// ── Render quality scale ──
// Multiplies internal resolution for sharper visuals on HiDPI displays.
// All pixel-dimension and velocity constants scale by S; time / ratio / color constants stay unchanged.
export const S = 2;

// Game dimensions
export const GAME_WIDTH = 800 * S;
export const GAME_HEIGHT = 400 * S;

// Physics
export const GRAVITY = 1200 * S;
export const JUMP_VELOCITY = -450 * S;
export const MAX_JUMPS = 2;

// Jump feel
export const JUMP_BUFFER_MS = 100;
export const COYOTE_TIME_MS = 80;
export const LOW_JUMP_GRAVITY_MULT = 3;
export const FALL_GRAVITY_MULT = 1.5;

// Player
export const PLAYER_X = 100 * S;
export const PLAYER_SIZE = 40 * S;
export const PLAYER_TEX_HEIGHT = 56 * S;

// Ground
export const GROUND_HEIGHT = 40 * S;
export const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT / 2;

// Ground segments (scrolling)
export const GROUND_TILE_WIDTH = 200 * S;
export const GROUND_SEGMENT_MIN = 2;
export const GROUND_SEGMENT_MAX = 4;
export const GAP_WIDTH_MIN = 100 * S;
export const GAP_WIDTH_MAX = 150 * S;
export const GAP_PROBABILITY = 0.3;
export const SCROLL_SPEED_INITIAL = -250 * S;
export const SCROLL_SPEED_MAX = -500 * S;
export const SCROLL_SPEED_INCREMENT = -10 * S;

// Coins
export const COIN_SIZE = 20 * S;
export const COIN_SCORE = 1;
export const COIN_LINE_SPACING = 40 * S;
export const COIN_ARC_COUNT = 5;
export const COIN_GROUND_Y_OFFSET = -30 * S;
export const COIN_HIGH_Y = 220 * S;
export const COIN_MID_Y = (COIN_HIGH_Y + (GROUND_Y - GROUND_HEIGHT / 2 + COIN_GROUND_Y_OFFSET)) / 2;
export const COIN_DIAGONAL_COUNT = 5;
export const COIN_ZIGZAG_COUNT = 6;
export const COIN_DIAMOND_COUNT = 5;
export const COLOR_COIN = 0xf1c40f;

// Quiz
export const QUIZ_INTERVAL_MS = 8000;
export const QUIZ_ANNOUNCE_MS = 4500;
export const QUIZ_WINDOW_MS = 5000;
export const QUIZ_RESULT_MS = 1000;
export const QUIZ_ITEM_SIZE = 44 * S;
export const QUIZ_WORD_WIDTH = 90 * S;
export const QUIZ_WORD_HEIGHT = 40 * S;
export const QUIZ_ITEM_HIGH_Y = 200 * S;
export const QUIZ_ITEM_SPACING_X = 200 * S;
export const COLOR_QUIZ_WORD = 0x3498db;

// Buff / Debuff (stack-based: multiplier = base ^ stacks)
export const SPEED_STACK_BASE = 1.15;
export const JUMP_STACK_BASE = 1.15;
export const SPEED_MULT_MIN = 0.4;
export const SPEED_MULT_MAX = 2.5;
export const JUMP_MULT_MIN = 0.4;
export const JUMP_MULT_MAX = 2.5;
export const JUMP_COUNT_MIN = 1;
export const JUMP_COUNT_MAX = 4;
export const SCORE_BONUS = 30;
export const EFFECT_DISPLAY_MS = 1500;

// HP gauge (Cookie Run style)
export const HP_MAX = 90000;
export const HP_ICON_RADIUS = 14 * S;
export const HP_BAR_X = 36 * S;
export const HP_BAR_Y = 8 * S;
export const HP_BAR_WIDTH = 600 * S;
export const HP_BAR_HEIGHT = 18 * S;
export const HP_BAR_RADIUS = 9 * S;
export const HP_BAR_PADDING = 2.5 * S;
export const COLOR_HP_HEART = 0xe74c3c;
export const COLOR_HP_HEART_SHINE = 0xf1948a;

// HP gauge visual
export const HP_FRAME_BG = 0x2a1215;
export const HP_FRAME_OUTLINE = 0x922b21;
export const HP_COLORS = {
  high: { fill: 0x2ecc71, dark: 0x1fa85a, outline: 0x1b8a4a, shine: 0x58d68d },
  mid:  { fill: 0xf39c12, dark: 0xd4850a, outline: 0xb37209, shine: 0xf5b041 },
  low:  { fill: 0xe74c3c, dark: 0xc0392b, outline: 0x922b21, shine: 0xec7063 },
};
export const HP_SEGMENT_COLOR = 0x922b21;
export const HP_MAX_BOOST = 5000;
export const HP_RESTORE_AMOUNT = 8000;
export const HP_DECAY_STACK_BASE = 1.15;
export const HP_DECAY_MULT_MIN = 0.4;
export const HP_DECAY_MULT_MAX = 2.5;
export const HP_MAX_MIN = 15000;

// Fall death
export const FALL_DEATH_Y = GAME_HEIGHT + 50 * S;

// Game Over
export const HIT_FREEZE_DURATION = 800;
export const RESTART_DELAY = 500;

// Speed increase per N coins
export const SPEED_UP_COIN_INTERVAL = 10;

// Colors
export const COLOR_SKY = 0xe8f4f8;
export const COLOR_PLAYER = 0x4a90d9;
export const COLOR_GROUND = 0x8b7355;
export const COLOR_GROUND_TOP = 0x6b8e23;

// Particle effects
export const TRAIL_LENGTH = 8;
export const DUST_PARTICLE_COUNT = 6;
export const JUMP_BURST_COUNT = 4;

// ── Screen FX ──
export const SHAKE_FALL_DEATH = { intensity: 0.015, duration: 300 };
export const SHAKE_HP_DEATH = { intensity: 0.008, duration: 200 };
export const SHAKE_WRONG_COLLECT = { intensity: 0.005, duration: 150 };
export const SHAKE_QUIZ_COLLECT = { intensity: 0.008, duration: 100 };
export const SHAKE_HIGH_LAND = { intensity: 0.003, duration: 100 };

export const FREEZE_QUIZ_COLLECT = 60;
export const FREEZE_DEATH = 100;
export const FREEZE_WRONG = 40;

export const FLASH_CORRECT = { r: 255, g: 255, b: 255, duration: 200 };
export const FLASH_WRONG = { r: 200, g: 50, b: 50, duration: 150 };
export const FLASH_HP_LOW = { r: 200, g: 50, b: 50, duration: 100 };
export const FLASH_COIN_STREAK = { r: 240, g: 200, b: 50, duration: 100 };
export const COIN_STREAK_THRESHOLD = 10;

export const ZOOM_PUNCH_QUIZ = { scale: 1.03, duration: 200 };
export const ZOOM_PUNCH_REWARD = { scale: 1.05, duration: 100 };

// ── Particle pool ──
export const PARTICLE_POOL_SIZE = 40;
export const COIN_BURST_COUNT = 8;
export const QUIZ_BURST_COUNT = 12;
export const DEATH_BURST_COUNT = 20;
export const SPEED_LINE_COUNT = 3;
export const AMBIENT_DUST_COUNT = 12;
export const SPEED_LINE_THRESHOLD = 1.5;

// ── Depth layers ──
export const DEPTH_SKY = -10;
export const DEPTH_SKY_TINT = -9;
export const DEPTH_PARALLAX_FAR = -3;
export const DEPTH_PARALLAX_MID = -2;
export const DEPTH_PARALLAX_NEAR = -1;
export const DEPTH_AMBIENT = 0.5;
export const DEPTH_ENTITIES = 1;
export const DEPTH_SPEED_LINES = 1.5;
export const DEPTH_HUD = 5;
export const DEPTH_QUIZ = 10;
export const DEPTH_OVERLAY = 20;

// ── Parallax mountain colors ──
export const COLOR_MOUNTAIN_FAR = 0xc8d8e8;
export const COLOR_MOUNTAIN_MID = 0x9bb0c8;
export const COLOR_MOUNTAIN_NEAR = 0x7a96b0;

// ── Sky gradient ──
export const SKY_TOP_COLOR = { r: 0x5b, g: 0x86, b: 0xc7 };
export const SKY_MID_COLOR = { r: 0xa8, g: 0xce, b: 0xef };
export const SKY_BOT_COLOR = { r: 0xf5, g: 0xe6, b: 0xca };

// ── Day/Night cycle (score-based, loops every 500 points) ──
export const DAY_NIGHT_CYCLE_SCORE = 500;
export const DAY_NIGHT_STAGES = [
  { at: 0.00, sky: { r: 255, g: 255, b: 255, a: 0    }, mountain: 0xffffff },  // Day — clear
  { at: 0.25, sky: { r: 255, g: 140, b:  50, a: 0.25 }, mountain: 0xffd0a0 },  // Sunset — orange
  { at: 0.50, sky: { r:  20, g:  24, b:  82, a: 0.55 }, mountain: 0x3a3f6e },  // Night — dark navy
  { at: 0.75, sky: { r: 120, g:  60, b: 140, a: 0.35 }, mountain: 0x8a6090 },  // Dawn — purple/pink
  { at: 1.00, sky: { r: 255, g: 255, b: 255, a: 0    }, mountain: 0xffffff },  // Day — loops
];

// ── HP gauge animation ──
export const HP_LOW_THRESHOLD = 0.25;
export const HP_HEARTBEAT_DURATION = 400;
export const HP_LERP_SPEED = 3;
export const HP_DAMAGE_FLASH_MS = 100;

// ── Score popup ──
export const SCORE_POPUP_DURATION = 600;
export const SCORE_POPUP_RISE = 30 * S;
export const SCORE_BOUNCE_SCALE = 1.3;
export const SCORE_BOUNCE_DURATION = 200;
export const SCORE_LERP_SPEED = 200;
