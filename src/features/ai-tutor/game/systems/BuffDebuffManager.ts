import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { HeartItem } from "../entities/HeartItem";
import { ActiveAbilityType } from "../quiz/quizTypes";
import {
  SPEED_STACK_BASE,
  JUMP_STACK_BASE,
  SPEED_MULT_MIN,
  SPEED_MULT_MAX,
  JUMP_MULT_MIN,
  JUMP_MULT_MAX,
  JUMP_COUNT_MIN,
  JUMP_COUNT_MAX,
  MAX_JUMPS,
  HP_DECAY_STACK_BASE,
  HP_DECAY_MULT_MIN,
  HP_DECAY_MULT_MAX,
  HEART_RESTORE_STACK_BASE,
  HEART_RESTORE_MULT_MIN,
  HEART_RESTORE_MULT_MAX,
  ACTIVE_UNLOCK_STACKS,
  PASSIVE_STACK_MIN,
} from "../constants";

/** Passive → Active mapping: hide passive when its active has stacks > 0 */
export const PASSIVE_TO_ACTIVE: Record<string, ActiveAbilityType> = {
  score: "magnet",
  hpDecay: "giant",
  speed: "coinRain",
  jumpCount: "multiJumpScore",
  jump: "skyTreasure",
};

export class BuffDebuffManager {
  // Passive stacks
  speedStacks = 0;
  jumpStacks = 0;
  jumpCountStacks = 0;
  scoreCardPickCount = 0;
  hpDecayStacks = 0;
  heartRestoreStacks = 0;

  // Computed multipliers
  scrollSpeedMultiplier = 1;
  hpDecayMultiplier = 1;
  heartRestoreMultiplier = 1;

  // Independent reward trackers (not affected by non-reward events)
  speedRewardStacks = 0;
  jumpRewardStacks = 0;
  jumpCountRewardStacks = 0;

  // 어빌리티 발동 카운터 (정답 시 ++, ACTIVE_UNLOCK_STACKS 도달 시 매핑 어빌리티 발동 + 카운터 리셋).
  // 카운터와 분리 — stacks/multiplier 는 영구 누적해서 buff 효과를 유지.
  speedTrigger = 0;
  jumpTrigger = 0;
  jumpCountTrigger = 0;
  scoreTrigger = 0;
  hpDecayTrigger = 0;

  private player: Player;
  private getHeartItems: () => Phaser.Physics.Arcade.Group;
  private activeStacksQuery: ((type: ActiveAbilityType) => number) | null = null;

  constructor(
    player: Player,
    getHeartItems: () => Phaser.Physics.Arcade.Group,
  ) {
    this.player = player;
    this.getHeartItems = getHeartItems;
  }

  /** Wire up cross-reference to ActiveAbilityManager after both are created */
  setActiveStacksQuery(fn: (type: ActiveAbilityType) => number): void {
    this.activeStacksQuery = fn;
  }

  reset(): void {
    this.speedStacks = 0;
    this.jumpStacks = 0;
    this.jumpCountStacks = 0;
    this.scoreCardPickCount = 0;
    this.hpDecayStacks = 0;
    this.heartRestoreStacks = 0;
    this.scrollSpeedMultiplier = 1;
    this.hpDecayMultiplier = 1;
    this.heartRestoreMultiplier = 1;
    this.speedRewardStacks = 0;
    this.jumpRewardStacks = 0;
    this.jumpCountRewardStacks = 0;
    this.speedTrigger = 0;
    this.jumpTrigger = 0;
    this.jumpCountTrigger = 0;
    this.scoreTrigger = 0;
    this.hpDecayTrigger = 0;
  }

  // ── Speed ──

  applySpeedUp(): void {
    // cap 제거 — multiplier 는 SPEED_MULT_MAX 에서 자연 cap. 사용자 buff 효과 영구 누적.
    this.speedStacks++;
    this.scrollSpeedMultiplier = this.computeMultiplier(SPEED_STACK_BASE, this.speedStacks, SPEED_MULT_MIN, SPEED_MULT_MAX);
    this.speedTrigger++;
  }

  applySpeedDown(): void {
    if (this.speedStacks <= PASSIVE_STACK_MIN) return;
    this.speedStacks--;
    this.scrollSpeedMultiplier = this.computeMultiplier(SPEED_STACK_BASE, this.speedStacks, SPEED_MULT_MIN, SPEED_MULT_MAX);
  }

  // ── Jump ──

  applyJumpUp(): void {
    this.jumpStacks++;
    this.player.jumpMultiplier = this.computeMultiplier(JUMP_STACK_BASE, this.jumpStacks, JUMP_MULT_MIN, JUMP_MULT_MAX);
    this.jumpTrigger++;
  }

  applyJumpDown(): void {
    if (this.jumpStacks <= PASSIVE_STACK_MIN) return;
    this.jumpStacks--;
    this.player.jumpMultiplier = this.computeMultiplier(JUMP_STACK_BASE, this.jumpStacks, JUMP_MULT_MIN, JUMP_MULT_MAX);
  }

  // ── Jump Count ──

  applyJumpCountUp(): void {
    this.jumpCountStacks++;
    this.player.maxJumps = Phaser.Math.Clamp(MAX_JUMPS + this.jumpCountStacks, JUMP_COUNT_MIN, JUMP_COUNT_MAX);
    this.jumpCountTrigger++;
  }

  applyJumpCountDown(): void {
    if (this.jumpCountStacks <= PASSIVE_STACK_MIN) return;
    this.jumpCountStacks--;
    this.player.maxJumps = Phaser.Math.Clamp(MAX_JUMPS + this.jumpCountStacks, JUMP_COUNT_MIN, JUMP_COUNT_MAX);
  }

  // ── Heart Restore ──

  applyHeartBoostUp(): void {
    // cap 제거 — HEART_RESTORE_MULT_MAX 에서 자연 cap. heartBoost 는 어빌리티 매핑 없는 단순 buff.
    this.heartRestoreStacks++;
    this.heartRestoreMultiplier = this.computeMultiplier(HEART_RESTORE_STACK_BASE, this.heartRestoreStacks, HEART_RESTORE_MULT_MIN, HEART_RESTORE_MULT_MAX);
    this.syncHeartRestoreStacks();
  }

  applyHeartBoostDown(): void {
    if (this.heartRestoreStacks <= PASSIVE_STACK_MIN) return;
    this.heartRestoreStacks--;
    this.heartRestoreMultiplier = this.computeMultiplier(HEART_RESTORE_STACK_BASE, this.heartRestoreStacks, HEART_RESTORE_MULT_MIN, HEART_RESTORE_MULT_MAX);
    this.syncHeartRestoreStacks();
  }

  private syncHeartRestoreStacks(): void {
    this.getHeartItems().getChildren().forEach((obj) => {
      (obj as HeartItem).setRestoreStacks(this.heartRestoreStacks);
    });
  }

  // ── HP Decay ──

  applyHpDecayDown(): void {
    // hpDecay is inverted: negative = buff direction (less decay)
    // cap 제거 — HP_DECAY_MULT_MIN 에서 자연 cap. trigger 는 정답 카운터.
    this.hpDecayStacks--;
    this.hpDecayMultiplier = this.computeMultiplier(HP_DECAY_STACK_BASE, this.hpDecayStacks, HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX);
    this.hpDecayTrigger++;
  }

  applyHpDecayUp(): void {
    // hpDecay is inverted: positive = debuff direction (more decay), capped at +1
    if (this.hpDecayStacks >= -PASSIVE_STACK_MIN) return;
    this.hpDecayStacks++;
    this.hpDecayMultiplier = this.computeMultiplier(HP_DECAY_STACK_BASE, this.hpDecayStacks, HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX);
  }

  // ── Score Passive ──

  applyScorePassiveUp(): void {
    this.scoreCardPickCount++;
    this.scoreTrigger++;
  }

  applyScorePassiveDown(): void {
    if (this.scoreCardPickCount <= PASSIVE_STACK_MIN) return;
    this.scoreCardPickCount--;
  }

  // ── Passive trigger reset ──
  // 어빌리티 발동 시 호출 — trigger 카운터만 0 으로. stacks/multiplier 는 영구 유지(buff 보존).
  // heartBoost 는 어빌리티 매핑이 없어 호출 대상 아님.
  resetPassiveStacksFor(passiveType: string): void {
    switch (passiveType) {
      case "speed":     this.speedTrigger = 0; break;
      case "jump":      this.jumpTrigger = 0; break;
      case "jumpCount": this.jumpCountTrigger = 0; break;
      case "score":     this.scoreTrigger = 0; break;
      case "hpDecay":   this.hpDecayTrigger = 0; break;
    }
  }

  // ── Query helpers ──

  isPassiveAtMax(_passiveType: string): boolean {
    // 영구 누적 + trigger 발동/리셋 사이클 — max-out 상태 없음. 보상 카드 풀에서 제외하지 않음.
    return false;
  }

  isPassiveHiddenByActive(passiveType: string): boolean {
    const activeType = PASSIVE_TO_ACTIVE[passiveType];
    if (!activeType || !this.activeStacksQuery) return false;
    return this.activeStacksQuery(activeType) > 0;
  }

  isActiveUnlocked(type: ActiveAbilityType): boolean {
    return this.getPassiveStacksForAbility(type) >= ACTIVE_UNLOCK_STACKS;
  }

  // 어빌리티 발동 진행도 표시(좌상단 동그라미 1/3)와 잠금 해제 판정은 모두 trigger 기반.
  // stacks 는 영구 누적되는 buff multiplier 입력값이라 어빌리티 발동 카운터로 쓰지 않음.
  getSignedPassiveStacks(type: ActiveAbilityType): number {
    switch (type) {
      case "magnet":         return this.scoreTrigger;
      case "giant":          return this.hpDecayTrigger;
      case "coinRain":       return this.speedTrigger;
      case "multiJumpScore": return this.jumpCountTrigger;
      case "skyTreasure":    return this.jumpTrigger;
    }
  }

  getPassiveStacksForAbility(type: ActiveAbilityType): number {
    switch (type) {
      case "magnet":         return this.scoreTrigger;
      case "giant":          return this.hpDecayTrigger;
      case "coinRain":       return this.speedTrigger;
      case "multiJumpScore": return this.jumpCountTrigger;
      case "skyTreasure":    return this.jumpTrigger;
    }
  }

  /** Force-set the associated passive to a target buff level (always positive direction) */
  setPassiveStacksForAbility(type: ActiveAbilityType, target: number): void {
    switch (type) {
      case "magnet":
        this.scoreCardPickCount = target;
        break;
      case "giant":
        // hpDecay is inverted: negative = buff, so set to -target
        this.hpDecayStacks = -target;
        this.hpDecayMultiplier = this.computeMultiplier(HP_DECAY_STACK_BASE, this.hpDecayStacks, HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX);
        break;
      case "coinRain":
        this.speedStacks = target;
        this.scrollSpeedMultiplier = this.computeMultiplier(SPEED_STACK_BASE, this.speedStacks, SPEED_MULT_MIN, SPEED_MULT_MAX);
        break;
      case "multiJumpScore":
        this.jumpCountStacks = target;
        this.player.maxJumps = Phaser.Math.Clamp(MAX_JUMPS + this.jumpCountStacks, JUMP_COUNT_MIN, JUMP_COUNT_MAX);
        break;
      case "skyTreasure":
        this.jumpStacks = target;
        this.player.jumpMultiplier = this.computeMultiplier(JUMP_STACK_BASE, this.jumpStacks, JUMP_MULT_MIN, JUMP_MULT_MAX);
        break;
    }
  }

  private computeMultiplier(base: number, stacks: number, min: number, max: number): number {
    return Phaser.Math.Clamp(Math.pow(base, stacks), min, max);
  }
}
