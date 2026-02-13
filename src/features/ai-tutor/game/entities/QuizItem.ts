import * as Phaser from "phaser";
import { S, QUIZ_ITEM_SIZE } from "../constants";

interface MeteorParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
}

export class QuizItem extends Phaser.Physics.Arcade.Sprite {
  readonly keyword: string;
  readonly isCorrect: boolean;
  private trail: Phaser.GameObjects.Graphics;
  private particles: MeteorParticle[] = [];

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
    const dt = delta / 16.67;
    const bodyR = QUIZ_ITEM_SIZE / 3;

    // ── Spawn ember particles ──
    const count = Phaser.Math.Between(1, 3);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 40) break;
      const colors = [0xffff99, 0xffaa00, 0xff6b35, 0xff4500];
      this.particles.push({
        x: this.x + (Math.random() - 0.3) * bodyR,
        y: this.y + (Math.random() - 0.5) * bodyR,
        vx: (0.5 + Math.random() * 1.5) * S,
        vy: (Math.random() - 0.5) * 0.8 * S,
        alpha: 0.6 + Math.random() * 0.4,
        size: (1 + Math.random() * 2) * S,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // ── Update particles ──
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 0.025 * dt;
      p.size *= 0.97;
      if (p.alpha <= 0 || p.size < 0.3 * S) {
        this.particles.splice(i, 1);
      }
    }

    // ── Draw ──
    this.trail.clear();

    // Outer glow around meteor body
    this.trail.fillStyle(0xff6b35, 0.12);
    this.trail.fillCircle(this.x, this.y, QUIZ_ITEM_SIZE * 0.6);
    this.trail.fillStyle(0xffaa00, 0.08);
    this.trail.fillCircle(this.x, this.y, QUIZ_ITEM_SIZE * 0.45);

    // Flame trail (yellow → orange → red)
    const trailCount = 8;
    for (let i = 1; i <= trailCount; i++) {
      const t = i / trailCount;
      const radius = bodyR * (1 - t * 0.75);
      const alpha = 0.5 * (1 - t);
      const offsetX = i * 8 * S;
      const color = t < 0.35 ? 0xffaa00 : t < 0.65 ? 0xff6b35 : 0xff4500;
      this.trail.fillStyle(color, alpha);
      this.trail.fillCircle(this.x + offsetX, this.y, radius);
    }

    // Ember particles
    for (const p of this.particles) {
      if (p.alpha > 0) {
        this.trail.fillStyle(p.color, p.alpha);
        this.trail.fillCircle(p.x, p.y, p.size);
      }
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
