import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  FONT_FAMILY,
} from "../constants";

export interface HowToPlayStrings {
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

export class HowToPlayModal {
  private scene: Phaser.Scene;
  private strings: HowToPlayStrings;

  constructor(scene: Phaser.Scene, strings: HowToPlayStrings) {
    this.scene = scene;
    this.strings = strings;
  }

  show(): void {
    const t = this.strings;
    const overlay = this.scene.add.container(0, 0).setDepth(100);

    // Dim backdrop
    const backdrop = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    overlay.add(backdrop);

    // Panel
    const panelW = 560 * S;
    const panelH = 340 * S;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelR = 16 * S;

    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x0d1117, 0.97);
    panelBg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);
    panelBg.lineStyle(2 * S, 0x6366f1, 0.3);
    panelBg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);
    overlay.add(panelBg);

    // Title
    const titleFontSize = Math.round(28 * S);
    overlay.add(
      this.scene.add
        .text(panelX, panelY - panelH / 2 + 30 * S, t.howToPlayTitle, {
          fontFamily: FONT_FAMILY,
          fontSize: `${titleFontSize}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1 * S, 0x6366f1, 0.25);
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
      this.scene.add
        .text(contentX, cy, `▸ ${t.controls}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${headFontSize}px`,
          color: "#818CF8",
          fontStyle: "bold",
        })
        .setOrigin(0)
    );
    cy += lineGap + 4 * S;

    overlay.add(
      this.scene.add
        .text(contentX + 12 * S, cy, t.controlJump, {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodyFontSize}px`,
          color: "#dddddd",
        })
        .setOrigin(0)
    );
    cy += lineGap;

    overlay.add(
      this.scene.add
        .text(contentX + 12 * S, cy, t.controlSlide, {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodyFontSize}px`,
          color: "#dddddd",
        })
        .setOrigin(0)
    );
    cy += lineGap + 12 * S;

    // Rules section
    overlay.add(
      this.scene.add
        .text(contentX, cy, `▸ ${t.rules}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${headFontSize}px`,
          color: "#818CF8",
          fontStyle: "bold",
        })
        .setOrigin(0)
    );
    cy += lineGap + 4 * S;

    const rules = [t.ruleCoins, t.ruleQuiz, t.ruleHp];
    rules.forEach((rule) => {
      overlay.add(
        this.scene.add
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

    const closeBg = this.scene.add.graphics();
    closeBg.fillStyle(0x0d1117, 0.8);
    closeBg.fillRoundedRect(panelX - closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8 * S);
    closeBg.lineStyle(2 * S, 0x6366f1, 0.5);
    closeBg.strokeRoundedRect(panelX - closeBtnW / 2, closeBtnY - closeBtnH / 2, closeBtnW, closeBtnH, 8 * S);
    overlay.add(closeBg);

    const closeText = this.scene.add
      .text(panelX, closeBtnY, t.close, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(16 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    overlay.add(closeText);

    const closeHitArea = this.scene.add
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
    this.scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
  }
}
