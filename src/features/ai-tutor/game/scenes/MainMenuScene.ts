import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT_FAMILY,
} from "../constants";


// ── i18n ──

interface MenuStrings {
  title: string;
  startGame: string;
}

const STRINGS: Record<"ko" | "en", MenuStrings> = {
  ko: {
    title: "Quiz Runner",
    startGame: "게임 시작",
  },
  en: {
    title: "Quiz Runner",
    startGame: "Start Game",
  },
};

// ── Scene ──

export class MainMenuScene extends Phaser.Scene {
  private t!: MenuStrings;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const loc = this.game.registry.get("locale") as string | undefined;
    this.t = STRINGS[loc === "en" ? "en" : "ko"];

    this.createBackground();
    this.createTitle();
    this.createMenuButtons();
  }

  // ── Background ──

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

  // ── Title ──

  private createTitle(): void {
    const titleY = GAME_HEIGHT * 0.18;

    const title = this.add
      .text(GAME_WIDTH / 2, titleY, this.t.title, {
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


    // Subtle pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ── Menu buttons ──

  private createMenuButtons(): void {
    const btnW = 260 * S;
    const btnH = 44 * S;
    const centerX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT * 0.55;

    this.createButton(centerX, btnY, btnW, btnH, this.t.startGame, true, "primary", () =>
      this.scene.start("GameScene"),
    );
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    _enabled: boolean,
    _variant: "primary",
    action?: () => void
  ): Phaser.GameObjects.Container {
    const radius = 12 * S;

    const bg = this.add.graphics();
    bg.fillStyle(0x6366f1, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    const hoverBg = this.add.graphics();
    hoverBg.fillStyle(0x818cf8, 1);
    hoverBg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    hoverBg.setAlpha(0);

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

    if (action) {
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        this.tweens.add({
          targets: hoverBg,
          alpha: 1,
          duration: 150,
          ease: "Power2",
        });
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
          ease: "Power2",
        });
      });

      container.on("pointerout", () => {
        this.tweens.add({
          targets: hoverBg,
          alpha: 0,
          duration: 150,
          ease: "Power2",
        });
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: "Power2",
        });
      });

      container.on("pointerdown", () => {
        this.tweens.add({
          targets: container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
          ease: "Power2",
          onComplete: () => {
            action();
          },
        });
      });
    }

    return container;
  }

}
