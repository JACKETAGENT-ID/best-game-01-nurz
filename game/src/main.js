// Prism Leap — bootstrap: wire canvas, input, the game loop and the
// ?shot= scenes used for screenshots. Served statically, no network.
import { createGame } from './game.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const input = createInput();
const g = createGame(canvas);
g.game.statusEl = statusEl;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot mode: stage a deterministic scene, draw one settled frame.
  const screen = stageShot(shot, g);
  g.draw(2.5);
  document.title = `Prism Leap — ${shot}`;
} else {
  let last = performance.now();
  let acc = 0;
  const STEP_MS = 1000 / 60;
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    // Edge-triggered actions are read once per frame: the step loop below
    // may run twice, and a flip pressed once must flip exactly once.
    const actions = input.actions();
    const move = input.move();
    let first = true;
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      if (g.game.screen === 'play') {
        g.step(move, first ? actions : { flip: false, colorCycle: false, colorPick: -1, restart: false, pause: false, mute: false, confirm: false, jumpPressed: false });
      } else if (actions.confirm) {
        g.confirm();
      }
      first = false;
    }
    input.endFrame();
    g.draw(now / 1000);
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('click', (event) => {
    g.click(event.clientX, event.clientY);
  });
  requestAnimationFrame(frame);
}
