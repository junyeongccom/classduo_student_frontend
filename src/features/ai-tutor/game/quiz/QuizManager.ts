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

const REWARD_CARDS: CardDef[] = [
  { type: "jump", title: "점프력 UP", desc: "점프력 15% 증가", color: 0x2ecc71 },
  { type: "jumpCount", title: "점프횟수 UP", desc: "점프 횟수 +1", color: 0x9b59b6 },
  { type: "speed", title: "속도 UP", desc: "이동속도 15% 증가", color: 0x3498db },
  { type: "score", title: `+${SCORE_BONUS}점`, desc: "즉시 점수 획득", color: 0xf1c40f },
  { type: "hpRestore", title: "체력 회복", desc: `현재 체력 +${HP_RESTORE_AMOUNT / 1000}초`, color: 0xff6b81 },
  { type: "hpDecay", title: "감소 속도 DOWN", desc: "감소 속도 15% 감소", color: 0x1abc9c },
];

export class QuizManager {
  private scene: Phaser.Scene;
  private callbacks: QuizCallbacks;
  private quizItems: Phaser.Physics.Arcade.Group;
  private bannerText: Phaser.GameObjects.Text | null = null;
  private resultText: Phaser.GameObjects.Text | null = null;
  private usedQuestions: Set<number> = new Set();
  private timeoutTimer: Phaser.Time.TimerEvent | null = null;
  private rewardUI: Phaser.GameObjects.GameObject[] = [];
  private previewMarkers: Phaser.GameObjects.GameObject[] = [];
  private itemYPositions: number[] = [];

  constructor(
    scene: Phaser.Scene,
    quizItems: Phaser.Physics.Arcade.Group,
    callbacks: QuizCallbacks
  ) {
    this.scene = scene;
    this.quizItems = quizItems;
    this.callbacks = callbacks;
  }

  startQuiz(): void {
    const question = this.pickQuestion();
    if (!question) return;

    this.callbacks.setGameState("quiz_announce");
    this.callbacks.onQuizAnnounce?.();

    this.bannerText = this.scene.add
      .text(GAME_WIDTH / 2, -30 * S, `먹으세요: ${question.correctAnswer}`, {
        fontFamily: "monospace",
        fontSize: `${22 * S}px`,
        color: "#ffffff",
        backgroundColor: "#1a1a2e",
        padding: { x: 16 * S, y: 8 * S },
        shadow: { offsetX: 1 * S, offsetY: 1 * S, color: "#000000", blur: 4 * S, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Slide-in from top
    this.scene.tweens.add({
      targets: this.bannerText,
      y: 50 * S,
      duration: 300,
      ease: "Back.Out",
    });

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
    this.showResult("시간 초과!", "#e67e22");
  }

  // ---- Result display ----

  private showResult(
    text: string,
    color: string,
    onComplete?: () => void
  ): void {
    this.clearBanner();

    this.callbacks.setGameState("quiz_result");

    this.resultText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 * S, text, {
        fontFamily: "monospace",
        fontSize: `${36 * S}px`,
        color: color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10);

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
    let pool = [...REWARD_CARDS];
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
      .text(GAME_WIDTH / 2, cardY - 30 * S, "보상을 선택하세요!", {
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

    const prefix = isCorrect ? "정답! " : "오답! ";
    const color = isCorrect ? "#2ecc71" : "#e74c3c";

    switch (type) {
      case "speed":
        if (isCorrect) {
          this.callbacks.applySpeedUp();
          this.callbacks.showEffect(prefix + "SPEED UP!", color);
        } else {
          this.callbacks.applySpeedDown();
          this.callbacks.showEffect(prefix + "SPEED DOWN!", color);
        }
        break;
      case "jump":
        if (isCorrect) {
          this.callbacks.applyJumpUp();
          this.callbacks.showEffect(prefix + "JUMP UP!", color);
        } else {
          this.callbacks.applyJumpDown();
          this.callbacks.showEffect(prefix + "JUMP DOWN!", color);
        }
        break;
      case "jumpCount":
        if (isCorrect) {
          this.callbacks.applyJumpCountUp();
          this.callbacks.showEffect(prefix + "JUMP COUNT UP!", color);
        } else if (this.callbacks.isJumpCountAtMin()) {
          this.callbacks.showEffect("오답! 하지만 효과 없음!", "#e67e22");
        } else {
          this.callbacks.applyJumpCountDown();
          this.callbacks.showEffect(prefix + "JUMP COUNT DOWN!", color);
        }
        break;
      case "score": {
        const amount = isCorrect ? SCORE_BONUS : -SCORE_BONUS;
        this.callbacks.addScore(amount);
        const label = amount > 0 ? `+${amount}점!` : `${amount}점!`;
        this.callbacks.showEffect(prefix + label, color);
        break;
      }
      case "hpRestore":
        if (isCorrect) {
          this.callbacks.applyHpRestore();
          this.callbacks.showEffect(prefix + "HP RESTORE!", color);
        } else {
          this.callbacks.applyHpDrain();
          this.callbacks.showEffect(prefix + "HP DRAIN!", color);
        }
        break;
      case "hpDecay":
        if (isCorrect) {
          this.callbacks.applyHpDecayDown();
          this.callbacks.showEffect(prefix + "DECAY SLOW!", color);
        } else {
          this.callbacks.applyHpDecayUp();
          this.callbacks.showEffect(prefix + "DECAY FAST!", color);
        }
        break;
    }

    this.callbacks.setGameState("playing");
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
    if (this.bannerText) {
      this.bannerText.destroy();
      this.bannerText = null;
    }
  }

  private clearResult(): void {
    if (this.resultText) {
      this.resultText.destroy();
      this.resultText = null;
    }
  }
}
