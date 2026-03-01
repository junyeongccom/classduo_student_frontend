import * as Phaser from "phaser";
import { trackInGameQuizAttempt } from '@/shared/hooks/useAnalytics'
import { QuizQuestion, ChoiceType, ActiveAbilityType } from "./quizTypes";
import { QuizPanelUI } from "./QuizPanelUI";
import { RewardCardUI } from "./RewardCardUI";
import { QuizAnswerUI } from "./QuizAnswerUI";
import { BuffDebuffManager } from "../systems/BuffDebuffManager";
import { ActiveAbilityManager } from "../systems/ActiveAbilityManager";
import {
  QUIZ_RESULT_MS,
  SCORE_BONUS,
} from "../constants";

export type GameState =
  | "waiting_start"
  | "intro"
  | "playing"
  | "quiz_answering"
  | "quiz_result"
  | "choosing_reward"
  | "game_over";

export interface QuizCallbacks {
  buffDebuff: BuffDebuffManager;
  activeAbility: ActiveAbilityManager;
  getScrollSpeed: () => number;
  getScoreTier: () => number;
  isJumpCountMaxed: () => boolean;
  isJumpCountAtMin: () => boolean;
  setGameState: (state: GameState) => void;
  addScore: (amount: number) => void;
  showEffect: (text: string, color: string) => void;
  onQuizCollect?: (x: number, y: number) => void;
  onRewardSelect?: (isCorrect: boolean) => void;
  onPhysicsPause?: () => void;
  onPhysicsResume?: () => void;
}

const T = {
  ko: {
    timeout: "시간 초과!",
    correct: "정답! ",
    wrong: "오답! ",
    wrongNoEffect: "오답! 하지만 효과 없음!",
    points: (n: number) => (n > 0 ? `+${n}점!` : `${n}점!`),
  },
  en: {
    timeout: "Time's up!",
    correct: "Correct! ",
    wrong: "Wrong! ",
    wrongNoEffect: "Wrong! No effect!",
    points: (n: number) => (n > 0 ? `+${n}pts!` : `${n}pts!`),
  },
} as const;

interface KeywordEntry {
  keyword: string;
  description: string;
}

export class QuizManager {
  private scene: Phaser.Scene;
  private callbacks: QuizCallbacks;
  private panelUI: QuizPanelUI;
  private rewardCardUI: RewardCardUI;
  private quizAnswerUI: QuizAnswerUI;

  private keywords: KeywordEntry[] = [];
  private usedKeywordIndices: Set<number> = new Set();
  private locale: "ko" | "en";

  private correctCount = 0;
  private wrongCount = 0;
  private skippedCount = 0;

  private currentCorrectAnswer = "";
  private pendingRewardType: ChoiceType | null = null;
  private get t() { return T[this.locale]; }

  constructor(
    scene: Phaser.Scene,
    callbacks: QuizCallbacks
  ) {
    this.scene = scene;
    this.callbacks = callbacks;

    const loc = scene.game.registry.get("locale") as string | undefined;
    this.locale = loc === "en" ? "en" : "ko";
    this.panelUI = new QuizPanelUI(scene, this.locale);
    this.rewardCardUI = new RewardCardUI(scene, this.locale, {
      isJumpCountMaxed: callbacks.isJumpCountMaxed,
      isActiveUnlocked: (type: ActiveAbilityType) => callbacks.activeAbility.isActiveUnlocked(type),
      getActiveLevel: (type: ActiveAbilityType) => callbacks.activeAbility.getActiveLevel(type),
      isPassiveHidden: (passiveType: string) => callbacks.buffDebuff.isPassiveHiddenByActive(passiveType),
      isPassiveMaxed: (passiveType: string) => callbacks.buffDebuff.isPassiveAtMax(passiveType),
    });
    this.rewardCardUI.onSelect = (type) => {
      this.pendingRewardType = type;
      this.showQuizAnswer();
    };

    this.quizAnswerUI = new QuizAnswerUI(scene, this.locale);
    this.quizAnswerUI.onAnswer = (isCorrect) => {
      this.handleQuizResult(isCorrect);
    };

    const kw = scene.game.registry.get("keywords") as KeywordEntry[] | undefined;
    if (kw && kw.length >= 3) {
      this.keywords = kw;
    }
  }

  handleScrollCollect(x: number, y: number): void {
    this.callbacks.onQuizCollect?.(x, y);
    this.callbacks.setGameState("choosing_reward");
    this.callbacks.onPhysicsPause?.();
    this.scene.physics.pause();
    this.rewardCardUI.show();
  }

  triggerAutoQuiz(): void {
    this.callbacks.setGameState("choosing_reward");
    this.callbacks.onPhysicsPause?.();
    this.scene.physics.pause();
    this.rewardCardUI.show();
  }

  private showQuizAnswer(): void {
    if (this.keywords.length < 3) {
      this.retryLoadKeywordsForQuiz();
      return;
    }

    const question = this.pickQuestion();
    if (!question) {
      // Fallback: treat as correct if no question available
      this.handleQuizResult(true);
      return;
    }

    this.currentCorrectAnswer = question.correctAnswer;
    this.callbacks.setGameState("quiz_answering");
    this.quizAnswerUI.show(question);
  }

  private async retryLoadKeywordsForQuiz(): Promise<void> {
    try {
      const lectureId = this.scene.game.registry.get("lectureId") as string | undefined;
      if (lectureId) {
        const { chatService } = await import("../../services/chatService");
        const { data } = await chatService.getLectureKeywords(lectureId, this.locale);
        if (data?.keywords && data.keywords.length >= 3) {
          const isEn = this.locale === "en";
          this.keywords = data.keywords.map((k: any) => ({
            keyword: (isEn && k.keyword_eng) || k.keyword,
            description: (isEn && k.description_eng) || k.description,
          }));
          this.scene.game.registry.set("keywords", this.keywords);
          this.showQuizAnswer();
          return;
        }
      }
    } catch {
      // API fail — fallback to correct
    }

    // No keywords available — treat as correct
    this.handleQuizResult(true);
  }

  private handleQuizResult(isCorrect: boolean): void {
    trackInGameQuizAttempt({
      correct: isCorrect,
      lecture_id: (this.scene.game.registry.get('lectureId') as string) || '',
      course_id: (this.scene.game.registry.get('courseId') as string) || '',
    });

    if (this.pendingRewardType) {
      this.handleRewardSelect(this.pendingRewardType, isCorrect);
      this.pendingRewardType = null;
    }
  }

  cleanup(): void {
    this.panelUI.cleanup();
    this.rewardCardUI.cleanup();
    this.quizAnswerUI.cleanup();
    if (this.scene.physics.world.isPaused) {
      this.scene.physics.resume();
    }
  }

  incrementSkipped(): void {
    this.skippedCount++;
  }

  getStats(): { correct: number; wrong: number; skipped: number } {
    return {
      correct: this.correctCount,
      wrong: this.wrongCount,
      skipped: this.skippedCount,
    };
  }

  // ---- Quiz question ----

  private pickQuestion(): QuizQuestion | null {
    if (this.keywords.length < 3) {
      return null;
    }
    return this.pickFromKeywords();
  }

  private pickFromKeywords(): QuizQuestion {
    if (this.usedKeywordIndices.size >= this.keywords.length) {
      this.usedKeywordIndices.clear();
    }

    const availableIndices = this.keywords
      .map((_, i) => i)
      .filter((i) => !this.usedKeywordIndices.has(i));
    const correctIdx =
      availableIndices[Phaser.Math.Between(0, availableIndices.length - 1)];
    this.usedKeywordIndices.add(correctIdx);

    const correct = this.keywords[correctIdx];

    const otherIndices = this.keywords
      .map((_, i) => i)
      .filter((i) => i !== correctIdx);
    const shuffled = Phaser.Utils.Array.Shuffle(otherIndices);
    const wrongAnswers = [
      this.keywords[shuffled[0]].keyword,
      this.keywords[shuffled[1]].keyword,
    ];

    return {
      text: correct.description,
      correctAnswer: correct.keyword,
      wrongAnswers,
    };
  }

  // ---- Result display ----

  private showResult(
    text: string,
    color: string,
    correctAnswer?: string,
  ): void {
    this.callbacks.setGameState("quiz_result");

    this.panelUI.showResult(text, color, correctAnswer);

    this.scene.time.delayedCall(QUIZ_RESULT_MS, () => {
      this.panelUI.clearResult();
      this.callbacks.setGameState("playing");
    });
  }

  // ---- Reward select handler ----

  private handleRewardSelect(type: ChoiceType, isCorrect: boolean): void {
    if (isCorrect) {
      this.correctCount++;
    } else {
      this.wrongCount++;
    }

    this.callbacks.onRewardSelect?.(isCorrect);
    this.scene.physics.resume();
    this.callbacks.onPhysicsResume?.();

    const { buffDebuff, activeAbility } = this.callbacks;
    const prefix = isCorrect ? this.t.correct : this.t.wrong;
    const color = isCorrect ? "#2ecc71" : "#e74c3c";
    let effectLabel = "";

    switch (type) {
      case "speed":
        if (isCorrect) {
          buffDebuff.applySpeedUp(); buffDebuff.speedRewardStacks++;
          effectLabel = prefix + "SPEED UP!";
        } else {
          buffDebuff.applySpeedDown(); buffDebuff.speedRewardStacks--;
          effectLabel = prefix + "SPEED DOWN!";
        }
        break;
      case "jump":
        if (isCorrect) {
          buffDebuff.applyJumpUp(); buffDebuff.jumpRewardStacks++;
          effectLabel = prefix + "JUMP UP!";
        } else {
          buffDebuff.applyJumpDown(); buffDebuff.jumpRewardStacks--;
          effectLabel = prefix + "JUMP DOWN!";
        }
        break;
      case "jumpCount":
        if (isCorrect) {
          buffDebuff.applyJumpCountUp(); buffDebuff.jumpCountRewardStacks++;
          effectLabel = prefix + "JUMP COUNT UP!";
        } else if (this.callbacks.isJumpCountAtMin()) {
          effectLabel = this.t.wrongNoEffect;
        } else {
          buffDebuff.applyJumpCountDown(); buffDebuff.jumpCountRewardStacks--;
          effectLabel = prefix + "JUMP COUNT DOWN!";
        }
        break;
      case "score": {
        const tier = Math.min(this.callbacks.getScoreTier(), SCORE_BONUS.length - 1);
        const bonus = SCORE_BONUS[tier];
        if (isCorrect) {
          this.callbacks.addScore(bonus);
          buffDebuff.applyScorePassiveUp();
        } else {
          this.callbacks.addScore(-bonus);
          buffDebuff.applyScorePassiveDown();
        }
        effectLabel = prefix + this.t.points(isCorrect ? bonus : -bonus);
        break;
      }
      case "scoreFallback": {
        const amount = isCorrect ? 30 : -30;
        this.callbacks.addScore(amount);
        effectLabel = prefix + this.t.points(amount);
        break;
      }
      case "heartBoost":
        if (isCorrect) {
          buffDebuff.applyHeartBoostUp();
          effectLabel = prefix + "HEART UP!";
        } else {
          buffDebuff.applyHeartBoostDown();
          effectLabel = prefix + "HEART DOWN!";
        }
        break;
      case "hpDecay":
        if (isCorrect) {
          buffDebuff.applyHpDecayDown();
          effectLabel = prefix + "DECAY SLOW!";
        } else {
          buffDebuff.applyHpDecayUp();
          effectLabel = prefix + "DECAY FAST!";
        }
        break;
      case "magnet":
        if (isCorrect) {
          activeAbility.applyActiveAbilityUp("magnet");
          effectLabel = prefix + "MAGNET!";
        } else {
          activeAbility.applyActiveAbilityDown("magnet");
          effectLabel = prefix + "REPEL!";
        }
        break;
      case "giant":
        if (isCorrect) {
          activeAbility.applyActiveAbilityUp("giant");
          effectLabel = prefix + "GIANT!";
        } else {
          activeAbility.applyActiveAbilityDown("giant");
          effectLabel = prefix + "SHRINK!";
        }
        break;
      case "coinRain":
        if (isCorrect) {
          activeAbility.applyActiveAbilityUp("coinRain");
          effectLabel = prefix + "COIN RAIN!";
        } else {
          activeAbility.applyActiveAbilityDown("coinRain");
          effectLabel = prefix + "METEOR STORM!";
        }
        break;
      case "multiJumpScore":
        if (isCorrect) {
          activeAbility.applyActiveAbilityUp("multiJumpScore");
          effectLabel = prefix + "MULTI JUMP!";
        } else {
          activeAbility.applyActiveAbilityDown("multiJumpScore");
          effectLabel = prefix + "JUMP PENALTY!";
        }
        break;
      case "skyTreasure":
        if (isCorrect) {
          activeAbility.applyActiveAbilityUp("skyTreasure");
          effectLabel = prefix + "SKY TREASURE!";
        } else {
          activeAbility.applyActiveAbilityDown("skyTreasure");
          effectLabel = prefix + "SKY METEOR!";
        }
        break;
    }

    const answer = isCorrect ? undefined : this.currentCorrectAnswer;
    this.showResult(effectLabel, color, answer);
  }
}
