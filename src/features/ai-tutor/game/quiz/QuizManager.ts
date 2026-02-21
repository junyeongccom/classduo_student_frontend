import * as Phaser from "phaser";
import { QuizItem } from "../entities/QuizItem";
import { QuizQuestion, ChoiceType, ActiveAbilityType } from "./quizTypes";
import { QuizPanelUI } from "./QuizPanelUI";
import { RewardCardUI } from "./RewardCardUI";
import {
  S,
  GAME_WIDTH,
  GROUND_Y,
  GROUND_HEIGHT,
  PLAYER_TEX_HEIGHT,
  QUIZ_ANNOUNCE_MS,
  QUIZ_WINDOW_MS,
  QUIZ_RESULT_MS,
  QUIZ_ITEM_HIGH_Y,
  QUIZ_ITEM_SIZE,
  QUIZ_ITEM_SPACING_X,
  SCORE_BONUS,
} from "../constants";

export type GameState =
  | "waiting_start"
  | "intro"
  | "playing"
  | "quiz_announce"
  | "quiz_active"
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
  applyMagnetUp: () => void;
  applyMagnetDown: () => void;
  applyGiantUp: () => void;
  applyGiantDown: () => void;
  applyCoinRainUp: () => void;
  applyCoinRainDown: () => void;
  setGameState: (state: GameState) => void;
  addScore: (amount: number) => void;
  showEffect: (text: string, color: string) => void;
  onQuizCollect?: (x: number, y: number) => void;
  onQuizAnnounce?: () => void;
  onRewardSelect?: (isCorrect: boolean) => void;
}

const T = {
  ko: {
    eat: (answer: string) => `먹으세요: ${answer}`,
    timeout: "시간 초과!",
    correct: "정답! ",
    wrong: "오답! ",
    wrongNoEffect: "오답! 하지만 효과 없음!",
    points: (n: number) => (n > 0 ? `+${n}점!` : `${n}점!`),
  },
  en: {
    eat: (answer: string) => `Collect: ${answer}`,
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
  private quizItems: Phaser.Physics.Arcade.Group;
  private panelUI: QuizPanelUI;
  private rewardCardUI: RewardCardUI;
  private timeoutTimer: Phaser.Time.TimerEvent | null = null;
  private itemYPositions: number[] = [];
  private itemColorIndices: number[] = [];

  private keywords: KeywordEntry[] = [];
  private usedKeywordIndices: Set<number> = new Set();
  private locale: "ko" | "en";

  private correctCount = 0;
  private wrongCount = 0;
  private skippedCount = 0;

  private currentCorrectAnswer = "";
  private get t() { return T[this.locale]; }

  constructor(
    scene: Phaser.Scene,
    quizItems: Phaser.Physics.Arcade.Group,
    callbacks: QuizCallbacks
  ) {
    this.scene = scene;
    this.quizItems = quizItems;
    this.callbacks = callbacks;

    const loc = scene.game.registry.get("locale") as string | undefined;
    this.locale = loc === "en" ? "en" : "ko";
    this.panelUI = new QuizPanelUI(scene, this.locale);
    this.rewardCardUI = new RewardCardUI(scene, this.locale, {
      isJumpCountMaxed: callbacks.isJumpCountMaxed,
      isActiveUnlocked: callbacks.isActiveUnlocked,
    });
    this.rewardCardUI.onSelect = (type, isCorrect) => {
      this.handleRewardSelect(type, isCorrect);
    };

    const kw = scene.game.registry.get("keywords") as KeywordEntry[] | undefined;
    if (kw && kw.length >= 3) {
      this.keywords = kw;
    }
  }

  startQuiz(): void {
    if (this.keywords.length < 3) {
      this.retryLoadKeywords();
      return;
    }
    this.executeQuiz();
  }

  private async retryLoadKeywords(): Promise<void> {
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
          this.executeQuiz();
          return;
        }
      }
    } catch {
      // API fail — show error below
    }

    const msg = this.locale === "en"
      ? "No keywords loaded — quiz unavailable"
      : "키워드 데이터 없음 — 퀴즈 불가";
    this.callbacks.showEffect(msg, "#e74c3c");
  }

  private executeQuiz(): void {
    const question = this.pickQuestion();
    if (!question) return;

    this.currentCorrectAnswer = question.correctAnswer;
    this.callbacks.setGameState("quiz_announce");
    this.callbacks.onQuizAnnounce?.();

    const bannerLabel = this.keywords.length >= 3
      ? question.text
      : this.t.eat(question.correctAnswer);
    const bannerBottomY = this.panelUI.showBanner(bannerLabel);

    const allWords = Phaser.Utils.Array.Shuffle([
      question.correctAnswer,
      ...question.wrongAnswers,
    ]);

    // Generate Y positions snapped to character-height levels
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const baseY = groundTop - QUIZ_ITEM_SIZE / 2 - 5 * S;
    const step = PLAYER_TEX_HEIGHT;
    const levels: number[] = [];
    for (let y = baseY; y >= QUIZ_ITEM_HIGH_Y; y -= step) {
      levels.push(y);
    }
    if (levels.length === 0) levels.push(baseY);
    this.itemYPositions = allWords.map(
      () => levels[Phaser.Math.Between(0, levels.length - 1)]
    );

    // Fixed color order: pink(0), purple(2), blue(1)
    this.itemColorIndices = [0, 2, 1];

    this.panelUI.showPreviewMarkers(allWords, this.itemColorIndices, bannerBottomY);

    this.scene.time.delayedCall(QUIZ_ANNOUNCE_MS, () => {
      this.callbacks.setGameState("quiz_active");
      this.spawnQuizItems(allWords, question.correctAnswer);

      this.timeoutTimer = this.scene.time.delayedCall(QUIZ_WINDOW_MS, () => {
        this.handleTimeout();
      });
    });
  }

  handleCollection(item: QuizItem): void {
    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }

    this.callbacks.onQuizCollect?.(item.x, item.y);

    this.clearQuizItems();
    this.panelUI.clearBanner();

    this.callbacks.setGameState("choosing_reward");
    this.scene.physics.pause();
    this.rewardCardUI.show(item.isCorrect);
  }

  cleanup(): void {
    this.clearQuizItems();
    this.panelUI.cleanup();
    this.rewardCardUI.cleanup();
    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }
    if (this.scene.physics.world.isPaused) {
      this.scene.physics.resume();
    }
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

  private spawnQuizItems(words: string[], correctAnswer: string): void {
    const speed = this.callbacks.getScrollSpeed();
    const startX = GAME_WIDTH + 50 * S;

    words.forEach((word, i) => {
      const y = this.itemYPositions[i];
      const x = startX + i * QUIZ_ITEM_SPACING_X;
      const isCorrect = word === correctAnswer;
      const colorIndex = this.itemColorIndices[i];

      const item = new QuizItem(this.scene, x, y, word, isCorrect, colorIndex);
      this.quizItems.add(item);
      item.setScrollSpeed(speed);
    });
  }

  private handleTimeout(): void {
    this.skippedCount++;
    this.clearQuizItems();
    this.panelUI.clearBanner();
    this.showResult(this.t.timeout, "#e67e22", this.currentCorrectAnswer);
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
    }

    const answer = isCorrect ? undefined : this.currentCorrectAnswer;
    this.showResult(effectLabel, color, answer);
  }

  // ---- Cleanup helpers ----

  private clearQuizItems(): void {
    const items = [...this.quizItems.getChildren()] as QuizItem[];
    items.forEach((item) => item.destroyWithTrail());
    this.quizItems.clear(true);
  }
}
