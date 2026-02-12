import Phaser from "phaser";

interface ShakeConfig {
  intensity: number;
  duration: number;
}

interface FlashConfig {
  r: number;
  g: number;
  b: number;
  duration: number;
}

interface ZoomConfig {
  scale: number;
  duration: number;
}

export class ScreenFXManager {
  private scene: Phaser.Scene;
  private frozen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shake(config: ShakeConfig): void {
    this.scene.cameras.main.shake(config.duration, config.intensity);
  }

  flash(config: FlashConfig, alpha = 1): void {
    const cam = this.scene.cameras.main;
    cam.flash(config.duration, config.r * alpha, config.g * alpha, config.b * alpha);
  }

  freeze(durationMs: number, callback?: () => void): void {
    if (this.frozen) return;
    this.frozen = true;
    this.scene.physics.pause();
    this.scene.time.paused = true;

    // Use raw setTimeout since scene time is paused
    setTimeout(() => {
      if (!this.scene || !this.scene.scene.isActive()) {
        this.frozen = false;
        return;
      }
      this.scene.time.paused = false;
      this.scene.physics.resume();
      this.frozen = false;
      callback?.();
    }, durationMs);
  }

  zoomPunch(config: ZoomConfig): void {
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: cam,
      zoom: config.scale,
      duration: config.duration,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => {
        cam.zoom = 1;
      },
    });
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  destroy(): void {
    this.frozen = false;
  }
}
