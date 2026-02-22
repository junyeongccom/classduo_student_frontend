import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT_FAMILY,
} from "../constants";

export class QuizPanelUI {
  private scene: Phaser.Scene;
  private locale: "ko" | "en";

  private resultContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, locale: "ko" | "en") {
    this.scene = scene;
    this.locale = locale;
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

  clearResult(): void {
    if (this.resultContainer) {
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
  }

  cleanup(): void {
    this.clearResult();
  }
}
