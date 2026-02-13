import * as Phaser from "phaser";
import { S } from "../constants";

export class Coin extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private spawnX: number;
  private spinTimer = 0;
  private currentFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "coin_f0");

    this.baseY = y;
    this.spawnX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Bob animation (sine wave)
    this.y = this.baseY + Math.sin(time * 0.003 + this.spawnX * 0.1) * 3 * S;

    // Spin animation (cycle through 4 width frames)
    this.spinTimer += delta;
    if (this.spinTimer > 166) { // ~6fps
      this.spinTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4;
      this.setTexture(`coin_f${this.currentFrame}`);
    }

    if (this.x + this.width / 2 < 0) {
      this.destroy();
    }
  }
}
