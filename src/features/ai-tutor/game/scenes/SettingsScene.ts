import * as Phaser from "phaser";
import { S, GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY } from "../constants";

// ── i18n ──

interface SettingsStrings {
  title: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  save: string;
  saved: string;
  back: string;
  loading: string;
  error: string;
}

const STRINGS: Record<"ko" | "en", SettingsStrings> = {
  ko: {
    title: "닉네임 변경",
    nicknameLabel: "닉네임",
    nicknamePlaceholder: "닉네임 입력 (최대 20자)",
    save: "저장",
    saved: "저장 완료!",
    back: "뒤로가기",
    loading: "로딩 중...",
    error: "저장 실패",
  },
  en: {
    title: "Nickname",
    nicknameLabel: "Nickname",
    nicknamePlaceholder: "Enter nickname (max 20 chars)",
    save: "Save",
    saved: "Saved!",
    back: "Back",
    loading: "Loading...",
    error: "Save failed",
  },
};

// ── Scene ──

export class SettingsScene extends Phaser.Scene {
  private t!: SettingsStrings;
  private nicknameInput: HTMLInputElement | null = null;
  private domElement: Phaser.GameObjects.DOMElement | null = null;

  constructor() {
    super({ key: "SettingsScene" });
  }

  create(): void {
    const loc = this.game.registry.get("locale") as string | undefined;
    this.t = STRINGS[loc === "en" ? "en" : "ko"];

    this.createBackground();
    this.createTitle();
    this.createNicknameSection();
    this.createBackButton();
    this.loadNickname();
  }

  // ── Background ──

  private createBackground(): void {
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

    const glow = this.add.graphics();
    glow.fillStyle(0x6366f1, 0.07);
    glow.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 40 * S, GAME_WIDTH * 1.2, 260 * S);
  }

  // ── Title ──

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 50 * S, this.t.title, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(36 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#312E81",
        strokeThickness: 4 * S,
      })
      .setOrigin(0.5);
  }

  // ── Nickname section ──

  private createNicknameSection(): void {
    const centerX = GAME_WIDTH / 2;
    const sectionY = GAME_HEIGHT * 0.35;

    // Label
    this.add
      .text(centerX, sectionY, this.t.nicknameLabel, {
        fontFamily: FONT_FAMILY,
        fontSize: `${18 * S}px`,
        color: "#818CF8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // HTML input element
    const inputW = 300 * S;
    const inputH = 40 * S;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.placeholder = this.t.nicknamePlaceholder;
    input.style.cssText = `
      width: ${inputW}px;
      height: ${inputH}px;
      font-size: ${16 * S}px;
      font-family: ${FONT_FAMILY};
      text-align: center;
      border: 2px solid #6366f1;
      border-radius: ${8 * S}px;
      background: rgba(26, 26, 46, 0.9);
      color: #ffffff;
      outline: none;
      padding: 0 ${12 * S}px;
    `;

    this.nicknameInput = input;
    this.domElement = this.add.dom(centerX, sectionY + 50 * S, input);

    // Save button
    const saveBtnY = sectionY + 110 * S;
    this.createSaveButton(centerX, saveBtnY);
  }

  // ── Save button ──

  private createSaveButton(x: number, y: number): void {
    const btnW = 160 * S;
    const btnH = 40 * S;
    const radius = 10 * S;

    const bg = this.add.graphics();
    bg.fillStyle(0x6366f1, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

    const hoverBg = this.add.graphics();
    hoverBg.fillStyle(0x818cf8, 1);
    hoverBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    hoverBg.setAlpha(0);

    const text = this.add
      .text(0, 0, this.t.save, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(18 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, hoverBg, text]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    // Status text below button
    const statusText = this.add
      .text(x, y + 36 * S, "", {
        fontFamily: FONT_FAMILY,
        fontSize: `${13 * S}px`,
        color: "#2ecc71",
      })
      .setOrigin(0.5);

    container.on("pointerover", () => {
      this.tweens.add({ targets: hoverBg, alpha: 1, duration: 150 });
    });
    container.on("pointerout", () => {
      this.tweens.add({ targets: hoverBg, alpha: 0, duration: 150 });
    });
    container.on("pointerdown", () => {
      this.saveNickname(statusText);
    });
  }

  // ── Back button ──

  private createBackButton(): void {
    const btnW = 160 * S;
    const btnH = 36 * S;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 50 * S;
    const radius = 10 * S;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.8);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    bg.lineStyle(2 * S, 0x6366f1, 0.5);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

    const hoverBg = this.add.graphics();
    hoverBg.fillStyle(0x1a1a2e, 0.9);
    hoverBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    hoverBg.lineStyle(2 * S, 0x818cf8, 1);
    hoverBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    hoverBg.setAlpha(0);

    const text = this.add
      .text(0, 0, this.t.back, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(16 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, hoverBg, text]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      this.tweens.add({ targets: hoverBg, alpha: 1, duration: 150 });
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    container.on("pointerout", () => {
      this.tweens.add({ targets: hoverBg, alpha: 0, duration: 150 });
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    container.on("pointerdown", () => {
      this.cleanupDOM();
      this.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95,
        duration: 50, yoyo: true,
        onComplete: () => this.scene.start("MainMenuScene"),
      });
    });
  }

  // ── Load / Save ──

  private async loadNickname(): Promise<void> {
    try {
      const { gameScoreService } = await import("../../services/gameScoreService");
      const { data } = await gameScoreService.getNickname();
      if (data?.nickname && this.nicknameInput) {
        this.nicknameInput.value = data.nickname;
        // Also store in registry for other scenes
        this.game.registry.set("nickname", data.nickname);
      }
    } catch {
      // Ignore load errors
    }
  }

  private async saveNickname(statusText: Phaser.GameObjects.Text): Promise<void> {
    const nickname = this.nicknameInput?.value?.trim();
    if (!nickname) return;

    try {
      const { gameScoreService } = await import("../../services/gameScoreService");
      const { data, error } = await gameScoreService.setNickname(nickname);
      if (data) {
        statusText.setText(this.t.saved);
        statusText.setColor("#2ecc71");
        this.game.registry.set("nickname", nickname);
      } else {
        statusText.setText(error?.message || this.t.error);
        statusText.setColor("#e74c3c");
      }
    } catch {
      statusText.setText(this.t.error);
      statusText.setColor("#e74c3c");
    }

    // Clear status after 2 seconds
    this.time.delayedCall(2000, () => {
      statusText.setText("");
    });
  }

  private cleanupDOM(): void {
    if (this.domElement) {
      this.domElement.destroy();
      this.domElement = null;
      this.nicknameInput = null;
    }
  }

  shutdown(): void {
    this.cleanupDOM();
  }
}
