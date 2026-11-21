export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    clicked: false,
    startQueued: false,
    restartQueued: false,
  };

  window.addEventListener('keydown', (event) => {
    input.keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === 'Enter') input.startQueued = true;
    if (event.code === 'KeyR' && !event.repeat) input.restartQueued = true;
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  if (canvas) {
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      input.mouseX = rect.width ? (event.clientX - rect.left) / rect.width * canvas.width : 0;
      input.mouseY = rect.height ? (event.clientY - rect.top) / rect.height * canvas.height : 0;
      input.clicked = true;
      input.startQueued = true;
    });
  }

  return input;
}

export function getMoveVector(input) {
  const keys = input.keys;
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const up = keys.has('KeyW') || keys.has('ArrowUp');
  const down = keys.has('KeyS') || keys.has('ArrowDown');
  let x = (right ? 1 : 0) - (left ? 1 : 0);
  let y = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(x, y);
  if (len > 0) { x /= len; y /= len; }
  return {
    x,
    y,
    sneaking: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

export function consumeStart(input) {
  const value = input.startQueued || input.clicked;
  input.startQueued = false;
  input.clicked = false;
  return value;
}

export function consumeRestart(input) {
  const value = input.restartQueued;
  input.restartQueued = false;
  return value;
}
