import * as Phaser from "phaser";
import { S, GAME_WIDTH, GAME_HEIGHT, RESTART_DELAY, FONT_FAMILY } from "../constants";

// ── i18n ──

interface GameOverStrings {
  gameOver: string;
  restart: string;
  mainMenu: string;
}

const STRINGS: Record<"ko" | "en", GameOverStrings> = {
  ko: {
    gameOver: "GAME OVER",
    restart: "다시 시작",
    mainMenu: "메인 메뉴",
  },
  en: {
    gameOver: "GAME OVER",
    restart: "Restart",
    mainMenu: "Main Menu",
  },
};

function detectLanguage(): "ko" | "en" {
  const lang = navigator.language || "en";
  return lang.startsWith("ko") ? "ko" : "en";
}

// ── Scene ──

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private correct = 0;
  private wrong = 0;
  private skipped = 0;
  private t!: GameOverStrings;

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
    this.t = STRINGS[detectLanguage()];

    this.createBackground();
    this.createTitle();
  }

  // ── Background (matches MainMenuScene) ──

  private createBackground(): void {
    // Gradient: top 0x0d1117 → bottom 0x0a0a0a
    const gfx = this.add.graphics();
    const steps = 64;
    const sliceH = GAME_HEIGHT / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Phaser.Math.Linear(0x0d, 0x0a, t);
      const g = Phaser.Math.Linear(0x11, 0x0a, t);
      const b = Phaser.Math.Linear(0x17, 0x0a, t);
      const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * sliceH, GAME_WIDTH, sliceH + 1);
    }

    // Bottom indigo glow
    const glow = this.add.graphics();
    glow.fillStyle(0x6366f1, 0.07);
    glow.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 40 * S, GAME_WIDTH * 1.2, 260 * S);

    // Floating indigo particles
    this.createParticles();
  }

  private createParticles(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const px = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const py = Phaser.Math.Between(40, GAME_HEIGHT - 40);
      const size = Phaser.Math.FloatBetween(2, 5) * S;
      const alpha = Phaser.Math.FloatBetween(0.08, 0.22);

      const dot = this.add.circle(px, py, size, 0x818cf8, alpha);

      this.tweens.add({
        targets: dot,
        x: dot.x + Phaser.Math.Between(-60, 60),
        y: dot.y + Phaser.Math.Between(-40, 40),
        alpha: { from: alpha, to: alpha * 0.4 },
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // ── Title (typewriter) ──

  private createTitle(): void {
    const fullText = this.t.gameOver;
    const titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, "", {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(52 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#312E81",
        strokeThickness: 6 * S,
        shadow: {
          offsetX: 3 * S,
          offsetY: 3 * S,
          color: "rgba(0,0,0,0.4)",
          blur: 10 * S,
          fill: true,
        },
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

    // Score count-up (delayed until title finishes)
    const titleDuration = fullText.length * 60 + 200;
    this.createScoreCountUp(titleDuration);
  }

  // ── Score count-up ──

  private createScoreCountUp(titleDuration: number): void {
    const scoreText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, "Score: 0", {
        fontFamily: FONT_FAMILY,
        fontSize: `${28 * S}px`,
        color: "#818CF8",
        fontStyle: "bold",
        shadow: {
          offsetX: 1 * S,
          offsetY: 1 * S,
          color: "rgba(0,0,0,0.5)",
          blur: 6 * S,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0);

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
                this.showButtons();
              },
            });
          }
        },
      });
    });
  }

  // ── Quiz stats ──

  private showQuizStats(): void {
    if (this.correct === 0 && this.wrong === 0 && this.skipped === 0) return;

    const y = GAME_HEIGHT * 0.56;
    const gap = 24 * S;
    const fontSize = `${18 * S}px`;
    const shadowCfg = {
      offsetX: 1 * S,
      offsetY: 1 * S,
      color: "rgba(0,0,0,0.6)",
      blur: 4 * S,
      fill: true,
    };

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
        shadow: shadowCfg,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const t2 = this.add
      .text(startX + w1 + gap + w2 / 2, y, wrongStr, {
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "#e74c3c",
        fontStyle: "bold",
        shadow: shadowCfg,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const t3 = this.add
      .text(startX + w1 + gap + w2 + gap + w3 / 2, y, skippedStr, {
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "#e67e22",
        fontStyle: "bold",
        shadow: shadowCfg,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade in
    this.tweens.add({ targets: [t1, t2, t3], alpha: 1, duration: 400, ease: "Power2" });
  }

  // ── Buttons ──

  private showButtons(): void {
    const btnW = 220 * S;
    const btnH = 44 * S;
    const gap = 16 * S;
    const centerX = GAME_WIDTH / 2;
    const baseY = GAME_HEIGHT * 0.75;

    const restartBtn = this.createButton(
      centerX,
      baseY,
      btnW,
      btnH,
      this.t.restart,
      "primary",
      () => this.scene.start("GameScene"),
    );
    restartBtn.setAlpha(0);

    const menuBtn = this.createButton(
      centerX,
      baseY + btnH + gap,
      btnW,
      btnH,
      this.t.mainMenu,
      "secondary",
      () => this.scene.start("MainMenuScene"),
    );
    menuBtn.setAlpha(0);

    // Fade in buttons
    this.tweens.add({
      targets: [restartBtn, menuBtn],
      alpha: 1,
      duration: 400,
      ease: "Power2",
    });

    // Keyboard shortcuts — mapped to restart
    this.time.delayedCall(Math.max(RESTART_DELAY, 200), () => {
      this.input.keyboard?.on("keydown-SPACE", () => this.scene.start("GameScene"), this);
      this.input.keyboard?.on("keydown-UP", () => this.scene.start("GameScene"), this);
    });
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    variant: "primary" | "secondary",
    action: () => void,
  ): Phaser.GameObjects.Container {
    const radius = 12 * S;

    const bg = this.add.graphics();
    const hoverBg = this.add.graphics();
    hoverBg.setAlpha(0);

    if (variant === "primary") {
      bg.fillStyle(0x6366f1, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      hoverBg.fillStyle(0x818cf8, 1);
      hoverBg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else {
      bg.fillStyle(0x1a1a2e, 0.8);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(2 * S, 0x6366f1, 0.5);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
      hoverBg.fillStyle(0x1a1a2e, 0.9);
      hoverBg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      hoverBg.lineStyle(2 * S, 0x818cf8, 1);
      hoverBg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }

    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(20 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, hoverBg, text]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      this.tweens.add({ targets: hoverBg, alpha: 1, duration: 150, ease: "Power2" });
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: "Power2" });
    });

    container.on("pointerout", () => {
      this.tweens.add({ targets: hoverBg, alpha: 0, duration: 150, ease: "Power2" });
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100, ease: "Power2" });
    });

    container.on("pointerdown", () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        ease: "Power2",
        onComplete: () => action(),
      });
    });

    return container;
  }
}
