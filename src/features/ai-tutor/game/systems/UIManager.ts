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
  private hpShinePhase = 0;
  private hpShineMaskGfx!: Phaser.GameObjects.Graphics;
  private hpShineGfx!: Phaser.GameObjects.Graphics;

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
    this.hpShineMaskGfx = this.scene.add.graphics();
    this.hpShineMaskGfx.setVisible(false);
    this.hpShineGfx = this.scene.add.graphics().setDepth(DEPTH_HUD + 0.15);
    this.hpShineGfx.setMask(this.hpShineMaskGfx.createGeometryMask());
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

  private getHpFillColor(displayRatio: number): number {
    const r = Phaser.Math.Clamp(displayRatio, 0, 1);
    // green(0x2ecc71) → orange(0xf39c12) → red(0xe74c3c)
    if (r > 0.5) {
      const t = (r - 0.5) / 0.5; // 1=green, 0=orange
      return this.lerpColor(0xf39c12, 0x2ecc71, t);
    }
    const t = r / 0.5; // 1=orange, 0=red
    return this.lerpColor(0xe74c3c, 0xf39c12, t);
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const gg = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (rr << 16) | (gg << 8) | bl;
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
    if (fillW <= 0) {
      this.hpShineGfx.clear();
      return;
    }

    const fx = HP_BAR_X + pad;
    const fy = HP_BAR_Y + pad;
    const trR = fillW >= innerW - innerR ? innerR : 0;
    const brR = fillW >= innerW - innerR ? innerR : 0;
    const corners = { tl: innerR, tr: trR, bl: innerR, br: brR };

    if (this.hpDamageFlashTimer > 0) {
      // Damage flash (white)
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(fx, fy, fillW, innerH, corners);
      this.hpShineGfx.clear();
      return;
    }

    const fillColor = this.getHpFillColor(displayRatio);

    // Smooth color-interpolated fill
    g.fillStyle(fillColor, 0.7);
    g.fillRoundedRect(fx, fy, fillW, innerH, corners);

    // Update geometry mask to match current fill shape
    this.hpShineMaskGfx.clear();
    this.hpShineMaskGfx.fillStyle(0xffffff);
    this.hpShineMaskGfx.fillRoundedRect(fx, fy, fillW, innerH, corners);

    // Diagonal shine sweep (active first 40% of cycle, paused 60%)
    this.hpShineGfx.clear();
    const sweepT = this.hpShinePhase < 0.4 ? this.hpShinePhase / 0.4 : -1;
    if (sweepT >= 0) {
      // Ease-in-out for natural acceleration
      const eased =
        sweepT < 0.5
          ? 2 * sweepT * sweepT
          : 1 - Math.pow(-2 * sweepT + 2, 2) / 2;

      const shineW = innerW * 0.3;
      const skew = innerH * 0.5;
      const startX = fx - shineW - skew;
      const endX = fx + fillW;
      const shineX = startX + (endX - startX) * eased;
      const strips = 10;
      const bandW = shineW + skew;
      const stripW = bandW / strips;

      for (let i = 0; i < strips; i++) {
        const t = i / (strips - 1);
        const d = (t - 0.5) * 2.8;
        const alpha = 0.3 * Math.exp(-(d * d));
        const x = shineX + stripW * i;

        this.hpShineGfx.fillStyle(0xffffff, alpha);
        this.hpShineGfx.beginPath();
        this.hpShineGfx.moveTo(x + skew, fy);
        this.hpShineGfx.lineTo(x + stripW + skew + 0.5, fy);
        this.hpShineGfx.lineTo(x + stripW + 0.5, fy + innerH);
        this.hpShineGfx.lineTo(x, fy + innerH);
        this.hpShineGfx.closePath();
        this.hpShineGfx.fillPath();
      }
    }
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

    // Shine sweep phase (5-second cycle)
    this.hpShinePhase = (this.hpShinePhase + delta / 5000) % 1;
  }

  cleanup(): void {
    this.effectDisplayTimer?.remove();
    this.heartbeatTween?.stop();
    this.hpShineGfx?.clearMask(true);
  }
}
