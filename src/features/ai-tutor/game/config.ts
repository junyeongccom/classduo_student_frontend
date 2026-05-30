import * as Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, COLOR_SKY } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

/**
 * @param parent Phaser 렌더 컨테이너
 * @param landscapeZoom 모바일 가로 강제 시 고정 줌(=목표 캔버스 폭/GAME_WIDTH). 지정 시 Scale.NONE 사용 —
 *   부모를 90° 회전시켜도 FIT처럼 회전된 bounding box를 재측정해 캔버스가 절반으로 줄지 않도록 측정에서 분리한다.
 */
export function createGameConfig(parent: HTMLElement, landscapeZoom?: number): Phaser.Types.Core.GameConfig {
  const scale: Phaser.Types.Core.ScaleConfig = landscapeZoom
    ? { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER, zoom: landscapeZoom }
    : { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH };
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
    dom: {
      createContainer: true,
    },
    scale,
    scene: [BootScene, MainMenuScene, GameScene, GameOverScene],
  };
}
