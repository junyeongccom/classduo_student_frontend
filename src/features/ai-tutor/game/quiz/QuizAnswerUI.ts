import * as Phaser from "phaser";
import { QuizQuestion } from "./quizTypes";
import { drawGlassPanel, lighten } from "../ui/glassPanel";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  SCROLL_COLORS,
  FONT_FAMILY,
  QUIZ_ANSWER_TIMEOUT_MS,
} from "../constants";

export class QuizAnswerUI {
  private scene: Phaser.Scene;
  private locale: "ko" | "en";

  private uiElements: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private answered = false;

  onAnswer: ((isCorrect: boolean) => void) | null = null;

  constructor(scene: Phaser.Scene, locale: "ko" | "en") {
    this.scene = scene;
    this.locale = locale;
  }

  show(question: QuizQuestion): void {
    this.answered = false;
    const allAnswers = Phaser.Utils.Array.Shuffle([
      question.correctAnswer,
      ...question.wrongAnswers,
    ]) as string[];

    // Dark overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(20);
    this.uiElements.push(overlay);

    // Question panel (glass panel, slide in from top)
    const questionPadX = 28 * S;
    const questionPadY = 16 * S;
    const questionR = 16 * S;
    const maxTextW = GAME_WIDTH * 0.7;
    const baseFontSize = 18 * S;
    const minFontSize = 12 * S;

    let fontSize = baseFontSize;
    const questionText = this.scene.add
      .text(0, 0, question.text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2 * S,
        wordWrap: { width: maxTextW, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(0.5);

    const maxBoxH = 100 * S;
    while (questionText.height + questionPadY * 2 > maxBoxH && fontSize > minFontSize) {
      fontSize -= 1 * S;
      questionText.setFontSize(fontSize);
    }

    const boxW = Math.max(questionText.width + questionPadX * 2, 300 * S);
    const boxH = Math.min(questionText.height + questionPadY * 2, maxBoxH);

    const questionBg = this.scene.add.graphics();
    drawGlassPanel(questionBg, {
      x: -boxW / 2,
      y: -boxH / 2,
      width: boxW,
      height: boxH,
      radius: questionR,
    });

    const questionY = GAME_HEIGHT * 0.25;
    const questionContainer = this.scene.add
      .container(GAME_WIDTH / 2, -boxH, [questionBg, questionText])
      .setDepth(21);

    // Slide in from top
    this.scene.tweens.add({
      targets: questionContainer,
      y: questionY,
      duration: 450,
      ease: "Back.Out",
    });

    this.uiElements.push(questionContainer);

    // Answer cards (3 cards, slide in from bottom with stagger)
    const cardW = 200 * S;
    const cardH = 70 * S;
    const gap = 20 * S;
    const totalW = cardW * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardY = GAME_HEIGHT * 0.65;

    allAnswers.forEach((answer, i) => {
      const cx = startX + cardW / 2 + i * (cardW + gap);
      const scrollColor = SCROLL_COLORS[i % SCROLL_COLORS.length];
      const isCorrect = answer === question.correctAnswer;

      const container = this.scene.add
        .container(cx, GAME_HEIGHT + cardH)
        .setDepth(21);

      // Entrance animation + idle float
      this.scene.tweens.add({
        targets: container,
        y: cardY,
        duration: 400,
        delay: i * 100,
        ease: "Back.Out",
        onComplete: () => {
          this.scene.tweens.add({
            targets: container,
            y: cardY - 4 * S,
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

      // Hover glow
      const glow = this.scene.add.graphics();
      const glowPad = 8 * S;
      glow.fillStyle(scrollColor.main, 1);
      glow.fillRoundedRect(
        hx - glowPad, hy - glowPad,
        cardW + glowPad * 2, cardH + glowPad * 2,
        r + glowPad,
      );
      glow.setAlpha(0);
      container.add(glow);

      // Background
      const bg = this.scene.add.graphics();
      drawGlassPanel(bg, {
        x: hx,
        y: hy,
        width: cardW,
        height: cardH,
        radius: r,
        glowColor: scrollColor.main,
        glowColorDark: scrollColor.dark,
      });
      container.add(bg);

      // Shimmer dot
      const shimmerDot = this.scene.add.graphics();
      const shimmerColor = lighten(scrollColor.main, 60);
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

      // Answer text (shrink to fit)
      const maxAnswerFont = 16 * S;
      const minAnswerFont = 10 * S;
      const padX = 12 * S;
      let answerFontSize = maxAnswerFont;
      const answerText = this.scene.add
        .text(0, 0, answer, {
          fontFamily: FONT_FAMILY,
          fontSize: `${answerFontSize}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 1.5 * S,
        })
        .setOrigin(0.5);

      while (answerText.width > cardW - padX * 2 && answerFontSize > minAnswerFont) {
        answerFontSize -= 1 * S;
        answerText.setFontSize(answerFontSize);
      }
      container.add(answerText);

      // Sparkle particles
      const sparkleTimer = this.scene.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          const px = Phaser.Math.Between(Math.round(hx + 6 * S), Math.round(hx + cardW - 6 * S));
          const py = Phaser.Math.Between(Math.round(hy + 6 * S), Math.round(hy + cardH - 6 * S));
          const dot = this.scene.add.graphics();
          dot.fillStyle(scrollColor.main, 0.7);
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
      this.timers.push(sparkleTimer);

      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        this.scene.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        this.scene.tweens.add({ targets: glow, alpha: 0.25, duration: 150 });
      });
      container.on("pointerout", () => {
        this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
        this.scene.tweens.add({ targets: glow, alpha: 0, duration: 150 });
      });
      container.on("pointerdown", () => {
        this.handleAnswer(isCorrect);
      });

      this.uiElements.push(container);
    });

    // Keyboard shortcut
    const answerCorrectness = allAnswers.map((a) => a === question.correctAnswer);
    this.keyHandler = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        ArrowLeft: 0,
        ArrowDown: 1,
        ArrowRight: 2,
      };
      const idx = keyMap[e.key];
      if (idx !== undefined && idx < answerCorrectness.length) {
        this.handleAnswer(answerCorrectness[idx]);
      }
    };
    this.scene.game.canvas.ownerDocument.addEventListener("keydown", this.keyHandler);

    // Countdown timer — yellow border shrinking along question box perimeter
    const borderW = 3 * S;
    const totalMs = QUIZ_ANSWER_TIMEOUT_MS;
    const startTime = Date.now();
    const bx = -boxW / 2;
    const by = -boxH / 2;
    const perimeter = (boxW + boxH) * 2;

    const timerBorder = this.scene.add.graphics();
    timerBorder.setDepth(1); // above questionBg, below questionText
    questionContainer.add(timerBorder);

    const drawBorderProgress = (g: Phaser.GameObjects.Graphics, ratio: number, color: number) => {
      g.clear();
      if (ratio <= 0) return;
      g.lineStyle(borderW, color, 1);
      g.beginPath();

      // Trace clockwise from top-left: top → right → bottom → left
      const totalLen = perimeter * ratio;
      let remaining = totalLen;

      // Top edge (left to right)
      const topLen = Math.min(remaining, boxW);
      g.moveTo(bx, by);
      g.lineTo(bx + topLen, by);
      remaining -= topLen;
      if (remaining <= 0) { g.strokePath(); return; }

      // Right edge (top to bottom)
      const rightLen = Math.min(remaining, boxH);
      g.lineTo(bx + boxW, by + rightLen);
      remaining -= rightLen;
      if (remaining <= 0) { g.strokePath(); return; }

      // Bottom edge (right to left)
      const bottomLen = Math.min(remaining, boxW);
      g.lineTo(bx + boxW - bottomLen, by + boxH);
      remaining -= bottomLen;
      if (remaining <= 0) { g.strokePath(); return; }

      // Left edge (bottom to top)
      const leftLen = Math.min(remaining, boxH);
      g.lineTo(bx, by + boxH - leftLen);

      g.strokePath();
    };

    // Draw initial full border
    drawBorderProgress(timerBorder, 1, 0xf1c40f);

    const timerEvent = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, totalMs - elapsed);
        const ratio = remaining / totalMs;

        // Color: yellow → orange → red
        let color: number;
        if (ratio > 0.5) color = 0xf1c40f;
        else if (ratio > 0.2) color = 0xf39c12;
        else color = 0xe74c3c;

        drawBorderProgress(timerBorder, ratio, color);

        if (remaining <= 0) {
          timerEvent.remove();
          this.handleAnswer(false);
        }
      },
    });
    this.timers.push(timerEvent);
  }

  private handleAnswer(isCorrect: boolean): void {
    if (this.answered) return;
    this.answered = true;
    this.clearUI();
    this.onAnswer?.(isCorrect);
  }

  cleanup(): void {
    this.clearUI();
  }

  private clearUI(): void {
    if (this.keyHandler) {
      this.scene.game.canvas.ownerDocument.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    this.uiElements.forEach((obj) => obj.destroy());
    this.uiElements = [];
  }
}
