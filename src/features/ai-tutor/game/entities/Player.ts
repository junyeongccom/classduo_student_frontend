import * as Phaser from "phaser";
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
  GROUND_Y,
  GROUND_HEIGHT,
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
  private duckRequested = false;
  private isRunning = false;
  private wasInAir = false;
  private squashTween?: Phaser.Tweens.Tween;
  private lastLandTime = 0;
  private trail: Phaser.GameObjects.Graphics;
  private prevPositions: { x: number; y: number }[] = [];

  jumpMultiplier = 1;
  scrollSpeed = 0;
  clampLeft = true;
  private _giantScale = 1;

  setGiantScale(scale: number): void {
    const old = this._giantScale;
    if (scale === old) return;
    this._giantScale = scale;
    if (scale > old) {
      // Growing: shift up so feet stay on ground (larger sprite pushes feet down)
      this.y -= (PLAYER_TEX_HEIGHT / 2) * (scale - old);
    }
    // Shrinking: don't adjust Y — moving down risks pushing body inside ground.
    // Player floats briefly; gravity brings them back down naturally.
  }

  getGiantScale(): number {
    return this._giantScale;
  }

  startSpin(): void {
    this.spinning = true;
  }

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
      const gs = this._giantScale;
      if (this.ducking) {
        this.setScale(1.3 * gs, 0.5 * gs);
      } else {
        this.setScale(1.4 * gs, 0.6 * gs);
        this.squashTween = this.scene.tweens.add({
          targets: this,
          scaleX: gs,
          scaleY: gs,
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

    // Buffered duck: pressed slide in air → execute on landing
    if (onGround && this.duckRequested) {
      this.duckRequested = false;
      this.startDuck();
    }

    // Clamp left side only (disabled during intro run-in)
    if (this.clampLeft && this.x < PLAYER_SIZE / 2) {
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
    // NOTE: setSize sets SOURCE dimensions; updateBounds multiplies by sprite scale.
    // So do NOT multiply by gs here — setScale(gs) already handles body scaling.
    if (this.ducking) {
      body.setSize(30 * S, 19 * S);
      body.setOffset(5 * S, 22 * S);
      // Tilt only when sliding on ground; flat in air
      this.setAngle(onGround ? -10 : 0);
    } else {
      body.setSize(30 * S, 38 * S);
      body.setOffset(5 * S, 5 * S);
    }

    // Apply giant visual scale when no squash/stretch tween is playing
    const gs2 = this._giantScale;
    if (gs2 !== 1 && (!this.squashTween || !this.squashTween.isPlaying())) {
      this.setScale(gs2);
    }

    this.applyVariableGravity(body);

    // Spin ghost trail
    if (this.spinning) {
      // Shift existing trail positions by scroll speed (world moves left)
      const dt = delta / 1000;
      for (const pos of this.prevPositions) {
        pos.x += this.scrollSpeed * dt;
      }
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
    if (this._giantScale !== 1) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down) {
      this.duckRequested = true;
      return;
    }
    this.ducking = true;
    this.squashTween?.stop();
    body.setSize(30 * S, 19 * S);
    body.setOffset(5 * S, 22 * S);
    this.y += 8.5 * S;
    this.setScale(1.3 * this._giantScale, 0.5 * this._giantScale);
  }

  endDuck(): void {
    this.duckRequested = false;
    if (!this.ducking) return;
    this.ducking = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30 * S, 38 * S);
    body.setOffset(5 * S, 5 * S);
    this.y -= 8.5 * S;
    this.setScale(this._giantScale, this._giantScale);
    this.setAngle(0);
  }

  resetState(): void {
    this.jumpCount = 0;
    this.lastGroundedAt = 0;
    this.jumpBufferedAt = 0;
    this.jumpHeld = false;
    this.maxJumps = MAX_JUMPS;
    this.jumpMultiplier = 1;
    this.scrollSpeed = 0;
    this._giantScale = 1;
    this.justJumped = false;
    this.spinning = false;
    this.ducking = false;
    this.duckRequested = false;
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

  private savedVelocity: { x: number; y: number } | null = null;

  prepareForPause(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Stop spinning and reset angle so collision box is aligned
    if (this.spinning) {
      this.spinning = false;
      this.setAngle(0);
    }
    // Save and zero velocity
    this.savedVelocity = { x: body.velocity.x, y: body.velocity.y };
    body.setVelocity(0, 0);
  }

  restoreAfterPause(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Restore saved velocity
    if (this.savedVelocity) {
      body.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
      this.savedVelocity = null;
    }
    // Ensure player is not below ground
    this.ensureAboveGround();
  }

  ensureAboveGround(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const bodyHeight = body.height * this.scaleY;
    const maxY = groundTop - bodyHeight / 2;
    if (this.y > maxY) {
      this.y = maxY;
      body.setVelocityY(0);
    }
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

    // Squash & Stretch: stretch on jump (account for giant scale)
    const gs = this._giantScale;
    this.squashTween?.stop();
    this.setScale(0.75 * gs, 1.35 * gs);
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: gs,
      scaleY: gs,
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
