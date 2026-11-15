// Prism Leap — physics: one fixed step of the platformer.
// Pure movement, collision, gravity flip, colour gates, springs, spikes,
// shards and the exit. No rendering, no input polling, no randomness here.
import {
  COLS, ROWS, TILE, GRAVITY, MOVE_SPEED, JUMP_SPEED, SPRING_SPEED,
  MAX_FALL, PLAYER_W, PLAYER_H, PRISM_COLORS, STEP,
} from './config.js';

export const TILE_SOLID = '#';
export const TILE_SPIKE = '^';
export const TILE_SHARD = 'o';
export const TILE_SPRING = '~';
export const TILE_START = 'P';
export const TILE_EXIT = 'E';
export const GATE_KEYS = ['R', 'B', 'G'];

/** Parse one level map into tiles, start, exit and shard positions. */
export function parseLevel(map) {
  const tiles = [];
  let start = { x: TILE * 2, y: TILE * 16 };
  let exit = { x: TILE * 30, y: TILE * 16 };
  const shards = [];
  for (let row = 0; row < ROWS; row += 1) {
    tiles.push(map[row].split(''));
    for (let col = 0; col < COLS; col += 1) {
      const ch = map[row][col];
      if (ch === TILE_START) start = { x: col * TILE + 4, y: row * TILE + TILE - PLAYER_H };
      if (ch === TILE_EXIT) exit = { x: col * TILE + 2, y: row * TILE + 2, w: TILE - 4, h: TILE - 4 };
      if (ch === TILE_SHARD) shards.push({ col, row, taken: false });
    }
  }
  return { tiles, start, exit, shards };
}

function tileAt(level, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return TILE_SOLID;
  return level.tiles[row][col];
}

/** A gate blocks the prism unless its colour matches the gate's colour. */
export function gateBlocks(level, col, row, colorIndex) {
  const ch = tileAt(level, col, row);
  if (!GATE_KEYS.includes(ch)) return false;
  return PRISM_COLORS[colorIndex].key !== ch;
}

function solidAt(level, col, row, colorIndex) {
  const ch = tileAt(level, col, row);
  if (ch === TILE_SOLID) return true;
  return gateBlocks(level, col, row, colorIndex);
}

/** True when the rectangle (x, y, w, h) overlaps any solid tile or gate. */
export function hitsSolid(level, x, y, w, h, colorIndex) {
  const c0 = Math.floor(x / TILE);
  const c1 = Math.floor((x + w - 0.01) / TILE);
  const r0 = Math.floor(y / TILE);
  const r1 = Math.floor((y + h - 0.01) / TILE);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      if (solidAt(level, col, row, colorIndex)) return true;
    }
  }
  return false;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function tileRect(col, row) {
  return { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
}

/** Fresh player state at the level start. */
export function freshPlayer(level) {
  return {
    x: level.start.x, y: level.start.y, w: PLAYER_W, h: PLAYER_H,
    vx: 0, vy: 0, gravity: 1, color: 1, grounded: false,
    coyote: 0, jumpBuffer: 0, invulnerable: 1, face: 1,
  };
}

/**
 * Advance the player one fixed step. `input` is { left, right, jump, flip, color }.
 * Returns events: { jumped, flipped, recolored, shard, spring, died, exited }.
 */
export function stepPlayer(level, player, input, dt = STEP) {
  const events = { jumped: false, flipped: false, recolored: false, shard: false, spring: false, died: false, exited: false };

  if (input.flip) {
    player.gravity *= -1;
    player.vy = 0;
    events.flipped = true;
  }
  if (typeof input.color === 'number' && input.color >= 0 && input.color < PRISM_COLORS.length && input.color !== player.color) {
    player.color = input.color;
    events.recolored = true;
  }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx = dir * MOVE_SPEED;
  if (dir !== 0) player.face = dir;

  if (input.jump) player.jumpBuffer = 0.12;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = player.grounded ? 0.12 : Math.max(0, player.coyote - dt);
  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = -player.gravity * JUMP_SPEED;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    events.jumped = true;
  }

  player.vy += player.gravity * GRAVITY * dt;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  if (player.vy < -MAX_FALL) player.vy = -MAX_FALL;

  // Horizontal move, then resolve against solid tiles.
  player.x += player.vx * dt;
  if (hitsSolid(level, player.x, player.y, player.w, player.h, player.color)) {
    if (player.vx > 0) player.x = Math.floor((player.x + player.w) / TILE) * TILE - player.w - 0.01;
    else if (player.vx < 0) player.x = (Math.floor(player.x / TILE) + 1) * TILE + 0.01;
    else player.x -= player.vx * dt;
    player.vx = 0;
  }
  player.x = Math.max(0, Math.min(COLS * TILE - player.w, player.x));

  // Vertical move, then resolve; landing sets grounded.
  const wasGrounded = player.grounded;
  player.grounded = false;
  player.y += player.vy * dt;
  if (hitsSolid(level, player.x, player.y, player.w, player.h, player.color)) {
    if (player.vy > 0) player.y = Math.floor((player.y + player.h) / TILE) * TILE - player.h - 0.01;
    else if (player.vy < 0) player.y = (Math.floor(player.y / TILE) + 1) * TILE + 0.01;
    if (player.gravity === 1 ? player.vy > 0 : player.vy < 0) player.grounded = true;
    player.vy = 0;
  }
  if (player.grounded && !wasGrounded) player.coyote = 0.12;
  player.y = Math.max(0, Math.min(ROWS * TILE - player.h, player.y));

  if (player.invulnerable > 0) player.invulnerable -= dt;

  // Tile interactions: spikes, springs, shards, exit.
  const c0 = Math.floor(player.x / TILE);
  const c1 = Math.floor((player.x + player.w - 0.01) / TILE);
  const r0 = Math.floor(player.y / TILE);
  const r1 = Math.floor((player.y + player.h - 0.01) / TILE);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const ch = tileAt(level, col, row);
      const rect = tileRect(col, row);
      if (ch === TILE_SPIKE && player.invulnerable <= 0 && overlaps(player, rect)) {
        events.died = true;
        return events;
      }
      if (ch === TILE_SPRING && overlaps(player, rect)) {
        const springing = player.gravity === 1 ? player.vy >= 0 : player.vy <= 0;
        if (springing && player.grounded) {
          player.vy = -player.gravity * SPRING_SPEED;
          player.grounded = false;
          events.spring = true;
        }
      }
    }
  }
  for (const shard of level.shards) {
    if (shard.taken) continue;
    const rect = tileRect(shard.col, shard.row);
    const centre = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    const shardCentre = { x: rect.x + TILE / 2, y: rect.y + TILE / 2 };
    const dx = centre.x - shardCentre.x;
    const dy = centre.y - shardCentre.y;
    if (dx * dx + dy * dy < 34 * 34) {
      shard.taken = true;
      events.shard = true;
    }
  }
  if (overlaps(player, level.exit)) events.exited = true;
  return events;
}
