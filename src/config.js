// ============================================
// config.js — Constants, perspective, tuning
// ============================================

window.TD = window.TD || {};

const VERSION = 'build 39';
const W = 800, H = 600;

// Perspective
const VP_X = W / 2;
const VP_Y = 130;
const GROUND_BOTTOM = H + 40;
const PLAYER_T = 0.68;
const LANE_W = 55;
const LANES = [-1, 0, 1];

// Physics
const BASE_SPEED = 0.0025;
const MAX_SPEED = 0.011;
const SPEED_INCREMENT = 0.0000025;
// Distance (in meters, as shown in the HUD) before the speed ramp kicks in.
// Before this threshold the runner stays at BASE_SPEED so beginners can warm up.
const SPEED_RAMP_START_METERS = 200;
// Jump tuning — these are paired with BASE_SPEED so the obstacle's collision
// dwell time fits comfortably inside the "clear" window of the jump arc.
//   jump duration   ≈ 2 * JUMP_VEL / GRAV                         (~50 frames)
//   "clear" window  = frames where jumpT > JUMP_CLEAR_THRESHOLD   (~49 frames)
//   collision dwell = (2 * OBS_COLLISION_HALF_T) / current_speed  (~32 frames at BASE_SPEED)
// Margin ≈ 17 frames at BASE_SPEED — forgiving but still requires real timing.
const JUMP_VEL = 0.030;
const GRAV = 0.0012;
const JUMP_CLEAR_THRESHOLD = 0.030;

// Slide
const SLIDE_DURATION = 150;         // total frames a slide lasts
const SLIDE_ACTIVE_START = 3;       // frame at which the slide "hitbox" becomes low
const SLIDE_ACTIVE_END = 147;       // frame at which the slide "hitbox" stops being low

// Obstacles
const OBS_INTERVAL = 145;
const OVERHEAD_CHANCE = 0.3;        // chance an obstacle is an overhead beam (slide-under)
const OBS_COLLISION_HALF_T = 0.040; // half-depth of the collision zone around PLAYER_T

// Coins
const COIN_INTERVAL_MIN = 35;
const COIN_INTERVAL_RANGE = 25;

// Invincibility power-up — collect this many coins in a row (without missing any)
// to enter a short invincible phase. The phase lasts INVINCIBLE_FRAMES game frames
// (~60 fps, so 300 frames ≈ 5 seconds).
const COIN_STREAK_GOAL = 5;
const INVINCIBLE_FRAMES = 300;

// Helpers
function laneToScreen(lane, t) {
  const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
  const x = VP_X + lane * LANE_W * t;
  return { x, y };
}

function pathHalfW(t) {
  return LANE_W * 1.8 * t + 8;
}

// Export to namespace
Object.assign(TD, {
  VERSION,
  W, H, VP_X, VP_Y, GROUND_BOTTOM, PLAYER_T, LANE_W, LANES,
  BASE_SPEED, MAX_SPEED, SPEED_INCREMENT, SPEED_RAMP_START_METERS,
  JUMP_VEL, GRAV, JUMP_CLEAR_THRESHOLD,
  SLIDE_DURATION, SLIDE_ACTIVE_START, SLIDE_ACTIVE_END,
  OBS_INTERVAL, OVERHEAD_CHANCE, OBS_COLLISION_HALF_T,
  COIN_INTERVAL_MIN, COIN_INTERVAL_RANGE,
  COIN_STREAK_GOAL, INVINCIBLE_FRAMES,
  laneToScreen, pathHalfW
});
