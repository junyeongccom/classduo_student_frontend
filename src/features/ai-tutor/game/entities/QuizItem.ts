import Phaser from "phaser";
import { S, QUIZ_ITEM_SIZE } from "../constants";

export class QuizItem extends Phaser.Physics.Arcade.Sprite {
  readonly keyword: string;
  readonly isCorrect: boolean;
  private trail: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    keyword: string,
    isCorrect: boolean
  ) {
    super(scene, x, y, "meteor");

    this.keyword = keyword;
    this.isCorrect = isCorrect;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(QUIZ_ITEM_SIZE, QUIZ_ITEM_SIZE);

    this.trail = scene.add.graphics();
    this.trail.setDepth((this.depth ?? 0) - 1);
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Draw trail behind the meteor (to the right, since it moves left)
    this.trail.clear();
    const trailCount = 6;
    for (let i = 1; i <= trailCount; i++) {
      const t = i / trailCount;
      const radius = (QUIZ_ITEM_SIZE / 3) * (1 - t * 0.8);
      const alpha = 0.4 * (1 - t);
      const offsetX = i * 10 * S;
      this.trail.fillStyle(0xff6b35, alpha);
      this.trail.fillCircle(this.x + offsetX, this.y, radius);
    }

    if (this.x + QUIZ_ITEM_SIZE / 2 < 0) {
      this.destroyWithTrail();
    }
  }

  destroyWithTrail(): void {
    this.trail.destroy();
    this.destroy();
  }
}
