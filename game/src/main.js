import { createWorld, stepWorld } from './world.js';
import { drawGame } from './render.js';
import { createInput, getMoveVector, consumeStart, consumeRestart } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas ? canvas.getContext('2d') : null;
const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');
if (ctx && canvas) {
  let world = createWorld(seed);

  if (shot) {
    stageShot(shot, world);
    drawGame(ctx, world, shot === 'start' ? 'title' : 'game');
  } else {
    const input = createInput(canvas);
    let screen = 'title';
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;

      if (consumeRestart(input)) {
        world = createWorld(seed);
        screen = 'game';
      } else if (consumeStart(input)) {
        if (screen === 'title') {
          screen = 'game';
        } else if (world.state !== 'playing') {
          world = createWorld(seed);
          screen = 'game';
        }
      }

      if (screen === 'game') {
        stepWorld(world, getMoveVector(input), dt);
      }

      drawGame(ctx, world, screen);
      requestAnimationFrame(frame);
    }

    drawGame(ctx, world, screen);
    requestAnimationFrame(frame);
  }
}
