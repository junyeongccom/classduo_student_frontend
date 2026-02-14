import * as Phaser from "phaser";
import { HEART_ITEM_SIZE, HEART_WAVE_AMPLITUDE, HEART_WAVE_SPEED } from "../constants";

export class HeartItem extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private spawnX: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "heart_item");

    this.baseY = y;
    this.spawnX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(HEART_ITEM_SIZE, HEART_ITEM_SIZE);
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Sine wave Y movement
    this.y =
      this.baseY +
      Math.sin(time * HEART_WAVE_SPEED + this.spawnX * 0.01) *
        HEART_WAVE_AMPLITUDE;

    // Destroy when off-screen left
    if (this.x + HEART_ITEM_SIZE / 2 < 0) {
      this.destroy();
    }
  }
}
