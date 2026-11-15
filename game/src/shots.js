// Prism Leap — shots: stage the four screenshot scenes with the game's own
// rules. Each scene plays forward from a fresh world at fixed steps, steered
// by a simple autopilot, so every frame is what a real game looks like and
// the same run always gives the same frame. No randomness anywhere.
//   start: title screen over a live level-1 backdrop
//   play:  autopilot plays level 2 (ruby gate) for 9 seconds
//   win:   autopilot plays the whole run; the win screen shows its real stats
//   lose:  a careless autopilot (never jumps) dies three times on level 4
import { STEP } from './config.js';
import { stepPlayer } from './physics.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER } from './render.js';

const SAMPLE = STEP;

/** Nearest shard, else the exit — the autopilot's objective. */
function objective(level, player) {
  let best = null;
  let bestD = Infinity;
  for (const shard of level.shards) {
    if (shard.taken) continue;
    const dx = shard.col * 30 + 15 - (player.x + player.w / 2);
    const dy = shard.row * 30 + 15 - (player.y + player.h / 2);
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = { x: shard.col * 30 + 15, y: shard.row * 30 + 15 }; }
  }
  if (best) return best;
  return { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 };
}

function gateAhead(level, player, dir) {
  const aheadX = dir > 0 ? player.x + player.w + 6 : player.x - 6;
  const col = Math.floor(aheadX / 30);
  const rows = [Math.floor(player.y / 30), Math.floor((player.y + player.h - 1) / 30)];
  for (const row of rows) {
    if (col < 0 || col >= 32 || row < 0 || row >= 18) continue;
    const ch = level.tiles[row][col];
    if (ch === 'R' || ch === 'B' || ch === 'G') return ch;
  }
  return null;
}

/**
 * While falling, project where the player will land (fall time from the
 * first solid tile in the gravity direction) and say which way to steer
 * when that landing is a spike: +1 steer right, -1 steer left, 0 safe.
 */
function landingDanger(level, player) {
  const col = Math.floor((player.x + player.w / 2) / 30);
  const step = player.gravity > 0 ? 1 : -1;
  let row = player.gravity > 0 ? Math.floor((player.y + player.h) / 30) : Math.floor(player.y / 30);
  while (row >= 0 && row < 18) {
    const ch = level.tiles[row][col];
    if (ch === '#' || ch === 'R' || ch === 'B' || ch === 'G') {
      const spikeRow = row - step;
      if (spikeRow < 0 || spikeRow >= 18) return 0;
      const dist = player.gravity > 0
        ? row * 30 - (player.y + player.h)
        : player.y - (row + 1) * 30;
      const fallTime = Math.sqrt((2 * Math.max(0, dist)) / 1800);
      const landX = player.x + player.w / 2 + player.vx * fallTime;
      // The landing box is 22px wide, so check every column it spans,
      // not just the centre column — a corner clip on a spike kills.
      const leftCol = Math.floor((landX - player.w / 2) / 30);
      const rightCol = Math.floor((landX + player.w / 2 - 1) / 30);
      let spikeLeft = false, spikeRight = false;
      for (let c = leftCol; c <= rightCol; c += 1) {
        if (c < 0 || c >= 32) continue;
        if (level.tiles[spikeRow][c] === '^') {
          if (c * 30 + 15 < landX) spikeLeft = true;
          else spikeRight = true;
        }
      }
      if (!spikeLeft && !spikeRight) return 0;
      // Steer away from the spike side. Spikes on both sides: steer back
      // the way the player came, or toward the nearer edge when falling
      // straight down.
      if (spikeLeft && !spikeRight) return -1;
      if (spikeRight && !spikeLeft) return 1;
      if (player.vx > 0) return 1;
      if (player.vx < 0) return -1;
      let l = leftCol;
      while (l >= 0 && level.tiles[spikeRow][l] === '^') l -= 1;
      let r = rightCol;
      while (r < 32 && level.tiles[spikeRow][r] === '^') r += 1;
      return (landX - (l + 1) * 30) <= (r * 30 - landX) ? 1 : -1;
    }
    row += step;
  }
  return 0;
}

/** True when a jump from here, toward `dir`, would land on a spike. */
function jumpWouldLandOnSpike(level, player, dir) {
  const groundRow = player.gravity > 0
    ? Math.floor((player.y + player.h + 4) / 30)
    : Math.floor((player.y - 4) / 30);
  const spikeRow = groundRow - player.gravity;
  if (spikeRow < 0 || spikeRow >= 18) return false;
  const landCol = Math.floor((player.x + player.w / 2 + dir * 194) / 30);
  for (let c = landCol - 1; c <= landCol + 1; c += 1) {
    if (c >= 0 && c < 32 && level.tiles[spikeRow][c] === '^') return true;
  }
  return false;
}

/** True when flipping here would drop the player onto a spike: the flip
 * sends it straight to the opposite surface, so a spike in its columns
 * on the way there is fatal. Scans the rows it falls through until a
 * fully solid row (the landing surface) is reached. */
function flipWouldLandOnSpike(level, player) {
  const leftCol = Math.floor(player.x / 30);
  const rightCol = Math.floor((player.x + player.w - 1) / 30);
  const step = player.gravity > 0 ? -1 : 1;
  let r = player.gravity > 0
    ? Math.floor(player.y / 30) - 1
    : Math.floor((player.y + player.h - 1) / 30) + 1;
  while (r >= 0 && r < 18) {
    let allSolid = true;
    for (let c = leftCol; c <= rightCol; c += 1) {
      const ch = level.tiles[r][c];
      if (ch === '^') return true;
      if (ch !== '#' && ch !== 'R' && ch !== 'B' && ch !== 'G') allSolid = false;
    }
    if (allSolid) return false;
    r += step;
  }
  return false;
}

/** True while the player's box still shares a row with any spike tile.
 * After a gravity flip the player rises slowly from rest, so it must hold
 * still horizontally until it clears that band — drifting sideways while
 * still low walks its edge into a spike column. */
function inSpikeBand(level, player) {
  const top = Math.floor(player.y / 30);
  const bottom = Math.floor((player.y + player.h - 1) / 30);
  for (let r = top; r <= bottom; r += 1) {
    if (r < 0 || r >= 18) continue;
    if (level.tiles[r].includes('^')) return true;
  }
  return false;
}

/** Steer the player: chase the objective, jump spikes/walls/gaps, match gates. */
export function autopilot(level, player, state) {
  // Hold still while rising out of a spike band after a flip. The flag
  // stays set until the player lands on the other side, so that while it
  // rises it steers toward the objective instead of coasting in the old
  // horizontal direction (a coast after a flip can carry it away from
  // the shard it flipped for).
  if (state.rising) {
    if (player.grounded) state.rising = false;
    else if (inSpikeBand(level, player)) return { left: false, right: false, jump: false, flip: false, color: -1 };
  }
  // Air steering first: never land on spikes. While falling, steer back
  // when the projected landing is a spike run.
  if (!player.grounded && player.vy * player.gravity > 0) {
    const danger = landingDanger(level, player);
    if (danger !== 0) {
      // Sticky: once steering starts, keep the same direction until the
      // landing is safe again, so the input cannot flip every step and
      // hover the player over the spikes.
      if (!state.steer) state.steer = danger > 0 ? -1 : 1;
      return { left: state.steer < 0, right: state.steer > 0, jump: false, flip: false, color: -1 };
    }
    state.steer = 0;
  } else if (player.grounded) {
    state.steer = 0;
  }
  const target = objective(level, player);
  const centre = player.x + player.w / 2;
  const dx = target.x - centre;
  // While airborne, never chase the target's x: the target may sit above a
  // spike run, and chasing it stalls the jump over the hazard. Coast in
  // the jump direction until landing, then steer on the ground. Only when
  // falling straight down (vx 0) steer toward the target in the air.
  // Exception: right after a gravity flip (state.rising) the player is
  // rising to the other side, not jumping a hazard — chase the target.
  const dead = player.grounded ? 6 : 12;
  let dir = dx > dead ? 1 : dx < -dead ? -1 : 0;
  if (!player.grounded && player.vx !== 0 && !state.rising) dir = Math.sign(player.vx);
  // Aligned horizontally but the objective is below on the gravity side
  // (standing on a ledge over it): walk off the edge toward it instead of
  // standing still — keep the facing direction so the drop happens.
  if (dir === 0 && player.grounded) {
    const dy0 = target.y - (player.y + player.h / 2);
    if ((player.gravity > 0 && dy0 > 40) || (player.gravity < 0 && dy0 < -40)) dir = player.face;
  }
  const dy = target.y - (player.y + player.h / 2);
  // The player wants to flip when the objective is on the far side of
  // gravity and it stands under/over it. If that flip would land on
  // spikes, do not stand still in the dead zone — nudge toward the
  // objective until the box clears the spike columns, then flip.
  const wantFlip = player.grounded && Math.abs(dx) < 40
    && ((player.gravity > 0 && dy < -80) || (player.gravity < 0 && dy > 80));
  const flipBlocked = wantFlip && flipWouldLandOnSpike(level, player);
  if (flipBlocked) dir = dx !== 0 ? Math.sign(dx) : player.face;
  const input = { left: dir < 0, right: dir > 0, jump: false, flip: false, color: -1 };

  const gate = gateAhead(level, player, dir || 1);
  if (gate) {
    const want = gate === 'R' ? 0 : gate === 'B' ? 1 : 2;
    if (player.color !== want) input.color = want;
  }
  // Flip when standing under/over the objective on the far side of gravity;
  // jump for it only when it is on the anti-gravity side (a shard overhead
  // while walking the floor, or underfoot while walking the ceiling) — never
  // jump for a shard that sits below on the gravity side: that only bounces
  // the player away from it. And never jump for a shard when the jump would
  // land on spikes. When the flip is blocked, do NOT jump instead — jumping
  // off the ceiling here just bounces the player away from the flip spot.
  if (wantFlip && !flipBlocked) {
    input.flip = true;
    state.rising = true;
  } else if (!wantFlip && player.grounded && Math.abs(dx) < 40
    && ((player.gravity > 0 && dy < -40) || (player.gravity < 0 && dy > 40))) {
    if (!jumpWouldLandOnSpike(level, player, dir || 1)) input.jump = true;
  }
  if (player.grounded && dir !== 0) {
    // Spike or wall ahead at body height: jump it. A 2-tile look-ahead
    // puts the jump's arc high over both edges of a spike run (a longer
    // look-ahead flattens the arc onto the far edge).
    const rows = [Math.floor(player.y / 30), Math.floor((player.y + player.h - 1) / 30)];
    for (let ahead = 1; ahead <= 2 && !input.jump; ahead += 1) {
      const col = Math.floor((dir > 0 ? player.x + player.w + ahead * 14 : player.x - ahead * 14) / 30);
      for (const row of rows) {
        if (col < 0 || col >= 32 || row < 0 || row >= 18) continue;
        const ch = level.tiles[row][col];
        if (ch === '^' || (ch === '#' && ahead <= 2)) input.jump = true;
      }
    }
    // Gap ahead (no floor below in gravity direction): jump it.
    const aheadCol = Math.floor((dir > 0 ? player.x + player.w + 14 : player.x - 14) / 30);
    const belowRow = player.gravity > 0
      ? Math.floor((player.y + player.h + 4) / 30)
      : Math.floor((player.y - 4) / 30);
    const aheadTile = (aheadCol < 0 || aheadCol >= 32 || belowRow < 0 || belowRow >= 18)
      ? '#'
      : level.tiles[belowRow][aheadCol];
    if (aheadTile === '.' || aheadTile === '^' || aheadTile === 'o') input.jump = true;
  }
  // If stuck even after jumping, flip gravity and try the ceiling.
  const stuck = state.lastX !== null && Math.abs(player.x - state.lastX) < 0.5 && dir !== 0 && player.grounded;
  if (stuck && state.stuckFrames > 50 && !flipWouldLandOnSpike(level, player)) {
    input.flip = true;
    state.rising = true;
    state.stuckFrames = 0;
  }
  if (stuck) state.stuckFrames += 1;
  else state.stuckFrames = 0;
  state.lastX = player.x;
  return input;
}

/**
 * Play one level with the autopilot. Returns 'exit' | 'died' | 'timeout'.
 * The game object is driven through its real step path so shards, timer
 * and deaths all accumulate exactly as in play.
 */
export function playLevelAuto(g, maxSeconds) {
  const state = { lastX: null, stuckFrames: 0 };
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (g.game.screen !== SCREEN_PLAY) return g.game.screen === 'clear' ? 'exit' : 'other';
    const input = autopilot(g.game.level, g.game.player, state);
    const move = { left: input.left, right: input.right, jump: input.jump };
    const actions = { flip: input.flip, colorCycle: false, colorPick: input.color, restart: false, pause: false, mute: false, confirm: false };
    const livesBefore = g.game.lives;
    g.step(move, actions);
    if (g.game.lives < livesBefore) return 'died';
    if (g.game.screen === 'clear') return 'exit';
  }
  return 'timeout';
}

/** Careless autopilot: walks right forever, never jumps — it dies on spikes. */
function playLevelCareless(g, maxSeconds) {
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (g.game.screen !== SCREEN_PLAY) return g.game.screen;
    g.step({ left: false, right: true, jump: false }, { flip: false, colorCycle: false, colorPick: -1, restart: false, pause: false, mute: false, confirm: false });
  }
  return 'timeout';
}

/**
 * Stage a named scene on the game object and return the screen to show.
 * start/play/win/lose; anything else is the title.
 */
export function stageShot(name, g) {
  if (name === 'play') {
    g.game.lives = 3;
    g.game.time = 0;
    g.game.deaths = 0;
    g.game.shardsGot = 0;
    g.loadLevel(1); // Ruby Gate: shows a gate, shards and the HUD.
    g.game.screen = SCREEN_PLAY;
    // Two seconds of play: the prism is mid-level, past the ruby gate,
    // with shards collected and the HUD live. (Longer would clear the
    // level and step into the next one.)
    playLevelAuto(g, 2);
    g.game.screen = SCREEN_PLAY;
    g.syncHud();
    return SCREEN_PLAY;
  }
  if (name === 'win') {
    g.game.lives = 3;
    g.game.time = 0;
    g.game.deaths = 0;
    g.game.shardsGot = 0;
    g.loadLevel(0);
    g.game.screen = SCREEN_PLAY;
    // Real playthrough: autopilot clears level after level.
    for (let level = 0; level < 10; level += 1) {
      let result = 'timeout';
      for (let attempt = 0; attempt < 3 && result !== 'exit'; attempt += 1) {
        result = playLevelAuto(g, 60);
        if (result === 'died') {
          if (g.game.lives <= 0) return SCREEN_OVER;
          g.loadLevel(g.game.levelIndex);
          g.game.screen = SCREEN_PLAY;
        }
      }
      if (result !== 'exit') return SCREEN_PLAY; // autopilot stuck; show play instead
      if (level < 9) g.nextLevel();
    }
    g.nextLevel(); // finishing level 10 opens the win screen
    return SCREEN_WIN;
  }
  if (name === 'lose') {
    g.game.lives = 3;
    g.game.time = 0;
    g.game.deaths = 0;
    g.game.shardsGot = 0;
    g.loadLevel(3); // Spike Run: the careless walker dies here, three times.
    g.game.screen = SCREEN_PLAY;
    for (let life = 0; life < 3; life += 1) {
      playLevelCareless(g, 30);
      if (g.game.screen === SCREEN_OVER) return SCREEN_OVER;
      if (g.game.screen === SCREEN_PLAY) {
        // Survived the walk somehow: restart the level and try again.
        g.loadLevel(3);
        g.game.screen = SCREEN_PLAY;
      }
    }
    return g.game.screen;
  }
  // start (default): title screen over level 1, settled a few seconds in.
  g.loadLevel(0);
  g.game.screen = SCREEN_TITLE;
  for (let i = 0; i < 5 / SAMPLE; i += 1) {
    // Let the title backdrop breathe: shards bob on their own clock.
  }
  return SCREEN_TITLE;
}
