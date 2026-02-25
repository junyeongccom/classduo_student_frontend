import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  DEPTH_HUD,
  DEPTH_QUIZ,
  EFFECT_DISPLAY_MS,
  SCORE_BOUNCE_SCALE,
  SCORE_BOUNCE_DURATION,
  FONT_FAMILY,
} from "../constants";
import { HpGaugeRenderer } from "./HpGaugeRenderer";
import { AbilityHudRenderer } from "./AbilityHudRenderer";

export class UIManager {
  private scene: Phaser.Scene;
  private hpGauge!: HpGaugeRenderer;
  private abilityHud!: AbilityHudRenderer;

  // Score
  private scoreText!: Phaser.GameObjects.Text;
  private coinLabel!: Phaser.GameObjects.Text;
  private displayedScore = 0;
  private targetScore = 0;

  // Effect text
  private effectText!: Phaser.GameObjects.Text;
  private effectDisplayTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Score
    this.scoreText = this.scene.add
      .text(GAME_WIDTH - 20 * S, 20 * S, "0", {
        fontFamily: FONT_FAMILY,
        fontSize: `${28 * S}px`,
        color: "#333333",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH_HUD);

    this.coinLabel = this.scene.add
      .text(GAME_WIDTH - 80 * S, 22 * S, "COIN", {
        fontFamily: FONT_FAMILY,
        fontSize: `${14 * S}px`,
        color: "#d4a017",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH_HUD);

    // HP gauge
    this.hpGauge = new HpGaugeRenderer(this.scene);
    this.hpGauge.create();

    // Effect text
    this.effectText = this.scene.add
      .text(GAME_WIDTH / 2, 20 * S, "", {
        fontFamily: FONT_FAMILY,
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

    // Ability HUD
    this.abilityHud = new AbilityHudRenderer(this.scene);
    this.abilityHud.create();
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

  // ── HP Gauge (delegated) ──

  updateHpGauge(hp: number, hpMax: number): void {
    this.hpGauge.updateHpGauge(hp, hpMax);
  }

  // ── Ability HUD (delegated) ──

  updatePassiveStackHUD(type: string, signedStacks: number): void {
    this.abilityHud.updatePassiveStackHUD(type, signedStacks);
  }

  updateActiveAbilityHUD(
    type: string,
    stacks: number,
    progress: number,
    isActive: boolean,
  ): void {
    this.abilityHud.updateActiveAbilityHUD(type, stacks, progress, isActive);
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

    // HP gauge animations
    this.hpGauge.update(delta);
  }

  cleanup(): void {
    this.effectDisplayTimer?.remove();
    this.hpGauge.cleanup();
    this.abilityHud.cleanup();
  }
}
