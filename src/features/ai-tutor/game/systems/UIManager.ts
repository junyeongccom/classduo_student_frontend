import Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  HP_ICON_RADIUS,
  HP_BAR_X,
  HP_BAR_Y,
  HP_BAR_WIDTH,
  HP_BAR_HEIGHT,
  HP_BAR_RADIUS,
  HP_BAR_PADDING,
  COLOR_HP_HEART,
  COLOR_HP_HEART_SHINE,
  HP_LOW_THRESHOLD,
  HP_HEARTBEAT_DURATION,
  HP_DAMAGE_FLASH_MS,
  DEPTH_HUD,
  DEPTH_QUIZ,
  EFFECT_DISPLAY_MS,
  SCORE_BOUNCE_SCALE,
  SCORE_BOUNCE_DURATION,
  HP_COLORS,
} from "../constants";

export class UIManager {
  private scene: Phaser.Scene;

  // Score
  private scoreText!: Phaser.GameObjects.Text;
  private coinLabel!: Phaser.GameObjects.Text;
  private displayedScore = 0;
  private targetScore = 0;

  // Effect text
  private effectText!: Phaser.GameObjects.Text;
  private effectDisplayTimer?: Phaser.Time.TimerEvent;

  // HP gauge
  private hpGaugeFrame!: Phaser.GameObjects.Graphics;
  private hpGaugeFill!: Phaser.GameObjects.Graphics;
  private displayedHpRatio = 1;
  private lastHpRatio = 1;
  private hpDamageFlashTimer = 0;

  // Heartbeat
  private heartbeatTween?: Phaser.Tweens.Tween;
  private heartIcon!: Phaser.GameObjects.Graphics;
  private isHeartbeating = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Score
    this.scoreText = this.scene.add
      .text(GAME_WIDTH - 20 * S, 20 * S, "0", {
        fontFamily: "monospace",
        fontSize: `${28 * S}px`,
        color: "#333333",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH_HUD);

    this.coinLabel = this.scene.add
      .text(GAME_WIDTH - 80 * S, 22 * S, "COIN", {
        fontFamily: "monospace",
        fontSize: `${14 * S}px`,
        color: "#d4a017",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH_HUD);

    // HP gauge (frame behind fill)
    this.hpGaugeFrame = this.scene.add.graphics().setDepth(DEPTH_HUD);
    this.hpGaugeFill = this.scene.add.graphics().setDepth(DEPTH_HUD + 0.1);
    this.heartIcon = this.scene.add.graphics().setDepth(DEPTH_HUD + 0.2);
    this.drawHpGaugeFrame();

    // Effect text
    this.effectText = this.scene.add
      .text(GAME_WIDTH / 2, 20 * S, "", {
        fontFamily: "monospace",
        fontSize: `${16 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#00000066",
        padding: { x: 8 * S, y: 4 * S },
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_QUIZ)
      .setAlpha(0);

    this.displayedScore = 0;
    this.targetScore = 0;
    this.displayedHpRatio = 1;
    this.lastHpRatio = 1;
  }

  // ── Score ──

  setScore(score: number): void {
    if (score !== this.targetScore) {
      this.targetScore = score;
      // Bounce
      this.scene.tweens.add({
        targets: this.scoreText,
        scaleX: SCORE_BOUNCE_SCALE,
        scaleY: SCORE_BOUNCE_SCALE,
        duration: SCORE_BOUNCE_DURATION / 2,
        yoyo: true,
        ease: "Back.Out",
      });
    }
  }

  showEffect(text: string, color: string): void {
    this.effectText.setText(text).setColor(color).setAlpha(1);
    this.effectDisplayTimer?.remove();
    this.effectDisplayTimer = this.scene.time.delayedCall(EFFECT_DISPLAY_MS, () => {
      this.effectText.setAlpha(0);
    });
  }

  // ── HP Gauge ──

  updateHpGauge(hp: number, hpMax: number): void {
    const ratio = hp / hpMax;

    // Detect sudden damage for flash
    if (ratio < this.lastHpRatio - 0.05) {
      this.hpDamageFlashTimer = HP_DAMAGE_FLASH_MS;
    }
    this.lastHpRatio = ratio;

    // Heartbeat when low HP
    if (ratio <= HP_LOW_THRESHOLD && ratio > 0) {
      if (!this.isHeartbeating) {
        this.isHeartbeating = true;
        this.heartbeatTween = this.scene.tweens.add({
          targets: this.heartIcon,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: HP_HEARTBEAT_DURATION / 2,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
    } else if (this.isHeartbeating) {
      this.isHeartbeating = false;
      this.heartbeatTween?.stop();
      this.heartIcon.setScale(1);
    }

    this.drawHpFill(ratio);
  }

  private drawHeartIcon(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number
  ): void {
    const topY = cy - r * 0.4;
    const botY = cy + r;
    const lx = cx - r * 0.55;
    const rx = cx + r * 0.55;
    const bulgeR = r * 0.55;

    g.fillStyle(COLOR_HP_HEART, 1);
    g.beginPath();
    g.arc(lx, topY, bulgeR, Math.PI, 0, false);
    g.arc(rx, topY, bulgeR, Math.PI, 0, false);
    g.lineTo(cx, botY);
    g.closePath();
    g.fillPath();

    g.lineStyle(2 * S, 0x922b21, 1);
    g.beginPath();
    g.arc(lx, topY, bulgeR, Math.PI, 0, false);
    g.arc(rx, topY, bulgeR, Math.PI, 0, false);
    g.lineTo(cx, botY);
    g.closePath();
    g.strokePath();

    g.fillStyle(COLOR_HP_HEART_SHINE, 0.6);
    g.fillCircle(lx - bulgeR * 0.15, topY - bulgeR * 0.2, bulgeR * 0.3);
  }

  private drawHpGaugeFrame(): void {
    const g = this.hpGaugeFrame;
    g.clear();

    const barW = HP_BAR_WIDTH;
    const bx = HP_BAR_X;
    const by = HP_BAR_Y;
    const bh = HP_BAR_HEIGHT;
    const br = HP_BAR_RADIUS;
    const pad = HP_BAR_PADDING;

    // Background fill — translucent dark
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(bx, by, barW, bh, br);

    // Subtle white border
    g.lineStyle(1 * S, 0xffffff, 0.2);
    g.strokeRoundedRect(bx, by, barW, bh, br);

    // Segment lines at 25%, 50%, 75%
    g.lineStyle(1 * S, 0xffffff, 0.15);
    const innerW = barW - pad * 2;
    for (const frac of [0.25, 0.5, 0.75]) {
      const lx = bx + pad + innerW * frac;
      g.lineBetween(lx, by + pad, lx, by + bh - pad);
    }

    // Heart icon
    const iconCx = HP_ICON_RADIUS + 4 * S;
    const iconCy = by + bh / 2;
    this.heartIcon.clear();
    this.drawHeartIcon(this.heartIcon, 0, 0, HP_ICON_RADIUS);
    this.heartIcon.setPosition(iconCx, iconCy);
  }

  private getHpColors(displayRatio: number) {
    if (displayRatio > 0.5) return HP_COLORS.high;
    if (displayRatio > 0.25) return HP_COLORS.mid;
    return HP_COLORS.low;
  }

  private drawHpFill(ratio: number): void {
    const pad = HP_BAR_PADDING;
    const innerW = HP_BAR_WIDTH - pad * 2;
    const innerH = HP_BAR_HEIGHT - pad * 2;
    const innerR = HP_BAR_RADIUS - pad;

    // Smooth lerp toward target
    this.displayedHpRatio += (ratio - this.displayedHpRatio) * 0.15;
    const displayRatio = Phaser.Math.Clamp(this.displayedHpRatio, 0, 1);
    const fillW = Math.max(0, innerW * displayRatio);

    const g = this.hpGaugeFill;
    g.clear();
    if (fillW <= 0) return;

    const fx = HP_BAR_X + pad;
    const fy = HP_BAR_Y + pad;
    const trR = fillW >= innerW - innerR ? innerR : 0;
    const brR = fillW >= innerW - innerR ? innerR : 0;
    const corners = { tl: innerR, tr: trR, bl: innerR, br: brR };

    if (this.hpDamageFlashTimer > 0) {
      // Damage flash (white)
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(fx, fy, fillW, innerH, corners);
      return;
    }

    const colors = this.getHpColors(displayRatio);

    // Simple translucent fill
    g.fillStyle(colors.fill, 0.7);
    g.fillRoundedRect(fx, fy, fillW, innerH, corners);
  }

  // ── Update ──

  update(delta: number): void {
    // Lerp score
    if (this.displayedScore !== this.targetScore) {
      const diff = this.targetScore - this.displayedScore;
      const step = Math.ceil(Math.abs(diff) * 0.2);
      if (Math.abs(diff) <= 1) {
        this.displayedScore = this.targetScore;
      } else {
        this.displayedScore += Math.sign(diff) * Math.min(step, Math.abs(diff));
      }
      this.scoreText.setText(String(this.displayedScore));
    }

    // Keep COIN label to the left of score number
    this.coinLabel.setX(this.scoreText.x - this.scoreText.displayWidth - 14 * S);

    // Damage flash timer
    if (this.hpDamageFlashTimer > 0) {
      this.hpDamageFlashTimer -= delta;
    }
  }

  cleanup(): void {
    this.effectDisplayTimer?.remove();
    this.heartbeatTween?.stop();
  }
}
