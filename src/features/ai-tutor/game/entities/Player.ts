import Phaser from "phaser";
import {
  S,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_JUMPS,
  JUMP_BUFFER_MS,
  COYOTE_TIME_MS,
  LOW_JUMP_GRAVITY_MULT,
  FALL_GRAVITY_MULT,
  PLAYER_SIZE,
  PLAYER_TEX_HEIGHT,
  COLOR_PLAYER,
  TRAIL_LENGTH,
} from "../constants";

// 720° / 0.4s = 1800°/s (same speed as old 2-rotation tween)
const SPIN_SPEED = 1800;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private jumpCount = 0;
  maxJumps = MAX_JUMPS;

  private lastGroundedAt = 0;
  private jumpBufferedAt = 0;
  private jumpHeld = false;
  private justJumped = false;
  private spinning = false;
  private ducking = false;
  private isRunning = false;
  private wasInAir = false;
  private squashTween?: Phaser.Tweens.Tween;
  private lastLandTime = 0;
  private trail: Phaser.GameObjects.Graphics;
  private prevPositions: { x: number; y: number }[] = [];

  jumpMultiplier = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_run0");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics body covers only the hoodie body, not the legs
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30 * S, 38 * S);
    body.setOffset(5 * S, 5 * S);

    // Spin ghost trail (rendered behind player)
    this.trail = scene.add.graphics();
    this.trail.setDepth((this.depth ?? 0) - 1);

    // Run animation (4-frame leg alternation)
    if (!scene.anims.exists("run")) {
      scene.anims.create({
        key: "run",
        frames: [
          { key: "player_run0" },
          { key: "player_run1" },
          { key: "player_run2" },
          { key: "player_run3" },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;

    // Landing detection → emit event for dust effect + squash
    // Cooldown prevents re-trigger when squash scale momentarily lifts body off ground
    if (this.wasInAir && onGround && time - this.lastLandTime > 200) {
      this.lastLandTime = time;
      this.emit('land', this.x, this.y);
      this.squashTween?.stop();
      if (this.ducking) {
        this.setScale(1.3, 0.5);
      } else {
        this.setScale(1.4, 0.6);
        this.squashTween = this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.Out',
        });
      }
    }
    this.wasInAir = !onGround;

    if (onGround) {
      this.lastGroundedAt = time;
      if (!this.justJumped) {
        this.jumpCount = 0;
      }
      if (this.spinning) {
        this.spinning = false;
        this.setAngle(0);
      }
    } else {
      this.justJumped = false;
    }

    if (onGround && time - this.jumpBufferedAt < JUMP_BUFFER_MS) {
      this.executeJump();
    }

    // Clamp left side only
    if (this.x < PLAYER_SIZE / 2) {
      this.x = PLAYER_SIZE / 2;
      body.setVelocityX(0);
    }

    // Animation state management
    if (this.spinning) {
      // Continuous rotation until landing
      this.angle += SPIN_SPEED * (delta / 1000);
      if (this.texture.key !== "player_spin") {
        this.stop();
        this.setTexture("player_spin");
        this.isRunning = false;
      }
    } else if (onGround) {
      if (this.ducking) {
        if (this.texture.key !== "player_duck") {
          this.stop();
          this.setTexture("player_duck");
          this.isRunning = false;
        }
      } else if (!this.isRunning) {
        this.play("run");
        this.isRunning = true;
      }
    } else {
      // In the air: rising = jump frame, falling = fall frame
      const vy = body.velocity.y;
      const targetTex = vy > 50 * S ? "player_fall" : "player_jump";
      if (this.isRunning || this.texture.key !== targetTex) {
        this.stop();
        this.setTexture(targetTex);
        this.isRunning = false;
      }
    }

    // Ensure body size stays correct after texture swap
    if (this.ducking) {
      body.setSize(30 * S, 19 * S);
      body.setOffset(5 * S, 24 * S);
      // Tilt only when sliding on ground; flat in air
      this.setAngle(onGround ? -10 : 0);
    } else {
      body.setSize(30 * S, 38 * S);
      body.setOffset(5 * S, 5 * S);
    }

    this.applyVariableGravity(body);

    // Spin ghost trail
    if (this.spinning) {
      this.prevPositions.push({ x: this.x, y: this.y });
      if (this.prevPositions.length > TRAIL_LENGTH) {
        this.prevPositions.shift();
      }
      this.trail.clear();
      for (let i = 0; i < this.prevPositions.length; i++) {
        const pos = this.prevPositions[i];
        const t = (i + 1) / this.prevPositions.length;
        const alpha = 0.35 * t;
        const radius = (PLAYER_SIZE / 2) * (0.4 + 0.4 * t);
        this.trail.fillStyle(0xc0392b, alpha);
        this.trail.fillCircle(pos.x, pos.y, radius);
      }
    } else {
      this.trail.clear();
      this.prevPositions.length = 0;
    }
  }

  requestJump(time: number): void {
    this.jumpHeld = true;
    this.jumpBufferedAt = time;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;
    const inCoyoteWindow = time - this.lastGroundedAt < COYOTE_TIME_MS;

    if (this.jumpCount === 0 && (onGround || inCoyoteWindow)) {
      this.executeJump();
    } else if (this.jumpCount > 0 && this.jumpCount < this.maxJumps) {
      this.executeJump();
    }
  }

  releaseJump(): void {
    this.jumpHeld = false;
  }

  get isDucking(): boolean {
    return this.ducking;
  }

  startDuck(): void {
    if (this.ducking) return;
    this.ducking = true;
    this.squashTween?.stop();
    // Compensate y so body bottom stays at same world position
    this.y += 8.5 * S;
    this.setScale(1.3, 0.5);
  }

  endDuck(): void {
    if (!this.ducking) return;
    this.ducking = false;
    // Compensate y so body bottom stays at same world position
    this.y -= 8.5 * S;
    this.setScale(1, 1);
    this.setAngle(0);
  }

  resetState(): void {
    this.jumpCount = 0;
    this.lastGroundedAt = 0;
    this.jumpBufferedAt = 0;
    this.jumpHeld = false;
    this.maxJumps = MAX_JUMPS;
    this.jumpMultiplier = 1;
    this.justJumped = false;
    this.spinning = false;
    this.ducking = false;
    this.isRunning = false;
    this.wasInAir = false;
    this.trail.clear();
    this.prevPositions.length = 0;
    this.squashTween?.stop();
    this.lastLandTime = 0;
    this.setScale(1, 1);
    this.setAngle(0);
    this.clearTint();
    this.setVelocity(0, 0);
    this.stop();
    this.setTexture("player_run0");
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(0);
    body.setSize(30 * S, 38 * S);
    body.setOffset(5 * S, 5 * S);
  }

  clearTrail(): void {
    this.trail.clear();
    this.prevPositions.length = 0;
  }

  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    super.destroy(fromScene);
  }

  private executeJump(): void {
    if (this.ducking) {
      this.endDuck();
    }
    this.setVelocityY(JUMP_VELOCITY * this.jumpMultiplier);
    this.jumpCount++;
    this.jumpBufferedAt = 0;
    this.justJumped = true;
    this.emit('jump', this.x, this.y, this.jumpCount);

    // Squash & Stretch: stretch on jump
    this.squashTween?.stop();
    this.setScale(0.75, 1.35);
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.Out',
    });

    // Spin on 2nd jump and above (continues until landing)
    if (this.jumpCount >= 2) {
      this.spinning = true;
    }
  }

  private applyVariableGravity(body: Phaser.Physics.Arcade.Body): void {
    const vy = body.velocity.y;
    const onGround = body.blocked.down;

    if (onGround) {
      body.setGravityY(0);
    } else if (vy < 0 && !this.jumpHeld) {
      body.setGravityY(GRAVITY * (LOW_JUMP_GRAVITY_MULT - 1));
    } else if (vy > 0) {
      body.setGravityY(GRAVITY * (FALL_GRAVITY_MULT - 1));
    } else {
      body.setGravityY(0);
    }
  }
}
