import { CONFIG } from './config.js';
import { createRng, rngRange, rngPick } from './random.js';

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function angleWrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rect(x, y, w, h, kind) {
  return { x, y, w, h, kind };
}

function makeGuard(name, color, speed, waypoints, startIndex = 0) {
  const start = waypoints[startIndex % waypoints.length];
  const next = waypoints[(startIndex + 1) % waypoints.length];
  return {
    name,
    color,
    speed,
    waypoints,
    x: start[0],
    y: start[1],
    r: CONFIG.guardRadius,
    targetIndex: (startIndex + 1) % waypoints.length,
    angle: Math.atan2(next[1] - start[1], next[0] - start[0]),
    wait: 0,
    suspicion: 0,
    state: 'patrol', // patrol | suspicious | alert
  };
}

export function createWorld(seed = 1) {
  const rng = createRng(seed);

  // Solid geometry blocks movement AND guard line of sight.
  const solids = [
    // Outer garden wall (the HUD sits above y=48).
    rect(18, 52, 924, 14, 'wall'),
    rect(18, 606, 924, 14, 'wall'),
    rect(18, 52, 14, 568, 'wall'),
    rect(928, 52, 14, 568, 'wall'),

    // Row between the top path and the upper path.
    rect(120, 138, 110, 18, 'hedge'),
    rect(310, 138, 120, 18, 'wall'),
    rect(540, 138, 110, 18, 'hedge'),
    rect(740, 125, 38, 38, 'crate'),
    rect(782, 125, 38, 38, 'crate'),

    // Middle garden, west and east of the shrine.
    rect(206, 255, 18, 86, 'hedge'),
    rect(118, 285, 38, 38, 'crate'),
    rect(160, 285, 38, 38, 'crate'),
    rect(742, 255, 18, 86, 'hedge'),
    rect(782, 300, 38, 38, 'crate'),

    // The Moon-Pearl shrine (gap at the bottom, x 458..502).
    rect(408, 252, 144, 14, 'hedge'),
    rect(408, 252, 14, 118, 'hedge'),
    rect(538, 252, 14, 118, 'hedge'),
    rect(408, 356, 50, 14, 'hedge'),
    rect(502, 356, 50, 14, 'hedge'),

    // South garden cover.
    rect(120, 485, 110, 18, 'hedge'),
    rect(330, 480, 38, 38, 'crate'),
    rect(385, 490, 70, 16, 'hedge'),
    rect(545, 480, 38, 38, 'crate'),
    rect(740, 485, 110, 18, 'hedge'),
  ];

  // Standing in a moon bush hides the fox unless a keeper is very close.
  const bushes = [
    { x: 108, y: 132, r: 34 },
    { x: 520, y: 120, r: 30 },
    { x: 105, y: 365, r: 34 },
    { x: 430, y: 398, r: 30 },
    { x: 850, y: 365, r: 34 },
    { x: 642, y: 525, r: 32 },
    { x: 815, y: 112, r: 28 },
  ];

  const lanterns = [
    { x: 122, y: 222 }, { x: 838, y: 222 },
    { x: 122, y: 448 }, { x: 838, y: 448 },
    { x: 480, y: 232 }, { x: 268, y: 448 },
    { x: 692, y: 130 }, { x: 150, y: 560 },
  ];

  const flowerColors = ['#f9a8d4', '#fcd34d', '#93c5fd', '#c4b5fd', '#fca5a5'];
  const decor = {
    grass: Array.from({ length: 120 }, () => ({
      x: rngRange(rng, 38, 922), y: rngRange(rng, 74, 600),
      s: rngRange(rng, 3, 7), a: rngRange(rng, 0, Math.PI),
    })),
    flowers: Array.from({ length: 52 }, () => ({
      x: rngRange(rng, 42, 918), y: rngRange(rng, 78, 596),
      s: rngRange(rng, 1.6, 3.2), c: rngPick(rng, flowerColors),
    })),
    pebbles: Array.from({ length: 42 }, () => ({
      x: rngRange(rng, 40, 920), y: rngRange(rng, 76, 598),
      s: rngRange(rng, 1.5, 4),
    })),
  };

  const guards = [
    makeGuard('Pine Keeper', '#2dd4bf', 57, [[70, 90], [480, 90], [480, 210], [70, 210]], 0),
    makeGuard('Gate Keeper', '#a78bfa', 66, [[888, 210], [888, 90], [690, 90], [690, 210]], 0),
    makeGuard('Shrine Keeper', '#38bdf8', 49, [[690, 425], [690, 210], [268, 210], [268, 425]], 0),
    makeGuard('South Keeper', '#f59e0b', 63, [[888, 425], [70, 425], [70, 568], [888, 568]], 0),
  ];

  const world = {
    seed,
    rng,
    time: 0,
    state: 'playing', // playing | won | lost
    solids,
    bushes,
    lanterns,
    decor,
    guards,
    player: {
      x: 62, y: 568, r: CONFIG.playerRadius,
      angle: 0, moving: false, sneaking: false, hidden: false, stepAcc: 0,
    },
    pearl: { x: 480, y: 310, r: 11 },
    exit: { x: 854, y: 62, w: 68, h: 58, cx: 888, cy: 90 },
    hasPearl: false,
    alert: 0,
    seenBy: 0,
    caughtBy: '',
    message: 'Find the Moon-Pearl in the shrine',
    messageTime: 4,
    gateCooldown: 0,
    events: [],
    particles: [],
  };
  return world;
}

export function isInBush(world, x, y) {
  return world.bushes.some((b) => distance(x, y, b.x, b.y) < b.r * 0.85);
}

function circleHitsRect(x, y, r, s) {
  const nx = clamp(x, s.x, s.x + s.w);
  const ny = clamp(y, s.y, s.y + s.h);
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy < r * r;
}

// Axis-separated circle movement: sliding along walls and crates.
export function moveCircle(world, ent, dx, dy, r) {
  ent.x += dx;
  if (dx !== 0) {
    for (const s of world.solids) {
      if (circleHitsRect(ent.x, ent.y, r, s)) {
        ent.x = dx > 0 ? s.x - r : s.x + s.w + r;
      }
    }
  }
  ent.y += dy;
  if (dy !== 0) {
    for (const s of world.solids) {
      if (circleHitsRect(ent.x, ent.y, r, s)) {
        ent.y = dy > 0 ? s.y - r : s.y + s.h + r;
      }
    }
  }
}

function segmentHitsRect(x1, y1, x2, y2, s) {
  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < s.x || x1 > s.x + s.w) return false;
  } else {
    let t1 = (s.x - x1) / dx;
    let t2 = (s.x + s.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < s.y || y1 > s.y + s.h) return false;
  } else {
    let t1 = (s.y - y1) / dy;
    let t2 = (s.y + s.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return false;
  }
  return tmax >= tmin && tmax >= 0 && tmin <= 1;
}

export function hasLineOfSight(world, x1, y1, x2, y2) {
  for (const s of world.solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

export function spawnParticles(world, x, y, color, count = 12, power = 70) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const speed = rngRange(world.rng, power * 0.25, power);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rngRange(world.rng, 0.35, 0.85),
      color,
      size: rngRange(world.rng, 1.5, 3.6),
    });
  }
  if (world.particles.length > 240) {
    world.particles.splice(0, world.particles.length - 240);
  }
}

function pushEvent(world, type, x, y) {
  world.events.push({ type, time: world.time, x, y });
  if (world.events.length > 24) world.events.shift();
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      world.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = Math.max(0, 1 - 3.2 * dt);
    p.vx *= drag;
    p.vy *= drag;
  }
}

export function guardCanSeePlayer(world, guard) {
  const p = world.player;
  const d = distance(guard.x, guard.y, p.x, p.y);
  if (d > CONFIG.guardViewDistance) return false;
  if (d > CONFIG.bushRevealDistance && isInBush(world, p.x, p.y)) return false;
  if (d > 28) {
    const toPlayer = Math.atan2(p.y - guard.y, p.x - guard.x);
    if (Math.abs(angleWrap(toPlayer - guard.angle)) > CONFIG.guardViewHalfAngle) return false;
  }
  return hasLineOfSight(world, guard.x, guard.y, p.x, p.y);
}

function catchPlayer(world, guard) {
  if (world.state !== 'playing') return;
  world.state = 'lost';
  world.caughtBy = guard.name;
  world.alert = 1;
  guard.state = 'alert';
  guard.suspicion = 1;
  world.message = `Caught by the ${guard.name}!`;
  world.messageTime = 999;
  pushEvent(world, 'caught', world.player.x, world.player.y);
  spawnParticles(world, world.player.x, world.player.y, '#f87171', 22, 95);
}

function turnGuardToward(guard, desired, dt, rate = 3.6) {
  const diff = angleWrap(desired - guard.angle);
  const step = clamp(diff, -rate * dt, rate * dt);
  guard.angle += step;
}

function moveGuardToward(world, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const desired = Math.atan2(dy, dx);
  turnGuardToward(guard, desired, dt, 9);
  const step = Math.min(d, speed * dt);
  moveCircle(world, guard, (dx / d) * step, (dy / d) * step, guard.r);
  return d <= step + 3;
}

function stepGuard(world, guard, dt) {
  const p = world.player;
  const sees = guardCanSeePlayer(world, guard);
  const d = distance(guard.x, guard.y, p.x, p.y);
  if (sees) {
    guard.lastSeenX = p.x;
    guard.lastSeenY = p.y;
    world.seenBy += 1;
    const fillSeconds = d < 42
      ? CONFIG.closeDetectionSeconds
      : (p.sneaking ? CONFIG.sneakDetectionSeconds : CONFIG.detectionSeconds);
    const before = guard.suspicion;
    guard.suspicion = clamp(guard.suspicion + dt / fillSeconds, 0, 1);
    if (before < 1 && guard.suspicion >= 1) {
      pushEvent(world, 'alert', guard.x, guard.y);
      spawnParticles(world, guard.x, guard.y - 18, '#f87171', 8, 48);
    }
  } else {
    guard.suspicion = clamp(guard.suspicion - dt / CONFIG.detectionDecaySeconds, 0, 1);
  }

  if (guard.suspicion >= 1) guard.state = 'alert';
  else if (guard.suspicion >= 0.32) guard.state = 'suspicious';
  else guard.state = 'patrol';
  world.alert = Math.max(world.alert, guard.suspicion);

  if (guard.state === 'alert') {
    const tx = guard.lastSeenX ?? p.x;
    const ty = guard.lastSeenY ?? p.y;
    moveGuardToward(world, guard, tx, ty, guard.speed * 1.38, dt);
  } else if (guard.state === 'suspicious') {
    const tx = guard.lastSeenX ?? p.x;
    const ty = guard.lastSeenY ?? p.y;
    turnGuardToward(guard, Math.atan2(ty - guard.y, tx - guard.x), dt, 3.8);
  } else if (guard.wait > 0) {
    guard.wait -= dt;
  } else {
    const target = guard.waypoints[guard.targetIndex];
    if (moveGuardToward(world, guard, target[0], target[1], guard.speed, dt)) {
      guard.targetIndex = (guard.targetIndex + 1) % guard.waypoints.length;
      guard.wait = 0.55;
    }
  }

  if (distance(guard.x, guard.y, p.x, p.y) < guard.r + p.r + 1) {
    catchPlayer(world, guard);
  }
}

export function stepWorld(world, rawInput, dt) {
  const step = Math.min(Math.max(dt || 0, 0), 0.05);
  if (world.state !== 'playing') {
    updateParticles(world, step);
    return world;
  }

  world.time += step;
  if (world.messageTime > 0) world.messageTime -= step;
  if (world.gateCooldown > 0) world.gateCooldown -= step;
  if (world.messageTime <= 0) {
    world.message = world.hasPearl
      ? 'Escape through the north-east gate'
      : 'Find the Moon-Pearl in the shrine';
  }

  const input = rawInput || { x: 0, y: 0, sneaking: false };
  let ix = Number(input.x) || 0;
  let iy = Number(input.y) || 0;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }

  const p = world.player;
  p.sneaking = !!input.sneaking;
  p.moving = len > 0.01;
  if (p.moving) {
    p.angle = Math.atan2(iy, ix);
    const speed = p.sneaking ? CONFIG.sneakSpeed : CONFIG.playerSpeed;
    moveCircle(world, p, ix * speed * step, iy * speed * step, p.r);
    p.stepAcc += speed * step;
    if (!p.sneaking && Math.floor(p.stepAcc / 34) !== Math.floor((p.stepAcc - speed * step) / 34)) {
      spawnParticles(world, p.x, p.y + 8, '#7dd3fc', 2, 24);
    }
  }
  p.hidden = isInBush(world, p.x, p.y);

  if (!world.hasPearl && distance(p.x, p.y, world.pearl.x, world.pearl.y) < p.r + world.pearl.r + 5) {
    world.hasPearl = true;
    world.message = 'You have the Moon-Pearl! Reach the north-east gate';
    world.messageTime = 4;
    pushEvent(world, 'pearl', world.pearl.x, world.pearl.y);
    spawnParticles(world, world.pearl.x, world.pearl.y, '#a5f3fc', 24, 88);
  }

  world.seenBy = 0;
  world.alert = 0;
  for (const guard of world.guards) {
    stepGuard(world, guard, step);
    if (world.state !== 'playing') {
      updateParticles(world, step);
      return world;
    }
  }

  const insideExit = p.x > world.exit.x && p.x < world.exit.x + world.exit.w
    && p.y > world.exit.y && p.y < world.exit.y + world.exit.h;
  if (insideExit && world.hasPearl) {
    world.state = 'won';
    world.message = 'You stole the Moon-Pearl!';
    world.messageTime = 999;
    pushEvent(world, 'won', world.exit.cx, world.exit.cy);
    spawnParticles(world, p.x, p.y, '#fcd34d', 28, 105);
    spawnParticles(world, p.x, p.y, '#a5f3fc', 18, 80);
  } else if (insideExit && world.gateCooldown <= 0) {
    world.message = 'The gate is sealed — steal the Moon-Pearl first';
    world.messageTime = 1.8;
    world.gateCooldown = 2;
    pushEvent(world, 'gate', world.exit.cx, world.exit.cy);
  }

  updateParticles(world, step);
  return world;
}
