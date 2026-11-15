// Prism Leap — game: the state machine and the fixed-step loop.
// Owns screens (title / play / level-clear / win / game-over / paused),
// lives, timer, shard counts and level progression. Rendering and physics
// live in their own files; this one only decides what happens when.
import { LEVELS, totalShards } from './levels.js';
import { parseLevel, freshPlayer, stepPlayer } from './physics.js';
import { STEP } from './config.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CLEAR, SCREEN_WIN, SCREEN_OVER, SCREEN_PAUSED } from './render.js';
import { sfx } from './audio.js';
import { VIEW_W, VIEW_H, MAX_LIVES } from './config.js';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CLEAR, SCREEN_WIN, SCREEN_OVER, SCREEN_PAUSED };

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  const game = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: null,
    levelName: '',
    player: null,
    lives: MAX_LIVES,
    time: 0,
    deaths: 0,
    shardsGot: 0,
    shardsInLevelGot: 0,
    shardsInLevel: 0,
    buttons: {},
    statusEl: null,
    timeText: '00:00',
    hud: null,
    stats: null,
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    game.levelIndex = index;
    game.levelName = def.name;
    game.level = parseLevel(def.map);
    game.player = freshPlayer(game.level);
    game.shardsInLevel = game.level.shards.length;
    game.shardsInLevelGot = 0;
    game.timeText = formatTime(game.time);
    syncHud();
  }

  function syncHud() {
    game.hud = {
      levelIndex: game.levelIndex,
      levelName: game.levelName,
      shardsGot: game.shardsGot,
      shardsTotal: totalShards(),
      lives: game.lives,
      timeText: game.timeText,
      color: game.player ? game.player.color : 0,
      gravity: game.player ? game.player.gravity : 1,
    };
    game.stats = {
      levelIndex: game.levelIndex,
      levelName: game.levelName,
      shardsGot: game.shardsGot,
      shardsTotal: totalShards(),
      timeText: game.timeText,
      deaths: game.deaths,
      lives: game.lives,
    };
  }

  function setStatus(text) {
    if (game.statusEl) game.statusEl.textContent = text;
  }

  function startRun() {
    game.lives = MAX_LIVES;
    game.time = 0;
    game.deaths = 0;
    game.shardsGot = 0;
    loadLevel(0);
    game.screen = SCREEN_PLAY;
    setStatus(`Level 1: ${game.levelName}. ${LEVELS[0].hint}`);
    sfx.unlock();
  }

  function nextLevel() {
    if (game.levelIndex + 1 >= LEVELS.length) {
      game.screen = SCREEN_WIN;
      syncHud();
      sfx.win();
      setStatus(`You win! Time ${game.timeText}, ${game.shardsGot} of ${totalShards()} shards.`);
      return;
    }
    loadLevel(game.levelIndex + 1);
    game.screen = SCREEN_PLAY;
    setStatus(`Level ${game.levelIndex + 1}: ${game.levelName}. ${LEVELS[game.levelIndex].hint}`);
  }

  function die() {
    game.deaths += 1;
    game.lives -= 1;
    sfx.death();
    if (game.lives <= 0) {
      game.screen = SCREEN_OVER;
      syncHud();
      setStatus(`Game over on level ${game.levelIndex + 1}.`);
      return;
    }
    // The failed attempt's shards respawn with the level, so take them
    // back out of the run total or they could be collected twice.
    game.shardsGot -= game.shardsInLevelGot;
    loadLevel(game.levelIndex);
    setStatus(`Ouch — a spike! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`);
  }

  /** One fixed step of play. `move`/`actions` come from input.js. */
  function step(move, actions) {
    if (game.screen !== SCREEN_PLAY) return;
    if (actions.pause) {
      game.screen = SCREEN_PAUSED;
      return;
    }
    if (actions.restart) {
      loadLevel(game.levelIndex);
      return;
    }
    if (actions.mute) sfx.toggleMute();
    let color = -1;
    if (actions.colorCycle) color = (game.player.color + 1) % 3;
    if (actions.colorPick >= 0) color = actions.colorPick;
    const input = {
      left: move.left,
      right: move.right,
      jump: move.jump,
      flip: actions.flip,
      color,
    };
    const events = stepPlayer(game.level, game.player, input, STEP);
    if (events.jumped) sfx.jump();
    if (events.flipped) sfx.flip();
    if (events.recolored) sfx.recolor();
    if (events.spring) sfx.spring();
    if (events.shard) {
      game.shardsGot += 1;
      game.shardsInLevelGot += 1;
      sfx.shard();
    }
    game.time += STEP;
    game.timeText = formatTime(game.time);
    if (events.died) {
      die();
      return;
    }
    if (events.exited) {
      sfx.levelClear();
      game.screen = SCREEN_CLEAR;
      syncHud();
      setStatus(`Level ${game.levelIndex + 1} clear!`);
      return;
    }
    // (invulnerability ticks down inside stepPlayer already.)
    syncHud();
  }

  /** Handle a confirm key or a button click on a non-play screen. */
  function confirm() {
    if (game.screen === SCREEN_TITLE) startRun();
    else if (game.screen === SCREEN_CLEAR) nextLevel();
    else if (game.screen === SCREEN_WIN || game.screen === SCREEN_OVER) startRun();
    else if (game.screen === SCREEN_PAUSED) game.screen = SCREEN_PLAY;
  }

  /** Click at canvas CSS pixels; returns true when a button was hit. */
  function click(cssX, cssY) {
    const rect = canvas.getBoundingClientRect();
    const x = (cssX - rect.left) * (VIEW_W / rect.width);
    const y = (cssY - rect.top) * (VIEW_H / rect.height);
    for (const key of Object.keys(game.buttons)) {
      const b = game.buttons[key];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (key === 'start' || key === 'again') startRun();
        else if (key === 'next') nextLevel();
        return true;
      }
    }
    return false;
  }

  function draw(time) {
    game.buttons = render(ctx, game, time);
  }

  loadLevel(0);
  return { game, step, confirm, click, draw, startRun, nextLevel, loadLevel, syncHud };
}
