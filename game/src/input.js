// Prism Leap — input: keyboard state plus clickable screen buttons.
// Keys: arrows/WASD move, Up/W/Space jump, G/Shift flip gravity,
// C or 1/2/3 switch colour, R restart level, P pause, M mute, Enter start.
export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered keys, consumed once per frame

  function codeOf(event) {
    return event.code;
  }

  function onKeyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function held(...codes) {
    return codes.some((c) => keys.has(c));
  }

  function wasPressed(...codes) {
    return codes.some((c) => pressed.has(c));
  }

  return {
    /** Held movement state for this frame. */
    move() {
      return {
        left: held('ArrowLeft', 'KeyA'),
        right: held('ArrowRight', 'KeyD'),
        jump: held('ArrowUp', 'KeyW', 'Space'),
      };
    },
    /** Edge-triggered actions, true only on the frame the key went down. */
    actions() {
      return {
        flip: wasPressed('KeyG', 'ShiftLeft', 'ShiftRight'),
        jumpPressed: wasPressed('ArrowUp', 'KeyW', 'Space'),
        colorCycle: wasPressed('KeyC'),
        colorPick: wasPressed('Digit1') ? 0 : wasPressed('Digit2') ? 1 : wasPressed('Digit3') ? 2 : -1,
        restart: wasPressed('KeyR'),
        pause: wasPressed('KeyP'),
        mute: wasPressed('KeyM'),
        confirm: wasPressed('Enter', 'Space'),
      };
    },
    /** Clear the edge-triggered set at the end of each frame. */
    endFrame() {
      pressed.clear();
    },
    codeOf,
  };
}
