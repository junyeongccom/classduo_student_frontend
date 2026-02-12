import Phaser from "phaser";
import { GROUND_HEIGHT } from "../constants";

export class GroundSegment extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    const texture = Math.random() < 0.5 ? "groundTile" : "groundTile2";
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // setDisplaySize scales the sprite → body auto-scales via updateBounds:
    //   body.width = sourceWidth(texture) * scaleX = TILE_WIDTH * (width/TILE_WIDTH) = width
    // So do NOT call body.setSize manually — it would double-scale.
    this.setDisplaySize(width, GROUND_HEIGHT);
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.x + this.displayWidth / 2 < 0) {
      this.destroy();
    }
  }
}
