// Prism Leap — render: everything drawn on the canvas.
// One clear job: turn a game state into pixels — the world, the HUD and
// the title / level-clear / win / game-over / paused screens.
import { VIEW_W, VIEW_H, TILE, COLS, ROWS, PALETTE, PRISM_COLORS } from './config.js';
import { GATE_KEYS } from './physics.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, time, levelIndex) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Fixed star field (positions from a tiny hash, no randomness at runtime).
  ctx.fillStyle = PALETTE.star;
  for (let i = 0; i < 70; i += 1) {
    const sx = ((i * 137.5) % VIEW_W);
    const sy = ((i * 89.3) % (VIEW_H * 0.7));
    const tw = 0.35 + 0.3 * Math.sin(time * 1.4 + i);
    ctx.globalAlpha = Math.max(0.12, tw);
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Distant drifting prisms for depth.
  for (let i = 0; i < 5; i += 1) {
    const px = ((i * 211 + time * 6 * (i % 2 === 0 ? 1 : -1)) % (VIEW_W + 120) + VIEW_W + 120) % (VIEW_W + 120) - 60;
    const py = 60 + i * 62;
    const size = 26 + (i % 3) * 10;
    const col = PRISM_COLORS[(i + levelIndex) % 3];
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = col.fill;
    ctx.beginPath();
    ctx.moveTo(px, py - size / 2);
    ctx.lineTo(px + size / 2, py + size / 2);
    ctx.lineTo(px - size / 2, py + size / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTiles(ctx, level, time) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = level.tiles[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = PALETTE.block;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.blockTop;
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = PALETTE.blockDark;
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x + 5, y + 8, 6, 6);
      } else if (GATE_KEYS.includes(ch)) {
        const colr = PRISM_COLORS.find((c) => c.key === ch);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = colr.dark;
        ctx.fillRect(x + 2, y, TILE - 4, TILE);
        ctx.fillStyle = colr.fill;
        ctx.fillRect(x + 5, y + 3, TILE - 10, TILE - 6);
        ctx.fillStyle = colr.glow;
        ctx.fillRect(x + 8, y + 6, 3, TILE - 12);
        ctx.fillRect(x + TILE - 11, y + 6, 3, TILE - 12);
        ctx.globalAlpha = 1;
      } else if (ch === '^') {
        ctx.fillStyle = PALETTE.spike;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 4);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.spikeTip;
        ctx.beginPath();
        ctx.moveTo(x + TILE / 2 - 4, y + TILE - 12);
        ctx.lineTo(x + TILE / 2, y + 4);
        ctx.lineTo(x + TILE / 2 + 4, y + TILE - 12);
        ctx.closePath();
        ctx.fill();
      } else if (ch === '~') {
        const bounce = 3 * Math.sin(time * 6 + col);
        ctx.fillStyle = PALETTE.spring;
        roundRect(ctx, x + 3, y + TILE - 12 + bounce, TILE - 6, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 6, y + TILE - 16 + bounce, TILE - 12, 4);
      }
    }
  }
}

function drawShards(ctx, level, time) {
  for (const shard of level.shards) {
    if (shard.taken) continue;
    const cx = shard.col * TILE + TILE / 2;
    const cy = shard.row * TILE + TILE / 2 + Math.sin(time * 3 + shard.col) * 2;
    const pulse = 1 + 0.08 * Math.sin(time * 4 + shard.row);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = PALETTE.coin;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = PALETTE.coinCore;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
}

function drawExit(ctx, level, time) {
  const { x, y, w, h } = level.exit;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ring = 15 + 2 * Math.sin(time * 3);
  ctx.strokeStyle = PALETTE.exitRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, ring, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.exitCore;
  ctx.beginPath();
  ctx.arc(cx, cy, 7 + 1.5 * Math.sin(time * 5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', cx, y - 6);
}

function drawPlayer(ctx, player, time) {
  const colr = PRISM_COLORS[player.color];
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (player.gravity < 0) ctx.rotate(Math.PI);
  const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Little light-prism: a triangle with a bright core and a face.
  ctx.fillStyle = colr.fill;
  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2);
  ctx.lineTo(player.w / 2, player.h / 2);
  ctx.lineTo(-player.w / 2, player.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colr.glow;
  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2 + 4);
  ctx.lineTo(player.w / 4, player.h / 2 - 4);
  ctx.lineTo(-player.w / 4, player.h / 2 - 4);
  ctx.closePath();
  ctx.fill();
  // Eyes look toward the run direction.
  ctx.fillStyle = '#10142a';
  const ex = player.face * 3;
  ctx.beginPath();
  ctx.arc(ex - 4, -1, 2, 0, Math.PI * 2);
  ctx.arc(ex + 4, -1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, hud) {
  ctx.fillStyle = PALETTE.hudBack;
  roundRect(ctx, 10, 8, VIEW_W - 20, 34, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${hud.levelIndex + 1}/10  ${hud.levelName}`, 22, 26);
  ctx.textAlign = 'center';
  ctx.fillText(`◆ ${hud.shardsGot}/${hud.shardsTotal}`, VIEW_W / 2 - 40, 26);
  ctx.fillText(`♥ ${'●'.repeat(Math.max(0, hud.lives))}${'○'.repeat(Math.max(0, 3 - hud.lives))}`, VIEW_W / 2 + 90, 26);
  ctx.textAlign = 'right';
  ctx.fillText(hud.timeText, VIEW_W - 22, 26);
  // Gravity + colour chips, bottom-left.
  const colr = PRISM_COLORS[hud.color];
  ctx.fillStyle = PALETTE.hudBack;
  roundRect(ctx, 10, VIEW_H - 40, 250, 30, 8);
  ctx.fill();
  ctx.fillStyle = colr.fill;
  ctx.beginPath();
  ctx.moveTo(30, VIEW_H - 32);
  ctx.lineTo(40, VIEW_H - 14);
  ctx.lineTo(20, VIEW_H - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${colr.name}  ·  gravity ${hud.gravity > 0 ? 'DOWN ↓' : 'UP ↑'}`, 50, VIEW_H - 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('G flip · C colour · R restart', VIEW_W - 14, VIEW_H - 24);
}

function drawButton(ctx, rect, label, accent) {
  ctx.fillStyle = accent;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.fillStyle = '#10142a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
}

function centrePanel(ctx, w, h) {
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(8, 11, 26, 0.86)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#5a6cb0';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  return { x, y, w, h };
}

function drawTitle(ctx, time) {
  const bob = Math.sin(time * 2) * 6;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PRISM LEAP', VIEW_W / 2, 150 + bob);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('flip gravity · switch colour · catch every shard', VIEW_W / 2, 200 + bob);
  // Three prisms showing the colours.
  PRISM_COLORS.forEach((colr, i) => {
    const px = VIEW_W / 2 + (i - 1) * 90;
    const py = 258 + Math.sin(time * 2 + i * 1.4) * 5;
    ctx.fillStyle = colr.fill;
    ctx.beginPath();
    ctx.moveTo(px, py - 22);
    ctx.lineTo(px + 20, py + 16);
    ctx.lineTo(px - 20, py + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(colr.name, px, py + 38);
  });
  ctx.font = '16px sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('← → move · ↑ / Space jump · G flip gravity · C switch colour', VIEW_W / 2, 340);
  ctx.fillText('10 levels · 3 lives · reach the EXIT portal', VIEW_W / 2, 366);
  const btn = { x: VIEW_W / 2 - 110, y: 400, w: 220, h: 52 };
  drawButton(ctx, btn, '▶  START', '#ffd94a');
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px sans-serif';
  ctx.fillText('or press Enter', VIEW_W / 2, 472);
  return { start: btn };
}

function drawClear(ctx, levelName, levelIndex, shardsGot, shardsInLevel, timeText) {
  const panel = centrePanel(ctx, 520, 260);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL CLEAR!', VIEW_W / 2, panel.y + 58);
  ctx.font = '19px sans-serif';
  ctx.fillText(`${levelName}  ·  shards ${shardsGot}/${shardsInLevel}  ·  ${timeText}`, VIEW_W / 2, panel.y + 108);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Next: level ${levelIndex + 2} of 10`, VIEW_W / 2, panel.y + 142);
  const btn = { x: VIEW_W / 2 - 110, y: panel.y + 176, w: 220, h: 48 };
  drawButton(ctx, btn, 'NEXT LEVEL ▶', '#7ef0d4');
  return { next: btn };
}

function drawWin(ctx, stats) {
  const panel = centrePanel(ctx, 560, 330);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ YOU WIN! ★', VIEW_W / 2, panel.y + 62);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('Every level cleared — the prism shines again.', VIEW_W / 2, panel.y + 112);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Time ${stats.timeText}   ·   Shards ${stats.shardsGot}/${stats.shardsTotal}`, VIEW_W / 2, panel.y + 152);
  ctx.fillText(`Deaths ${stats.deaths}   ·   Lives left ${stats.lives}`, VIEW_W / 2, panel.y + 182);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Thanks for playing Prism Leap!', VIEW_W / 2, panel.y + 216);
  const btn = { x: VIEW_W / 2 - 110, y: panel.y + 246, w: 220, h: 48 };
  drawButton(ctx, btn, '↻  PLAY AGAIN', '#ffd94a');
  return { again: btn };
}

function drawOver(ctx, stats) {
  const panel = centrePanel(ctx, 520, 300);
  ctx.fillStyle = '#ff5a6e';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', VIEW_W / 2, panel.y + 62);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px sans-serif';
  ctx.fillText(`The prism shattered on level ${stats.levelIndex + 1} — ${stats.levelName}`, VIEW_W / 2, panel.y + 112);
  ctx.font = '18px sans-serif';
  ctx.fillText(`Shards ${stats.shardsGot}/${stats.shardsTotal}  ·  Time ${stats.timeText}`, VIEW_W / 2, panel.y + 148);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Tip: flip gravity early, and match the gate colour.', VIEW_W / 2, panel.y + 182);
  const btn = { x: VIEW_W / 2 - 110, y: panel.y + 216, w: 220, h: 48 };
  drawButton(ctx, btn, '↻  TRY AGAIN', '#ff5a6e');
  return { again: btn };
}

function drawPaused(ctx) {
  const panel = centrePanel(ctx, 420, 170);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', VIEW_W / 2, panel.y + 62);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P to resume', VIEW_W / 2, panel.y + 110);
  return {};
}

/** Draw one frame. Returns the clickable buttons of the current screen. */
export function render(ctx, state, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(ctx, time, state.levelIndex);
  if (state.screen === SCREEN_TITLE) {
    drawTiles(ctx, state.level, time);
    drawShards(ctx, state.level, time);
    drawExit(ctx, state.level, time);
    ctx.fillStyle = 'rgba(8, 11, 26, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return drawTitle(ctx, time);
  }
  drawTiles(ctx, state.level, time);
  drawShards(ctx, state.level, time);
  drawExit(ctx, state.level, time);
  drawPlayer(ctx, state.player, time);
  if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) {
    drawHud(ctx, state.hud);
  }
  if (state.screen === SCREEN_CLEAR) {
    drawHud(ctx, state.hud);
    return drawClear(ctx, state.levelName, state.levelIndex, state.shardsInLevelGot, state.shardsInLevel, state.timeText);
  }
  if (state.screen === SCREEN_WIN) return drawWin(ctx, state.stats);
  if (state.screen === SCREEN_OVER) return drawOver(ctx, state.stats);
  if (state.screen === SCREEN_PAUSED) return drawPaused(ctx);
  return {};
}
