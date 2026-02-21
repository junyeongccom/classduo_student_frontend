import * as Phaser from "phaser";
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

    // Extend physics body 4× deeper than visual as safety net against fast/large objects.
    // setSize sets SOURCE dims; updateBounds multiplies by sprite scale → correct world size.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(body.sourceWidth, body.sourceHeight * 4, false);
    body.setOffset(0, 0);
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
