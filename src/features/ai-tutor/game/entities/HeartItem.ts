import * as Phaser from "phaser";
import {
  S,
  HEART_ITEM_SIZE,
  HEART_WAVE_AMPLITUDE,
  HEART_WAVE_SPEED,
  COLOR_HP_HEART,
  COLOR_HP_HEART_SHINE,
} from "../constants";

interface HeartParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
}

export class HeartItem extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private spawnX: number;
  private trail: Phaser.GameObjects.Graphics;
  private particles: HeartParticle[] = [];
  private elapsed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "heart_item");

    this.baseY = y;
    this.spawnX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(HEART_ITEM_SIZE, HEART_ITEM_SIZE);

    this.trail = scene.add.graphics();
    this.trail.setDepth((this.depth ?? 0) - 1);
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const dt = delta / 16.67;

    this.elapsed += delta;

    // Sine wave Y movement
    this.y =
      this.baseY +
      Math.sin(time * HEART_WAVE_SPEED + this.spawnX * 0.01) *
        HEART_WAVE_AMPLITUDE;

    // Heartbeat beat factor (used for glow pulsing)
    const beat = Math.sin(this.elapsed * 0.005);

    // Compensate 1-frame lag: preUpdate runs before the physics step,
    // so predict where the sprite will render after this frame's physics sync.
    const arcadeBody = this.body as Phaser.Physics.Arcade.Body | null;
    const drawX = this.x + (arcadeBody ? arcadeBody.velocity.x * (delta / 1000) : 0);
    const drawY = this.y;

    // Spawn sparkle particles (0~1 per frame, max 15)
    if (this.particles.length < 15 && Math.random() < 0.5) {
      const bodyR = HEART_ITEM_SIZE / 3;
      const sparkleColors = [COLOR_HP_HEART, COLOR_HP_HEART_SHINE, 0xffffff];
      this.particles.push({
        x: drawX + (Math.random() - 0.5) * bodyR,
        y: drawY + (Math.random() - 0.5) * bodyR,
        vx: (Math.random() - 0.5) * 0.4 * S,
        vy: -(0.3 + Math.random() * 0.5) * S,
        alpha: 0.4 + Math.random() * 0.4,
        size: (0.5 + Math.random() * 1.2) * S,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 0.02 * dt;
      p.size *= 0.98;
      if (p.alpha <= 0 || p.size < 0.3 * S) {
        this.particles.splice(i, 1);
      }
    }

    // Draw
    this.trail.clear();

    // Heartbeat glow (pulsing with beat)
    const glowPulse = (beat + 1) / 2; // 0~1

    // Outer glow
    const outerAlpha = 0.15 + glowPulse * 0.15; // 0.15~0.30
    const outerRadius =
      HEART_ITEM_SIZE * (0.65 + glowPulse * 0.15); // 0.65~0.80
    this.trail.fillStyle(COLOR_HP_HEART, outerAlpha);
    this.trail.fillCircle(drawX, drawY, outerRadius);

    // Inner glow
    const innerAlpha = 0.1 + glowPulse * 0.12; // 0.10~0.22
    const innerRadius =
      HEART_ITEM_SIZE * (0.45 + glowPulse * 0.1); // 0.45~0.55
    this.trail.fillStyle(COLOR_HP_HEART_SHINE, innerAlpha);
    this.trail.fillCircle(drawX, drawY, innerRadius);

    // Sparkle particles
    for (const p of this.particles) {
      if (p.alpha > 0) {
        this.trail.fillStyle(p.color, p.alpha);
        this.trail.fillCircle(p.x, p.y, p.size);
      }
    }

    // Destroy when off-screen left
    if (this.x + HEART_ITEM_SIZE / 2 < 0) {
      this.destroyWithTrail();
    }
  }

  destroyWithTrail(): void {
    this.trail.destroy();
    this.destroy();
  }
}
