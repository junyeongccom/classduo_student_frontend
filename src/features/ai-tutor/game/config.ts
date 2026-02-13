import * as Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, COLOR_SKY } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLOR_SKY,
    parent,
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: GRAVITY },
        debug: false,
      },
    },
    input: {
      keyboard: {
        capture: [
          Phaser.Input.Keyboard.KeyCodes.SPACE,
          Phaser.Input.Keyboard.KeyCodes.UP,
          Phaser.Input.Keyboard.KeyCodes.DOWN,
        ],
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene, GameOverScene],
  };
}
