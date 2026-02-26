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
  leaderboard: string;
  settings: string;
  locked: string;
}

const STRINGS: Record<"ko" | "en", MenuStrings> = {
  ko: {
    title: "Quiz Runner",
    startGame: "게임 시작",
    leaderboard: "리더보드",
    settings: "게임 설정",
    locked: "준비 중",
  },
  en: {
    title: "Quiz Runner",
    startGame: "Start Game",
    leaderboard: "Leaderboard",
    settings: "Settings",
    locked: "Coming Soon",
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
    const menuItems: {
      label: string;
      enabled: boolean;
      action?: () => void;
    }[] = [
      {
        label: this.t.startGame,
        enabled: true,
        action: () => this.scene.start("GameScene"),
      },
      {
        label: this.t.leaderboard,
        enabled: true,
        action: () => this.scene.start("LeaderboardScene"),
      },
      {
        label: this.t.settings,
        enabled: true,
        action: () => this.scene.start("SettingsScene"),
      },
    ];

    const btnW = 260 * S;
    const btnH = 44 * S;
    const gap = 12 * S;
    const totalH = menuItems.length * btnH + (menuItems.length - 1) * gap;
    const startY = GAME_HEIGHT * 0.38 + (GAME_HEIGHT * 0.62 - totalH) / 2;
    const centerX = GAME_WIDTH / 2;

    menuItems.forEach((item, i) => {
      const y = startY + i * (btnH + gap);
      const variant: "primary" | "secondary" | "disabled" =
        !item.enabled ? "disabled" : i === 0 ? "primary" : "secondary";
      this.createButton(centerX, y, btnW, btnH, item.label, item.enabled, variant, item.action);
    });
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    enabled: boolean,
    variant: "primary" | "secondary" | "disabled",
    action?: () => void
  ): Phaser.GameObjects.Container {
    const radius = 12 * S;

    const bg = this.add.graphics();
    const hoverBg = this.add.graphics();
    hoverBg.setAlpha(0);

    if (variant === "primary") {
      // Solid indigo background
      bg.fillStyle(0x6366f1, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      // Hover: brighter indigo + glow
      hoverBg.fillStyle(0x818cf8, 1);
      hoverBg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else if (variant === "secondary") {
      // Dark background + indigo border
      bg.fillStyle(0x1a1a2e, 0.8);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(2 * S, 0x6366f1, 0.5);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
      // Hover: brighter border
      hoverBg.fillStyle(0x1a1a2e, 0.9);
      hoverBg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      hoverBg.lineStyle(2 * S, 0x818cf8, 1);
      hoverBg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else {
      // Disabled — dark + grey border
      bg.fillStyle(0x000000, 0.3);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(2 * S, 0xffffff, 0.15);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }

    // Label text
    const fontSize = Math.round(20 * S);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: enabled ? "#ffffff" : "#888888",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [bg, hoverBg, text];

    // Lock icon for disabled buttons
    if (!enabled) {
      const lockText = this.add
        .text(-w / 2 + 18 * S, 0, "🔒", {
          fontSize: `${Math.round(16 * S)}px`,
        })
        .setOrigin(0.5);
      children.push(lockText);

      // "Coming soon" subtitle
      const subText = this.add
        .text(0, h / 2 + 8 * S, this.t.locked, {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(11 * S)}px`,
          color: "#666666",
        })
        .setOrigin(0.5);
      children.push(subText);
    }

    const container = this.add.container(x, y, children);
    container.setSize(w, h);

    if (enabled && action) {
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
