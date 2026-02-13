import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { GroundSegment } from "../entities/GroundSegment";
import { Coin } from "../entities/Coin";
import { QuizItem } from "../entities/QuizItem";
import { QuizManager, GameState } from "../quiz/QuizManager";
import { ScreenFXManager } from "../systems/ScreenFXManager";
import { ParticleManager } from "../systems/ParticleManager";
import { CameraManager } from "../systems/CameraManager";
import { UIManager } from "../systems/UIManager";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_X,
  PLAYER_TEX_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  GROUND_TILE_WIDTH,
  GROUND_SEGMENT_MIN,
  GROUND_SEGMENT_MAX,
  GAP_WIDTH_MIN,
  GAP_WIDTH_MAX,
  GAP_PROBABILITY,
  SCROLL_SPEED_INITIAL,
  SCROLL_SPEED_MAX,
  SCROLL_SPEED_INCREMENT,
  SPEED_UP_COIN_INTERVAL,
  COIN_LINE_SPACING,
  COIN_ARC_COUNT,
  COIN_GROUND_Y_OFFSET,
  COIN_HIGH_Y,
  COIN_MID_Y,
  COIN_DIAGONAL_COUNT,
  COIN_ZIGZAG_COUNT,
  COIN_DIAMOND_COUNT,
  QUIZ_INTERVAL_MS,
  FALL_DEATH_Y,
  MAX_JUMPS,
  SPEED_STACK_BASE,
  JUMP_STACK_BASE,
  SPEED_MULT_MIN,
  SPEED_MULT_MAX,
  JUMP_MULT_MIN,
  JUMP_MULT_MAX,
  JUMP_COUNT_MIN,
  JUMP_COUNT_MAX,
  HP_MAX,
  HP_RESTORE_AMOUNT,
  HP_DECAY_STACK_BASE,
  HP_DECAY_MULT_MIN,
  HP_DECAY_MULT_MAX,
  SPEED_LINE_THRESHOLD,
  SHAKE_FALL_DEATH,
  SHAKE_HP_DEATH,
  SHAKE_WRONG_COLLECT,
  SHAKE_QUIZ_COLLECT,
  FREEZE_DEATH,
  FLASH_CORRECT,
  FLASH_WRONG,
  ZOOM_PUNCH_QUIZ,
  ZOOM_PUNCH_REWARD,
} from "../constants";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private grounds!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private quizItems!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private baseScrollSpeed = SCROLL_SPEED_INITIAL;
  private scrollSpeedMultiplier = 1;
  private gameState: GameState = "playing";
  private nextGroundX = 0;
  private distanceTraveled = 0;
  private totalCoinsCollected = 0;
  private quizTimer = 0;

  private speedStacks = 0;
  private jumpStacks = 0;
  private jumpCountStacks = 0;

  private hp = HP_MAX;
  private hpMax = HP_MAX;
  private hpDecayStacks = 0;
  private hpDecayMultiplier = 1;

  private lastCoinPattern = "";

  private quizManager!: QuizManager;
  private lastSlideDustTime = 0;
  private lastHpFlashTime = 0;

  private startUI: Phaser.GameObjects.Container | null = null;

  // Managers
  private screenFX!: ScreenFXManager;
  private particles!: ParticleManager;
  private cameraManager!: CameraManager;
  private ui!: UIManager;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.resetState();
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT + 200);

    // Create managers
    this.screenFX = new ScreenFXManager(this);
    this.particles = new ParticleManager(this);
    this.cameraManager = new CameraManager(this);
    this.ui = new UIManager(this);

    this.cameraManager.create();
    this.ui.create();

    this.createGroups();
    this.createPlayer();
    this.setupCollisions();
    this.setupInput();
    this.createQuizManager();
    this.fillInitialGround();

    // Fade in, then show START UI
    this.cameras.main.fadeIn(400);
    this.physics.pause();
    this.createStartUI();
  }

  private createStartUI(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Opaque overlay — hides game background completely
    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
      .setOrigin(0.5);

    // START text
    const startText = this.add
      .text(0, 0, "START", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${Math.round(64 * S)}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6 * S,
      })
      .setOrigin(0.5);

    // Tap hint
    const hintText = this.add
      .text(0, 50 * S, "Tap to Start", {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(20 * S)}px`,
        color: "#cccccc",
      })
      .setOrigin(0.5);

    const container = this.add.container(cx, cy, [overlay, startText, hintText]);
    container.setDepth(1000);
    container.setSize(GAME_WIDTH, GAME_HEIGHT);
    container.setInteractive();

    // Pulse animation
    this.tweens.add({
      targets: startText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    container.on("pointerdown", () => {
      this.startGame();
    });

    this.startUI = container;
  }

  private startGame(): void {
    if (this.gameState !== "waiting_start") return;

    if (this.startUI) {
      this.tweens.add({
        targets: this.startUI,
        alpha: 0,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          this.startUI?.destroy();
          this.startUI = null;

          // Begin intro — spin drop from above
          this.gameState = "intro";
          this.physics.resume();

          // Keep ground still during intro
          this.grounds.getChildren().forEach((obj) => {
            (obj as GroundSegment).setScrollSpeed(0);
          });

          // Player drops from above with spin
          this.player.setVisible(true);
          this.player.setAlpha(1);
          this.player.startSpin();

          // On landing: impact effect → brief pause → playing
          this.player.once("land", () => {
            this.screenFX.shake({ intensity: 0.006, duration: 150 });
            this.particles.spawnDustEffect(this.player.x);
            this.time.delayedCall(400, () => {
              this.gameState = "playing";
            });
          });
        },
      });
    }
  }

  private resetState(): void {
    this.score = 0;
    this.baseScrollSpeed = SCROLL_SPEED_INITIAL;
    this.scrollSpeedMultiplier = 1;
    this.speedStacks = 0;
    this.jumpStacks = 0;
    this.jumpCountStacks = 0;
    this.gameState = "waiting_start";
    this.nextGroundX = 0;
    this.distanceTraveled = 0;
    this.totalCoinsCollected = 0;
    this.quizTimer = 0;
    this.hp = HP_MAX;
    this.hpMax = HP_MAX;
    this.hpDecayStacks = 0;
    this.hpDecayMultiplier = 1;
    this.lastSlideDustTime = 0;
    this.lastHpFlashTime = 0;
    this.lastCoinPattern = "";
  }

  private createGroups(): void {
    this.grounds = this.physics.add.group({
      runChildUpdate: true,
      allowGravity: false,
      immovable: true,
    });
    this.coins = this.physics.add.group({
      runChildUpdate: true,
      allowGravity: false,
      immovable: true,
    });
    this.quizItems = this.physics.add.group({
      runChildUpdate: true,
      allowGravity: false,
      immovable: true,
    });
  }

  private createPlayer(): void {
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const bodyBottomFromCenter = -PLAYER_TEX_HEIGHT / 2 + (5 + 38) * S;
    const playerY = groundTop - bodyBottomFromCenter;

    // Hidden above screen until intro drop
    this.player = new Player(this, PLAYER_X, -80 * S);
    this.player.setAlpha(0);
    this.player.setVisible(false);

    this.player.on("land", this.onPlayerLand, this);
    this.player.on("jump", this.onPlayerJump, this);
  }

  private onPlayerLand = (x: number, _y: number): void => {
    this.particles.spawnDustEffect(x);
  };

  private onPlayerJump = (x: number, y: number, jumpCount: number): void => {
    this.particles.spawnJumpBurst(x, y, jumpCount);
  };

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.grounds);
    this.physics.add.overlap(this.player, this.coins, this.onCollectCoin, undefined, this);
    this.physics.add.overlap(this.player, this.quizItems, this.onCollectQuizItem, undefined, this);
  }

  private setupInput(): void {
    this.input.keyboard?.on("keydown-SPACE", this.handleJumpDown, this);
    this.input.keyboard?.on("keydown-UP", this.handleJumpDown, this);
    this.input.keyboard?.on("keyup-SPACE", this.handleJumpUp, this);
    this.input.keyboard?.on("keyup-UP", this.handleJumpUp, this);
    this.input.keyboard?.on("keydown-DOWN", this.handleDuckDown, this);
    this.input.keyboard?.on("keyup-DOWN", this.handleDuckUp, this);
    this.input.on("pointerdown", this.handleJumpDown, this);
    this.input.on("pointerup", this.handleJumpUp, this);
  }

  private createQuizManager(): void {
    this.quizManager = new QuizManager(this, this.quizItems, {
      getScrollSpeed: () => this.getEffectiveSpeed(),
      applySpeedUp: () => this.applySpeedUp(),
      applySpeedDown: () => this.applySpeedDown(),
      applyJumpUp: () => this.applyJumpUp(),
      applyJumpDown: () => this.applyJumpDown(),
      applyJumpCountUp: () => this.applyJumpCountUp(),
      applyJumpCountDown: () => this.applyJumpCountDown(),
      isJumpCountMaxed: () => this.player.maxJumps >= JUMP_COUNT_MAX,
      isJumpCountAtMin: () => this.player.maxJumps <= JUMP_COUNT_MIN,
      applyHpRestore: () => this.applyHpRestore(),
      applyHpDrain: () => this.applyHpDrain(),
      applyHpDecayDown: () => this.applyHpDecayDown(),
      applyHpDecayUp: () => this.applyHpDecayUp(),
      setGameState: (state: GameState) => {
        this.gameState = state;
      },
      addScore: (amount: number) => {
        this.score = Math.max(0, this.score + amount);
        this.ui.setScore(this.score);
      },
      showEffect: (text: string, color: string) => this.ui.showEffect(text, color),
      onQuizCollect: (x: number, y: number) => {
        // Same effect for both correct and wrong — no spoiler
        this.screenFX.shake(SHAKE_QUIZ_COLLECT);
        this.screenFX.flash(FLASH_CORRECT);
        this.particles.spawnQuizFlash(x, y);
      },
      onQuizAnnounce: () => {
        this.screenFX.zoomPunch(ZOOM_PUNCH_QUIZ);
      },
      onRewardSelect: (isCorrect: boolean) => {
        if (isCorrect) {
          this.screenFX.zoomPunch(ZOOM_PUNCH_REWARD);
        } else {
          // Wrong answer revealed — impact effect
          this.screenFX.shake(SHAKE_WRONG_COLLECT);
          this.screenFX.flash(FLASH_WRONG);
        }
      },
    });
  }

  private handleJumpDown = (): void => {
    if (this.gameState === "waiting_start") {
      this.startGame();
      return;
    }
    if (this.gameState === "game_over" || this.gameState === "intro") return;
    this.player.requestJump(this.time.now);
  };

  private handleJumpUp = (): void => {
    this.player.releaseJump();
  };

  private handleDuckDown = (): void => {
    if (this.gameState === "waiting_start") {
      this.startGame();
      return;
    }
    if (this.gameState === "game_over" || this.gameState === "intro") return;
    this.player.startDuck();
  };

  private handleDuckUp = (): void => {
    this.player.endDuck();
  };

  // ── Ground spawning ──

  private fillInitialGround(): void {
    this.nextGroundX = 0;
    while (this.nextGroundX < GAME_WIDTH + GROUND_TILE_WIDTH) {
      const tileCount = Phaser.Math.Between(GROUND_SEGMENT_MIN, GROUND_SEGMENT_MAX);
      const width = tileCount * GROUND_TILE_WIDTH;
      this.spawnGroundSegment(this.nextGroundX + width / 2, width);
      // No coins on initial ground — they appear naturally after intro
      this.nextGroundX += width;
    }
  }

  private spawnGroundSegment(centerX: number, width: number): void {
    const seg = new GroundSegment(this, centerX, GROUND_Y, width);
    this.grounds.add(seg);
    seg.setScrollSpeed(this.getEffectiveSpeed());
  }

  private spawnNewGround(): void {
    while (this.nextGroundX < GAME_WIDTH + GROUND_TILE_WIDTH * 2) {
      if (this.distanceTraveled > 800 && Math.random() < GAP_PROBABILITY) {
        const gapWidth = Phaser.Math.Between(GAP_WIDTH_MIN, GAP_WIDTH_MAX);
        this.spawnArcCoins(this.nextGroundX, gapWidth);
        this.nextGroundX += gapWidth;
      }

      const tileCount = Phaser.Math.Between(GROUND_SEGMENT_MIN, GROUND_SEGMENT_MAX);
      const width = tileCount * GROUND_TILE_WIDTH;
      this.spawnGroundSegment(this.nextGroundX + width / 2, width);

      const excludeSlots = new Set<number>();
      const totalSlots = Math.floor(width / COIN_LINE_SPACING);

      // 60% chance to spawn a bonus aerial formation
      if (Math.random() < 0.6 && totalSlots > 0) {
        const bonusPatterns = ["high", "diagonal", "zigzag", "diamond"];
        const candidates = bonusPatterns.filter((p) => p !== this.lastCoinPattern);
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        this.lastCoinPattern = chosen;

        switch (chosen) {
          case "high": {
            const count = Math.min(5, totalSlots);
            for (let i = 0; i < count; i++) excludeSlots.add(i);
            this.spawnHighCoins(this.nextGroundX, width);
            break;
          }
          case "diagonal": {
            const count = Math.min(COIN_DIAGONAL_COUNT, totalSlots);
            for (let i = 0; i < count; i++) excludeSlots.add(i);
            this.spawnDiagonalCoins(this.nextGroundX, width);
            break;
          }
          case "zigzag": {
            const count = Math.min(COIN_ZIGZAG_COUNT, totalSlots);
            for (let i = 0; i < count; i++) excludeSlots.add(i);
            this.spawnZigzagCoins(this.nextGroundX, width);
            break;
          }
          case "diamond": {
            const centerSlot = Math.floor(totalSlots / 2);
            for (let s = centerSlot - 1; s <= centerSlot + 1; s++) {
              if (s >= 0 && s < totalSlots) excludeSlots.add(s);
            }
            this.spawnDiamondCoins(this.nextGroundX, width);
            break;
          }
        }
      }

      // Always spawn ground coins, skipping slots occupied by formations
      this.spawnGroundCoins(this.nextGroundX, width, excludeSlots);

      this.nextGroundX += width;
    }
  }

  // ── Coin spawning ──

  private spawnGroundCoins(startX: number, segWidth: number, excludeSlots?: Set<number>): void {
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    const y = groundTop + COIN_GROUND_Y_OFFSET;
    const count = Math.floor(segWidth / COIN_LINE_SPACING);
    const speed = this.getEffectiveSpeed();
    for (let i = 0; i < count; i++) {
      if (excludeSlots?.has(i)) continue;
      const x = startX + COIN_LINE_SPACING / 2 + i * COIN_LINE_SPACING;
      const coin = new Coin(this, x, y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  private spawnHighCoins(startX: number, segWidth: number): void {
    const y = COIN_HIGH_Y;
    const count = Math.min(5, Math.floor(segWidth / COIN_LINE_SPACING));
    const speed = this.getEffectiveSpeed();
    for (let i = 0; i < count; i++) {
      const x = startX + COIN_LINE_SPACING / 2 + i * COIN_LINE_SPACING;
      const coin = new Coin(this, x, y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  private spawnArcCoins(gapStartX: number, gapWidth: number): void {
    const speed = this.getEffectiveSpeed();
    const groundTop = GROUND_Y - GROUND_HEIGHT / 2;
    for (let i = 0; i < COIN_ARC_COUNT; i++) {
      const t = i / (COIN_ARC_COUNT - 1);
      const x = gapStartX + gapWidth * t;
      const arcHeight = 120 * S;
      const y = groundTop - 30 * S - arcHeight * 4 * t * (1 - t);
      const coin = new Coin(this, x, y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  private spawnDiagonalCoins(startX: number, segWidth: number): void {
    const midY = COIN_MID_Y;
    const highY = COIN_HIGH_Y;
    const ascending = Math.random() < 0.5;
    const speed = this.getEffectiveSpeed();

    for (let i = 0; i < COIN_DIAGONAL_COUNT; i++) {
      const t = i / (COIN_DIAGONAL_COUNT - 1);
      const x = startX + COIN_LINE_SPACING / 2 + i * COIN_LINE_SPACING;
      const y = ascending
        ? midY + (highY - midY) * t
        : highY + (midY - highY) * t;
      const coin = new Coin(this, x, y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  private spawnZigzagCoins(startX: number, segWidth: number): void {
    const midY = COIN_MID_Y;
    const highY = COIN_HIGH_Y;
    const count = Math.min(COIN_ZIGZAG_COUNT, Math.floor(segWidth / COIN_LINE_SPACING));
    const speed = this.getEffectiveSpeed();

    for (let i = 0; i < count; i++) {
      const x = startX + COIN_LINE_SPACING / 2 + i * COIN_LINE_SPACING;
      const y = i % 2 === 0 ? midY : highY;
      const coin = new Coin(this, x, y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  private spawnDiamondCoins(startX: number, segWidth: number): void {
    const highY = COIN_HIGH_Y;
    const midY = COIN_MID_Y;
    const totalSlots = Math.floor(segWidth / COIN_LINE_SPACING);
    const centerSlot = Math.floor(totalSlots / 2);
    const centerX = startX + COIN_LINE_SPACING / 2 + centerSlot * COIN_LINE_SPACING;
    const centerY = (highY + midY) / 2;
    const speed = this.getEffectiveSpeed();

    // Diamond in mid~high range, snapped to coin grid
    const points = [
      { x: centerX, y: highY },                        // top
      { x: centerX - COIN_LINE_SPACING, y: centerY },  // left
      { x: centerX, y: centerY },                      // center
      { x: centerX + COIN_LINE_SPACING, y: centerY },  // right
      { x: centerX, y: midY },                         // bottom
    ];

    for (const pt of points) {
      const coin = new Coin(this, pt.x, pt.y);
      this.coins.add(coin);
      coin.setScrollSpeed(speed);
    }
  }

  // ── Coin collection ──

  private onCollectCoin: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    coinObj
  ): void => {
    const coin = coinObj as Coin;
    const cx = coin.x;
    const cy = coin.y;
    coin.destroy();

    this.score++;
    this.totalCoinsCollected++;
    this.ui.setScore(this.score);

    // Coin burst particles + popup
    this.particles.spawnCoinBurst(cx, cy);
    this.particles.spawnScorePopup(cx, cy - 10 * S, "+1", "#f1c40f");

    // Speed increase
    if (this.totalCoinsCollected % SPEED_UP_COIN_INTERVAL === 0) {
      this.baseScrollSpeed = Math.max(
        this.baseScrollSpeed + SCROLL_SPEED_INCREMENT,
        SCROLL_SPEED_MAX
      );
    }
  };

  // ── Quiz item collection ──

  private onCollectQuizItem: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    itemObj
  ): void => {
    if (this.gameState !== "quiz_active") return;
    const item = itemObj as QuizItem;
    this.quizManager.handleCollection(item);
  };

  // ── Buff / Debuff ──

  private getEffectiveSpeed(): number {
    return this.baseScrollSpeed * this.scrollSpeedMultiplier;
  }

  private applySpeedUp(): void {
    this.speedStacks++;
    this.scrollSpeedMultiplier = Phaser.Math.Clamp(
      Math.pow(SPEED_STACK_BASE, this.speedStacks),
      SPEED_MULT_MIN, SPEED_MULT_MAX
    );
  }

  private applySpeedDown(): void {
    this.speedStacks--;
    this.scrollSpeedMultiplier = Phaser.Math.Clamp(
      Math.pow(SPEED_STACK_BASE, this.speedStacks),
      SPEED_MULT_MIN, SPEED_MULT_MAX
    );
  }

  private applyJumpUp(): void {
    this.jumpStacks++;
    this.player.jumpMultiplier = Phaser.Math.Clamp(
      Math.pow(JUMP_STACK_BASE, this.jumpStacks),
      JUMP_MULT_MIN, JUMP_MULT_MAX
    );
  }

  private applyJumpDown(): void {
    this.jumpStacks--;
    this.player.jumpMultiplier = Phaser.Math.Clamp(
      Math.pow(JUMP_STACK_BASE, this.jumpStacks),
      JUMP_MULT_MIN, JUMP_MULT_MAX
    );
  }

  private applyJumpCountUp(): void {
    this.jumpCountStacks++;
    this.player.maxJumps = Phaser.Math.Clamp(
      MAX_JUMPS + this.jumpCountStacks,
      JUMP_COUNT_MIN, JUMP_COUNT_MAX
    );
  }

  private applyJumpCountDown(): void {
    this.jumpCountStacks--;
    this.player.maxJumps = Phaser.Math.Clamp(
      MAX_JUMPS + this.jumpCountStacks,
      JUMP_COUNT_MIN, JUMP_COUNT_MAX
    );
  }

  private applyHpRestore(): void {
    this.hp = Math.min(this.hp + HP_RESTORE_AMOUNT, this.hpMax);
  }

  private applyHpDrain(): void {
    this.hp = Math.max(1, this.hp - HP_RESTORE_AMOUNT);
  }

  private applyHpDecayDown(): void {
    this.hpDecayStacks--;
    this.hpDecayMultiplier = Phaser.Math.Clamp(
      Math.pow(HP_DECAY_STACK_BASE, this.hpDecayStacks),
      HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX
    );
  }

  private applyHpDecayUp(): void {
    this.hpDecayStacks++;
    this.hpDecayMultiplier = Phaser.Math.Clamp(
      Math.pow(HP_DECAY_STACK_BASE, this.hpDecayStacks),
      HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX
    );
  }

  // ── Sync scroll speed ──

  private syncScrollSpeed(): void {
    const speed = this.getEffectiveSpeed();
    this.grounds.getChildren().forEach((obj) => {
      (obj as GroundSegment).setScrollSpeed(speed);
    });
    this.coins.getChildren().forEach((obj) => {
      (obj as Coin).setScrollSpeed(speed);
    });
    this.quizItems.getChildren().forEach((obj) => {
      (obj as QuizItem).setScrollSpeed(speed);
    });
  }

  // ── Main update ──

  update(time: number, delta: number): void {
    if (
      this.gameState === "game_over" ||
      this.gameState === "choosing_reward" ||
      this.gameState === "waiting_start"
    )
      return;

    const isIntro = this.gameState === "intro";

    // Camera / parallax — stationary during intro
    if (!isIntro) {
      this.cameraManager.update(this.getEffectiveSpeed(), delta, this.score);
    }

    // HP decay, quiz timer — only during active gameplay
    if (!isIntro) {
      this.hp -= delta * this.hpDecayMultiplier;
      if (this.hp <= 0) {
        this.hp = 0;
        this.ui.updateHpGauge(this.hp, this.hpMax);
        this.triggerGameOver("hp");
        return;
      }
      this.ui.updateHpGauge(this.hp, this.hpMax);

      if (this.gameState === "playing") {
        this.quizTimer += delta;
        if (this.quizTimer >= QUIZ_INTERVAL_MS) {
          this.quizTimer = 0;
          this.quizManager.startQuiz();
        }
      }
    }

    // Player physics — runs during intro for ground collision
    this.player.scrollSpeed = isIntro ? 0 : this.getEffectiveSpeed();
    this.player.update(time, delta);

    // Slide dust
    if (!isIntro) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (this.player.isDucking && playerBody.blocked.down) {
        if (time - this.lastSlideDustTime > 50) {
          this.lastSlideDustTime = time;
          this.particles.spawnSlideDust(this.player.x + 25 * S);
        }
      }

      // Speed lines when going fast
      if (this.scrollSpeedMultiplier >= SPEED_LINE_THRESHOLD) {
        this.particles.spawnSpeedLines();
      }
    }

    // Ground scroll + spawn — stationary during intro
    if (!isIntro) {
      const scrollDelta = Math.abs(this.getEffectiveSpeed()) * (delta / 1000);
      this.distanceTraveled += scrollDelta;
      this.nextGroundX += this.getEffectiveSpeed() * (delta / 1000);

      this.spawnNewGround();
      this.syncScrollSpeed();
    }

    // Particle & UI update
    this.particles.update(delta);
    this.ui.update(delta);

    // Fall death — not during intro
    if (!isIntro && this.player.y > FALL_DEATH_Y) {
      this.triggerGameOver("fall");
    }
  }

  private triggerGameOver(cause: "hp" | "fall"): void {
    if (this.gameState === "game_over") return;
    this.gameState = "game_over";

    // Death effects
    if (cause === "fall") {
      this.screenFX.shake(SHAKE_FALL_DEATH);
      this.particles.spawnDeathExplosion(this.player.x, this.player.y);
    } else {
      this.screenFX.shake(SHAKE_HP_DEATH);
      this.particles.spawnDeathExplosion(this.player.x, this.player.y);
    }

    this.screenFX.freeze(FREEZE_DEATH, () => {
      this.finishGameOver(cause);
    });

    this.quizManager.cleanup();
    this.ui.cleanup();

    this.grounds.getChildren().forEach((obj) => {
      (obj as GroundSegment).setVelocityX(0);
    });
    this.coins.getChildren().forEach((obj) => {
      (obj as Coin).setVelocityX(0);
    });

    this.player.clearTrail();
    this.player.stop();
    this.player.setTexture("player_dead");
    this.player.setAngle(0);
  }

  private finishGameOver(cause: "hp" | "fall"): void {
    if (cause === "hp") {
      this.player.setTint(0xcccccc);
      this.tweens.add({
        targets: this.player,
        angle: 90,
        y: this.player.y + 10 * S,
        duration: 500,
        ease: "Power2",
        onComplete: () => {
          // Slow zoom + darken transition
          this.cameras.main.zoomTo(1.1, 800);
          this.cameras.main.fadeOut(800, 0, 0, 0, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress === 1) {
              const stats = this.quizManager.getStats();
              this.scene.start("GameOverScene", { score: this.score, ...stats });
            }
          });
        },
      });
    } else {
      this.player.setTint(0xff0000);
      this.cameras.main.zoomTo(1.1, 600);
      this.cameras.main.fadeOut(600, 0, 0, 0, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          const stats = this.quizManager.getStats();
          this.scene.start("GameOverScene", { score: this.score, ...stats });
        }
      });
    }
  }
}
