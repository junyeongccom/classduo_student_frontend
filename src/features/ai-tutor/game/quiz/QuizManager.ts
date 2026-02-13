import * as Phaser from "phaser";
import { QuizItem } from "../entities/QuizItem";
import { QuizQuestion, ChoiceType } from "./quizTypes";
import { QUIZ_QUESTIONS } from "./quizData";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
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
  HP_RESTORE_AMOUNT,
  COLOR_QUIZ_WORD,
  FONT_FAMILY,
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
  { type: "hpDecay", title: "체력 감소 DOWN", desc: "체력 감소 속도 15% 감소", color: 0x1abc9c },
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
  private rewardTimers: Phaser.Time.TimerEvent[] = [];
  private previewMarkers: Phaser.GameObjects.GameObject[] = [];
  private itemYPositions: number[] = [];
  private bannerBottomY = 0;

  private keywords: KeywordEntry[] = [];
  private usedKeywordIndices: Set<number> = new Set();
  private locale: "ko" | "en";

  private correctCount = 0;
  private wrongCount = 0;
  private skippedCount = 0;

  private pendingRewardTypes: ChoiceType[] = [];
  private pendingRewardCorrect = false;
  private rewardKeyHandler: ((e: KeyboardEvent) => void) | null = null;
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

    this.spawnPreviewMarkers(allWords);

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

  getStats(): { correct: number; wrong: number; skipped: number } {
    return {
      correct: this.correctCount,
      wrong: this.wrongCount,
      skipped: this.skippedCount,
    };
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
    this.skippedCount++;
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
        fontFamily: FONT_FAMILY,
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

      // Entrance animation → idle float on complete
      this.scene.tweens.add({
        targets: container,
        y: cy,
        duration: 400,
        delay: i * 100,
        ease: "Back.Out",
        onComplete: () => {
          // 1) Idle floating
          this.scene.tweens.add({
            targets: container,
            y: cy - 4 * S,
            duration: 1200,
            delay: i * 200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
        },
      });

      const hx = -cardW / 2;
      const hy = -cardH / 2;
      const r = 12 * S;

      // 3) Hover glow (behind card bg)
      const glow = this.scene.add.graphics();
      const glowPad = 8 * S;
      glow.fillStyle(card.color, 1);
      glow.fillRoundedRect(
        hx - glowPad, hy - glowPad,
        cardW + glowPad * 2, cardH + glowPad * 2,
        r + glowPad
      );
      glow.setAlpha(0);
      container.add(glow);

      // Background
      const bg = this.scene.add.graphics();
      bg.fillStyle(card.color, 0.25);
      bg.fillRoundedRect(hx, hy, cardW, cardH, r);
      bg.lineStyle(1.5 * S, card.color, 0.45);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);
      container.add(bg);

      // 4) Border shimmer dot
      const shimmerDot = this.scene.add.graphics();
      const shimmerColor = lighten(card.color, 60);
      const shimmerR = 4 * S;
      shimmerDot.fillStyle(shimmerColor, 0.8);
      shimmerDot.fillCircle(0, 0, shimmerR);
      shimmerDot.setAlpha(0.8);
      container.add(shimmerDot);

      const perimeter = (cardW + cardH) * 2;
      const shimmerTarget = { progress: 0 };
      this.scene.tweens.add({
        targets: shimmerTarget,
        progress: 1,
        duration: 2500,
        repeat: -1,
        ease: "Linear",
        onUpdate: () => {
          const p = shimmerTarget.progress;
          const dist = p * perimeter;
          let sx: number, sy: number;
          if (dist < cardW) {
            sx = hx + dist; sy = hy;
          } else if (dist < cardW + cardH) {
            sx = hx + cardW; sy = hy + (dist - cardW);
          } else if (dist < cardW * 2 + cardH) {
            sx = hx + cardW - (dist - cardW - cardH); sy = hy + cardH;
          } else {
            sx = hx; sy = hy + cardH - (dist - cardW * 2 - cardH);
          }
          shimmerDot.setPosition(sx, sy);
        },
      });

      // Title
      const cardTitle = this.scene.add
        .text(0, -25 * S, card.title, {
          fontFamily: FONT_FAMILY,
          fontSize: `${18 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(cardTitle);

      // Description
      const cardDesc = this.scene.add
        .text(0, 20 * S, card.desc, {
          fontFamily: FONT_FAMILY,
          fontSize: `${12 * S}px`,
          color: "#cccccc",
        })
        .setOrigin(0.5);
      container.add(cardDesc);

      // 2) Sparkle particles
      const sparkleTimer = this.scene.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          const px = Phaser.Math.Between(Math.round(hx + 6 * S), Math.round(hx + cardW - 6 * S));
          const py = Phaser.Math.Between(Math.round(hy + 6 * S), Math.round(hy + cardH - 6 * S));
          const dot = this.scene.add.graphics();
          dot.fillStyle(card.color, 0.7);
          dot.fillCircle(0, 0, Phaser.Math.Between(1, 3) * S);
          dot.setPosition(px, py);
          container.add(dot);
          this.scene.tweens.add({
            targets: dot,
            y: py - Phaser.Math.Between(8, 16) * S,
            alpha: 0,
            duration: 800,
            ease: "Quad.Out",
            onComplete: () => { dot.destroy(); },
          });
        },
      });
      this.rewardTimers.push(sparkleTimer);

      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 100,
        });
        this.scene.tweens.add({
          targets: glow,
          alpha: 0.25,
          duration: 150,
        });
      });
      container.on("pointerout", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
        this.scene.tweens.add({
          targets: glow,
          alpha: 0,
          duration: 150,
        });
      });
      container.on("pointerdown", () =>
        this.selectReward(card.type, isCorrect)
      );

      this.rewardUI.push(container);
    });

    // Keyboard shortcut: Left/Down/Right arrows to pick cards
    this.pendingRewardTypes = selected.map((c) => c.type);
    this.pendingRewardCorrect = isCorrect;
    this.rewardKeyHandler = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        ArrowLeft: 0,
        ArrowDown: 1,
        ArrowRight: 2,
      };
      const idx = keyMap[e.key];
      if (idx !== undefined && this.pendingRewardTypes[idx]) {
        this.selectReward(this.pendingRewardTypes[idx], this.pendingRewardCorrect);
      }
    };
    this.scene.game.canvas.ownerDocument.addEventListener("keydown", this.rewardKeyHandler);
  }

  private selectReward(type: ChoiceType, isCorrect: boolean): void {
    if (isCorrect) {
      this.correctCount++;
    } else {
      this.wrongCount++;
    }

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
        fontFamily: FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2 * S,
        wordWrap: { width: maxTextW, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    while (text.height + padY * 2 > maxBoxH && fontSize > minFontSize) {
      fontSize -= 1 * S;
      text.setFontSize(fontSize);
    }

    const boxW = Math.max(text.width + padX * 2, 240 * S);
    const boxH = Math.min(text.height + padY * 2, maxBoxH);
    const hx = -boxW / 2;
    const hy = -boxH / 2;

    const bg = this.scene.add.graphics();

    // A) Glassmorphism background
    // 1) Base dark layer
    bg.fillStyle(0x0a0a1a, 0.55);
    bg.fillRoundedRect(hx, hy, boxW, boxH, r);

    // 2) Top 1/3 highlight (glass reflection)
    bg.fillStyle(0xffffff, 0.06);
    bg.fillRoundedRect(hx, hy, boxW, boxH * 0.35, { tl: r, tr: r, bl: 0, br: 0 });

    // 3) Top edge bright line
    bg.lineStyle(1 * S, 0xffffff, 0.15);
    bg.beginPath();
    bg.arc(hx + r, hy + r, r, Math.PI, Math.PI * 1.5);
    bg.lineTo(hx + boxW - r, hy);
    bg.arc(hx + boxW - r, hy + r, r, Math.PI * 1.5, 0);
    bg.strokePath();

    // B) Neon glow border (3 layers)
    // Outer glow (wide & transparent)
    bg.lineStyle(6 * S, COLOR_QUIZ_WORD, 0.08);
    bg.strokeRoundedRect(hx, hy, boxW, boxH, r);

    // Middle glow
    bg.lineStyle(3 * S, COLOR_QUIZ_WORD, 0.15);
    bg.strokeRoundedRect(hx, hy, boxW, boxH, r);

    // Inner sharp border
    bg.lineStyle(1.5 * S, 0x5dade2, 0.4);
    bg.strokeRoundedRect(hx, hy, boxW, boxH, r);

    const bannerY = 36 * S;
    this.bannerBottomY = bannerY + boxH;
    const container = this.scene.add
      .container(GAME_WIDTH / 2, -boxH, [bg, text])
      .setDepth(10);

    // Slide-in from top
    this.scene.tweens.add({
      targets: container,
      y: bannerY + boxH / 2,
      duration: 450,
      ease: "Back.Out",
    });

    // Gentle bg pulse (text stays at 0.8)
    this.scene.tweens.add({
      targets: bg,
      alpha: { from: 1, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    return container;
  }

  private createResultPopup(label: string, color: string): Phaser.GameObjects.Container {
    const colorNum = parseInt(color.replace("#", ""), 16);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${26 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 0, color: color, blur: 8 * S, stroke: true, fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    // Glow pulse — radial gradient circle behind text
    const glowR = Math.max(text.width, text.height) * 0.8;
    const glow = this.scene.add.graphics();
    // Layered circles: large faint → small bright for soft radial falloff
    glow.fillStyle(colorNum, 0.15);
    glow.fillCircle(0, 0, glowR);
    glow.fillStyle(colorNum, 0.3);
    glow.fillCircle(0, 0, glowR * 0.6);
    glow.fillStyle(colorNum, 0.5);
    glow.fillCircle(0, 0, glowR * 0.3);
    glow.setAlpha(0);

    const container = this.scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 * S, [glow, text])
      .setDepth(10)
      .setScale(1.4)
      .setAlpha(0);

    // Punch in
    this.scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.Out",
    });

    // Glow expand + fade
    this.scene.tweens.add({
      targets: glow,
      scaleX: { from: 0.5, to: 1.5 },
      scaleY: { from: 0.5, to: 1.5 },
      alpha: { from: 0.3, to: 0 },
      duration: 400,
      delay: 50,
      ease: "Quad.Out",
      onComplete: () => { glow.destroy(); },
    });

    // Burst sparkles
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkleCount + Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = Phaser.Math.Between(Math.round(40 * S), Math.round(80 * S));
      const dot = this.scene.add.graphics();
      dot.fillStyle(colorNum, 0.8);
      dot.fillCircle(0, 0, Phaser.Math.Between(1, 5) * S);
      dot.setAlpha(0);
      container.add(dot);

      this.scene.tweens.add({
        targets: dot,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: { from: 0.9, to: 0 },
        duration: 500,
        delay: 100,
        ease: "Quad.Out",
        onComplete: () => { dot.destroy(); },
      });
    }

    return container;
  }

  // ---- Preview markers ----

  private spawnPreviewMarkers(words: string[]): void {
    const cardW = 140 * S;
    const cardH = 44 * S;
    const gap = 16 * S;
    const totalW = cardW * words.length + gap * (words.length - 1);
    const startX = (GAME_WIDTH - totalW) / 2;
    const baseY = this.bannerBottomY + 16 * S + cardH / 2;
    const r = 10 * S;

    words.forEach((word, i) => {
      const cx = startX + cardW / 2 + i * (cardW + gap);

      const container = this.scene.add.container(cx, baseY).setDepth(5);

      const bg = this.scene.add.graphics();
      const hx = -cardW / 2;
      const hy = -cardH / 2;

      // A) Glassmorphism background
      // 1) Base dark layer
      bg.fillStyle(0x0a0a1a, 0.55);
      bg.fillRoundedRect(hx, hy, cardW, cardH, r);

      // 2) Top 1/3 highlight (glass reflection)
      bg.fillStyle(0xffffff, 0.06);
      bg.fillRoundedRect(hx, hy, cardW, cardH * 0.35, { tl: r, tr: r, bl: 0, br: 0 });

      // 3) Top edge bright line
      bg.lineStyle(1 * S, 0xffffff, 0.15);
      bg.beginPath();
      bg.arc(hx + r, hy + r, r, Math.PI, Math.PI * 1.5);
      bg.lineTo(hx + cardW - r, hy);
      bg.arc(hx + cardW - r, hy + r, r, Math.PI * 1.5, 0);
      bg.strokePath();

      // B) Neon glow border (3 layers)
      bg.lineStyle(6 * S, COLOR_QUIZ_WORD, 0.08);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);

      bg.lineStyle(3 * S, COLOR_QUIZ_WORD, 0.15);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);

      bg.lineStyle(1.5 * S, 0x5dade2, 0.4);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);

      container.add(bg);

      // Word text
      const text = this.scene.add
        .text(0, 0, word, {
          fontFamily: FONT_FAMILY,
          fontSize: `${14 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2 * S,
        })
        .setOrigin(0.5)
        .setAlpha(0.8);
      container.add(text);

      // Slide-in from top
      container.setAlpha(0);
      container.y = baseY - 20 * S;
      this.scene.tweens.add({
        targets: container,
        y: baseY,
        alpha: 1,
        duration: 450,
        delay: i * 80,
        ease: "Back.Out",
      });

      // Gentle bg pulse
      this.scene.tweens.add({
        targets: bg,
        alpha: { from: 1, to: 0.7 },
        duration: 1500,
        delay: i * 80,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
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
    if (this.rewardKeyHandler) {
      this.scene.game.canvas.ownerDocument.removeEventListener("keydown", this.rewardKeyHandler);
      this.rewardKeyHandler = null;
    }
    this.pendingRewardTypes = [];
    this.rewardTimers.forEach((t) => t.remove());
    this.rewardTimers = [];
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
    this.clearPreviewMarkers();
  }

  private clearResult(): void {
    if (this.resultContainer) {
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
  }
}
