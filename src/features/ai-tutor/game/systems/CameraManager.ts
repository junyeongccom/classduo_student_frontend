import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  DEPTH_SKY,
  DEPTH_SKY_TINT,
  DEPTH_PARALLAX_FAR,
  DEPTH_PARALLAX_MID,
  DEPTH_PARALLAX_NEAR,
  DAY_NIGHT_CYCLE_SCORE,
  DAY_NIGHT_STAGES,
} from "../constants";

export class CameraManager {
  private scene: Phaser.Scene;
  private skyBg!: Phaser.GameObjects.Image;
  private skyTint!: Phaser.GameObjects.Rectangle;
  private mountainFar!: Phaser.GameObjects.TileSprite;
  private mountainMid!: Phaser.GameObjects.TileSprite;
  private mountainNear!: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Sky gradient background (texture created in BootScene)
    this.skyBg = this.scene.add.image(0, 0, "sky_gradient")
      .setOrigin(0, 0)
      .setDepth(DEPTH_SKY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Sky tint overlay for distance-based color change
    this.skyTint = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_SKY_TINT);

    // Mountain layers at different heights
    const mountainPeakH = 120 * S;
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const mountainTop = groundTop - mountainPeakH;
    const mountainSpriteH = GAME_HEIGHT - mountainTop;

    this.mountainFar = this.scene.add
      .tileSprite(0, mountainTop, GAME_WIDTH, mountainSpriteH, "mountains_far")
      .setOrigin(0, 0)
      .setDepth(DEPTH_PARALLAX_FAR);

    this.mountainMid = this.scene.add
      .tileSprite(0, mountainTop + 20 * S, GAME_WIDTH, mountainSpriteH, "mountains_mid")
      .setOrigin(0, 0)
      .setDepth(DEPTH_PARALLAX_MID);

    this.mountainNear = this.scene.add
      .tileSprite(0, mountainTop + 40 * S, GAME_WIDTH, mountainSpriteH, "mountains_near")
      .setOrigin(0, 0)
      .setDepth(DEPTH_PARALLAX_NEAR);
  }

  update(effectiveSpeed: number, delta: number, score: number): void {
    const dt = delta / 1000;
    const scrollAmount = Math.abs(effectiveSpeed) * dt;

    // Parallax scroll at different rates
    this.mountainFar.tilePositionX += scrollAmount * 0.05;
    this.mountainMid.tilePositionX += scrollAmount * 0.10;
    this.mountainNear.tilePositionX += scrollAmount * 0.20;

    // Score-based day/night cycle
    this.updateDayNight(score);
  }

  private updateDayNight(score: number): void {
    const progress = (score % DAY_NIGHT_CYCLE_SCORE) / DAY_NIGHT_CYCLE_SCORE;
    const stages = DAY_NIGHT_STAGES;

    // Find which two stages we're between
    let fromIdx = 0;
    for (let i = stages.length - 1; i >= 0; i--) {
      if (progress >= stages[i].at) {
        fromIdx = i;
        break;
      }
    }
    const toIdx = Math.min(fromIdx + 1, stages.length - 1);

    const fromStage = stages[fromIdx];
    const toStage = stages[toIdx];

    // Interpolation factor between the two stages
    const range = toStage.at - fromStage.at;
    const t = range > 0 ? (progress - fromStage.at) / range : 0;

    // Interpolate sky overlay color + alpha
    const r = Math.round(fromStage.sky.r + (toStage.sky.r - fromStage.sky.r) * t);
    const g = Math.round(fromStage.sky.g + (toStage.sky.g - fromStage.sky.g) * t);
    const b = Math.round(fromStage.sky.b + (toStage.sky.b - fromStage.sky.b) * t);
    const a = fromStage.sky.a + (toStage.sky.a - fromStage.sky.a) * t;

    this.skyTint.setFillStyle(Phaser.Display.Color.GetColor(r, g, b), a);

    // Interpolate mountain tint
    const fromMtn = Phaser.Display.Color.IntegerToColor(fromStage.mountain);
    const toMtn = Phaser.Display.Color.IntegerToColor(toStage.mountain);
    const mr = Math.round(fromMtn.red + (toMtn.red - fromMtn.red) * t);
    const mg = Math.round(fromMtn.green + (toMtn.green - fromMtn.green) * t);
    const mb = Math.round(fromMtn.blue + (toMtn.blue - fromMtn.blue) * t);
    const mtnTint = Phaser.Display.Color.GetColor(mr, mg, mb);

    this.mountainFar.setTint(mtnTint);
    this.mountainMid.setTint(mtnTint);
    this.mountainNear.setTint(mtnTint);
  }

  destroy(): void {
    // Cleanup handled by scene
  }
}
