import * as Phaser from "phaser";
import { S, QUIZ_ITEM_SIZE, SCROLL_COLORS } from "../constants";

interface ScrollParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
}

// Slow float parameters
const FLOAT_AMPLITUDE = 8 * S;
const FLOAT_SPEED = 0.0018;

export class QuizItem extends Phaser.Physics.Arcade.Sprite {
  readonly colorIndex: number;
  private trail: Phaser.GameObjects.Graphics;
  private particles: ScrollParticle[] = [];
  private baseY: number;
  private floatPhase: number;
  private elapsed = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    colorIndex: number
  ) {
    super(scene, x, y, `scroll_${colorIndex}`);

    this.colorIndex = colorIndex;
    this.baseY = y;
    this.floatPhase = Math.random() * Math.PI * 2;

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
    const colors = SCROLL_COLORS[this.colorIndex];

    // Floating bob
    this.elapsed += delta;
    this.y = this.baseY + Math.sin(this.elapsed * FLOAT_SPEED + this.floatPhase) * FLOAT_AMPLITUDE;

    // Spawn magic sparkle particles
    const count = Phaser.Math.Between(1, 2);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 30) break;
      const sparkleColors = [colors.main, colors.light, 0xffffff];
      this.particles.push({
        x: this.x + (Math.random() - 0.3) * bodyR,
        y: this.y + (Math.random() - 0.5) * bodyR,
        vx: (0.2 + Math.random() * 0.8) * S,
        vy: -(0.2 + Math.random() * 0.6) * S,
        alpha: 0.4 + Math.random() * 0.4,
        size: (0.6 + Math.random() * 1.5) * S,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
      });
    }

    // Update particles
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

    // Draw
    this.trail.clear();

    // Outer glow in scroll color
    const glowX = this.x - QUIZ_ITEM_SIZE * 0.1;
    this.trail.fillStyle(colors.main, 0.28);
    this.trail.fillCircle(glowX, this.y, QUIZ_ITEM_SIZE * 0.7);
    this.trail.fillStyle(colors.light, 0.2);
    this.trail.fillCircle(glowX, this.y, QUIZ_ITEM_SIZE * 0.5);

    // Gentle sparkle trail (soft dots trailing behind)
    const trailCount = 5;
    for (let i = 1; i <= trailCount; i++) {
      const t = i / trailCount;
      const radius = (bodyR * 0.2) * (1 - t * 0.5);
      const alpha = 0.3 * (1 - t);
      const offsetX = i * 6 * S;
      const offsetY = Math.sin(this.elapsed * FLOAT_SPEED + this.floatPhase - i * 0.3) * FLOAT_AMPLITUDE * 0.3;
      this.trail.fillStyle(colors.light, alpha);
      this.trail.fillCircle(this.x + offsetX, this.y + offsetY, radius);
    }

    // Sparkle particles
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
