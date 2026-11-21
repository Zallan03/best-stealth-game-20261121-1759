import { stepWorld } from './world.js';

const DT = 1 / 60;
const IDLE = { x: 0, y: 0, sneaking: false };

function runWaypoints(world, waypoints, seconds) {
  let elapsed = 0;
  let index = 0;
  let waiting = 0;
  while (elapsed < seconds && world.state === 'playing') {
    let input = IDLE;
    if (waiting > 0) {
      waiting -= DT;
    } else if (index < waypoints.length) {
      const wp = waypoints[index];
      const dx = wp.x - world.player.x;
      const dy = wp.y - world.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        index += 1;
        waiting = wp.wait || 0;
      } else {
        input = { x: dx / d, y: dy / d, sneaking: !!wp.sneak };
      }
    }
    stepWorld(world, input, DT);
    elapsed += DT;
  }
}

function runSeconds(world, seconds, inputForStep) {
  let elapsed = 0;
  while (elapsed < seconds && world.state === 'playing') {
    stepWorld(world, inputForStep(world, elapsed), DT);
    elapsed += DT;
  }
}

export function stageShot(name, world) {
  if (name === 'start') {
    runWaypoints(world, [
      { x: 220, y: 568 },
      { x: 268, y: 448, sneak: true, wait: 99 },
    ], 5);
  } else if (name === 'play') {
    runWaypoints(world, [
      { x: 300, y: 568 },
      { x: 480, y: 568 },
      { x: 480, y: 452 },
      { x: 430, y: 388, sneak: true, wait: 3 },
      { x: 480, y: 382, sneak: true },
      { x: 480, y: 310, sneak: true, wait: 1 },
      { x: 480, y: 382, sneak: true },
      { x: 560, y: 400, sneak: true },
      { x: 642, y: 525, sneak: true, wait: 4 },
      { x: 642, y: 540, sneak: true },
      { x: 870, y: 540, sneak: true },
      { x: 870, y: 365, sneak: true },
      { x: 850, y: 365, sneak: true },
      { x: 882, y: 390, sneak: true, wait: 99 },
    ], 26);
  } else if (name === 'end') {
    runSeconds(world, 45, (w) => {
      const dx = 888 - w.player.x;
      const dy = 568 - w.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) return IDLE;
      return { x: dx / d, y: dy / d, sneaking: false };
    });
    for (let i = 0; i < 30; i += 1) stepWorld(world, IDLE, DT);
  } else {
    runSeconds(world, 1, () => IDLE);
  }
  return world;
}
