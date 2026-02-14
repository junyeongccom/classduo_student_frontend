import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  FONT_FAMILY,
} from "../constants";

// ── i18n ──

interface MenuStrings {
  title: string;
  startGame: string;
  howToPlay: string;
  dashboard: string;
  settings: string;
  locked: string;
  howToPlayTitle: string;
  controls: string;
  controlJump: string;
  controlSlide: string;
  rules: string;
  ruleCoins: string;
  ruleQuiz: string;
  ruleHp: string;
  close: string;
}

const STRINGS: Record<"ko" | "en", MenuStrings> = {
  ko: {
    title: "JUMP ACTION",
    startGame: "게임 시작",
    howToPlay: "게임 설명",
    dashboard: "대시보드",
    settings: "게임 설정",
    locked: "준비 중",
    howToPlayTitle: "게임 설명",
    controls: "조작법",
    controlJump: "Space / 탭  →  점프 (더블 점프 가능)",
    controlSlide: "↓ 키  →  슬라이드",
    rules: "규칙",
    ruleCoins: "코인을 모아 점수를 올리세요",
    ruleQuiz: "퀴즈 아이템을 모으면 보상/패널티 획득",
    ruleHp: "HP가 0이 되거나 낭떠러지에 빠지면 게임 오버",
    close: "닫기",
  },
  en: {
    title: "JUMP ACTION",
    startGame: "Start Game",
    howToPlay: "How to Play",
    dashboard: "Dashboard",
    settings: "Settings",
    locked: "Coming Soon",
    howToPlayTitle: "How to Play",
    controls: "Controls",
    controlJump: "Space / Tap  →  Jump (double jump available)",
    controlSlide: "↓ Key  →  Slide",
    rules: "Rules",
    ruleCoins: "Collect coins to increase your score",
    ruleQuiz: "Collect quiz items for rewards or penalties",
    ruleHp: "Game over when HP reaches 0 or you fall off",
    close: "Close",
  },
};

function detectLanguage(): "ko" | "en" {
  const lang = navigator.language || "en";
  return lang.startsWith("ko") ? "ko" : "en";
}

// ── Scene ──

export class MainMenuScene extends Phaser.Scene {
  private t!: MenuStrings;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    this.t = STRINGS[detectLanguage()];

    this.createBackground();
    this.createCharacter();
    this.createTitle();
    this.createMenuButtons();
  }

  // ── Background ──

  private createBackground(): void {
    // Sky gradient
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "sky_gradient").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Mountain layers (static, no parallax)
    const mountainY = GROUND_Y - GROUND_HEIGHT / 2;
    const mountainH = 160 * S;
    this.add
      .image(GAME_WIDTH / 2, mountainY - mountainH / 2 + 40 * S, "mountains_far")
      .setDisplaySize(GAME_WIDTH, mountainH)
      .setAlpha(0.7);
    this.add
      .image(GAME_WIDTH / 2, mountainY - mountainH / 2 + 60 * S, "mountains_mid")
      .setDisplaySize(GAME_WIDTH, mountainH)
      .setAlpha(0.8);
    this.add
      .image(GAME_WIDTH / 2, mountainY - mountainH / 2 + 80 * S, "mountains_near")
      .setDisplaySize(GAME_WIDTH, mountainH)
      .setAlpha(0.9);

    // Ground strip
    this.add
      .rectangle(GAME_WIDTH / 2, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT, 0x6b8e23)
      .setOrigin(0.5);
    this.add
      .rectangle(GAME_WIDTH / 2, GROUND_Y + GROUND_HEIGHT / 2 - 3 * S, GAME_WIDTH, GROUND_HEIGHT - 6 * S, 0x8b7355)
      .setOrigin(0.5);
  }

  // ── Character ──

  private createCharacter(): void {
    const charX = GAME_WIDTH * 0.18;
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const charY = groundTop - 28 * S;

    const character = this.add
      .image(charX, charY, "player_run0")
      .setOrigin(0.5, 1)
      .setScale(2.5);

    // Gentle bob animation
    this.tweens.add({
      targets: character,
      y: charY - 6 * S,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // ── Title ──

  private createTitle(): void {
    const titleY = GAME_HEIGHT * 0.15;

    const title = this.add
      .text(GAME_WIDTH / 2, titleY, this.t.title, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(52 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#2c3e50",
        strokeThickness: 6 * S,
        shadow: {
          offsetX: 3 * S,
          offsetY: 3 * S,
          color: "rgba(0,0,0,0.3)",
          blur: 8 * S,
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
        label: this.t.howToPlay,
        enabled: true,
        action: () => this.showHowToPlay(),
      },
      {
        label: this.t.dashboard,
        enabled: false,
      },
      {
        label: this.t.settings,
        enabled: false,
      },
    ];

    const btnW = 260 * S;
    const btnH = 44 * S;
    const gap = 12 * S;
    const startY = GAME_HEIGHT * 0.38;
    const centerX = GAME_WIDTH * 0.62;

    menuItems.forEach((item, i) => {
      const y = startY + i * (btnH + gap);
      this.createButton(centerX, y, btnW, btnH, item.label, item.enabled, item.action);
    });
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    enabled: boolean,
    action?: () => void
  ): Phaser.GameObjects.Container {
    const radius = 12 * S;

    // Button background — glassmorphism style
    const bg = this.add.graphics();
    if (enabled) {
      // Fill with semi-transparent white
      bg.fillStyle(0xffffff, 0.2);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      // Border
      bg.lineStyle(2 * S, 0xffffff, 0.5);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else {
      // Disabled — darker, more transparent
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

    const children: Phaser.GameObjects.GameObject[] = [bg, text];

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
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
          ease: "Power2",
        });
      });

      container.on("pointerout", () => {
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

  // ── How to Play overlay ──

  private showHowToPlay(): void {
    const overlay = this.add.container(0, 0).setDepth(100);

    // Dim backdrop
    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    overlay.add(backdrop);

    // Panel
    const panelW = 560 * S;
    const panelH = 340 * S;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelR = 16 * S;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);
    panelBg.lineStyle(2 * S, 0xffffff, 0.3);
    panelBg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);
    overlay.add(panelBg);

    // Title
    const titleFontSize = Math.round(28 * S);
    overlay.add(
      this.add
        .text(panelX, panelY - panelH / 2 + 30 * S, this.t.howToPlayTitle, {
          fontFamily: FONT_FAMILY,
          fontSize: `${titleFontSize}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1 * S, 0xffffff, 0.2);
    divider.lineBetween(
      panelX - panelW / 2 + 30 * S,
      panelY - panelH / 2 + 55 * S,
      panelX + panelW / 2 - 30 * S,
      panelY - panelH / 2 + 55 * S
    );
    overlay.add(divider);

    // Content
    const contentX = panelX - panelW / 2 + 40 * S;
    const bodyFontSize = Math.round(15 * S);
    const headFontSize = Math.round(18 * S);
    let cy = panelY - panelH / 2 + 80 * S;
    const lineGap = 24 * S;

    // Controls section
    overlay.add(
      this.add
        .text(contentX, cy, `▸ ${this.t.controls}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${headFontSize}px`,
          color: "#f0c040",
          fontStyle: "bold",
        })
        .setOrigin(0)
    );
    cy += lineGap + 4 * S;

    overlay.add(
      this.add
        .text(contentX + 12 * S, cy, this.t.controlJump, {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodyFontSize}px`,
          color: "#dddddd",
        })
        .setOrigin(0)
    );
    cy += lineGap;

    overlay.add(
      this.add
        .text(contentX + 12 * S, cy, this.t.controlSlide, {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodyFontSize}px`,
          color: "#dddddd",
        })
        .setOrigin(0)
    );
    cy += lineGap + 12 * S;

    // Rules section
    overlay.add(
      this.add
        .text(contentX, cy, `▸ ${this.t.rules}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${headFontSize}px`,
          color: "#f0c040",
          fontStyle: "bold",
        })
        .setOrigin(0)
    );
    cy += lineGap + 4 * S;

    const rules = [this.t.ruleCoins, this.t.ruleQuiz, this.t.ruleHp];
    rules.forEach((rule) => {
      overlay.add(
        this.add
          .text(contentX + 12 * S, cy, `• ${rule}`, {
            fontFamily: FONT_FAMILY,
            fontSize: `${bodyFontSize}px`,
            color: "#dddddd",
          })
          .setOrigin(0)
      );
      cy += lineGap;
    });

    // Close button
    const closeBtnW = 120 * S;
    const closeBtnH = 36 * S;
    const closeBtnY = panelY + panelH / 2 - 30 * S;

    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xffffff, 0.15);
    closeBg.fillRoundedRect(panelX - closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8 * S);
    closeBg.lineStyle(2 * S, 0xffffff, 0.3);
    closeBg.strokeRoundedRect(panelX - closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8 * S);
    overlay.add(closeBg);

    const closeText = this.add
      .text(panelX, closeBtnY, this.t.close, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(16 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    overlay.add(closeText);

    const closeHitArea = this.add
      .rectangle(panelX, closeBtnY, closeBtnW, closeBtnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    overlay.add(closeHitArea);

    closeHitArea.on("pointerdown", () => {
      overlay.destroy();
    });

    // Also close on backdrop click
    backdrop.on("pointerdown", () => {
      overlay.destroy();
    });

    // Fade in
    overlay.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
  }
}
