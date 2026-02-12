import Phaser from "phaser";
import {
  S,
  PARTICLE_POOL_SIZE,
  COIN_BURST_COUNT,
  QUIZ_BURST_COUNT,
  DEATH_BURST_COUNT,
  SPEED_LINE_COUNT,
  AMBIENT_DUST_COUNT,
  DEPTH_ENTITIES,
  DEPTH_HUD,
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  PLAYER_TEX_HEIGHT,
  COLOR_GROUND,
  COLOR_PLAYER,
  SCORE_POPUP_DURATION,
  SCORE_POPUP_RISE,
} from "../constants";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  active: boolean;
}

interface SpeedLine {
  x: number;
  y: number;
  width: number;
  alpha: number;
  speed: number;
  active: boolean;
}

interface AmbientDust {
  x: number;
  y: number;
  baseY: number;
  vx: number;
  phase: number;
  size: number;
  alpha: number;
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private pool: Particle[];
  private speedLines: SpeedLine[];
  private ambientDusts: AmbientDust[];
  private popups: { text: Phaser.GameObjects.Text; life: number; maxLife: number; startY: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(DEPTH_ENTITIES);

    // Pre-allocate particle pool
    this.pool = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, size: 2 * S, color: 0xffffff, alpha: 1, active: false,
      });
    }

    // Speed lines pool
    this.speedLines = [];
    for (let i = 0; i < SPEED_LINE_COUNT * 2; i++) {
      this.speedLines.push({ x: 0, y: 0, width: 0, alpha: 0, speed: 0, active: false });
    }

    // Ambient dust
    this.ambientDusts = [];
    for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
      this.ambientDusts.push({
        x: Phaser.Math.Between(0, GAME_WIDTH),
        y: Phaser.Math.Between(50 * S, GAME_HEIGHT - 80 * S),
        baseY: 0,
        vx: -(Phaser.Math.Between(5, 15)) * S,
        phase: Math.random() * Math.PI * 2,
        size: Phaser.Math.FloatBetween(1 * S, 2 * S),
        alpha: Phaser.Math.FloatBetween(0.15, 0.35),
      });
      this.ambientDusts[i].baseY = this.ambientDusts[i].y;
    }
  }

  private getParticle(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }

  private emit(
    x: number, y: number,
    count: number,
    opts: {
      color: number;
      sizeMin?: number; sizeMax?: number;
      speedMin?: number; speedMax?: number;
      lifeMin?: number; lifeMax?: number;
      angle?: number; spread?: number;
      gravity?: number;
    }
  ): void {
    const {
      color,
      sizeMin = 2 * S, sizeMax = 4 * S,
      speedMin = 30 * S, speedMax = 80 * S,
      lifeMin = 300, lifeMax = 500,
      angle, spread = Math.PI * 2,
      gravity = 0,
    } = opts;

    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) break;

      const a = angle !== undefined
        ? angle + (Math.random() - 0.5) * spread
        : Math.random() * Math.PI * 2;
      const spd = Phaser.Math.FloatBetween(speedMin, speedMax);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * spd;
      p.vy = Math.sin(a) * spd + (gravity ? 0 : 0);
      p.life = Phaser.Math.Between(lifeMin, lifeMax);
      p.maxLife = p.life;
      p.size = Phaser.Math.FloatBetween(sizeMin, sizeMax);
      p.color = color;
      p.alpha = 1;
      p.active = true;
    }
  }

  // ── Public particle spawners ──

  spawnDustEffect(x: number): void {
    const footY = GROUND_Y - GROUND_HEIGHT / 2;
    this.emit(x, footY, 6, {
      color: COLOR_GROUND,
      sizeMin: 2 * S, sizeMax: 4 * S,
      speedMin: 20 * S, speedMax: 60 * S,
      lifeMin: 300, lifeMax: 500,
      angle: -Math.PI / 2, spread: Math.PI * 0.8,
    });
  }

  spawnSlideDust(playerRightX: number): void {
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    // Main cloud from right edge
    this.emit(playerRightX, groundTop - 2 * S, 5, {
      color: COLOR_GROUND,
      sizeMin: 2 * S, sizeMax: 5 * S,
      speedMin: 40 * S, speedMax: 90 * S,
      lifeMin: 300, lifeMax: 500,
      angle: Math.PI * 0.85, spread: Math.PI * 0.7,
    });
    // Upward puff
    this.emit(playerRightX - 3 * S, groundTop - 4 * S, 2, {
      color: 0xa89070,
      sizeMin: 1 * S, sizeMax: 3 * S,
      speedMin: 15 * S, speedMax: 40 * S,
      lifeMin: 200, lifeMax: 350,
      angle: -Math.PI / 2, spread: Math.PI * 0.5,
    });
  }

  spawnJumpBurst(x: number, y: number, jumpCount: number): void {
    if (jumpCount < 2) return;
    const footY = y + PLAYER_TEX_HEIGHT / 4;
    this.emit(x, footY, 4, {
      color: COLOR_PLAYER,
      sizeMin: 1 * S, sizeMax: 3 * S,
      speedMin: 20 * S, speedMax: 50 * S,
      lifeMin: 250, lifeMax: 400,
      angle: Math.PI / 2, spread: Math.PI * 0.6,
    });
  }

  spawnCoinBurst(x: number, y: number): void {
    this.emit(x, y, COIN_BURST_COUNT, {
      color: 0xf1c40f,
      sizeMin: 2 * S, sizeMax: 4 * S,
      speedMin: 40 * S, speedMax: 100 * S,
      lifeMin: 200, lifeMax: 400,
    });
  }

  spawnQuizFlash(x: number, y: number): void {
    this.emit(x, y, QUIZ_BURST_COUNT, {
      color: 0xff6b35,
      sizeMin: 2 * S, sizeMax: 5 * S,
      speedMin: 50 * S, speedMax: 120 * S,
      lifeMin: 200, lifeMax: 400,
    });
    this.spawnExpandRing(x, y, 0xff6b35, 22 * S, 66 * S, 200);
  }

  spawnDeathExplosion(x: number, y: number): void {
    this.emit(x, y, DEATH_BURST_COUNT, {
      color: COLOR_PLAYER,
      sizeMin: 2 * S, sizeMax: 5 * S,
      speedMin: 50 * S, speedMax: 150 * S,
      lifeMin: 300, lifeMax: 600,
    });
    this.spawnExpandRing(x, y, 0xffffff, 10 * S, 80 * S, 300);
  }

  spawnWrongCollect(x: number, y: number): void {
    this.emit(x, y, 6, {
      color: 0xe74c3c,
      sizeMin: 2 * S, sizeMax: 4 * S,
      speedMin: 30 * S, speedMax: 70 * S,
      lifeMin: 200, lifeMax: 350,
    });
  }

  // ── Expanding ring effect ──
  private rings: { x: number; y: number; radius: number; maxRadius: number; life: number; maxLife: number; color: number }[] = [];

  private spawnExpandRing(x: number, y: number, color: number, startR: number, endR: number, duration: number): void {
    this.rings.push({
      x, y,
      radius: startR, maxRadius: endR,
      life: duration, maxLife: duration,
      color,
    });
  }

  // ── Score popup text ──

  spawnScorePopup(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: `${14 * S}px`,
      color: color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2 * S,
    }).setOrigin(0.5).setDepth(DEPTH_HUD);
    this.popups.push({ text: t, life: SCORE_POPUP_DURATION, maxLife: SCORE_POPUP_DURATION, startY: y });
  }

  // ── Speed lines ──

  spawnSpeedLines(): void {
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      for (const sl of this.speedLines) {
        if (!sl.active) {
          sl.x = GAME_WIDTH + Phaser.Math.Between(0, 100 * S);
          sl.y = Phaser.Math.Between(30 * S, GAME_HEIGHT - 60 * S);
          sl.width = Phaser.Math.Between(15 * S, 30 * S);
          sl.alpha = Phaser.Math.FloatBetween(0.15, 0.3);
          sl.speed = Phaser.Math.Between(600 * S, 1000 * S);
          sl.active = true;
          break;
        }
      }
    }
  }

  // ── Main update ──

  update(delta: number): void {
    const dt = delta / 1000;
    this.gfx.clear();

    // Update & draw particles
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.life / p.maxLife;
      this.gfx.fillStyle(p.color, t * 0.8);
      this.gfx.fillCircle(p.x, p.y, p.size * t);
    }

    // Update & draw expanding rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life -= delta;
      if (ring.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - ring.life / ring.maxLife;
      const r = ring.radius + (ring.maxRadius - ring.radius) * t;
      this.gfx.lineStyle(2 * S, ring.color, (1 - t) * 0.6);
      this.gfx.strokeCircle(ring.x, ring.y, r);
    }

    // Update & draw speed lines
    for (const sl of this.speedLines) {
      if (!sl.active) continue;
      sl.x -= sl.speed * dt;
      if (sl.x + sl.width < 0) {
        sl.active = false;
        continue;
      }
      this.gfx.fillStyle(0xffffff, sl.alpha);
      this.gfx.fillRect(sl.x, sl.y, sl.width, 1 * S);
    }

    // Update & draw ambient dust
    for (const d of this.ambientDusts) {
      d.x += d.vx * dt;
      d.phase += dt * 1.5;
      d.y = d.baseY + Math.sin(d.phase) * 8 * S;
      if (d.x < -10 * S) {
        d.x = GAME_WIDTH + 10 * S;
        d.y = Phaser.Math.Between(50 * S, GAME_HEIGHT - 80 * S);
        d.baseY = d.y;
      }
      this.gfx.fillStyle(0xf5e6ca, d.alpha);
      this.gfx.fillCircle(d.x, d.y, d.size);
    }

    // Update & draw popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= delta;
      if (pop.life <= 0) {
        pop.text.destroy();
        this.popups.splice(i, 1);
        continue;
      }
      const t = 1 - pop.life / pop.maxLife;
      pop.text.setY(pop.startY - SCORE_POPUP_RISE * t);
      pop.text.setAlpha(1 - t);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    for (const pop of this.popups) {
      pop.text.destroy();
    }
    this.popups = [];
    this.rings = [];
  }
}
