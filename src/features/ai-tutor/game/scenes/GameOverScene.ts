import * as Phaser from "phaser";
import { S, GAME_WIDTH, GAME_HEIGHT, RESTART_DELAY, FONT_FAMILY } from "../constants";

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private correct = 0;
  private wrong = 0;
  private skipped = 0;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: { score: number; correct: number; wrong: number; skipped: number }): void {
    this.score = data.score ?? 0;
    this.correct = data.correct ?? 0;
    this.wrong = data.wrong ?? 0;
    this.skipped = data.skipped ?? 0;
  }

  create(): void {
    // Semi-transparent overlay
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0.7
      )
      .setOrigin(0.5);

    // Typewriter "GAME OVER"
    const fullText = "GAME OVER";
    const titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, "", {
        fontFamily: FONT_FAMILY,
        fontSize: `${48 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { offsetX: 2 * S, offsetY: 2 * S, color: "#000000", blur: 6 * S, fill: true },
      })
      .setOrigin(0.5);

    // Typewriter effect
    let charIndex = 0;
    this.time.addEvent({
      delay: 60,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        titleText.setText(fullText.substring(0, charIndex));
      },
    });

    // Score count-up
    const scoreText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, "Score: 0", {
        fontFamily: FONT_FAMILY,
        fontSize: `${28 * S}px`,
        color: "#f0c040",
        shadow: { offsetX: 1 * S, offsetY: 1 * S, color: "#000000", blur: 4 * S, fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Delay score display until title finishes
    const titleDuration = fullText.length * 60 + 200;
    this.time.delayedCall(titleDuration, () => {
      scoreText.setAlpha(1);
      const countDuration = Math.min(1000, this.score * 30);
      let elapsed = 0;
      this.time.addEvent({
        delay: 16,
        repeat: Math.ceil(countDuration / 16),
        callback: () => {
          elapsed += 16;
          const t = Math.min(elapsed / countDuration, 1);
          const displayScore = Math.round(this.score * t);
          scoreText.setText(`Score: ${displayScore}`);
          if (t >= 1) {
            // Final bounce
            this.tweens.add({
              targets: scoreText,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 100,
              yoyo: true,
              ease: "Back.Out",
              onComplete: () => {
                this.showQuizStats();
              },
            });
          }
        },
      });
    });

    // Blinking restart text
    const restartText = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT * 0.7,
        "Press SPACE or Click to Restart",
        {
          fontFamily: FONT_FAMILY,
          fontSize: `${18 * S}px`,
          color: "#cccccc",
        }
      )
      .setOrigin(0.5)
      .setAlpha(0);

    // Delay before allowing restart
    this.time.delayedCall(Math.max(RESTART_DELAY, titleDuration + 500), () => {
      this.tweens.add({
        targets: restartText,
        alpha: { from: 0, to: 1 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        hold: 600,
      });

      this.input.keyboard?.on("keydown-SPACE", this.restart, this);
      this.input.keyboard?.on("keydown-UP", this.restart, this);
      this.input.on("pointerdown", this.restart, this);
    });
  }

  private showQuizStats(): void {
    if (this.correct === 0 && this.wrong === 0 && this.skipped === 0) return;

    const y = GAME_HEIGHT * 0.62;
    const gap = 24 * S;
    const fontSize = `${18 * S}px`;

    const correctStr = `✓ ${this.correct}`;
    const wrongStr = `✗ ${this.wrong}`;
    const skippedStr = `− ${this.skipped}`;

    // Measure widths to center all three
    const tempText = this.add.text(0, 0, correctStr, { fontFamily: FONT_FAMILY, fontSize }).setVisible(false);
    const w1 = tempText.width;
    tempText.setText(wrongStr);
    const w2 = tempText.width;
    tempText.setText(skippedStr);
    const w3 = tempText.width;
    tempText.destroy();

    const totalW = w1 + w2 + w3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2;

    const t1 = this.add
      .text(startX + w1 / 2, y, correctStr, {
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "#2ecc71",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const t2 = this.add
      .text(startX + w1 + gap + w2 / 2, y, wrongStr, {
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "#e74c3c",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const t3 = this.add
      .text(startX + w1 + gap + w2 + gap + w3 / 2, y, skippedStr, {
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "#e67e22",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade in
    this.tweens.add({ targets: [t1, t2, t3], alpha: 1, duration: 400, ease: "Power2" });
  }

  private restart(): void {
    this.scene.start("GameScene");
  }
}
