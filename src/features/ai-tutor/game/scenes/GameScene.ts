import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { GroundSegment } from "../entities/GroundSegment";
import { Coin } from "../entities/Coin";
import { Meteor } from "../entities/Meteor";
import { HeartItem } from "../entities/HeartItem";
import { QuizManager, GameState } from "../quiz/QuizManager";
import { ScreenFXManager } from "../systems/ScreenFXManager";
import { ParticleManager } from "../systems/ParticleManager";
import { CameraManager } from "../systems/CameraManager";
import { UIManager } from "../systems/UIManager";
import { BuffDebuffManager } from "../systems/BuffDebuffManager";
import { ActiveAbilityManager } from "../systems/ActiveAbilityManager";
import { trackGameStart } from '@/shared/hooks/useAnalytics'
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_X,
  GROUND_Y,
  GROUND_HEIGHT,
  GROUND_TILE_WIDTH,
  GROUND_SEGMENT_MIN,
  GROUND_SEGMENT_MAX,
  GAP_WIDTH_MIN,
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
  SCROLL_SPAWN_INTERVAL_MS,
  FALL_DEATH_Y,
  HP_MAX,
  SPEED_LINE_THRESHOLD,
  SHAKE_FALL_DEATH,
  SHAKE_HP_DEATH,
  SHAKE_WRONG_COLLECT,
  FREEZE_DEATH,
  FLASH_CORRECT,
  FLASH_WRONG,
  ZOOM_PUNCH_REWARD,
  HEART_SPAWN_INTERVAL_MS,
  HEART_RESTORE_AMOUNT,
  HEART_SPAWN_Y,
  HEART_ITEM_SIZE,
  METEOR_SPAWN_INTERVAL_MIN_MS,
  METEOR_SPAWN_INTERVAL_MAX_MS,
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
  SCORE_BONUS,
  JUMP_COUNT_MAX,
  JUMP_COUNT_MIN,
} from "../constants";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private grounds!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private heartItems!: Phaser.Physics.Arcade.Group;
  private meteors!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private baseScrollSpeed = SCROLL_SPEED_INITIAL;
  private gameState: GameState = "playing";
  private nextGroundX = 0;
  private distanceTraveled = 0;
  private totalCoinsCollected = 0;
  private scrollTimer = 0;
  private heartTimer = 0;
  private meteorTimer = 0;
  private meteorNextSpawn = 0;
  private elapsedPlayTime = 0;

  private hp = HP_MAX;
  private hpMax = HP_MAX;

  private lastCoinPattern = "";
  private meteorSlowTimer = 0;
  private meteorSlowMult = 1;
  private isRankMode = false;
  private obstacleHitCount = 0;

  private quizManager!: QuizManager;
  private lastSlideDustTime = 0;

  // Managers
  private screenFX!: ScreenFXManager;
  private particles!: ParticleManager;
  private cameraManager!: CameraManager;
  private ui!: UIManager;
  private buffDebuff!: BuffDebuffManager;
  private activeAbility!: ActiveAbilityManager;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.resetState();
    this.isRankMode = this.game.registry.get('gameMode') === 'rank';
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

    // BuffDebuff + ActiveAbility managers
    this.buffDebuff = new BuffDebuffManager(this.player, () => this.heartItems);
    this.activeAbility = new ActiveAbilityManager(this, this.buffDebuff, {
      player: this.player,
      getCoins: () => this.coins,
      getMeteors: () => this.meteors,
      spawnMeteor: () => this.spawnMeteor(),
      getEffectiveSpeed: () => this.getEffectiveSpeed(),
      lerpDiff: (keys) => this.lerpDiff(keys),
    }, this.ui);
    this.buffDebuff.setActiveStacksQuery((type) => this.activeAbility.getStacks(type));

    this.setupCollisions();
    this.setupInput();
    this.createQuizManager();
    this.fillInitialGround();

    trackGameStart({
      game_type: 'platformer',
      lecture_id: this.game.registry.get('lectureId') || '',
      course_id: this.game.registry.get('courseId') || '',
      game_mode: this.isRankMode ? 'rank' : 'normal',
    });

    // Check nickname for rank mode
    if (this.isRankMode) {
      this.checkNicknameAndStart();
      return;
    }

    // Begin intro — spin drop from above
    this.beginIntro();
  }

  private resetState(): void {
    this.score = 0;
    this.baseScrollSpeed = SCROLL_SPEED_INITIAL;
    this.gameState = "intro";
    this.nextGroundX = 0;
    this.distanceTraveled = 0;
    this.totalCoinsCollected = 0;
    this.scrollTimer = 0;
    this.heartTimer = 0;
    this.meteorTimer = 0;
    this.meteorNextSpawn = Phaser.Math.Between(METEOR_SPAWN_INTERVAL_MIN_MS, METEOR_SPAWN_INTERVAL_MAX_MS);
    this.elapsedPlayTime = 0;
    this.hp = HP_MAX;
    this.hpMax = HP_MAX;
    this.lastSlideDustTime = 0;
    this.lastCoinPattern = "";
    this.meteorSlowTimer = 0;
    this.meteorSlowMult = 1;
    this.obstacleHitCount = 0;
    // Managers reset in create() after instantiation
  }

  private checkNicknameAndStart(): void {
    // Nickname is now handled by React (GameTabContainer) before the game starts.
    // Just verify and begin intro.
    const existingNickname = this.game.registry.get("nickname");
    if (!existingNickname) {
      console.warn("[GameScene] Rank mode started without nickname — React should have handled this.");
    }
    this.beginIntro();
  }

  private beginIntro(): void {
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

    // Multi Jump Score active ability: bonus/penalty on double+ jumps
    const result = this.activeAbility.handleMultiJumpScore(jumpCount, x, y);
    if (result) {
      if (result.scoreDelta !== 0) {
        this.score += result.scoreDelta;
        this.ui.setScore(this.score);
      }
      if (result.hpDelta !== 0) {
        this.hp = Math.max(0, this.hp + result.hpDelta);
        this.ui.updateHpGauge(this.hp, this.hpMax);
        if (this.hp <= 0) {
          this.triggerGameOver("hp");
        }
      }
      if (result.popupText) {
        this.particles.spawnScorePopup(x, y - 20 * S, result.popupText, result.popupColor!);
      }
    }
  };

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.grounds);
    this.physics.add.overlap(this.player, this.coins, this.onCollectCoin, undefined, this);
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
    this.quizManager = new QuizManager(this, {
      buffDebuff: this.buffDebuff,
      activeAbility: this.activeAbility,
      getScrollSpeed: () => this.getEffectiveSpeed(),
      getScoreTier: () => Math.min(Math.max(this.buffDebuff.scoreCardPickCount - 1, 0), SCORE_BONUS.length - 1),
      isJumpCountMaxed: () => this.player.maxJumps >= JUMP_COUNT_MAX,
      isJumpCountAtMin: () => this.player.maxJumps <= JUMP_COUNT_MIN,
      setGameState: (state: GameState) => {
        this.gameState = state;
      },
      addScore: (amount: number) => {
        this.score = Math.max(0, this.score + amount);
        this.ui.setScore(this.score);
      },
      showEffect: (text: string, color: string) => this.ui.showEffect(text, color),
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
      onPhysicsPause: () => {
        this.player.prepareForPause();
      },
      onPhysicsResume: () => {
        this.player.restoreAfterPause();
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

  private spawnNewGround(): void {
    while (this.nextGroundX < GAME_WIDTH + GROUND_TILE_WIDTH * 2) {
      if (this.distanceTraveled > 800 && Math.random() < this.lerpDiff(DIFF_GAP_PROBABILITY)) {
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
    const coinValue = coin.value;
    coin.destroy();

    this.score += coinValue;
    this.totalCoinsCollected++;
    this.ui.setScore(this.score);

    // Coin burst particles + popup
    this.particles.spawnCoinBurst(cx, cy);
    const popupColor = coinValue > 1 ? "#f5c842" : "#f1c40f";
    this.particles.spawnScorePopup(cx, cy - 10 * S, `+${coinValue}`, popupColor);

    // Speed increase
    if (this.totalCoinsCollected % SPEED_UP_COIN_INTERVAL === 0) {
      this.baseScrollSpeed = Math.max(
        this.baseScrollSpeed + SCROLL_SPEED_INCREMENT,
        SCROLL_SPEED_MAX
      );
    }
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
    heart.setRestoreStacks(this.buffDebuff.heartRestoreStacks);
  }

  private onCollectHeart: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    heartObj
  ): void => {
    const heart = heartObj as HeartItem;
    const hx = heart.x;
    const hy = heart.y;
    const isSmall = heart.smallRestore > 0;
    heart.destroyWithTrail();

    const restore = isSmall ? heart.smallRestore : HEART_RESTORE_AMOUNT * this.buffDebuff.heartRestoreMultiplier;
    this.hp = Math.min(this.hp + restore, this.hpMax);
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
    if (this.activeAbility.isGiantActive()) {
      meteor.destroyWithTrail();
      const meteorScore = this.activeAbility.getGiantMeteorScore();
      if (meteorScore > 0) {
        this.score += meteorScore;
        this.ui.setScore(this.score);
        this.particles.spawnScorePopup(mx, my - 10 * S, `+${meteorScore}`, "#e67e22");
      }
      this.particles.spawnMeteorSmash(mx, my);
      this.screenFX.shake({ intensity: 0.008, duration: 150 });
      return;
    }

    meteor.destroyWithTrail();
    this.obstacleHitCount++;

    // HP damage
    this.hp = Math.max(0, this.hp - this.lerpDiff(DIFF_METEOR_DAMAGE));
    this.ui.updateHpGauge(this.hp, this.hpMax);

    // Temporary speed slow (does not affect speed stacks)
    this.meteorSlowTimer = 2000; // 2 seconds of slow
    this.meteorSlowMult = 0.5;

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

  private getEffectiveSpeed(): number {
    const base = this.baseScrollSpeed * this.buffDebuff.scrollSpeedMultiplier + this.lerpDiff(DIFF_SCROLL_SPEED_BONUS);
    return base * this.meteorSlowMult;
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
      this.gameState === "choosing_reward" ||
      this.gameState === "quiz_answering"
    )
      return;

    const isIntro = this.gameState === "intro";

    // Camera / parallax — stationary during intro
    if (!isIntro) {
      this.cameraManager.update(this.getEffectiveSpeed(), delta, this.elapsedPlayTime);
    }

    // Accumulate play time for difficulty ramp
    if (!isIntro) {
      this.elapsedPlayTime += delta;
    }

    // Meteor slow recovery
    if (this.meteorSlowTimer > 0) {
      this.meteorSlowTimer -= delta;
      if (this.meteorSlowTimer <= 0) {
        this.meteorSlowTimer = 0;
        this.meteorSlowMult = 1;
      }
    }

    // HP decay, quiz timer — only during active gameplay
    if (!isIntro) {
      this.hp -= delta * HP_DECAY_BASE_RATE * this.buffDebuff.hpDecayMultiplier;
      if (this.hp <= 0) {
        this.hp = 0;
        this.ui.updateHpGauge(this.hp, this.hpMax);
        this.triggerGameOver("hp");
        return;
      }
      this.ui.updateHpGauge(this.hp, this.hpMax);

      if (this.gameState === "playing") {
        this.scrollTimer += delta;
        if (this.scrollTimer >= SCROLL_SPAWN_INTERVAL_MS) {
          this.scrollTimer = 0;
          this.quizManager.triggerAutoQuiz();
        }

        this.heartTimer += delta;
        if (this.heartTimer >= HEART_SPAWN_INTERVAL_MS) {
          this.heartTimer = 0;
          this.spawnHeartItem();
        }

        this.meteorTimer += delta;
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
      this.activeAbility.update(delta);
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
      if (this.buffDebuff.scrollSpeedMultiplier >= SPEED_LINE_THRESHOLD) {
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
    this.activeAbility.deactivateAll();

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
    const gameOverData = {
      score: this.score,
      ...this.quizManager.getStats(),
      skipped: 0,
      gameMode: this.isRankMode ? "rank" : "normal",
      elapsedMs: Math.round(this.elapsedPlayTime),
      lectureId: this.game.registry.get("lectureId") || "",
      courseId: this.game.registry.get("courseId") || "",
      obstacleHit: this.obstacleHitCount,
    };

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
              this.scene.start("GameOverScene", gameOverData);
            }
          });
        },
      });
    } else {
      this.player.setTint(0xff0000);
      this.cameras.main.zoomTo(1.1, 600);
      this.cameras.main.fadeOut(600, 0, 0, 0, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          this.scene.start("GameOverScene", gameOverData);
        }
      });
    }
  }
}
