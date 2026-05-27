import * as Phaser from "phaser";
import { S, GAME_HEIGHT, BIG_COIN_VALUE } from "../constants";

export class Coin extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private spawnX: number;
  private spinTimer = 0;
  private currentFrame = 0;
  private rainMode = false;
  private bigMode = false;
  public value = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "coin_f0");

    this.baseY = y;
    this.spawnX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  setBigMode(): void {
    this.bigMode = true;
    this.value = BIG_COIN_VALUE;
    this.setTexture("bigCoin_f0");
  }

  setScrollSpeed(speed: number): void {
    this.setVelocityX(speed);
  }

  adjustBaseY(dy: number): void {
    this.baseY += dy;
  }

  setRainMode(): void {
    this.rainMode = true;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Bob animation (sine wave) — rain coins fall instead.
    // 1200 px/s — 화면을 약 0.5초만에 가로질러 떨어짐 (소나기 강도).
    if (this.rainMode) {
      this.baseY += 1200 * S * (delta / 1000);
      this.y = this.baseY;
    } else {
      this.y = this.baseY + Math.sin(time * 0.003 + this.spawnX * 0.1) * 3 * S;
    }

    // Spin animation (cycle through 4 width frames)
    this.spinTimer += delta;
    if (this.spinTimer > 166) { // ~6fps
      this.spinTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4;
      const prefix = this.bigMode ? "bigCoin_f" : "coin_f";
      this.setTexture(`${prefix}${this.currentFrame}`);
    }

    if (this.x + this.width / 2 < 0 || this.y > GAME_HEIGHT + 100 * S) {
      this.destroy();
    }
  }
}
