import * as Phaser from "phaser";
import { S, GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY } from "../constants";

// ── i18n ──

interface LeaderboardStrings {
  title: string;
  rank: string;
  name: string;
  score: string;
  empty: string;
  back: string;
  yourBest: string;
  loading: string;
}

const STRINGS: Record<"ko" | "en", LeaderboardStrings> = {
  ko: {
    title: "리더보드",
    rank: "순위",
    name: "이름",
    score: "점수",
    empty: "아직 기록이 없습니다",
    back: "뒤로가기",
    yourBest: "내 최고 기록",
    loading: "로딩 중...",
  },
  en: {
    title: "Leaderboard",
    rank: "Rank",
    name: "Name",
    score: "Score",
    empty: "No records yet",
    back: "Back",
    yourBest: "Your Best",
    loading: "Loading...",
  },
};

// ── Scene ──

export class LeaderboardScene extends Phaser.Scene {
  private t!: LeaderboardStrings;

  constructor() {
    super({ key: "LeaderboardScene" });
  }

  create(): void {
    const loc = this.game.registry.get("locale") as string | undefined;
    this.t = STRINGS[loc === "en" ? "en" : "ko"];

    this.createBackground();
    this.createTitle();
    this.createBackButton();
    this.loadRankingData();
  }

  // ── Background ──

  private createBackground(): void {
    const gfx = this.add.graphics();
    const steps = 64;
    const sliceH = GAME_HEIGHT / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Phaser.Math.Linear(0x0d, 0x0a, t);
      const g = Phaser.Math.Linear(0x11, 0x0a, t);
      const b = Phaser.Math.Linear(0x17, 0x0a, t);
      const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, i * sliceH, GAME_WIDTH, sliceH + 1);
    }

    const glow = this.add.graphics();
    glow.fillStyle(0x6366f1, 0.07);
    glow.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 40 * S, GAME_WIDTH * 1.2, 260 * S);
  }

  // ── Title ──

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 50 * S, this.t.title, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(36 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#312E81",
        strokeThickness: 4 * S,
      })
      .setOrigin(0.5);
  }

  // ── Back button ──

  private createBackButton(): void {
    const btnW = 160 * S;
    const btnH = 36 * S;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 50 * S;
    const radius = 10 * S;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.8);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    bg.lineStyle(2 * S, 0x6366f1, 0.5);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

    const hoverBg = this.add.graphics();
    hoverBg.fillStyle(0x1a1a2e, 0.9);
    hoverBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    hoverBg.lineStyle(2 * S, 0x818cf8, 1);
    hoverBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
    hoverBg.setAlpha(0);

    const text = this.add
      .text(0, 0, this.t.back, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(16 * S)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, hoverBg, text]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      this.tweens.add({ targets: hoverBg, alpha: 1, duration: 150 });
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    container.on("pointerout", () => {
      this.tweens.add({ targets: hoverBg, alpha: 0, duration: 150 });
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    container.on("pointerdown", () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95,
        duration: 50, yoyo: true,
        onComplete: () => this.scene.start("MainMenuScene"),
      });
    });
  }

  // ── Data loading ──

  private async loadRankingData(): Promise<void> {
    const lectureId = this.game.registry.get("lectureId") as string;
    if (!lectureId) {
      this.showEmptyState();
      return;
    }

    // Loading text
    const loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, this.t.loading, {
        fontFamily: FONT_FAMILY,
        fontSize: `${16 * S}px`,
        color: "#818CF8",
      })
      .setOrigin(0.5);

    try {
      const { gameScoreService } = await import("../../services/gameScoreService");
      const { data } = await gameScoreService.getRankings(lectureId);

      loadingText.destroy();

      if (!data || data.rankings.length === 0) {
        this.showEmptyState();
        return;
      }

      this.renderRankings(data.rankings, data.my_best);
    } catch {
      loadingText.destroy();
      this.showEmptyState();
    }
  }

  // ── Render rankings ──

  private renderRankings(
    rankings: Array<{
      rank: number;
      user_id: string;
      display_name?: string | null;
      score: number;
      achieved_at: string;
    }>,
    myBest: {
      rank: number;
      score: number;
      achieved_at: string;
    } | null,
  ): void {
    const headerY = 100 * S;
    const rowH = 30 * S;
    const colX = {
      rank: GAME_WIDTH * 0.15,
      name: GAME_WIDTH * 0.5,
      score: GAME_WIDTH * 0.8,
    };
    const fontSize = `${14 * S}px`;
    const headerFontSize = `${13 * S}px`;

    // Header
    const headerColor = "#888888";
    this.add.text(colX.rank, headerY, this.t.rank, { fontFamily: FONT_FAMILY, fontSize: headerFontSize, color: headerColor, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(colX.name, headerY, this.t.name, { fontFamily: FONT_FAMILY, fontSize: headerFontSize, color: headerColor, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(colX.score, headerY, this.t.score, { fontFamily: FONT_FAMILY, fontSize: headerFontSize, color: headerColor, fontStyle: "bold" }).setOrigin(0.5);

    // Separator
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, 0x333333, 0.5);
    sepGfx.lineBetween(GAME_WIDTH * 0.08, headerY + 16 * S, GAME_WIDTH * 0.92, headerY + 16 * S);

    // Rows (max ~12 visible)
    const maxVisible = Math.min(rankings.length, 12);
    for (let i = 0; i < maxVisible; i++) {
      const entry = rankings[i];
      const y = headerY + 36 * S + i * rowH;
      // myBest가 있고 같은 순위이면 현재 사용자 행 하이라이트
      const isMe = myBest !== null && entry.rank === myBest.rank && entry.score === myBest.score;

      if (isMe) {
        const rowBg = this.add.graphics();
        rowBg.fillStyle(0x6366f1, 0.15);
        rowBg.fillRoundedRect(GAME_WIDTH * 0.08, y - rowH / 2 + 2, GAME_WIDTH * 0.84, rowH - 4, 6 * S);
      }

      const textColor = isMe ? "#818CF8" : "#cccccc";
      const rankColor = i < 3 ? ["#FFD700", "#C0C0C0", "#CD7F32"][i] : textColor;

      this.add.text(colX.rank, y, `${entry.rank}`, { fontFamily: FONT_FAMILY, fontSize, color: rankColor, fontStyle: "bold" }).setOrigin(0.5);
      this.add.text(colX.name, y, entry.display_name || "???", { fontFamily: FONT_FAMILY, fontSize, color: textColor }).setOrigin(0.5);
      this.add.text(colX.score, y, `${entry.score}`, { fontFamily: FONT_FAMILY, fontSize, color: textColor, fontStyle: "bold" }).setOrigin(0.5);
    }

    // If user's best is outside top visible entries, show below
    if (myBest && myBest.rank > maxVisible) {
      const extraY = headerY + 36 * S + maxVisible * rowH + 20 * S;

      const sepGfx2 = this.add.graphics();
      sepGfx2.lineStyle(1, 0x6366f1, 0.3);
      sepGfx2.lineBetween(GAME_WIDTH * 0.2, extraY - 10 * S, GAME_WIDTH * 0.8, extraY - 10 * S);

      this.add.text(GAME_WIDTH * 0.12, extraY, this.t.yourBest, { fontFamily: FONT_FAMILY, fontSize: `${12 * S}px`, color: "#818CF8" }).setOrigin(0, 0.5);
      this.add.text(colX.rank, extraY, `${myBest.rank}`, { fontFamily: FONT_FAMILY, fontSize, color: "#818CF8", fontStyle: "bold" }).setOrigin(0.5);
      this.add.text(colX.score, extraY, `${myBest.score}`, { fontFamily: FONT_FAMILY, fontSize, color: "#818CF8", fontStyle: "bold" }).setOrigin(0.5);
    }
  }

  // ── Empty state ──

  private showEmptyState(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, this.t.empty, {
        fontFamily: FONT_FAMILY,
        fontSize: `${20 * S}px`,
        color: "#666666",
      })
      .setOrigin(0.5);
  }
}
