import * as Phaser from "phaser";
import {
  S,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SIZE,
  PLAYER_TEX_HEIGHT,
  GROUND_TILE_WIDTH,
  GROUND_HEIGHT,
  COIN_SIZE,
  QUIZ_ITEM_SIZE,
  COLOR_GROUND_TOP,
  COLOR_COIN,
  COLOR_MOUNTAIN_FAR,
  COLOR_MOUNTAIN_MID,
  COLOR_MOUNTAIN_NEAR,
  SKY_TOP_COLOR,
  SKY_MID_COLOR,
  SKY_BOT_COLOR,
} from "../constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    this.createSkyTexture();
    this.createPlayerTexture();
    this.createGroundTileTexture();
    this.createCoinTexture();
    this.createMeteorTexture();
    this.createMountainTextures();
    this.scene.start("GameScene");
  }

  // ── Sky gradient texture ──

  private createSkyTexture(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const g = this.add.graphics();

    const top = SKY_TOP_COLOR;
    const mid = SKY_MID_COLOR;
    const bot = SKY_BOT_COLOR;

    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      let r: number, gr: number, b: number;
      if (t < 0.5) {
        const lt = t / 0.5;
        r = Math.round(top.r + (mid.r - top.r) * lt);
        gr = Math.round(top.g + (mid.g - top.g) * lt);
        b = Math.round(top.b + (mid.b - top.b) * lt);
      } else {
        const lt = (t - 0.5) / 0.5;
        r = Math.round(mid.r + (bot.r - mid.r) * lt);
        gr = Math.round(mid.g + (bot.g - mid.g) * lt);
        b = Math.round(mid.b + (bot.b - mid.b) * lt);
      }
      g.fillStyle((r << 16) | (gr << 8) | b);
      g.fillRect(0, y, w, 1);
    }

    g.generateTexture("sky_gradient", w, h);
    g.destroy();
  }

  // ── Hoodie body drawing ──

  private drawHoodieBody(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    topPad: number,
    eyeStyle: "normal" | "squint" | "dead" | "open" = "normal"
  ): void {
    const bodyX = 4 * S;
    const bodyY = topPad;
    const bodyW = 32 * S;
    const bodyH = 38 * S;
    const tlr = 14 * S;
    const trr = 14 * S;
    const blr = 4 * S;
    const brr = 4 * S;

    // Body gradient (top lighter, bottom darker)
    const topColor = { r: 0xd0, g: 0x44, b: 0x35 };
    const botColor = { r: 0xa0, g: 0x28, b: 0x1e };
    for (let row = 0; row < bodyH; row++) {
      const t = row / (bodyH - 1);
      const r = Math.round(topColor.r + (botColor.r - topColor.r) * t);
      const gr = Math.round(topColor.g + (botColor.g - topColor.g) * t);
      const b = Math.round(topColor.b + (botColor.b - topColor.b) * t);
      g.fillStyle((r << 16) | (gr << 8) | b);
      // Clip to rounded rect area per row
      const ry = bodyY + row;
      let leftEdge = bodyX;
      let rightEdge = bodyX + bodyW;

      // Top-left corner
      if (row < tlr) {
        const dy = tlr - row;
        const dx = tlr - Math.sqrt(Math.max(0, tlr * tlr - dy * dy));
        leftEdge = Math.max(leftEdge, bodyX + dx);
      }
      // Top-right corner
      if (row < trr) {
        const dy = trr - row;
        const dx = trr - Math.sqrt(Math.max(0, trr * trr - dy * dy));
        rightEdge = Math.min(rightEdge, bodyX + bodyW - dx);
      }
      // Bottom-left corner
      if (row > bodyH - blr) {
        const dy = row - (bodyH - blr);
        const dx = blr - Math.sqrt(Math.max(0, blr * blr - dy * dy));
        leftEdge = Math.max(leftEdge, bodyX + dx);
      }
      // Bottom-right corner
      if (row > bodyH - brr) {
        const dy = row - (bodyH - brr);
        const dx = brr - Math.sqrt(Math.max(0, brr * brr - dy * dy));
        rightEdge = Math.min(rightEdge, bodyX + bodyW - dx);
      }

      if (rightEdge > leftEdge) {
        g.fillRect(leftEdge, ry, rightEdge - leftEdge, 1);
      }
    }

    // Hood edge shadow (dark arc at top, kept inside body)
    g.lineStyle(2 * S, 0x7a1a12, 0.5);
    g.beginPath();
    g.arc(cx + 2 * S, bodyY + tlr, tlr - 2 * S, -Math.PI * 0.75, -Math.PI * 0.25, false);
    g.strokePath();

    // Outline
    g.lineStyle(2 * S, 0x922b21);
    g.beginPath();
    g.moveTo(bodyX + tlr, bodyY);
    g.lineTo(bodyX + bodyW - trr, bodyY);
    g.arc(bodyX + bodyW - trr, bodyY + trr, trr, -Math.PI / 2, 0, false);
    g.lineTo(bodyX + bodyW, bodyY + bodyH - brr);
    g.arc(bodyX + bodyW - brr, bodyY + bodyH - brr, brr, 0, Math.PI / 2, false);
    g.lineTo(bodyX + blr, bodyY + bodyH);
    g.arc(bodyX + blr, bodyY + bodyH - blr, blr, Math.PI / 2, Math.PI, false);
    g.lineTo(bodyX, bodyY + tlr);
    g.arc(bodyX + tlr, bodyY + tlr, tlr, Math.PI, -Math.PI / 2, false);
    g.closePath();
    g.strokePath();

    // Pocket line
    g.lineStyle(1 * S, 0x922b21, 0.5);
    g.lineBetween(bodyX + 6 * S, bodyY + 30 * S, bodyX + bodyW - 6 * S, bodyY + 30 * S);

    // Center seam (zipper line)
    const seamX = cx + 7 * S;
    const seamTop = bodyY + 24 * S;
    const seamBot = bodyY + bodyH - 2 * S;
    g.lineStyle(2 * S, 0x922b21);
    g.lineBetween(seamX, seamTop, seamX, seamBot);

    // "K" on right chest
    const kx = seamX + 3 * S;
    const ky = bodyY + 24 * S;
    const kh = 6 * S;
    g.lineStyle(1.2 * S, 0xffffff);
    g.lineBetween(kx, ky, kx, ky + kh);
    g.lineBetween(kx + 4 * S, ky, kx, ky + kh * 0.45);
    g.lineBetween(kx, ky + kh * 0.45, kx + 4 * S, ky + kh);

    // Face (white oval)
    const faceCx = cx + 2 * S;
    const faceCy = topPad + 14 * S;
    const faceRx = 11 * S;
    const faceRy = 10 * S;
    g.fillStyle(0xffffff);
    g.fillEllipse(faceCx, faceCy, faceRx * 2, faceRy * 2);

    // Eyes
    const eyeY = topPad + 13 * S;
    if (eyeStyle === "squint") {
      const es = 3 * S;
      g.lineStyle(1.8 * S, 0x222222);
      const lx = cx + 3 * S;
      g.lineBetween(lx - es, eyeY - es, lx + es, eyeY);
      g.lineBetween(lx + es, eyeY, lx - es, eyeY + es);
      const rx = cx + 11 * S;
      g.lineBetween(rx + es, eyeY - es, rx - es, eyeY);
      g.lineBetween(rx - es, eyeY, rx + es, eyeY + es);
    } else if (eyeStyle === "dead") {
      const es = 2.5 * S;
      g.lineStyle(1.8 * S, 0x222222);
      const lx = cx + 4 * S;
      g.lineBetween(lx - es, eyeY - es, lx + es, eyeY + es);
      g.lineBetween(lx + es, eyeY - es, lx - es, eyeY + es);
      const rx = cx + 11 * S;
      g.lineBetween(rx - es, eyeY - es, rx + es, eyeY + es);
      g.lineBetween(rx + es, eyeY - es, rx - es, eyeY + es);
    } else if (eyeStyle === "open") {
      // Surprised "o" mouth eyes
      g.fillStyle(0xffffff);
      g.fillCircle(cx + 2 * S, eyeY, 5 * S);
      g.fillCircle(cx + 10 * S, eyeY, 4 * S);
      g.fillStyle(0x222222);
      g.fillCircle(cx + 4 * S, eyeY - 1 * S, 2.5 * S);
      g.fillCircle(cx + 11 * S, eyeY - 1 * S, 2 * S);
      // White highlight dots
      g.fillStyle(0xffffff);
      g.fillCircle(cx + 3 * S, eyeY - 2 * S, 1 * S);
      g.fillCircle(cx + 10 * S, eyeY - 2 * S, 0.8 * S);
    } else {
      g.fillStyle(0xffffff);
      g.fillCircle(cx + 2 * S, eyeY, 5 * S);
      g.fillCircle(cx + 10 * S, eyeY, 4 * S);
      g.fillStyle(0x222222);
      g.fillCircle(cx + 4 * S, eyeY, 2.5 * S);
      g.fillCircle(cx + 11 * S, eyeY, 2 * S);
      // White highlight dots
      g.fillStyle(0xffffff);
      g.fillCircle(cx + 3 * S, eyeY - 1 * S, 1 * S);
      g.fillCircle(cx + 10 * S, eyeY - 1 * S, 0.8 * S);
    }

    // Blush
    g.fillStyle(0xffaaaa, 0.5);
    g.fillCircle(faceCx - faceRx * 0.6, faceCy + faceRy * 0.5, 2.5 * S);
    g.fillCircle(faceCx + faceRx * 0.65, faceCy + faceRy * 0.5, 2.5 * S);
  }

  private drawLeg(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    shoeH: number,
    r: number
  ): void {
    g.fillStyle(0xc0392b);
    g.fillRoundedRect(x, y, w, h, { tl: 0, tr: 0, bl: r, br: r });
    // Shoe
    g.fillStyle(0x922b21);
    g.fillRoundedRect(x, y + h - shoeH, w, shoeH, { tl: 0, tr: 0, bl: r, br: r });
    // Shoe laces
    g.lineStyle(0.8 * S, 0xffffff, 0.6);
    g.lineBetween(x + 1 * S, y + h - shoeH + 1 * S, x + w - 1 * S, y + h - shoeH + 1 * S);
    if (shoeH > 2 * S) {
      g.lineBetween(x + 1 * S, y + h - shoeH + 3 * S, x + w - 1 * S, y + h - shoeH + 3 * S);
    }
    // Outline
    g.lineStyle(2 * S, 0x922b21);
    g.strokeRoundedRect(x, y, w, h, { tl: 0, tr: 0, bl: r, br: r });
  }

  // ── Character shadow ──
  private drawShadow(g: Phaser.GameObjects.Graphics, cx: number, bottomY: number): void {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(cx, bottomY + 2 * S, 26 * S, 6 * S);
  }

  private createPlayerTexture(): void {
    const w = PLAYER_SIZE;
    const h = PLAYER_TEX_HEIGHT;
    const topPad = 3 * S;
    const legR = 3 * S;

    // --- Run frames (4 frames, exaggerated leg movement) ---
    const legConfigs = [
      { leftY: 36 * S, leftH: 14 * S, rightY: 42 * S, rightH: 8 * S },
      { leftY: 39 * S, leftH: 11 * S, rightY: 39 * S, rightH: 11 * S },
      { leftY: 42 * S, leftH: 8 * S, rightY: 36 * S, rightH: 14 * S },
      { leftY: 39 * S, leftH: 11 * S, rightY: 39 * S, rightH: 11 * S },
    ];

    for (let frame = 0; frame < 4; frame++) {
      const g = this.add.graphics();
      const cx = w / 2;
      this.drawHoodieBody(g, cx, topPad);

      const leftX = cx - 6 * S;
      const rightX = cx + 1 * S;
      const legW = 7 * S;
      const shoeH = 3 * S;
      const cfg = legConfigs[frame];

      this.drawLeg(g, leftX, topPad + cfg.leftY, legW, cfg.leftH, shoeH, legR);
      this.drawLeg(g, rightX, topPad + cfg.rightY, legW, cfg.rightH, shoeH, legR);
      this.drawShadow(g, cx, topPad + Math.max(cfg.leftY + cfg.leftH, cfg.rightY + cfg.rightH));

      g.generateTexture(`player_run${frame}`, w, h);
      g.destroy();
    }

    // --- Jump frame ---
    {
      const g = this.add.graphics();
      const cx = w / 2;
      this.drawHoodieBody(g, cx, topPad, "squint");

      const leftX = cx - 6 * S;
      const rightX = cx + 1 * S;
      const legW = 7 * S;
      const shoeH = 3 * S;
      this.drawLeg(g, leftX, topPad + 38 * S, legW, 12 * S, shoeH, legR);
      this.drawLeg(g, rightX, topPad + 40 * S, legW, 10 * S, shoeH, legR);

      g.generateTexture("player_jump", w, h);
      g.destroy();
    }

    // --- Fall frame ---
    {
      const g = this.add.graphics();
      const cx = w / 2;
      this.drawHoodieBody(g, cx, topPad, "open");

      const leftX = cx - 8 * S;
      const rightX = cx + 3 * S;
      const legW = 7 * S;
      const shoeH = 3 * S;
      this.drawLeg(g, leftX, topPad + 38 * S, legW, 13 * S, shoeH, legR);
      this.drawLeg(g, rightX, topPad + 38 * S, legW, 13 * S, shoeH, legR);

      g.generateTexture("player_fall", w, h);
      g.destroy();
    }

    // --- Spin frame ---
    {
      const g = this.add.graphics();
      const cx = w / 2;
      this.drawHoodieBody(g, cx, topPad, "squint");

      const leftX = cx - 6 * S;
      const rightX = cx + 1 * S;
      const legW = 7 * S;
      const shoeH = 2 * S;
      const tuckY = topPad + 39 * S;
      const tuckH = 7 * S;

      this.drawLeg(g, leftX, tuckY, legW, tuckH, shoeH, legR);
      this.drawLeg(g, rightX, tuckY, legW, tuckH, shoeH, legR);

      g.generateTexture("player_spin", w, h);
      g.destroy();
    }

    // --- Duck frame ---
    {
      const g = this.add.graphics();
      const cx = w / 2;
      const duckTopPad = topPad + 12 * S;
      this.drawHoodieBody(g, cx, duckTopPad, "squint");

      const leftX = cx - 6 * S;
      const rightX = cx + 1 * S;
      const legW = 7 * S;
      const shoeH = 2 * S;
      this.drawLeg(g, leftX, duckTopPad + 38 * S, legW, 6 * S, shoeH, 3 * S);
      this.drawLeg(g, rightX, duckTopPad + 38 * S, legW, 6 * S, shoeH, 3 * S);
      this.drawShadow(g, cx, duckTopPad + 44 * S);

      g.generateTexture("player_duck", w, h);
      g.destroy();
    }

    // --- Dead frame ---
    {
      const g = this.add.graphics();
      const cx = w / 2;
      this.drawHoodieBody(g, cx, topPad, "dead");

      const leftX = cx - 6 * S;
      const rightX = cx + 1 * S;
      const legW = 7 * S;
      const shoeH = 3 * S;
      this.drawLeg(g, leftX, topPad + 38 * S, legW, 12 * S, shoeH, legR);
      this.drawLeg(g, rightX, topPad + 40 * S, legW, 10 * S, shoeH, legR);

      g.generateTexture("player_dead", w, h);
      g.destroy();
    }
  }

  private createGroundTileTexture(): void {
    const w = GROUND_TILE_WIDTH;
    const h = GROUND_HEIGHT;

    for (let variant = 0; variant < 2; variant++) {
      const g = this.add.graphics();
      const seed = variant * 137;

      // Gradient fill
      const topRGB = { r: 0x9b, g: 0x83, b: 0x65 };
      const botRGB = { r: 0x6a, g: 0x55, b: 0x40 };
      const gradientStart = 6 * S;
      const gradientRows = h - gradientStart;
      for (let i = 0; i < gradientRows; i++) {
        const t = i / (gradientRows - 1);
        const r = Math.round(topRGB.r + (botRGB.r - topRGB.r) * t);
        const gr = Math.round(topRGB.g + (botRGB.g - topRGB.g) * t);
        const b = Math.round(topRGB.b + (botRGB.b - topRGB.b) * t);
        g.fillStyle((r << 16) | (gr << 8) | b);
        g.fillRect(0, gradientStart + i, w, 1);
      }

      // Dirt texture dots
      for (let d = 0; d < 30 * S; d++) {
        const dx = ((seed + d * 73) % w);
        const dy = gradientStart + ((seed + d * 47) % gradientRows);
        g.fillStyle(0x5a4530, 0.3);
        g.fillRect(dx, dy, 1 * S, 1 * S);
      }

      // Grass top
      g.fillStyle(COLOR_GROUND_TOP);
      g.fillRect(0, 0, w, 6 * S);

      // Grass blades
      const bladeColors = [0x6b8e23, 0x7ba028, 0x5d7a1e];
      for (let bx = 0; bx < w; bx += Phaser.Math.Between(3 * S, 5 * S)) {
        const bladeH = Phaser.Math.Between(3 * S, 6 * S);
        const color = bladeColors[(bx + seed) % bladeColors.length];
        g.fillStyle(color);
        g.fillTriangle(bx, 6 * S, bx + 1 * S, 6 * S - bladeH, bx + 2 * S, 6 * S);
      }

      // Top border line
      g.lineStyle(1 * S, 0x4a6818);
      g.lineBetween(0, 6 * S, w, 6 * S);

      // Tile divider
      g.lineStyle(1 * S, 0x7a6548);
      g.lineBetween(w - 1 * S, 6 * S, w - 1 * S, h);

      const key = variant === 0 ? "groundTile" : "groundTile2";
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  private createCoinTexture(): void {
    const size = COIN_SIZE;

    const widths = [1.0, 0.7, 0.3, 0.7];
    for (let frame = 0; frame < 4; frame++) {
      const g = this.add.graphics();
      const scaleX = widths[frame];
      const cx = size / 2;
      const cy = size / 2;
      const rx = (size / 2 - 1 * S) * scaleX;
      const ry = size / 2 - 1 * S;

      // Outer
      g.fillStyle(COLOR_COIN);
      g.fillEllipse(cx, cy, rx * 2, ry * 2);

      // Inner ring
      g.fillStyle(0xd4a017, 0.4);
      g.fillEllipse(cx, cy, rx * 1.4, ry * 1.4);

      // Star in center
      if (scaleX > 0.5) {
        g.fillStyle(0xfff176, 0.8);
        const starR = ry * 0.35;
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const innerAngle = angle + Math.PI / 5;
          const ox = cx + Math.cos(angle) * starR * scaleX;
          const oy = cy + Math.sin(angle) * starR;
          const ix = cx + Math.cos(innerAngle) * starR * 0.4 * scaleX;
          const iy = cy + Math.sin(innerAngle) * starR * 0.4;
          if (i === 0) g.moveTo(ox, oy);
          else g.lineTo(ox, oy);
          g.lineTo(ix, iy);
        }
        g.closePath();
        g.fillPath();
      }

      // Border
      g.lineStyle(1.5 * S, 0xd4a017);
      g.strokeEllipse(cx, cy, rx * 2, ry * 2);

      // Highlight
      if (scaleX > 0.4) {
        g.fillStyle(0xfff176, 0.5);
        g.fillEllipse(cx - rx * 0.2, cy - ry * 0.2, rx * 0.5, ry * 0.5);
      }

      // Shadow arc
      g.lineStyle(1 * S, 0xb8860b, 0.3);
      g.beginPath();
      g.arc(cx + rx * 0.1, cy + ry * 0.1, ry * 0.7, 0.3, Math.PI * 0.8, false);
      g.strokePath();

      g.generateTexture(`coin_f${frame}`, size, size);
      g.destroy();
    }

    // Coin glow texture
    {
      const glowSize = 30 * S;
      const g = this.add.graphics();
      for (let ring = 5; ring > 0; ring--) {
        const t = ring / 5;
        g.fillStyle(0xf1c40f, t * 0.15);
        g.fillCircle(glowSize / 2, glowSize / 2, (glowSize / 2) * t);
      }
      g.generateTexture("coinGlow", glowSize, glowSize);
      g.destroy();
    }
  }

  // ── Mountain textures (3 layers, sin-curve based for perfect tiling) ──

  private createMountainTextures(): void {
    const w = GAME_WIDTH;
    const h = 160 * S;
    const PI2 = Math.PI * 2;

    // Helper: draw a smooth mountain silhouette using summed sinusoids.
    // All harmonics have period = w, so f(0) === f(w) → seamless tile.
    const drawMountain = (
      g: Phaser.GameObjects.Graphics,
      color: number,
      baseY: number,
      harmonics: { amp: number; freq: number; phase: number }[],
      texKey: string,
    ) => {
      g.fillStyle(color);
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 2 * S) {
        let y = baseY;
        for (const { amp, freq, phase } of harmonics) {
          y -= amp * Math.sin((PI2 * freq * x) / w + phase);
        }
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fillPath();
      g.generateTexture(texKey, w, h);
      g.destroy();
    };

    // Far mountains — gentle, low amplitude
    drawMountain(
      this.add.graphics(),
      COLOR_MOUNTAIN_FAR,
      80 * S,
      [
        { amp: 25 * S, freq: 1, phase: 0 },
        { amp: 15 * S, freq: 2, phase: 1.2 },
        { amp: 8 * S, freq: 3, phase: 3.5 },
      ],
      "mountains_far",
    );

    // Mid mountains — medium peaks
    drawMountain(
      this.add.graphics(),
      COLOR_MOUNTAIN_MID,
      75 * S,
      [
        { amp: 28 * S, freq: 1, phase: 0.8 },
        { amp: 18 * S, freq: 2, phase: 2.4 },
        { amp: 10 * S, freq: 4, phase: 4.1 },
      ],
      "mountains_mid",
    );

    // Near mountains — sharper, taller peaks
    drawMountain(
      this.add.graphics(),
      COLOR_MOUNTAIN_NEAR,
      70 * S,
      [
        { amp: 30 * S, freq: 1, phase: 1.5 },
        { amp: 20 * S, freq: 3, phase: 3.0 },
        { amp: 12 * S, freq: 5, phase: 5.2 },
      ],
      "mountains_near",
    );
  }

  private createMeteorTexture(): void {
    const size = QUIZ_ITEM_SIZE;
    const g = this.add.graphics();

    g.fillStyle(0xff6b35, 0.3);
    g.fillCircle(size / 2, size / 2, size / 2);

    g.fillStyle(0xffaa00);
    g.fillCircle(size / 2, size / 2, size / 3);

    // Outline stroke (dark burnt orange, like heart border approach)
    g.lineStyle(2.5 * S, 0x8b3a00, 1);
    g.strokeCircle(size / 2, size / 2, size / 3);

    g.fillStyle(0xffff99);
    g.fillCircle(size / 2, size / 2, size / 5);

    g.generateTexture("meteor", size, size);
    g.destroy();
  }
}
