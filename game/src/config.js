// Prism Leap — shared constants: view size, tile grid, physics and palette.
// One clear job: every number the rest of the game agrees on lives here.
export const VIEW_W = 960;
export const VIEW_H = 540;
export const TILE = 30;
export const COLS = 32;
export const ROWS = 18;

export const GRAVITY = 1800; // px/s^2 pulling toward the current "down"
export const MOVE_SPEED = 250; // px/s horizontal
export const JUMP_SPEED = 700; // px/s, ~136 px high, ~194 px of air distance
export const SPRING_SPEED = 1080; // px/s from a spring pad
export const MAX_FALL = 1100; // px/s terminal velocity; must stay above JUMP_SPEED (700) and SPRING_SPEED (1080), or the clamp eats both
export const PLAYER_W = 22;
export const PLAYER_H = 26;
export const MAX_LIVES = 3;
export const STEP = 1 / 60; // fixed simulation step, seconds

// Prism colours: ruby / azure / verdant. Gates open only to a matching prism.
export const PRISM_COLORS = [
  { key: 'R', name: 'ruby', fill: '#ff5a6e', glow: '#ff9aa8', dark: '#a11e30' },
  { key: 'B', name: 'azure', fill: '#4aa8ff', glow: '#9fd0ff', dark: '#14568f' },
  { key: 'G', name: 'verdant', fill: '#58d68d', glow: '#a9ecc2', dark: '#1d7a44' },
];

export const PALETTE = {
  skyTop: '#131a33',
  skyBottom: '#232c52',
  star: '#cdd7ff',
  block: '#3b4a7a',
  blockTop: '#5a6cb0',
  blockDark: '#232c52',
  spike: '#e8ecf7',
  spikeTip: '#ff5a6e',
  coin: '#ffd94a',
  coinCore: '#fff3b0',
  exitRing: '#7ef0d4',
  exitCore: '#d8fff4',
  spring: '#ff9f43',
  text: '#f2f5ff',
  dim: '#9aa7d6',
  hudBack: 'rgba(8, 11, 26, 0.72)',
};
