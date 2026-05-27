import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { Coin } from "../entities/Coin";
import { Meteor } from "../entities/Meteor";
import { ActiveAbilityType } from "../quiz/quizTypes";
import { BuffDebuffManager } from "./BuffDebuffManager";
import { UIManager } from "./UIManager";
import {
  S,
  GAME_WIDTH,
  METEOR_SIZE,
  METEOR_SPAWN_Y_MIN,
  METEOR_SPAWN_Y_MAX,
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
  MULTI_JUMP_COOLDOWN_MS,
  MULTI_JUMP_DURATION_MS,
  MULTI_JUMP_SCORE_BUFF,
  MULTI_JUMP_HP_PENALTY,
  SKY_TREASURE_COOLDOWN_MS,
  SKY_TREASURE_DURATION_MS,
  SKY_TREASURE_SPAWN_MS,
  SKY_TREASURE_DEBUFF_SPAWN_MS,
  SKY_TREASURE_SPAWN_Y,
  BIG_COIN_SIZE,
  ACTIVE_MAX_LEVEL,
  PASSIVE_STACK_MIN,
  DIFF_METEOR_SPEED_MULT,
} from "../constants";

interface ActiveAbilityState {
  stacks: number;
  cooldown: number;
  activeTimer: number;
  isActive: boolean;
  spawnTimer: number;
}

export interface ActiveAbilityDeps {
  player: Player;
  getCoins: () => Phaser.Physics.Arcade.Group;
  getMeteors: () => Phaser.Physics.Arcade.Group;
  spawnMeteor: () => void;
  getEffectiveSpeed: () => number;
  lerpDiff: (keys: [number, number, number, number]) => number;
  /** 거인화/초고속 종료 직후 ms 동안 fall_death 무시 + ensureAboveGround 적용 */
  startFallDeathGrace?: (ms: number) => void;
  /** 거인화/초고속 종료 직후 ms 동안 gap+meteor spawn 금지 + meteor 충돌 면역 */
  startPostAbilityGuard?: (ms: number) => void;
  /** 거인화 종료 시점에 화면에 떠있는 meteor 일괄 제거 */
  clearAllMeteors?: () => void;
}

export interface MultiJumpScoreResult {
  scoreDelta: number;
  hpDelta: number;
  popupText?: string;
  popupColor?: string;
}

const ABILITY_CONFIG: Record<ActiveAbilityType, { cooldownMs: number; durationMs: number }> = {
  magnet:         { cooldownMs: MAGNET_COOLDOWN_MS, durationMs: MAGNET_DURATION_MS },
  giant:          { cooldownMs: GIANT_COOLDOWN_MS, durationMs: GIANT_DURATION_MS },
  coinRain:       { cooldownMs: COIN_RAIN_COOLDOWN_MS, durationMs: COIN_RAIN_DURATION_MS },
  multiJumpScore: { cooldownMs: MULTI_JUMP_COOLDOWN_MS, durationMs: MULTI_JUMP_DURATION_MS },
  skyTreasure:    { cooldownMs: SKY_TREASURE_COOLDOWN_MS, durationMs: SKY_TREASURE_DURATION_MS },
};

// 5종 어빌리티 모두 1회성 발동(패시브 3 모음 → 한 번 발동 → 원상복귀 → 다시 모음 → 발동).
// 영구 활성(ALWAYS_ON) 어빌리티 없음 — 사용자 의도(단일 발동 + 매번 동일 효과).
const ALWAYS_ON_ABILITIES: Set<ActiveAbilityType> = new Set();

const ALL_TYPES: ActiveAbilityType[] = ["magnet", "giant", "coinRain", "multiJumpScore", "skyTreasure"];

function makeDefaultState(): Record<ActiveAbilityType, ActiveAbilityState> {
  return {
    magnet:         { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    giant:          { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    coinRain:       { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    multiJumpScore: { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
    skyTreasure:    { stacks: 0, cooldown: 0, activeTimer: 0, isActive: false, spawnTimer: 0 },
  };
}

export class ActiveAbilityManager {
  private scene: Phaser.Scene;
  private buffDebuff: BuffDebuffManager;
  private deps: ActiveAbilityDeps;
  private ui: UIManager;
  private abilities: Record<ActiveAbilityType, ActiveAbilityState>;

  constructor(
    scene: Phaser.Scene,
    buffDebuff: BuffDebuffManager,
    deps: ActiveAbilityDeps,
    ui: UIManager,
  ) {
    this.scene = scene;
    this.buffDebuff = buffDebuff;
    this.deps = deps;
    this.ui = ui;
    this.abilities = makeDefaultState();
  }

  reset(): void {
    this.abilities = makeDefaultState();
  }

  // ── Public queries ──

  getStacks(type: ActiveAbilityType): number {
    return this.abilities[type].stacks;
  }

  isActiveUnlocked(type: ActiveAbilityType): boolean {
    return this.buffDebuff.getPassiveStacksForAbility(type) >= ACTIVE_MAX_LEVEL;
  }

  getActiveLevel(type: ActiveAbilityType): number {
    return Math.min(Math.abs(this.abilities[type].stacks), ACTIVE_MAX_LEVEL);
  }

  isGiantActive(): boolean {
    const s = this.abilities.giant;
    return s.isActive && s.stacks > 0;
  }

  /** multiJumpScore type 을 "초고속 돌진" 효과로 재정의 — 속도 ×5, 자석, 무적, groundLock. */
  isHyperDashActive(): boolean {
    const s = this.abilities.multiJumpScore;
    return s.isActive && s.stacks > 0;
  }

  getGiantMeteorScore(): number {
    const level = Math.min(Math.abs(this.abilities.giant.stacks), ACTIVE_MAX_LEVEL);
    return GIANT_METEOR_SCORE[level];
  }

  // ── Stack manipulation ──

  applyActiveAbilityUp(type: ActiveAbilityType): void {
    const state = this.abilities[type];
    const oldStacks = state.stacks;
    // 1회성 발동 + 매번 동일 효과 — Lv 누적 개념 폐기. 항상 stacks=1.
    state.stacks = 1;
    this.handleAbilityStackChange(type, oldStacks);
  }

  applyActiveAbilityDown(type: ActiveAbilityType): void {
    const state = this.abilities[type];
    if (state.stacks > 0) {
      const oldStacks = state.stacks;
      state.stacks--;
      this.handleAbilityStackChange(type, oldStacks);
    } else {
      // Active at 0 — reduce the associated passive by 1 (min PASSIVE_STACK_MIN)
      switch (type) {
        case "magnet":         this.buffDebuff.scoreCardPickCount = Math.max(PASSIVE_STACK_MIN, this.buffDebuff.scoreCardPickCount - 1); break;
        case "giant":          this.buffDebuff.applyHpDecayUp(); break;
        case "coinRain":       this.buffDebuff.applySpeedDown(); break;
        case "multiJumpScore": this.buffDebuff.applyJumpCountDown(); break;
        case "skyTreasure":    this.buffDebuff.applyJumpDown(); break;
      }
    }
  }

  private handleAbilityStackChange(type: ActiveAbilityType, oldStacks: number): void {
    const state = this.abilities[type];
    if (state.stacks === 0) {
      if (state.isActive) this.deactivateAbility(type);
      state.isActive = false;
      state.cooldown = 0;
      state.activeTimer = 0;
      state.spawnTimer = 0;
    } else if (oldStacks === 0) {
      if (ALWAYS_ON_ABILITIES.has(type)) {
        state.isActive = true;
        state.spawnTimer = 0;
      } else {
        // 잠금 해제 직후 즉시 첫 발동 (이전엔 cooldown 채워야 첫 발동 → 사용자가 발동을 못 느낌).
        // 사용자가 액티브 카드 선택한 그 순간 바로 효과 체감.
        const config = ABILITY_CONFIG[type];
        const level = Math.min(Math.abs(state.stacks), ACTIVE_MAX_LEVEL);
        const isBuff = state.stacks > 0;
        state.isActive = true;
        state.activeTimer = config.durationMs;
        state.cooldown = 0;
        state.spawnTimer = 0;
        this.activateAbility(type, level, isBuff);
      }
    }
  }

  // ── Multi Jump Score (event-based) ──

  handleMultiJumpScore(jumpCount: number, x: number, y: number): MultiJumpScoreResult | null {
    const mjs = this.abilities.multiJumpScore;
    if (!mjs.isActive || mjs.stacks === 0 || jumpCount < 2) return null;

    const level = Math.min(Math.abs(mjs.stacks), ACTIVE_MAX_LEVEL);
    if (mjs.stacks > 0) {
      const bonus = MULTI_JUMP_SCORE_BUFF[level];
      if (bonus > 0) {
        return { scoreDelta: bonus, hpDelta: 0, popupText: `+${bonus}`, popupColor: "#9b59b6" };
      }
    } else {
      const penalty = MULTI_JUMP_HP_PENALTY[level];
      if (penalty > 0) {
        return { scoreDelta: 0, hpDelta: -penalty };
      }
    }
    return null;
  }

  // ── Deactivate all (game over) ──

  deactivateAll(): void {
    for (const type of ALL_TYPES) {
      if (this.abilities[type].isActive) this.deactivateAbility(type);
      this.abilities[type].isActive = false;
    }
  }

  // ── Frame update ──

  update(delta: number): void {
    for (const type of ALL_TYPES) {
      const state = this.abilities[type];
      if (state.stacks === 0) {
        const signedStacks = this.buffDebuff.getSignedPassiveStacks(type);
        if (signedStacks !== 0) {
          this.ui.updatePassiveStackHUD(type, signedStacks);
        } else {
          this.ui.updateActiveAbilityHUD(type, 0, 0, false);
        }
        continue;
      }

      const level = Math.min(Math.abs(state.stacks), ACTIVE_MAX_LEVEL);
      const isBuff = state.stacks > 0;

      // Always-on abilities — no cooldown, permanently active
      if (ALWAYS_ON_ABILITIES.has(type)) {
        if (!state.isActive) {
          state.isActive = true;
          state.spawnTimer = 0;
        }
        this.applyAbilityEffect(type, level, isBuff, delta);
        this.ui.updateActiveAbilityHUD(type, state.stacks, 1, true);
        continue;
      }

      const config = ABILITY_CONFIG[type];

      if (state.isActive) {
        state.activeTimer -= delta;
        if (state.activeTimer <= 0) {
          // 발동 종료 — 자동 재발동(cooldown 사이클) 안 함. stacks 0 으로
          // 원상복귀 → 다음 update 의 stacks===0 분기에서 패시브 진행도 HUD 로 전환.
          this.deactivateAbility(type);
          state.isActive = false;
          state.cooldown = 0;
          state.activeTimer = 0;
          state.stacks = 0;
          state.spawnTimer = 0;
          this.ui.updateActiveAbilityHUD(type, 0, 0, false);
        } else {
          this.applyAbilityEffect(type, level, isBuff, delta);
          this.ui.updateActiveAbilityHUD(type, state.stacks,
            state.activeTimer / config.durationMs, true);
        }
      }
      // stacks > 0 + !isActive 케이스는 도달하지 않음
      //  - handleAbilityStackChange(oldStacks=0) 가 즉시 isActive=true 로 설정
      //  - 위 분기에서 activeTimer 끝나면 stacks=0 으로 가버림
    }
  }

  // ── Activate / Deactivate ──

  private activateAbility(type: ActiveAbilityType, level: number, isBuff: boolean): void {
    switch (type) {
      case "giant": {
        const scale = isBuff ? GIANT_BUFF_SCALE[level] : GIANT_DEBUFF_SCALE[level];
        this.deps.player.setGiantScale(scale);
        // 거인화 동안 player X 위치 고정 — body 보정/ground 충돌로 좌측 벽까지 밀리는 버그 차단
        this.deps.player.setFixedX(this.deps.player.x);
        // 구덩이 무시 — 거인화 발동 동안 ground 위 떠있도록 Y 고정
        this.deps.player.setGroundLocked(true);
        break;
      }
      case "multiJumpScore":
        // 초고속 돌진 발동 — getEffectiveSpeed 가 isHyperDashActive 체크로 자동 ×5,
        // meteor 충돌 무시는 onHitMeteor 가드, 구덩이 무시는 groundLock 처리.
        this.deps.player.setGroundLocked(true);
        break;
    }
  }

  private deactivateAbility(type: ActiveAbilityType): void {
    switch (type) {
      case "giant":
        // 종료 시점에 화면 모든 meteor 제거 — 거인화 동안 폭격된 meteor 가 player 에 도달해
        // 종료 직후 체력 깎이는 케이스 차단.
        this.deps.clearAllMeteors?.();
        // 종료 후 2초간 gap spawn 금지 — 구덩이 위로 떨어져 죽는 케이스 차단.
        this.deps.startPostAbilityGuard?.(2000);
        // visual scale 8 → 1 부드러운 lerp 가 끝난 후에야 groundLocked 해제 +
        // fall_death grace 시작. 그 사이엔 거인 상태로 ground 위에 떠있어 자연스럽게 축소.
        this.deps.player.setFixedX(null);
        this.deps.player.setGiantScale(1, () => {
          this.deps.player.setGroundLocked(false);
          this.deps.startFallDeathGrace?.(1500);
        });
        break;
      case "multiJumpScore":
        this.deps.player.setGroundLocked(false);
        this.deps.startFallDeathGrace?.(1500);
        this.deps.startPostAbilityGuard?.(2000);
        break;
    }
  }

  // ── Per-frame effects ──

  private applyAbilityEffect(type: ActiveAbilityType, level: number, isBuff: boolean, delta: number): void {
    switch (type) {
      case "magnet":
        this.applyMagnetEffect(level, isBuff, delta);
        break;
      case "coinRain":
        this.applyCoinRainEffect(level, isBuff, delta);
        break;
      case "skyTreasure":
        this.applySkyTreasureEffect(level, isBuff, delta);
        break;
      case "giant":
        // 거인화 동안 meteor 폭격 — 무적임을 시각적으로 강하게 보여줌
        this.applyGiantMeteorRain(delta);
        // 거인 visual 영역 안의 코인 자동 획득은 GameScene 에서 매 프레임 처리.
        break;
      case "multiJumpScore":
        // 초고속 돌진 동안 자석 효과(코인 자동 흡수) — magnet Lv1 강도 재사용
        this.applyMagnetEffect(1, true, delta);
        break;
    }
  }

  /** 거인화 활성 동안 300ms 마다 meteor spawn — 사용자가 직접 부딪치며 무적 체감. */
  private applyGiantMeteorRain(delta: number): void {
    const state = this.abilities.giant;
    // 종료 1초 전부터는 spawn 중단 — 새 meteor 가 player 도달 전 화면 밖으로 나가도록.
    if (state.activeTimer <= 1000) return;
    const interval = 300;
    state.spawnTimer += delta;
    if (state.spawnTimer >= interval) {
      state.spawnTimer -= interval;
      this.deps.spawnMeteor();
    }
  }

  private applyMagnetEffect(level: number, isBuff: boolean, delta: number): void {
    const force = isBuff ? MAGNET_PULL_FORCE[level] : MAGNET_REPEL_FORCE[level];
    const direction = isBuff ? 1 : -1;
    const dt = delta / 1000;
    const player = this.deps.player;

    this.deps.getCoins().getChildren().forEach((obj) => {
      const coin = obj as Coin;
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = MAGNET_RANGE[level];
      if (dist > 10 * S && dist < range) {
        const nx = dx / dist;
        const ny = dy / dist;
        coin.x += nx * force * direction * dt;
        coin.adjustBaseY(ny * force * direction * dt);
      }
    });
  }

  private applyCoinRainEffect(level: number, isBuff: boolean, delta: number): void {
    const state = this.abilities.coinRain;
    const interval = isBuff ? COIN_RAIN_SPAWN_MS[level] : METEOR_RAIN_SPAWN_MS[level];
    if (interval <= 0) return;

    state.spawnTimer += delta;
    // while 루프 — interval 이 매우 짧을 때(예: 10ms) 한 프레임(16ms)에 여러 개 spawn.
    while (state.spawnTimer >= interval) {
      state.spawnTimer -= interval;
      if (isBuff) {
        const x = Phaser.Math.Between(Math.round(100 * S), Math.round(GAME_WIDTH - 100 * S));
        const coin = new Coin(this.scene, x, 0);
        this.deps.getCoins().add(coin);
        coin.setScrollSpeed(this.deps.getEffectiveSpeed());
        coin.setRainMode();
      } else {
        this.deps.spawnMeteor();
      }
    }
  }

  private applySkyTreasureEffect(level: number, isBuff: boolean, delta: number): void {
    const state = this.abilities.skyTreasure;
    const interval = isBuff ? SKY_TREASURE_SPAWN_MS[level] : SKY_TREASURE_DEBUFF_SPAWN_MS[level];
    if (interval <= 0) return;

    state.spawnTimer += delta;
    if (state.spawnTimer >= interval) {
      state.spawnTimer -= interval;

      if (isBuff) {
        const x = GAME_WIDTH + BIG_COIN_SIZE;
        const y = Phaser.Math.Between(Math.round(SKY_TREASURE_SPAWN_Y - 40 * S), Math.round(SKY_TREASURE_SPAWN_Y + 40 * S));
        const coin = new Coin(this.scene, x, y);
        coin.setBigMode();
        this.deps.getCoins().add(coin);
        coin.setScrollSpeed(this.deps.getEffectiveSpeed());
      } else {
        const x = GAME_WIDTH + METEOR_SIZE;
        const meteor = new Meteor(this.scene, x, SKY_TREASURE_SPAWN_Y);
        this.deps.getMeteors().add(meteor);
        meteor.setScrollSpeed(this.deps.getEffectiveSpeed() * this.deps.lerpDiff(DIFF_METEOR_SPEED_MULT));
      }
    }
  }
}
