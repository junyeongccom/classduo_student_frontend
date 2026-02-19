import * as Phaser from "phaser";
import { drawGlassPanel } from "../ui/glassPanel";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  SCROLL_COLORS,
  FONT_FAMILY,
} from "../constants";

export class QuizPanelUI {
  private scene: Phaser.Scene;
  private locale: "ko" | "en";

  private bannerContainer: Phaser.GameObjects.Container | null = null;
  private resultContainer: Phaser.GameObjects.Container | null = null;
  private previewMarkers: Phaser.GameObjects.GameObject[] = [];
  private bannerBottomY = 0;

  constructor(scene: Phaser.Scene, locale: "ko" | "en") {
    this.scene = scene;
    this.locale = locale;
  }

  // ---- Banner ----

  showBanner(label: string): number {
    const maxTextW = GAME_WIDTH * 0.65;
    const padX = 28 * S;
    const padY = 16 * S;
    const r = 16 * S;
    const maxBoxH = 100 * S;
    const baseFontSize = 20 * S;
    const minFontSize = 12 * S;

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
    drawGlassPanel(bg, { x: hx, y: hy, width: boxW, height: boxH, radius: r });

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

    // Gentle bg pulse
    this.scene.tweens.add({
      targets: bg,
      alpha: { from: 1, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.bannerContainer = container;
    return this.bannerBottomY;
  }

  // ---- Preview markers ----

  showPreviewMarkers(
    words: string[],
    colorIndices: number[],
    bannerBottomY: number,
  ): void {
    const cardW = 140 * S;
    const cardH = 44 * S;
    const gap = 16 * S;
    const totalW = cardW * words.length + gap * (words.length - 1);
    const startX = (GAME_WIDTH - totalW) / 2;
    const baseY = bannerBottomY + 16 * S + cardH / 2;
    const r = 10 * S;

    words.forEach((word, i) => {
      const cx = startX + cardW / 2 + i * (cardW + gap);
      const scrollColor = SCROLL_COLORS[colorIndices[i]];

      const container = this.scene.add.container(cx, baseY).setDepth(5);

      const bg = this.scene.add.graphics();
      const hx = -cardW / 2;
      const hy = -cardH / 2;

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

      // Word text — shrink font if it overflows card
      const maxFontSize = 14 * S;
      const minFontSize = 8 * S;
      const padX = 8 * S;
      let fontSize = maxFontSize;
      const text = this.scene.add
        .text(0, 0, word, {
          fontFamily: FONT_FAMILY,
          fontSize: `${fontSize}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2 * S,
        })
        .setOrigin(0.5)
        .setAlpha(0.8);

      while (text.width > cardW - padX * 2 && fontSize > minFontSize) {
        fontSize -= 1 * S;
        text.setFontSize(fontSize);
      }
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

  // ---- Result popup ----

  showResult(label: string, color: string, correctAnswer?: string): void {
    const colorNum = parseInt(color.replace("#", ""), 16);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${26 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: color,
          blur: 8 * S,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    const children: Phaser.GameObjects.GameObject[] = [];

    // Glow pulse — radial gradient circle behind text
    const glowR = Math.max(text.width, text.height) * 0.8;
    const glow = this.scene.add.graphics();
    glow.fillStyle(colorNum, 0.15);
    glow.fillCircle(0, 0, glowR);
    glow.fillStyle(colorNum, 0.3);
    glow.fillCircle(0, 0, glowR * 0.6);
    glow.fillStyle(colorNum, 0.5);
    glow.fillCircle(0, 0, glowR * 0.3);
    glow.setAlpha(0);

    children.push(glow, text);

    // Show correct answer below the effect text when wrong
    if (correctAnswer) {
      const answerLabel =
        this.locale === "en"
          ? `Answer: ${correctAnswer}`
          : `정답: ${correctAnswer}`;
      const answerText = this.scene.add
        .text(0, 24 * S, answerLabel, {
          fontFamily: FONT_FAMILY,
          fontSize: `${18 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: color,
            blur: 8 * S,
            stroke: true,
            fill: true,
          },
        })
        .setOrigin(0.5)
        .setAlpha(0.7);
      children.push(answerText);
    }

    const container = this.scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 * S, children)
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
      onComplete: () => {
        glow.destroy();
      },
    });

    // Burst sparkles
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / sparkleCount +
        Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = Phaser.Math.Between(
        Math.round(40 * S),
        Math.round(80 * S),
      );
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
        onComplete: () => {
          dot.destroy();
        },
      });
    }

    this.resultContainer = container;
  }

  // ---- Cleanup ----

  clearBanner(): void {
    if (this.bannerContainer) {
      this.bannerContainer.destroy();
      this.bannerContainer = null;
    }
    this.clearPreviewMarkers();
  }

  clearResult(): void {
    if (this.resultContainer) {
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
  }

  private clearPreviewMarkers(): void {
    this.previewMarkers.forEach((m) => m.destroy());
    this.previewMarkers = [];
  }

  cleanup(): void {
    this.clearBanner();
    this.clearResult();
  }
}
