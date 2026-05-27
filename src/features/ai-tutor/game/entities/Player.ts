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
  // 거인화 transition 의 목표 scale — update 에서 매 프레임 lerp 로 _giantScale 점진 변경.
  // 즉시 setScale 변동(시각적 깜빡임/사라짐) 방지.
  private _targetGiantScale = 1;
  private _giantScaleOnComplete: (() => void) | null = null;
  // 거인화 활성 중 player X 를 이 값으로 강제 (Phaser body 보정으로 좌측 벽까지 밀리는 버그 방지)
  private fixedX: number | null = null;
  // 거인화/초고속 돌진 등 "구덩이 무시" 어빌리티 활성 중 player Y 를 ground 위에 고정.
  private groundLocked = false;

  setFixedX(x: number | null): void {
    this.fixedX = x;
  }

  setGroundLocked(locked: boolean): void {
    this.groundLocked = locked;
  }

  isGroundLocked(): boolean {
    return this.groundLocked;
  }

  /**
   * 거인화 scale 변경. tween 없이 update() 안에서 매 프레임 lerp 로 부드럽게 _giantScale 변경.
   * y 좌표는 건드리지 않음 — groundLocked 가 visual 발을 ground 위로 강제.
   * @param onComplete scale 도달 시 콜백 (deactivate 흐름 — groundLocked 해제 등)
   */
  setGiantScale(scale: number, onComplete?: () => void): void {
    this._targetGiantScale = scale;
    this._giantScaleOnComplete = onComplete ?? null;
  }

  getGiantScale(): number {
    return this._giantScale;
  }

  /** _giantScale 을 _targetGiantScale 쪽으로 ~300ms 에 도달하도록 매 프레임 lerp. */
  private updateGiantScaleLerp(delta: number): void {
    const diff = this._targetGiantScale - this._giantScale;
    if (Math.abs(diff) < 0.01) {
      if (this._giantScale !== this._targetGiantScale) {
        this._giantScale = this._targetGiantScale;
        const cb = this._giantScaleOnComplete;
        this._giantScaleOnComplete = null;
        cb?.();
      }
      return;
    }
    // 300ms 안에 거의 도달하도록 (delta/300 비율로 보간)
    this._giantScale += diff * Math.min(1, delta / 300);
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

    // 거인화 scale 부드러운 transition (매 프레임 lerp)
    this.updateGiantScaleLerp(delta);

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
    // Giant 발동 중에는 source 를 1/scale 로 줄여 actual body = 원본(30×38) 유지 →
    // ground collision 정상, 점프 정상, 화면 좌측 밀림 방지.
    const gs2 = this._giantScale;
    if (this.ducking) {
      body.setSize(30 * S, 19 * S);
      body.setOffset(5 * S, 22 * S);
      // Tilt only when sliding on ground; flat in air
      this.setAngle(onGround ? -10 : 0);
    } else if (gs2 !== 1) {
      body.setSize(30 * S / gs2, 38 * S / gs2);
      body.setOffset(5 * S / gs2, 5 * S / gs2);
    } else {
      body.setSize(30 * S, 38 * S);
      body.setOffset(5 * S, 5 * S);
    }

    // Apply giant visual scale when no squash/stretch tween is playing
    if (gs2 !== 1 && (!this.squashTween || !this.squashTween.isPlaying())) {
      this.setScale(gs2);
    }

    // 거인화 중 X 고정 — Phaser body 보정/충돌로 player 가 화면 좌측 벽까지 밀려나는 케이스 차단
    if (this.fixedX !== null) {
      this.x = this.fixedX;
      body.setVelocityX(0);
    }

    // 무적(거인화·초고속 돌진 등) 활성 중에는 구덩이 위에서도 ground 위에 떠있도록 Y 강제.
    // 거인화 시에는 visual 발(PLAYER_TEX_HEIGHT/2 × scale)이 ground top 에 닿도록,
    // 평소(scale=1, 초고속 돌진)에는 평소 body 발 위치(player 원래 ground 위치) 유지.
    if (this.groundLocked) {
      const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
      const offset = this._giantScale > 1
        ? (PLAYER_TEX_HEIGHT / 2) * this._giantScale
        : 19 * S; // body source height/2 — 평소 ground 위 위치
      const targetY = groundTop - offset;
      this.y = targetY;
      body.setVelocityY(0);
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

    // groundLocked(거인화/초고속) 활성 중에는 실제 점프 대신 회전 모션만 트리거 — 시각 도파민용.
    // body 가 ground 와 안 닿아 있어 일반 점프 분기 모두 fail, spinning 효과만 살리기 위함.
    if (this.groundLocked) {
      this.spinning = true;
      this.jumpCount++;
      this.emit('jump', this.x, this.y, this.jumpCount);
      return;
    }

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
    // y 좌표를 8.5*S 만큼 내리면서 body 가 ground 안쪽으로 한두 프레임 박히는
    // 케이스 방지 — 즉시 ground 위로 보정.
    this.ensureAboveGround();
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
    this._targetGiantScale = 1;
    this._giantScaleOnComplete = null;
    this.fixedX = null;
    this.groundLocked = false;
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
