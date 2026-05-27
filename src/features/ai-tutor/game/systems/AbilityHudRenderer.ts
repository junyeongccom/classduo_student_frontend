import * as Phaser from "phaser";
import {
  S,
  HP_BAR_X,
  HP_BAR_Y,
  HP_BAR_HEIGHT,
  DEPTH_HUD,
  FONT_FAMILY,
  ACTIVE_MAX_LEVEL,
  ACTIVE_UNLOCK_STACKS,
} from "../constants";

export class AbilityHudRenderer {
  private scene: Phaser.Scene;

  private abilityIcons: Record<string, {
    container: Phaser.GameObjects.Container;
    bgCircle: Phaser.GameObjects.Graphics;
    progressRing: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    nameLabel: Phaser.GameObjects.Text;
    levelText: Phaser.GameObjects.Text;
  }> = {};
  private abilityActivePulse: Record<string, Phaser.Tweens.Tween> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const types = ["magnet", "giant", "coinRain", "multiJumpScore", "skyTreasure"] as const;
    // 동그라미 안: 직관적 한글 1자 / 동그라미 아래: 풀 한글 이름
    const labels: Record<string, string> = { magnet: "자", giant: "거", coinRain: "코", multiJumpScore: "초", skyTreasure: "보" };
    const names: Record<string, string> = { magnet: "자석", giant: "거대화", coinRain: "코인비", multiJumpScore: "초고속", skyTreasure: "보물" };
    const colors: Record<string, number> = { magnet: 0xf1c40f, giant: 0x1abc9c, coinRain: 0x3498db, multiJumpScore: 0x9b59b6, skyTreasure: 0x2ecc71 };

    const startX = HP_BAR_X;
    const startY = HP_BAR_Y + HP_BAR_HEIGHT + 8 * S;
    const iconR = 10 * S;
    // 풀 이름(최대 3자) 가로 폭 확보를 위해 spacing 살짝 확대
    const spacing = 34 * S;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const cx = startX + iconR + i * spacing;
      const cy = startY + iconR;

      const container = this.scene.add.container(cx, cy).setDepth(DEPTH_HUD + 0.3);
      container.setVisible(false);

      // Background circle
      const bgCircle = this.scene.add.graphics();
      bgCircle.fillStyle(colors[type], 0.3);
      bgCircle.fillCircle(0, 0, iconR);
      container.add(bgCircle);

      // Progress ring (drawn each frame)
      const progressRing = this.scene.add.graphics();
      container.add(progressRing);

      // 동그라미 안 한 글자 라벨 (자/거/코/콤/보)
      const label = this.scene.add
        .text(0, -1 * S, labels[type], {
          fontFamily: FONT_FAMILY,
          fontSize: `${10 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(label);

      // 동그라미 아래 풀 한글 이름 (자석/거대화/코인비/콤보/보물)
      const nameLabel = this.scene.add
        .text(0, iconR + 4 * S, names[type], {
          fontFamily: FONT_FAMILY,
          fontSize: `${7 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(nameLabel);

      // 풀 이름 아래 진행도/레벨 (1/3, Lv1 등) — bold + 사이즈 ↑ + 진한 색 (가독성)
      const levelText = this.scene.add
        .text(0, iconR + 13 * S, "", {
          fontFamily: FONT_FAMILY,
          fontSize: `${9 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2 * S,
        })
        .setOrigin(0.5);
      container.add(levelText);

      this.abilityIcons[type] = { container, bgCircle, progressRing, label, nameLabel, levelText };
    }
  }

  /** Show passive stack progress (signed: negative = debuff, positive = building toward unlock) */
  updatePassiveStackHUD(type: string, signedStacks: number): void {
    const icon = this.abilityIcons[type];
    if (!icon) return;

    // Stop any active pulse
    if (this.abilityActivePulse[type]) {
      this.abilityActivePulse[type].stop();
      delete this.abilityActivePulse[type];
      icon.bgCircle.setAlpha(1);
    }

    if (signedStacks === 0) {
      icon.container.setVisible(false);
      return;
    }

    icon.container.setVisible(true);
    const iconR = 10 * S;
    const isDebuff = signedStacks < 0;
    const absStacks = Math.abs(signedStacks);
    const g = icon.progressRing;
    g.clear();

    if (isDebuff) {
      // Debuff: red filled ring, full progress
      icon.label.setAlpha(0.4);
      icon.levelText.setText(`${signedStacks}`);
      icon.levelText.setColor("#e74c3c");

      g.lineStyle(1.5 * S, 0xe74c3c, 0.4);
      g.strokeCircle(0, 0, iconR);

      // Full red ring
      g.lineStyle(2.5 * S, 0xe74c3c, 0.7);
      g.beginPath();
      g.arc(0, 0, iconR + 1 * S, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, false);
      g.strokePath();
    } else {
      // Buff: progress toward unlock
      const progress = Math.min(absStacks, ACTIVE_UNLOCK_STACKS) / ACTIVE_UNLOCK_STACKS;

      icon.label.setAlpha(0.4);
      icon.levelText.setText(`${absStacks}/${ACTIVE_UNLOCK_STACKS}`);
      icon.levelText.setColor("#ffffff");

      g.lineStyle(1.5 * S, 0x888888, 0.3);
      g.strokeCircle(0, 0, iconR);

      if (progress > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + progress * Math.PI * 2;
        g.lineStyle(2.5 * S, 0xaaaaaa, 0.6);
        g.beginPath();
        g.arc(0, 0, iconR + 1 * S, startAngle, endAngle, false);
        g.strokePath();
      }
    }
  }

  updateActiveAbilityHUD(
    type: string,
    stacks: number,
    progress: number,
    isActive: boolean,
  ): void {
    const icon = this.abilityIcons[type];
    if (!icon) return;

    if (stacks === 0) {
      icon.container.setVisible(false);
      // Stop pulse if any
      if (this.abilityActivePulse[type]) {
        this.abilityActivePulse[type].stop();
        delete this.abilityActivePulse[type];
        icon.bgCircle.setAlpha(1);
      }
      return;
    }

    icon.container.setVisible(true);
    const level = Math.min(Math.abs(stacks), ACTIVE_MAX_LEVEL);
    const iconR = 10 * S;

    // 1회성 발동 + 매번 동일 효과 — Lv 표시 제거. 진행도 ring 으로 활성/지속 시간 표현.
    icon.levelText.setText("");
    icon.levelText.setColor("#2ecc71");

    // Draw progress ring
    const g = icon.progressRing;
    g.clear();

    // Base border circle
    g.lineStyle(1.5 * S, 0x2ecc71, 0.4);
    g.strokeCircle(0, 0, iconR);

    // Progress arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Phaser.Math.Clamp(progress, 0, 1) * Math.PI * 2;
    if (progress > 0.001) {
      g.lineStyle(2.5 * S, isActive ? 0xf1c40f : 0x2ecc71, 0.9);
      g.beginPath();
      g.arc(0, 0, iconR + 1 * S, startAngle, endAngle, false);
      g.strokePath();
    }

    // Brightness based on state
    icon.label.setAlpha(isActive ? 1 : 0.6);

    // Pulse during active
    if (isActive && !this.abilityActivePulse[type]) {
      this.abilityActivePulse[type] = this.scene.tweens.add({
        targets: icon.bgCircle,
        alpha: { from: 1, to: 0.4 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    } else if (!isActive && this.abilityActivePulse[type]) {
      this.abilityActivePulse[type].stop();
      delete this.abilityActivePulse[type];
      icon.bgCircle.setAlpha(1);
    }
  }

  cleanup(): void {
    for (const key in this.abilityActivePulse) {
      this.abilityActivePulse[key].stop();
    }
    this.abilityActivePulse = {};
    for (const key in this.abilityIcons) {
      this.abilityIcons[key].container.destroy();
    }
    this.abilityIcons = {};
  }
}
