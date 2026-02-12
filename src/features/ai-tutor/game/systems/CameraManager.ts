import Phaser from "phaser";
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
  SKY_TINT_STAGES,
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

  update(effectiveSpeed: number, delta: number, distanceTraveled: number): void {
    const dt = delta / 1000;
    const scrollAmount = Math.abs(effectiveSpeed) * dt;

    // Parallax scroll at different rates
    this.mountainFar.tilePositionX += scrollAmount * 0.05;
    this.mountainMid.tilePositionX += scrollAmount * 0.10;
    this.mountainNear.tilePositionX += scrollAmount * 0.20;

    // Distance-based sky tinting
    this.updateSkyTint(distanceTraveled);
  }

  private updateSkyTint(distance: number): void {
    const stages = SKY_TINT_STAGES;

    // Find which two stages we're between
    let fromIdx = 0;
    for (let i = stages.length - 1; i >= 0; i--) {
      if (distance >= stages[i].dist) {
        fromIdx = i;
        break;
      }
    }

    const toIdx = Math.min(fromIdx + 1, stages.length - 1);

    if (fromIdx === toIdx) {
      this.skyTint.setFillStyle(stages[fromIdx].color, 0.15);
      return;
    }

    const fromDist = stages[fromIdx].dist;
    const toDist = stages[toIdx].dist;
    const t = Phaser.Math.Clamp((distance - fromDist) / (toDist - fromDist), 0, 1);

    const fromColor = Phaser.Display.Color.IntegerToColor(stages[fromIdx].color);
    const toColor = Phaser.Display.Color.IntegerToColor(stages[toIdx].color);

    const r = Math.round(fromColor.red + (toColor.red - fromColor.red) * t);
    const g = Math.round(fromColor.green + (toColor.green - fromColor.green) * t);
    const b = Math.round(fromColor.blue + (toColor.blue - fromColor.blue) * t);

    const blended = Phaser.Display.Color.GetColor(r, g, b);
    const alpha = t * 0.2;
    this.skyTint.setFillStyle(blended, alpha);
  }

  destroy(): void {
    // Cleanup handled by scene
  }
}
