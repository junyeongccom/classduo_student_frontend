import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { GroundSegment } from "../entities/GroundSegment";
import { Coin } from "../entities/Coin";
import { QuizItem } from "../entities/QuizItem";
import { Meteor } from "../entities/Meteor";
import { HeartItem } from "../entities/HeartItem";
import { QuizManager, GameState } from "../quiz/QuizManager";
import { ActiveAbilityType } from "../quiz/quizTypes";
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
  QUIZ_SAFE_ZONE_MS,
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
  HEART_SPAWN_INTERVAL_MS,
  HEART_RESTORE_AMOUNT,
  HEART_RESTORE_STACK_BASE,
  HEART_RESTORE_MULT_MIN,
  HEART_RESTORE_MULT_MAX,
  HEART_SPAWN_Y,
  HEART_ITEM_SIZE,
  METEOR_SPAWN_INTERVAL_MIN_MS,
  METEOR_SPAWN_INTERVAL_MAX_MS,
  METEOR_SPEED_MULT,
  METEOR_DAMAGE_HP,
  METEOR_SIZE,
  METEOR_SPAWN_Y_MIN,
  METEOR_SPAWN_Y_MAX,
  HP_DECAY_BASE_RATE,
  QUIZ_CORRECT_HP_RESTORE,
  DIFFICULTY_RAMP_SECONDS,
  DIFF_METEOR_MIN_MS,
  DIFF_METEOR_MAX_MS,
  DIFF_METEOR_SPEED_MULT,
  DIFF_SCROLL_SPEED_BONUS,
  DIFF_GAP_PROBABILITY,
  DIFF_GAP_MAX_WIDTH,
  DIFF_DOUBLE_METEOR_THRESHOLD,
  DIFF_DOUBLE_METEOR_CHANCE,
  DIFF_TRIPLE_METEOR_THRESHOLD,
  DIFF_TRIPLE_METEOR_CHANCE,
  DIFF_METEOR_DAMAGE,
  DIFFICULTY_MAX,
  MAGNET_COOLDOWN_MS,
  MAGNET_DURATION_MS,
  MAGNET_PULL_FORCE,
  MAGNET_REPEL_FORCE,
  MAGNET_RANGE,
  GIANT_COOLDOWN_MS,
  GIANT_DURATION_MS,
  GIANT_BUFF_SCALE,
  GIANT_DEBUFF_SCALE,
  GIANT_METEOR_SCORE,
  COIN_RAIN_COOLDOWN_MS,
  COIN_RAIN_DURATION_MS,
  COIN_RAIN_SPAWN_MS,
  METEOR_RAIN_SPAWN_MS,
  ACTIVE_UNLOCK_STACKS,
  ACTIVE_MAX_LEVEL,
} from "../constants";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private grounds!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private quizItems!: Phaser.Physics.Arcade.Group;
  private heartItems!: Phaser.Physics.Arcade.Group;
  private meteors!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private baseScrollSpeed = SCROLL_SPEED_INITIAL;
  private scrollSpeedMultiplier = 1;
  private gameState: GameState = "playing";
  private nextGroundX = 0;
  private distanceTraveled = 0;
  private totalCoinsCollected = 0;
  private quizTimer = 0;
  private heartTimer = 0;
  private meteorTimer = 0;
  private meteorNextSpawn = 0;
  private elapsedPlayTime = 0;

  private speedStacks = 0;
  private jumpStacks = 0;
  private jumpCountStacks = 0;

  private hp = HP_MAX;
  private hpMax = HP_MAX;
  private hpDecayStacks = 0;
  private hpDecayMultiplier = 1;
  private heartRestoreStacks = 0;
  private heartRestoreMultiplier = 1;

  // Independent unlock trackers (not affected by non-reward events)
  private scoreCardPickCount = 0;
  private speedRewardStacks = 0;

  private lastCoinPattern = "";

  // Active abilities
  private activeAbilities: Record<ActiveAbilityType, {
    stacks: number;
    cooldown: number;
    activeTimer: number;
    isActive: boolean;
    spawnTimer: number;
  }> = {
    magnet:   { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    giant:    { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    coinRain: { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
  };

  private quizManager!: QuizManager;
  private lastSlideDustTime = 0;
  private lastHpFlashTime = 0;

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

    // Begin intro — spin drop from above
    this.cameras.main.fadeIn(400);
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
  }

  private resetState(): void {
    this.score = 0;
    this.baseScrollSpeed = SCROLL_SPEED_INITIAL;
    this.scrollSpeedMultiplier = 1;
    this.speedStacks = 0;
    this.jumpStacks = 0;
    this.jumpCountStacks = 0;
    this.gameState = "intro";
    this.nextGroundX = 0;
    this.distanceTraveled = 0;
    this.totalCoinsCollected = 0;
    this.quizTimer = 0;
    this.heartTimer = 0;
    this.meteorTimer = 0;
    this.meteorNextSpawn = Phaser.Math.Between(METEOR_SPAWN_INTERVAL_MIN_MS, METEOR_SPAWN_INTERVAL_MAX_MS);
    this.elapsedPlayTime = 0;
    this.hp = HP_MAX;
    this.hpMax = HP_MAX;
    this.hpDecayStacks = 0;
    this.hpDecayMultiplier = 1;
    this.heartRestoreStacks = 0;
    this.heartRestoreMultiplier = 1;
    this.scoreCardPickCount = 0;
    this.speedRewardStacks = 0;
    this.lastSlideDustTime = 0;
    this.lastHpFlashTime = 0;
    this.lastCoinPattern = "";
    this.activeAbilities = {
      magnet:   { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
      giant:    { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
      coinRain: { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    };
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
    this.heartItems = this.physics.add.group({
      runChildUpdate: true,
      allowGravity: false,
      immovable: true,
    });
    this.meteors = this.physics.add.group({
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
    this.physics.add.overlap(this.player, this.heartItems, this.onCollectHeart, undefined, this);
    this.physics.add.overlap(this.player, this.meteors, this.onHitMeteor, undefined, this);
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
      applySpeedUp: () => { this.applySpeedUp(); this.speedRewardStacks++; },
      applySpeedDown: () => { this.applySpeedDown(); this.speedRewardStacks--; },
      applyJumpUp: () => this.applyJumpUp(),
      applyJumpDown: () => this.applyJumpDown(),
      applyJumpCountUp: () => this.applyJumpCountUp(),
      applyJumpCountDown: () => this.applyJumpCountDown(),
      isJumpCountMaxed: () => this.player.maxJumps >= JUMP_COUNT_MAX,
      isJumpCountAtMin: () => this.player.maxJumps <= JUMP_COUNT_MIN,
      applyHeartBoostUp: () => this.applyHeartBoostUp(),
      applyHeartBoostDown: () => this.applyHeartBoostDown(),
      applyHpDecayDown: () => this.applyHpDecayDown(),
      applyHpDecayUp: () => this.applyHpDecayUp(),
      isActiveUnlocked: (type: ActiveAbilityType) => this.isActiveUnlocked(type),
      applyMagnetUp: () => this.applyActiveAbilityUp("magnet"),
      applyMagnetDown: () => this.applyActiveAbilityDown("magnet"),
      applyGiantUp: () => this.applyActiveAbilityUp("giant"),
      applyGiantDown: () => this.applyActiveAbilityDown("giant"),
      applyCoinRainUp: () => this.applyActiveAbilityUp("coinRain"),
      applyCoinRainDown: () => this.applyActiveAbilityDown("coinRain"),
      setGameState: (state: GameState) => {
        this.gameState = state;
      },
      addScore: (amount: number) => {
        this.score = Math.max(0, this.score + amount);
        this.ui.setScore(this.score);
        this.scoreCardPickCount++;
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
        // Clear all hazards so the player can focus on the quiz
        this.meteors.getChildren().forEach((obj) => (obj as Meteor).destroyWithTrail());
      },
      onRewardSelect: (isCorrect: boolean) => {
        if (isCorrect) {
          this.hp = Math.min(this.hp + QUIZ_CORRECT_HP_RESTORE, this.hpMax);
          this.ui.updateHpGauge(this.hp, this.hpMax);
          this.screenFX.zoomPunch(ZOOM_PUNCH_REWARD);
        } else {
          this.screenFX.shake(SHAKE_WRONG_COLLECT);
          this.screenFX.flash(FLASH_WRONG);
        }
      },
    });
  }

  private handleJumpDown = (): void => {
    if (this.gameState === "game_over" || this.gameState === "intro") return;
    this.player.requestJump(this.time.now);
  };

  private handleJumpUp = (): void => {
    this.player.releaseJump();
  };

  private handleDuckDown = (): void => {
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

  private isQuizPhase(): boolean {
    return (
      this.gameState === "quiz_announce" ||
      this.gameState === "quiz_active" ||
      this.gameState === "quiz_result" ||
      this.gameState === "choosing_reward"
    );
  }

  /** True when the quiz is about to start — stop spawning hazards early */
  private isQuizApproaching(): boolean {
    return this.quizTimer >= QUIZ_INTERVAL_MS - QUIZ_SAFE_ZONE_MS;
  }

  private spawnNewGround(): void {
    while (this.nextGroundX < GAME_WIDTH + GROUND_TILE_WIDTH * 2) {
      if (this.distanceTraveled > 800 && !this.isQuizPhase() && !this.isQuizApproaching() && Math.random() < this.lerpDiff(DIFF_GAP_PROBABILITY)) {
        const gapWidth = Phaser.Math.Between(GAP_WIDTH_MIN, Math.round(this.lerpDiff(DIFF_GAP_MAX_WIDTH)));
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

  // ── Heart item spawn & collection ──

  private spawnHeartItem(): void {
    const x = GAME_WIDTH + HEART_ITEM_SIZE;
    const yMin = HEART_SPAWN_Y;
    const yMax = GROUND_Y - GROUND_HEIGHT / 2 - HEART_ITEM_SIZE;
    const y = Phaser.Math.Between(yMin, yMax);
    const heart = new HeartItem(this, x, y);
    this.heartItems.add(heart);
    heart.setScrollSpeed(this.getEffectiveSpeed());
    heart.setRestoreStacks(this.heartRestoreStacks);
  }

  private onCollectHeart: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    heartObj
  ): void => {
    const heart = heartObj as HeartItem;
    const hx = heart.x;
    const hy = heart.y;
    heart.destroyWithTrail();

    this.hp = Math.min(this.hp + HEART_RESTORE_AMOUNT * this.heartRestoreMultiplier, this.hpMax);
    this.ui.updateHpGauge(this.hp, this.hpMax);

    this.particles.spawnCoinBurst(hx, hy);
  };

  // ── Meteor obstacle ──

  private spawnMeteor(): void {
    const x = GAME_WIDTH + METEOR_SIZE;
    const y = Phaser.Math.Between(METEOR_SPAWN_Y_MIN, METEOR_SPAWN_Y_MAX);
    const meteor = new Meteor(this, x, y);
    this.meteors.add(meteor);
    meteor.setScrollSpeed(this.getEffectiveSpeed() * this.lerpDiff(DIFF_METEOR_SPEED_MULT));
  }

  private onHitMeteor: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    meteorObj
  ): void => {
    const meteor = meteorObj as Meteor;
    const mx = meteor.x;
    const my = meteor.y;

    // Giant buff — smash meteor instead of taking damage
    const giantState = this.activeAbilities.giant;
    if (giantState.isActive && giantState.stacks > 0) {
      meteor.destroyWithTrail();
      const level = Math.min(Math.abs(giantState.stacks), ACTIVE_MAX_LEVEL);
      const meteorScore = GIANT_METEOR_SCORE[level];
      if (meteorScore > 0) {
        this.score += meteorScore;
        this.ui.setScore(this.score);
        this.particles.spawnScorePopup(mx, my - 10 * S, `+${meteorScore}`, "#e67e22");
      }
      this.particles.spawnCoinBurst(mx, my);
      return;
    }

    meteor.destroyWithTrail();

    // HP damage
    this.hp = Math.max(0, this.hp - this.lerpDiff(DIFF_METEOR_DAMAGE));
    this.ui.updateHpGauge(this.hp, this.hpMax);

    // Speed down (heavy penalty)
    this.applySpeedDown();
    this.applySpeedDown();
    this.applySpeedDown();

    // Screen effects
    this.screenFX.shake(SHAKE_WRONG_COLLECT);
    this.screenFX.flash(FLASH_WRONG);
    this.particles.spawnDeathExplosion(mx, my);

    if (this.hp <= 0) {
      this.triggerGameOver("hp");
    }
  };

  // ── Difficulty ──

  private getDifficulty(): number {
    return Math.min(DIFFICULTY_MAX, this.elapsedPlayTime / 1000 / DIFFICULTY_RAMP_SECONDS);
  }

  private lerpDiff(keys: [number, number, number, number]): number {
    const d = this.getDifficulty();
    const seg = Math.min(Math.floor(d), 2);
    const t = d - seg;
    return keys[seg] + (keys[seg + 1] - keys[seg]) * t;
  }

  // ── Buff / Debuff ──

  private getEffectiveSpeed(): number {
    return this.baseScrollSpeed * this.scrollSpeedMultiplier + this.lerpDiff(DIFF_SCROLL_SPEED_BONUS);
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

  private applyHeartBoostUp(): void {
    this.heartRestoreStacks++;
    this.heartRestoreMultiplier = Phaser.Math.Clamp(
      Math.pow(HEART_RESTORE_STACK_BASE, this.heartRestoreStacks),
      HEART_RESTORE_MULT_MIN, HEART_RESTORE_MULT_MAX
    );
    this.syncHeartRestoreStacks();
  }

  private applyHeartBoostDown(): void {
    this.heartRestoreStacks--;
    this.heartRestoreMultiplier = Phaser.Math.Clamp(
      Math.pow(HEART_RESTORE_STACK_BASE, this.heartRestoreStacks),
      HEART_RESTORE_MULT_MIN, HEART_RESTORE_MULT_MAX
    );
    this.syncHeartRestoreStacks();
  }

  private syncHeartRestoreStacks(): void {
    this.heartItems.getChildren().forEach((obj) => {
      (obj as HeartItem).setRestoreStacks(this.heartRestoreStacks);
    });
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

  // ── Active abilities ──

  private static readonly ABILITY_CONFIG: Record<ActiveAbilityType, { cooldownMs: number; durationMs: number }> = {
    magnet:   { cooldownMs: MAGNET_COOLDOWN_MS, durationMs: MAGNET_DURATION_MS },
    giant:    { cooldownMs: GIANT_COOLDOWN_MS, durationMs: GIANT_DURATION_MS },
    coinRain: { cooldownMs: COIN_RAIN_COOLDOWN_MS, durationMs: COIN_RAIN_DURATION_MS },
  };

  private isActiveUnlocked(type: ActiveAbilityType): boolean {
    switch (type) {
      case "magnet":   return this.scoreCardPickCount >= ACTIVE_UNLOCK_STACKS;
      case "giant":    return Math.abs(this.hpDecayStacks) >= ACTIVE_UNLOCK_STACKS;
      case "coinRain": return Math.abs(this.speedRewardStacks) >= ACTIVE_UNLOCK_STACKS;
    }
  }

  private applyActiveAbilityUp(type: ActiveAbilityType): void {
    const state = this.activeAbilities[type];
    const oldStacks = state.stacks;
    state.stacks = Math.min(state.stacks + 1, ACTIVE_MAX_LEVEL);
    this.handleAbilityStackChange(type, oldStacks);
  }

  private applyActiveAbilityDown(type: ActiveAbilityType): void {
    const state = this.activeAbilities[type];
    const oldStacks = state.stacks;
    state.stacks = Math.max(state.stacks - 1, -ACTIVE_MAX_LEVEL);
    this.handleAbilityStackChange(type, oldStacks);
  }

  private handleAbilityStackChange(type: ActiveAbilityType, oldStacks: number): void {
    const state = this.activeAbilities[type];
    if (state.stacks === 0) {
      // Became inactive — deactivate if currently firing
      if (state.isActive) this.deactivateAbility(type);
      state.isActive = false;
      state.cooldown = 0;
      state.activeTimer = 0;
      state.spawnTimer = 0;
    } else if (oldStacks === 0) {
      // Just became active — start cooldown cycle
      state.cooldown = 0;
      state.isActive = false;
      state.spawnTimer = 0;
    }
  }

  private updateActiveAbilities(delta: number): void {
    const types: ActiveAbilityType[] = ["magnet", "giant", "coinRain"];
    for (const type of types) {
      const state = this.activeAbilities[type];
      if (state.stacks === 0) {
        this.ui.updateActiveAbilityHUD(type, 0, 0, false);
        continue;
      }

      const config = GameScene.ABILITY_CONFIG[type];
      const level = Math.min(Math.abs(state.stacks), ACTIVE_MAX_LEVEL);
      const isBuff = state.stacks > 0;

      if (state.isActive) {
        // Active — count down duration
        state.activeTimer -= delta;
        if (state.activeTimer <= 0) {
          this.deactivateAbility(type);
          state.isActive = false;
          state.cooldown = 0;
        } else {
          this.applyAbilityEffect(type, level, isBuff, delta);
        }
        this.ui.updateActiveAbilityHUD(type, state.stacks,
          state.activeTimer / config.durationMs, true);
      } else {
        // Cooldown — count up
        state.cooldown += delta;
        if (state.cooldown >= config.cooldownMs) {
          state.isActive = true;
          state.activeTimer = config.durationMs;
          state.cooldown = 0;
          state.spawnTimer = 0;
          this.activateAbility(type, level, isBuff);
        }
        this.ui.updateActiveAbilityHUD(type, state.stacks,
          state.cooldown / config.cooldownMs, false);
      }
    }
  }

  private activateAbility(type: ActiveAbilityType, level: number, isBuff: boolean): void {
    switch (type) {
      case "giant": {
        const scale = isBuff ? GIANT_BUFF_SCALE[level] : GIANT_DEBUFF_SCALE[level];
        this.player.setGiantScale(scale);
        break;
      }
    }
  }

  private deactivateAbility(type: ActiveAbilityType): void {
    switch (type) {
      case "giant":
        this.player.setGiantScale(1);
        break;
    }
  }

  private applyAbilityEffect(type: ActiveAbilityType, level: number, isBuff: boolean, delta: number): void {
    switch (type) {
      case "magnet":
        this.applyMagnetEffect(level, isBuff, delta);
        break;
      case "coinRain":
        this.applyCoinRainEffect(level, isBuff, delta);
        break;
      // Giant effect is passive (scale), handled in activate/deactivate
    }
  }

  private applyMagnetEffect(level: number, isBuff: boolean, delta: number): void {
    const force = isBuff ? MAGNET_PULL_FORCE[level] : MAGNET_REPEL_FORCE[level];
    const direction = isBuff ? 1 : -1;
    const dt = delta / 1000;

    this.coins.getChildren().forEach((obj) => {
      const coin = obj as Coin;
      const dx = this.player.x - coin.x;
      const dy = this.player.y - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10 * S && dist < MAGNET_RANGE) {
        const nx = dx / dist;
        const ny = dy / dist;
        coin.x += nx * force * direction * dt;
        coin.adjustBaseY(ny * force * direction * dt);
      }
    });
  }

  private applyCoinRainEffect(level: number, isBuff: boolean, delta: number): void {
    const state = this.activeAbilities.coinRain;
    const interval = isBuff ? COIN_RAIN_SPAWN_MS[level] : METEOR_RAIN_SPAWN_MS[level];
    if (interval <= 0) return;

    state.spawnTimer += delta;
    if (state.spawnTimer >= interval) {
      state.spawnTimer -= interval;
      if (isBuff) {
        // Spawn coin from sky at random X
        const x = Phaser.Math.Between(Math.round(100 * S), Math.round(GAME_WIDTH - 100 * S));
        const coin = new Coin(this, x, 0);
        this.coins.add(coin);
        coin.setScrollSpeed(this.getEffectiveSpeed());
        coin.setRainMode();
      } else {
        // Spawn extra meteor
        this.spawnMeteor();
      }
    }
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
    this.heartItems.getChildren().forEach((obj) => {
      (obj as HeartItem).setScrollSpeed(speed);
    });
    this.meteors.getChildren().forEach((obj) => {
      (obj as Meteor).setScrollSpeed(speed * this.lerpDiff(DIFF_METEOR_SPEED_MULT));
    });
  }

  // ── Main update ──

  update(time: number, delta: number): void {
    if (
      this.gameState === "game_over" ||
      this.gameState === "choosing_reward"
    )
      return;

    const isIntro = this.gameState === "intro";

    // Camera / parallax — stationary during intro
    if (!isIntro) {
      this.cameraManager.update(this.getEffectiveSpeed(), delta, this.score);
    }

    // Accumulate play time for difficulty ramp
    if (!isIntro) {
      this.elapsedPlayTime += delta;
    }

    // HP decay, quiz timer — only during active gameplay
    if (!isIntro) {
      this.hp -= delta * HP_DECAY_BASE_RATE * this.hpDecayMultiplier;
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

        this.heartTimer += delta;
        if (this.heartTimer >= HEART_SPAWN_INTERVAL_MS) {
          this.heartTimer = 0;
          this.spawnHeartItem();
        }

        if (!this.isQuizApproaching()) this.meteorTimer += delta;
        if (this.meteorTimer >= this.meteorNextSpawn) {
          this.meteorTimer = 0;
          this.meteorNextSpawn = Phaser.Math.Between(
            Math.round(this.lerpDiff(DIFF_METEOR_MIN_MS)),
            Math.round(this.lerpDiff(DIFF_METEOR_MAX_MS)),
          );
          this.spawnMeteor();
          // Extra meteors in late game
          const d = this.getDifficulty();
          if (d > DIFF_DOUBLE_METEOR_THRESHOLD && Math.random() < DIFF_DOUBLE_METEOR_CHANCE) {
            this.spawnMeteor();
          }
          if (d > DIFF_TRIPLE_METEOR_THRESHOLD && Math.random() < DIFF_TRIPLE_METEOR_CHANCE) {
            this.spawnMeteor();
          }
        }
      }

      // Active abilities — cooldown cycling + effects
      this.updateActiveAbilities(delta);
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

    // Deactivate all active abilities
    for (const type of ["magnet", "giant", "coinRain"] as ActiveAbilityType[]) {
      if (this.activeAbilities[type].isActive) this.deactivateAbility(type);
      this.activeAbilities[type].isActive = false;
    }

    this.quizManager.cleanup();
    this.ui.cleanup();

    this.grounds.getChildren().forEach((obj) => {
      (obj as GroundSegment).setVelocityX(0);
    });
    this.coins.getChildren().forEach((obj) => {
      (obj as Coin).setVelocityX(0);
    });
    this.heartItems.getChildren().forEach((obj) => {
      (obj as HeartItem).setVelocityX(0);
    });
    this.meteors.getChildren().forEach((obj) => {
      (obj as Meteor).setVelocityX(0);
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
