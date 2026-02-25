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
const PASSIVE_TO_ACTIVE: Record<string, ActiveAbilityType> = {
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
  }

  // ── Speed ──

  applySpeedUp(): void {
    if (this.speedStacks >= ACTIVE_UNLOCK_STACKS) return;
    this.speedStacks++;
    this.scrollSpeedMultiplier = this.computeMultiplier(SPEED_STACK_BASE, this.speedStacks, SPEED_MULT_MIN, SPEED_MULT_MAX);
  }

  applySpeedDown(): void {
    if (this.speedStacks <= PASSIVE_STACK_MIN) return;
    this.speedStacks--;
    this.scrollSpeedMultiplier = this.computeMultiplier(SPEED_STACK_BASE, this.speedStacks, SPEED_MULT_MIN, SPEED_MULT_MAX);
  }

  // ── Jump ──

  applyJumpUp(): void {
    if (this.jumpStacks >= ACTIVE_UNLOCK_STACKS) return;
    this.jumpStacks++;
    this.player.jumpMultiplier = this.computeMultiplier(JUMP_STACK_BASE, this.jumpStacks, JUMP_MULT_MIN, JUMP_MULT_MAX);
  }

  applyJumpDown(): void {
    if (this.jumpStacks <= PASSIVE_STACK_MIN) return;
    this.jumpStacks--;
    this.player.jumpMultiplier = this.computeMultiplier(JUMP_STACK_BASE, this.jumpStacks, JUMP_MULT_MIN, JUMP_MULT_MAX);
  }

  // ── Jump Count ──

  applyJumpCountUp(): void {
    if (this.jumpCountStacks >= ACTIVE_UNLOCK_STACKS) return;
    this.jumpCountStacks++;
    this.player.maxJumps = Phaser.Math.Clamp(MAX_JUMPS + this.jumpCountStacks, JUMP_COUNT_MIN, JUMP_COUNT_MAX);
  }

  applyJumpCountDown(): void {
    if (this.jumpCountStacks <= PASSIVE_STACK_MIN) return;
    this.jumpCountStacks--;
    this.player.maxJumps = Phaser.Math.Clamp(MAX_JUMPS + this.jumpCountStacks, JUMP_COUNT_MIN, JUMP_COUNT_MAX);
  }

  // ── Heart Restore ──

  applyHeartBoostUp(): void {
    if (this.heartRestoreStacks >= ACTIVE_UNLOCK_STACKS) return;
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
    if (this.hpDecayStacks <= -ACTIVE_UNLOCK_STACKS) return;
    this.hpDecayStacks--;
    this.hpDecayMultiplier = this.computeMultiplier(HP_DECAY_STACK_BASE, this.hpDecayStacks, HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX);
  }

  applyHpDecayUp(): void {
    // hpDecay is inverted: positive = debuff direction (more decay), capped at +1
    if (this.hpDecayStacks >= -PASSIVE_STACK_MIN) return;
    this.hpDecayStacks++;
    this.hpDecayMultiplier = this.computeMultiplier(HP_DECAY_STACK_BASE, this.hpDecayStacks, HP_DECAY_MULT_MIN, HP_DECAY_MULT_MAX);
  }

  // ── Score Passive ──

  applyScorePassiveUp(): void {
    if (this.scoreCardPickCount >= ACTIVE_UNLOCK_STACKS) return;
    this.scoreCardPickCount++;
  }

  applyScorePassiveDown(): void {
    if (this.scoreCardPickCount <= PASSIVE_STACK_MIN) return;
    this.scoreCardPickCount--;
  }

  // ── Query helpers ──

  isPassiveAtMax(passiveType: string): boolean {
    switch (passiveType) {
      case "speed":      return this.speedStacks >= ACTIVE_UNLOCK_STACKS;
      case "jump":       return this.jumpStacks >= ACTIVE_UNLOCK_STACKS;
      case "jumpCount":  return this.jumpCountStacks >= ACTIVE_UNLOCK_STACKS;
      case "score":      return this.scoreCardPickCount >= ACTIVE_UNLOCK_STACKS;
      case "heartBoost": return this.heartRestoreStacks >= ACTIVE_UNLOCK_STACKS;
      case "hpDecay":    return this.hpDecayStacks <= -ACTIVE_UNLOCK_STACKS;
      default:           return false;
    }
  }

  isPassiveHiddenByActive(passiveType: string): boolean {
    const activeType = PASSIVE_TO_ACTIVE[passiveType];
    if (!activeType || !this.activeStacksQuery) return false;
    return this.activeStacksQuery(activeType) > 0;
  }

  isActiveUnlocked(type: ActiveAbilityType): boolean {
    return this.getPassiveStacksForAbility(type) >= ACTIVE_UNLOCK_STACKS;
  }

  getSignedPassiveStacks(type: ActiveAbilityType): number {
    switch (type) {
      case "magnet":         return this.scoreCardPickCount;
      case "giant":          return -this.hpDecayStacks; // hpDecay is inverted: negative stacks = buff
      case "coinRain":       return this.speedStacks;
      case "multiJumpScore": return this.jumpCountStacks;
      case "skyTreasure":    return this.jumpStacks;
    }
  }

  getPassiveStacksForAbility(type: ActiveAbilityType): number {
    switch (type) {
      case "magnet":         return this.scoreCardPickCount;
      case "giant":          return Math.abs(this.hpDecayStacks);
      case "coinRain":       return Math.abs(this.speedStacks);
      case "multiJumpScore": return Math.abs(this.jumpCountStacks);
      case "skyTreasure":    return Math.abs(this.jumpStacks);
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
