import Phaser from "phaser";
import { QuizItem } from "../entities/QuizItem";
import { QuizQuestion, ChoiceType } from "./quizTypes";
import { QUIZ_QUESTIONS } from "./quizData";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  QUIZ_ANNOUNCE_MS,
  QUIZ_WINDOW_MS,
  QUIZ_RESULT_MS,
  QUIZ_ITEM_HIGH_Y,
  QUIZ_ITEM_SIZE,
  QUIZ_ITEM_SPACING_X,
  SCORE_BONUS,
  HP_RESTORE_AMOUNT,
} from "../constants";

export type GameState =
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
  applyHpRestore: () => void;
  applyHpDrain: () => void;
  applyHpDecayDown: () => void;
  applyHpDecayUp: () => void;
  setGameState: (state: GameState) => void;
  addScore: (amount: number) => void;
  showEffect: (text: string, color: string) => void;
  onQuizCollect?: (x: number, y: number) => void;
  onQuizAnnounce?: () => void;
  onRewardSelect?: (isCorrect: boolean) => void;
}

interface CardDef {
  type: ChoiceType;
  title: string;
  desc: string;
  color: number;
}

// Color helpers to derive gradient/outline/shine from base color
function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - amount);
  const g = Math.max(0, ((color >> 8) & 0xff) - amount);
  const b = Math.max(0, (color & 0xff) - amount);
  return (r << 16) | (g << 8) | b;
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

const REWARD_CARDS_KO: CardDef[] = [
  { type: "jump", title: "점프력 UP", desc: "점프력 15% 증가", color: 0x2ecc71 },
  { type: "jumpCount", title: "점프횟수 UP", desc: "점프 횟수 +1", color: 0x9b59b6 },
  { type: "speed", title: "속도 UP", desc: "이동속도 15% 증가", color: 0x3498db },
  { type: "score", title: `+${SCORE_BONUS}점`, desc: "즉시 점수 획득", color: 0xf1c40f },
  { type: "hpRestore", title: "체력 회복", desc: `현재 체력 +${HP_RESTORE_AMOUNT / 1000}초`, color: 0xff6b81 },
  { type: "hpDecay", title: "감소 속도 DOWN", desc: "감소 속도 15% 감소", color: 0x1abc9c },
];

const REWARD_CARDS_EN: CardDef[] = [
  { type: "jump", title: "JUMP UP", desc: "Jump +15%", color: 0x2ecc71 },
  { type: "jumpCount", title: "JUMP COUNT UP", desc: "Jump count +1", color: 0x9b59b6 },
  { type: "speed", title: "SPEED UP", desc: "Speed +15%", color: 0x3498db },
  { type: "score", title: `+${SCORE_BONUS}pts`, desc: "Instant score", color: 0xf1c40f },
  { type: "hpRestore", title: "HP RESTORE", desc: `HP +${HP_RESTORE_AMOUNT / 1000}s`, color: 0xff6b81 },
  { type: "hpDecay", title: "DECAY DOWN", desc: "Decay -15%", color: 0x1abc9c },
];

const T = {
  ko: {
    eat: (answer: string) => `먹으세요: ${answer}`,
    timeout: "시간 초과!",
    chooseReward: "보상을 선택하세요!",
    correct: "정답! ",
    wrong: "오답! ",
    wrongNoEffect: "오답! 하지만 효과 없음!",
    points: (n: number) => (n > 0 ? `+${n}점!` : `${n}점!`),
  },
  en: {
    eat: (answer: string) => `Collect: ${answer}`,
    timeout: "Time's up!",
    chooseReward: "Choose a reward!",
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
  private bannerContainer: Phaser.GameObjects.Container | null = null;
  private resultContainer: Phaser.GameObjects.Container | null = null;
  private usedQuestions: Set<number> = new Set();
  private timeoutTimer: Phaser.Time.TimerEvent | null = null;
  private rewardUI: Phaser.GameObjects.GameObject[] = [];
  private previewMarkers: Phaser.GameObjects.GameObject[] = [];
  private itemYPositions: number[] = [];

  private keywords: KeywordEntry[] = [];
  private usedKeywordIndices: Set<number> = new Set();
  private locale: "ko" | "en";
  private get t() { return T[this.locale]; }
  private get rewardCards() { return this.locale === "en" ? REWARD_CARDS_EN : REWARD_CARDS_KO; }

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

    const kw = scene.game.registry.get("keywords") as KeywordEntry[] | undefined;
    if (kw && kw.length >= 3) {
      this.keywords = kw;
    }
  }

  startQuiz(): void {
    const question = this.pickQuestion();
    if (!question) return;

    this.callbacks.setGameState("quiz_announce");
    this.callbacks.onQuizAnnounce?.();

    const bannerLabel = this.keywords.length >= 3
      ? question.text
      : this.t.eat(question.correctAnswer);
    this.bannerContainer = this.createBanner(bannerLabel);

    const allWords = Phaser.Utils.Array.Shuffle([
      question.correctAnswer,
      ...question.wrongAnswers,
    ]);

    // Generate random Y positions for each item
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const lowY = groundTop - QUIZ_ITEM_SIZE / 2 - 5 * S;
    this.itemYPositions = allWords.map(
      () => Phaser.Math.Between(QUIZ_ITEM_HIGH_Y, lowY)
    );

    this.spawnPreviewMarkers(allWords);

    this.scene.time.delayedCall(QUIZ_ANNOUNCE_MS, () => {
      this.clearPreviewMarkers();
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
    this.clearBanner();
    this.showRewardCards(item.isCorrect);
  }

  cleanup(): void {
    this.clearQuizItems();
    this.clearBanner();
    this.clearResult();
    this.clearRewardUI();
    this.clearPreviewMarkers();
    if (this.timeoutTimer) {
      this.timeoutTimer.remove();
      this.timeoutTimer = null;
    }
    if (this.scene.physics.world.isPaused) {
      this.scene.physics.resume();
    }
  }

  // ---- Quiz question ----

  private pickQuestion(): QuizQuestion | null {
    // 실제 키워드 데이터가 있으면 사용
    if (this.keywords.length >= 3) {
      return this.pickFromKeywords();
    }

    // 폴백: 목 데이터
    if (this.usedQuestions.size >= QUIZ_QUESTIONS.length) {
      this.usedQuestions.clear();
    }

    const available = QUIZ_QUESTIONS.filter(
      (_, i) => !this.usedQuestions.has(i)
    );
    const idx = Phaser.Math.Between(0, available.length - 1);
    const originalIdx = QUIZ_QUESTIONS.indexOf(available[idx]);
    this.usedQuestions.add(originalIdx);

    return available[idx];
  }

  private pickFromKeywords(): QuizQuestion {
    // 모든 키워드 소진 시 초기화
    if (this.usedKeywordIndices.size >= this.keywords.length) {
      this.usedKeywordIndices.clear();
    }

    // 미사용 키워드 중 랜덤 선택
    const availableIndices = this.keywords
      .map((_, i) => i)
      .filter((i) => !this.usedKeywordIndices.has(i));
    const correctIdx =
      availableIndices[Phaser.Math.Between(0, availableIndices.length - 1)];
    this.usedKeywordIndices.add(correctIdx);

    const correct = this.keywords[correctIdx];

    // 오답 2개: 정답 제외 나머지에서 랜덤
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

      const item = new QuizItem(this.scene, x, y, word, isCorrect);
      this.quizItems.add(item);
      item.setScrollSpeed(speed);
    });
  }

  private handleTimeout(): void {
    this.clearQuizItems();
    this.showResult(this.t.timeout, "#e67e22");
  }

  // ---- Result display ----

  private showResult(
    text: string,
    color: string,
    onComplete?: () => void
  ): void {
    this.clearBanner();

    this.callbacks.setGameState("quiz_result");

    this.resultContainer = this.createResultPopup(text, color);

    this.scene.time.delayedCall(QUIZ_RESULT_MS, () => {
      this.clearResult();
      if (onComplete) {
        onComplete();
      } else {
        this.callbacks.setGameState("playing");
      }
    });
  }

  // ---- Reward card UI ----

  private pickCards(): CardDef[] {
    let pool = [...this.rewardCards];
    if (this.callbacks.isJumpCountMaxed()) {
      pool = pool.filter((c) => c.type !== "jumpCount");
    }
    return Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
  }

  private showRewardCards(isCorrect: boolean): void {
    this.callbacks.setGameState("choosing_reward");
    this.scene.physics.pause();

    const selected = this.pickCards();
    const cardW = 150 * S;
    const cardH = 180 * S;
    const gap = 24 * S;
    const totalW = cardW * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardY = (GAME_HEIGHT - cardH) / 2;

    // Dark overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(20);
    this.rewardUI.push(overlay);

    // Title
    const title = this.scene.add
      .text(GAME_WIDTH / 2, cardY - 30 * S, this.t.chooseReward, {
        fontFamily: "monospace",
        fontSize: `${20 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.rewardUI.push(title);

    // Cards (enter from bottom with stagger)
    selected.forEach((card, i) => {
      const cx = startX + cardW / 2 + i * (cardW + gap);
      const cy = cardY + cardH / 2;

      const container = this.scene.add.container(cx, GAME_HEIGHT + cardH).setDepth(21);

      // Entrance animation: slide up from bottom with stagger
      this.scene.tweens.add({
        targets: container,
        y: cy,
        duration: 400,
        delay: i * 100,
        ease: "Back.Out",
      });

      // Background (game style: gradient + outline + shine)
      const bg = this.scene.add.graphics();
      const hx = -cardW / 2;
      const hy = -cardH / 2;
      const r = 12 * S;

      // Dark base (bottom gradient)
      bg.fillStyle(darken(card.color, 25), 1);
      bg.fillRoundedRect(hx, hy, cardW, cardH, r);

      // Main fill (top 75%)
      bg.fillStyle(card.color, 1);
      bg.fillRoundedRect(hx, hy, cardW, cardH * 0.75, { tl: r, tr: r, bl: 0, br: 0 });

      // Shine highlight (top strip)
      bg.fillStyle(lighten(card.color, 30), 0.3);
      bg.fillRoundedRect(hx + 3 * S, hy + 2 * S, cardW - 6 * S, cardH * 0.2, { tl: r, tr: r, bl: 0, br: 0 });

      // Outline (darker shade, 2px like character/heart)
      bg.lineStyle(2 * S, darken(card.color, 50), 1);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);
      container.add(bg);

      // Title
      const cardTitle = this.scene.add
        .text(0, -25 * S, card.title, {
          fontFamily: "monospace",
          fontSize: `${18 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3 * S,
        })
        .setOrigin(0.5);
      container.add(cardTitle);

      // Description
      const cardDesc = this.scene.add
        .text(0, 20 * S, card.desc, {
          fontFamily: "monospace",
          fontSize: `${12 * S}px`,
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2 * S,
        })
        .setOrigin(0.5);
      container.add(cardDesc);

      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 100,
        });
      });
      container.on("pointerout", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      });
      container.on("pointerdown", () =>
        this.selectReward(card.type, isCorrect)
      );

      this.rewardUI.push(container);
    });
  }

  private selectReward(type: ChoiceType, isCorrect: boolean): void {
    this.callbacks.onRewardSelect?.(isCorrect);
    this.clearRewardUI();
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
      case "hpRestore":
        if (isCorrect) {
          this.callbacks.applyHpRestore();
          effectLabel = prefix + "HP RESTORE!";
        } else {
          this.callbacks.applyHpDrain();
          effectLabel = prefix + "HP DRAIN!";
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
    }

    this.showResult(effectLabel, color);
  }

  // ---- Banner UI ----

  private createBanner(label: string): Phaser.GameObjects.Container {
    const maxTextW = GAME_WIDTH * 0.65;
    const padX = 28 * S;
    const padY = 16 * S;
    const r = 16 * S;
    const maxBoxH = 100 * S;
    const baseFontSize = 20 * S;
    const minFontSize = 12 * S;

    // Create text, shrink font if it exceeds max box height
    let fontSize = baseFontSize;
    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: "monospace",
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2 * S,
        wordWrap: { width: maxTextW, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(0.5);

    while (text.height + padY * 2 > maxBoxH && fontSize > minFontSize) {
      fontSize -= 1 * S;
      text.setFontSize(fontSize);
    }

    const boxW = Math.max(text.width + padX * 2, 240 * S);
    const boxH = Math.min(text.height + padY * 2, maxBoxH);
    const hx = -boxW / 2;
    const hy = -boxH / 2;

    const bg = this.scene.add.graphics();

    // Outer glow
    bg.fillStyle(0x3498db, 0.12);
    bg.fillRoundedRect(hx - 6 * S, hy - 6 * S, boxW + 12 * S, boxH + 12 * S, r + 6 * S);
    bg.fillStyle(0x3498db, 0.06);
    bg.fillRoundedRect(hx - 12 * S, hy - 12 * S, boxW + 24 * S, boxH + 24 * S, r + 12 * S);

    // Dark base (bottom gradient)
    bg.fillStyle(darken(0x1a2d42, 20), 1);
    bg.fillRoundedRect(hx, hy, boxW, boxH, r);

    // Main fill (top 70%)
    bg.fillStyle(0x1a2d42, 1);
    bg.fillRoundedRect(hx, hy, boxW, boxH * 0.7, { tl: r, tr: r, bl: 0, br: 0 });

    // Shine highlight (top strip)
    bg.fillStyle(0x2980b9, 0.2);
    bg.fillRoundedRect(hx + 4 * S, hy + 3 * S, boxW - 8 * S, boxH * 0.18, { tl: r, tr: r, bl: 0, br: 0 });

    // Border outline
    bg.lineStyle(2.5 * S, 0x3498db, 0.8);
    bg.strokeRoundedRect(hx, hy, boxW, boxH, r);

    // Inner border (subtle highlight)
    bg.lineStyle(1 * S, 0x5dade2, 0.15);
    bg.strokeRoundedRect(hx + 3 * S, hy + 3 * S, boxW - 6 * S, boxH - 6 * S, r - 3 * S);

    const container = this.scene.add
      .container(GAME_WIDTH / 2, -boxH, [bg, text])
      .setDepth(10);

    // Slide-in from top
    this.scene.tweens.add({
      targets: container,
      y: 50 * S,
      duration: 450,
      ease: "Back.Out",
    });

    // Glow pulse (subtle border breathing)
    this.scene.tweens.add({
      targets: bg,
      alpha: { from: 1, to: 0.8 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    return container;
  }

  private createResultPopup(label: string, color: string): Phaser.GameObjects.Container {
    const colorNum = parseInt(color.replace("#", ""), 16);
    const strokeColor = `#${darken(colorNum, 80).toString(16).padStart(6, "0")}`;
    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: "monospace",
        fontSize: `${30 * S}px`,
        color: color,
        fontStyle: "bold",
        stroke: strokeColor,
        strokeThickness: 4 * S,
      })
      .setOrigin(0.5);

    const container = this.scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 * S, [text])
      .setDepth(10)
      .setScale(1.4)
      .setAlpha(0);

    // Punch in + fade
    this.scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.Out",
    });

    return container;
  }

  // ---- Preview markers ----

  private drawWarningIcon(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number
  ): void {
    const top = cy - size * 0.6;
    const bot = cy + size * 0.5;
    const half = size * 0.55;

    // Red triangle fill
    g.fillStyle(0xe74c3c, 1);
    g.beginPath();
    g.moveTo(cx, top);
    g.lineTo(cx + half, bot);
    g.lineTo(cx - half, bot);
    g.closePath();
    g.fillPath();

    // Dark outline
    g.lineStyle(2 * S, 0x922b21, 1);
    g.beginPath();
    g.moveTo(cx, top);
    g.lineTo(cx + half, bot);
    g.lineTo(cx - half, bot);
    g.closePath();
    g.strokePath();

    // White exclamation mark (line + dot)
    const exTop = cy - size * 0.25;
    const exBot = cy + size * 0.1;
    g.lineStyle(3 * S, 0xffffff, 1);
    g.lineBetween(cx, exTop, cx, exBot);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy + size * 0.28, 2 * S);
  }

  private spawnPreviewMarkers(words: string[]): void {
    const totalWidth = (words.length - 1) * QUIZ_ITEM_SPACING_X;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    words.forEach((word, i) => {
      const y = this.itemYPositions[i];
      const x = startX + i * QUIZ_ITEM_SPACING_X;

      const container = this.scene.add.container(x, y).setDepth(5);

      const text = this.scene.add
        .text(0, 0, word, {
          fontFamily: "monospace",
          fontSize: `${15 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3 * S,
        })
        .setOrigin(0.5);
      container.add(text);

      const halfTextW = text.width / 2;
      const triS = 18 * S;
      const triGap = 6 * S;

      const icons = this.scene.add.graphics();
      // Left warning triangle + exclamation
      this.drawWarningIcon(icons, -(halfTextW + triGap + triS * 0.5), 0, triS);
      // Right warning triangle + exclamation
      this.drawWarningIcon(icons, halfTextW + triGap + triS * 0.5, 0, triS);
      container.add(icons);

      this.scene.tweens.add({
        targets: container,
        alpha: { from: 1, to: 0.3 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });

      this.previewMarkers.push(container);
    });
  }

  private clearPreviewMarkers(): void {
    this.previewMarkers.forEach((m) => m.destroy());
    this.previewMarkers = [];
  }

  // ---- Cleanup helpers ----

  private clearRewardUI(): void {
    this.rewardUI.forEach((obj) => obj.destroy());
    this.rewardUI = [];
  }

  private clearQuizItems(): void {
    const items = [...this.quizItems.getChildren()] as QuizItem[];
    items.forEach((item) => item.destroyWithTrail());
    this.quizItems.clear(true);
  }

  private clearBanner(): void {
    if (this.bannerContainer) {
      this.bannerContainer.destroy();
      this.bannerContainer = null;
    }
  }

  private clearResult(): void {
    if (this.resultContainer) {
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
  }
}
