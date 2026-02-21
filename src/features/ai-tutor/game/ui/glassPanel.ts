import * as Phaser from "phaser";
import { S } from "../constants";

export interface GlassPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  glowColor?: number;
  glowColorDark?: number;
}

/**
 * Draw a glassmorphism panel: dark base, top highlight, edge line, 3-layer glow border.
 * If `glowColorDark` is provided the outer two layers use it; otherwise all layers use `glowColor`.
 */
export function drawGlassPanel(
  g: Phaser.GameObjects.Graphics,
  opts: GlassPanelOptions,
): void {
  const { x, y, width, height, radius } = opts;
  const glowColor = opts.glowColor ?? 0xffffff;
  const glowColorDark = opts.glowColorDark ?? glowColor;

  // 1) Base dark layer
  g.fillStyle(0x0a0a1a, 0.55);
  g.fillRoundedRect(x, y, width, height, radius);

  // 2) Top 1/3 highlight (glass reflection)
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(x, y, width, height * 0.35, {
    tl: radius,
    tr: radius,
    bl: 0,
    br: 0,
  });

  // 3) Top edge bright line
  g.lineStyle(1 * S, 0xffffff, 0.15);
  g.beginPath();
  g.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
  g.lineTo(x + width - radius, y);
  g.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, 0);
  g.strokePath();

  // 4) 3-layer glow border
  g.lineStyle(6 * S, glowColorDark, glowColorDark === glowColor ? 0.06 : 0.12);
  g.strokeRoundedRect(x, y, width, height, radius);

  g.lineStyle(3 * S, glowColorDark, glowColorDark === glowColor ? 0.15 : 0.25);
  g.strokeRoundedRect(x, y, width, height, radius);

  g.lineStyle(1.5 * S, glowColor, glowColorDark === glowColor ? 0.35 : 0.5);
  g.strokeRoundedRect(x, y, width, height, radius);
}

/** Lighten an RGB hex color by adding `amount` to each channel (clamped to 255). */
export function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}
