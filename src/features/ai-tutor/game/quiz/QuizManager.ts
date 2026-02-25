import * as Phaser from "phaser";
import { QuizQuestion, ChoiceType, ActiveAbilityType } from "./quizTypes";
import { QuizPanelUI } from "./QuizPanelUI";
import { RewardCardUI } from "./RewardCardUI";
import { QuizAnswerUI } from "./QuizAnswerUI";
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
  getScrollSpeed: () => number;
  applySpeedUp: () => void;
  applySpeedDown: () => void;
  applyJumpUp: () => void;
  applyJumpDown: () => void;
  applyJumpCountUp: () => void;
  applyJumpCountDown: () => void;
  isJumpCountMaxed: () => boolean;
  isJumpCountAtMin: () => boolean;
  applyHeartBoostUp: () => void;
  applyHeartBoostDown: () => void;
  applyHpDecayDown: () => void;
  applyHpDecayUp: () => void;
  isActiveUnlocked: (type: ActiveAbilityType) => boolean;
  getActiveLevel: (type: ActiveAbilityType) => number;
  isPassiveHidden: (passiveType: string) => boolean;
  applyMagnetUp: () => void;
  applyMagnetDown: () => void;
  applyGiantUp: () => void;
  applyGiantDown: () => void;
  applyCoinRainUp: () => void;
  applyCoinRainDown: () => void;
  applyMultiJumpScoreUp: () => void;
  applyMultiJumpScoreDown: () => void;
  applySkyTreasureUp: () => void;
  applySkyTreasureDown: () => void;
  setGameState: (state: GameState) => void;
  addScore: (amount: number) => void;
  showEffect: (text: string, color: string) => void;
  onQuizCollect?: (x: number, y: number) => void;
  onRewardSelect?: (isCorrect: boolean) => void;
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
      isActiveUnlocked: callbacks.isActiveUnlocked,
      getActiveLevel: callbacks.getActiveLevel,
      isPassiveHidden: callbacks.isPassiveHidden,
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
    this.scene.physics.pause();
    this.rewardCardUI.show();
  }

  triggerAutoQuiz(): void {
    this.callbacks.setGameState("choosing_reward");
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

    const prefix = isCorrect ? this.t.correct : this.t.wrong;
    const color = isCorrect ? "#2ecc71" : "#e74c3c";
    let effectLabel = "";

    switch (type) {
      case "speed":
        if (isCorrect) {
          this.callbacks.applySpeedUp();
          effectLabel = prefix + "SPEED UP!";
        } else {
          this.callbacks.applySpeedDown();
          effectLabel = prefix + "SPEED DOWN!";
        }
        break;
      case "jump":
        if (isCorrect) {
          this.callbacks.applyJumpUp();
          effectLabel = prefix + "JUMP UP!";
        } else {
          this.callbacks.applyJumpDown();
          effectLabel = prefix + "JUMP DOWN!";
        }
        break;
      case "jumpCount":
        if (isCorrect) {
          this.callbacks.applyJumpCountUp();
          effectLabel = prefix + "JUMP COUNT UP!";
        } else if (this.callbacks.isJumpCountAtMin()) {
          effectLabel = this.t.wrongNoEffect;
        } else {
          this.callbacks.applyJumpCountDown();
          effectLabel = prefix + "JUMP COUNT DOWN!";
        }
        break;
      case "score": {
        const amount = isCorrect ? SCORE_BONUS : -SCORE_BONUS;
        this.callbacks.addScore(amount);
        effectLabel = prefix + this.t.points(amount);
        break;
      }
      case "heartBoost":
        if (isCorrect) {
          this.callbacks.applyHeartBoostUp();
          effectLabel = prefix + "HEART UP!";
        } else {
          this.callbacks.applyHeartBoostDown();
          effectLabel = prefix + "HEART DOWN!";
        }
        break;
      case "hpDecay":
        if (isCorrect) {
          this.callbacks.applyHpDecayDown();
          effectLabel = prefix + "DECAY SLOW!";
        } else {
          this.callbacks.applyHpDecayUp();
          effectLabel = prefix + "DECAY FAST!";
        }
        break;
      case "magnet":
        if (isCorrect) {
          this.callbacks.applyMagnetUp();
          effectLabel = prefix + "MAGNET!";
        } else {
          this.callbacks.applyMagnetDown();
          effectLabel = prefix + "REPEL!";
        }
        break;
      case "giant":
        if (isCorrect) {
          this.callbacks.applyGiantUp();
          effectLabel = prefix + "GIANT!";
        } else {
          this.callbacks.applyGiantDown();
          effectLabel = prefix + "SHRINK!";
        }
        break;
      case "coinRain":
        if (isCorrect) {
          this.callbacks.applyCoinRainUp();
          effectLabel = prefix + "COIN RAIN!";
        } else {
          this.callbacks.applyCoinRainDown();
          effectLabel = prefix + "METEOR STORM!";
        }
        break;
      case "multiJumpScore":
        if (isCorrect) {
          this.callbacks.applyMultiJumpScoreUp();
          effectLabel = prefix + "MULTI JUMP!";
        } else {
          this.callbacks.applyMultiJumpScoreDown();
          effectLabel = prefix + "JUMP PENALTY!";
        }
        break;
      case "skyTreasure":
        if (isCorrect) {
          this.callbacks.applySkyTreasureUp();
          effectLabel = prefix + "SKY TREASURE!";
        } else {
          this.callbacks.applySkyTreasureDown();
          effectLabel = prefix + "SKY METEOR!";
        }
        break;
    }

    const answer = isCorrect ? undefined : this.currentCorrectAnswer;
    this.showResult(effectLabel, color, answer);
  }
}
