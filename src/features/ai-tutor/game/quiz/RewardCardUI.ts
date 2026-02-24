import * as Phaser from "phaser";
import { ChoiceType, ActiveAbilityType } from "./quizTypes";
import { lighten } from "../ui/glassPanel";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  SCORE_BONUS,
  FONT_FAMILY,
} from "../constants";

interface CardDef {
  type: ChoiceType;
  title: string;
  desc: string;
  color: number;
}

const REWARD_CARDS_KO: CardDef[] = [
  { type: "jump", title: "점프력 UP", desc: "점프력 15% 증가", color: 0x2ecc71 },
  { type: "jumpCount", title: "점프횟수 UP", desc: "점프 횟수 +1", color: 0x9b59b6 },
  { type: "speed", title: "속도 UP", desc: "이동속도 15% 증가", color: 0x3498db },
  { type: "score", title: `+${SCORE_BONUS}점`, desc: "즉시 점수 획득", color: 0xf1c40f },
  { type: "heartBoost", title: "회복 강화", desc: "하트 회복량 15% 증가", color: 0xff6b81 },
  { type: "hpDecay", title: "체력 감소 DOWN", desc: "체력 감소 속도 15% 감소", color: 0x1abc9c },
];

const REWARD_CARDS_EN: CardDef[] = [
  { type: "jump", title: "JUMP UP", desc: "Jump +15%", color: 0x2ecc71 },
  { type: "jumpCount", title: "JUMP COUNT UP", desc: "Jump count +1", color: 0x9b59b6 },
  { type: "speed", title: "SPEED UP", desc: "Speed +15%", color: 0x3498db },
  { type: "score", title: `+${SCORE_BONUS}pts`, desc: "Instant score", color: 0xf1c40f },
  { type: "heartBoost", title: "HEART BOOST", desc: "Heart restore +15%", color: 0xff6b81 },
  { type: "hpDecay", title: "DECAY DOWN", desc: "Decay -15%", color: 0x1abc9c },
];

const ACTIVE_CARDS_KO: CardDef[] = [
  { type: "magnet", title: "자석", desc: "코인을 끌어당기는 힘!", color: 0xe74c3c },
  { type: "giant", title: "거인화", desc: "거대해져서 운석 파괴!", color: 0xe67e22 },
  { type: "coinRain", title: "코인 비", desc: "하늘에서 코인이 내린다!", color: 0xf1c40f },
  { type: "multiJumpScore", title: "멀티점프", desc: "다단 점프로 보너스 점수!", color: 0x9b59b6 },
  { type: "skyTreasure", title: "하늘 보물", desc: "높은 곳에서 보물이 내린다!", color: 0x3498db },
];

const ACTIVE_CARDS_EN: CardDef[] = [
  { type: "magnet", title: "MAGNET", desc: "Attract coins!", color: 0xe74c3c },
  { type: "giant", title: "GIANT", desc: "Grow big & smash meteors!", color: 0xe67e22 },
  { type: "coinRain", title: "COIN RAIN", desc: "Coins from the sky!", color: 0xf1c40f },
  { type: "multiJumpScore", title: "MULTI JUMP", desc: "Bonus score on multi-jumps!", color: 0x9b59b6 },
  { type: "skyTreasure", title: "SKY TREASURE", desc: "Treasures from above!", color: 0x3498db },
];

const CHOOSE_REWARD = {
  ko: "보상을 선택하세요!",
  en: "Choose a reward!",
} as const;

export interface RewardCallbacks {
  isJumpCountMaxed: () => boolean;
  isActiveUnlocked: (type: ActiveAbilityType) => boolean;
}

export class RewardCardUI {
  private scene: Phaser.Scene;
  private locale: "ko" | "en";
  private rewardCallbacks: RewardCallbacks;

  private rewardUI: Phaser.GameObjects.GameObject[] = [];
  private rewardTimers: Phaser.Time.TimerEvent[] = [];
  private pendingRewardTypes: ChoiceType[] = [];
  private rewardKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  onSelect: ((type: ChoiceType) => void) | null = null;

  private get rewardCards() { return this.locale === "en" ? REWARD_CARDS_EN : REWARD_CARDS_KO; }
  private get activeCards() { return this.locale === "en" ? ACTIVE_CARDS_EN : ACTIVE_CARDS_KO; }

  constructor(
    scene: Phaser.Scene,
    locale: "ko" | "en",
    callbacks: RewardCallbacks,
  ) {
    this.scene = scene;
    this.locale = locale;
    this.rewardCallbacks = callbacks;
  }

  show(): void {
    const selected = this.pickCards();
    const cardW = 150 * S;
    const cardH = 180 * S;
    const gap = 24 * S;
    const totalW = cardW * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2;
    const cardY = (GAME_HEIGHT - cardH) / 2;

    // Dark overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(20);
    this.rewardUI.push(overlay);

    // Title
    const title = this.scene.add
      .text(GAME_WIDTH / 2, cardY - 30 * S, CHOOSE_REWARD[this.locale], {
        fontFamily: FONT_FAMILY,
        fontSize: `${20 * S}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.rewardUI.push(title);

    // Cards (enter from bottom with stagger)
    selected.forEach((card, i) => {
      const cx = startX + cardW / 2 + i * (cardW + gap);
      const cy = cardY + cardH / 2;

      const container = this.scene.add.container(cx, GAME_HEIGHT + cardH).setDepth(21);

      // Entrance animation → idle float on complete
      this.scene.tweens.add({
        targets: container,
        y: cy,
        duration: 400,
        delay: i * 100,
        ease: "Back.Out",
        onComplete: () => {
          this.scene.tweens.add({
            targets: container,
            y: cy - 4 * S,
            duration: 1200,
            delay: i * 200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
        },
      });

      const hx = -cardW / 2;
      const hy = -cardH / 2;
      const r = 12 * S;

      // Hover glow (behind card bg)
      const glow = this.scene.add.graphics();
      const glowPad = 8 * S;
      glow.fillStyle(card.color, 1);
      glow.fillRoundedRect(
        hx - glowPad, hy - glowPad,
        cardW + glowPad * 2, cardH + glowPad * 2,
        r + glowPad
      );
      glow.setAlpha(0);
      container.add(glow);

      // Background
      const bg = this.scene.add.graphics();
      bg.fillStyle(card.color, 0.25);
      bg.fillRoundedRect(hx, hy, cardW, cardH, r);
      bg.lineStyle(1.5 * S, card.color, 0.45);
      bg.strokeRoundedRect(hx, hy, cardW, cardH, r);
      container.add(bg);

      // Border shimmer dot
      const shimmerDot = this.scene.add.graphics();
      const shimmerColor = lighten(card.color, 60);
      const shimmerR = 4 * S;
      shimmerDot.fillStyle(shimmerColor, 0.8);
      shimmerDot.fillCircle(0, 0, shimmerR);
      shimmerDot.setAlpha(0.8);
      container.add(shimmerDot);

      const perimeter = (cardW + cardH) * 2;
      const shimmerTarget = { progress: 0 };
      this.scene.tweens.add({
        targets: shimmerTarget,
        progress: 1,
        duration: 2500,
        repeat: -1,
        ease: "Linear",
        onUpdate: () => {
          const p = shimmerTarget.progress;
          const dist = p * perimeter;
          let sx: number, sy: number;
          if (dist < cardW) {
            sx = hx + dist; sy = hy;
          } else if (dist < cardW + cardH) {
            sx = hx + cardW; sy = hy + (dist - cardW);
          } else if (dist < cardW * 2 + cardH) {
            sx = hx + cardW - (dist - cardW - cardH); sy = hy + cardH;
          } else {
            sx = hx; sy = hy + cardH - (dist - cardW * 2 - cardH);
          }
          shimmerDot.setPosition(sx, sy);
        },
      });

      // Title
      const cardTitle = this.scene.add
        .text(0, -25 * S, card.title, {
          fontFamily: FONT_FAMILY,
          fontSize: `${18 * S}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(cardTitle);

      // Description
      const cardDesc = this.scene.add
        .text(0, 20 * S, card.desc, {
          fontFamily: FONT_FAMILY,
          fontSize: `${12 * S}px`,
          color: "#cccccc",
        })
        .setOrigin(0.5);
      container.add(cardDesc);

      // Sparkle particles
      const sparkleTimer = this.scene.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          const px = Phaser.Math.Between(Math.round(hx + 6 * S), Math.round(hx + cardW - 6 * S));
          const py = Phaser.Math.Between(Math.round(hy + 6 * S), Math.round(hy + cardH - 6 * S));
          const dot = this.scene.add.graphics();
          dot.fillStyle(card.color, 0.7);
          dot.fillCircle(0, 0, Phaser.Math.Between(1, 3) * S);
          dot.setPosition(px, py);
          container.add(dot);
          this.scene.tweens.add({
            targets: dot,
            y: py - Phaser.Math.Between(8, 16) * S,
            alpha: 0,
            duration: 800,
            ease: "Quad.Out",
            onComplete: () => { dot.destroy(); },
          });
        },
      });
      this.rewardTimers.push(sparkleTimer);

      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });

      container.on("pointerover", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 100,
        });
        this.scene.tweens.add({
          targets: glow,
          alpha: 0.25,
          duration: 150,
        });
      });
      container.on("pointerout", () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
        this.scene.tweens.add({
          targets: glow,
          alpha: 0,
          duration: 150,
        });
      });
      container.on("pointerdown", () => {
        this.handleSelect(card.type);
      });

      this.rewardUI.push(container);
    });

    // Keyboard shortcut
    this.pendingRewardTypes = selected.map((c) => c.type);
    this.rewardKeyHandler = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        ArrowLeft: 0,
        ArrowDown: 1,
        ArrowRight: 2,
      };
      const idx = keyMap[e.key];
      if (idx !== undefined && this.pendingRewardTypes[idx]) {
        this.handleSelect(this.pendingRewardTypes[idx]);
      }
    };
    this.scene.game.canvas.ownerDocument.addEventListener("keydown", this.rewardKeyHandler);
  }

  private handleSelect(type: ChoiceType): void {
    this.clearRewardUI();
    this.onSelect?.(type);
  }

  private pickCards(): CardDef[] {
    let pool = [...this.rewardCards];
    if (this.rewardCallbacks.isJumpCountMaxed()) {
      pool = pool.filter((c) => c.type !== "jumpCount");
    }

    const activeTypes: ActiveAbilityType[] = ["magnet", "giant", "coinRain", "multiJumpScore", "skyTreasure"];
    const unlocked = activeTypes.filter((t) => this.rewardCallbacks.isActiveUnlocked(t));

    if (unlocked.length > 0) {
      const chosenType = unlocked[Phaser.Math.Between(0, unlocked.length - 1)];
      const activeCard = this.activeCards.find((c) => c.type === chosenType)!;
      const passives = Phaser.Utils.Array.Shuffle(pool).slice(0, 2);
      const insertIdx = Phaser.Math.Between(0, 2);
      passives.splice(insertIdx, 0, activeCard);
      return passives;
    }

    return Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
  }

  cleanup(): void {
    this.clearRewardUI();
  }

  private clearRewardUI(): void {
    if (this.rewardKeyHandler) {
      this.scene.game.canvas.ownerDocument.removeEventListener("keydown", this.rewardKeyHandler);
      this.rewardKeyHandler = null;
    }
    this.pendingRewardTypes = [];
    this.rewardTimers.forEach((t) => t.remove());
    this.rewardTimers = [];
    this.rewardUI.forEach((obj) => obj.destroy());
    this.rewardUI = [];
  }
}
