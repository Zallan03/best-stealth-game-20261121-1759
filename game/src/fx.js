// fx.js — Particle effects, screen shake, and floating text for Lantern Fox.
// A small self-contained Canvas 2D effects layer. No imports.
// The game creates one fx state with createFx(), spawns bursts and floating
// texts at gameplay moments (pearl pickup, keeper alert, gate escape), ticks
// it every frame with updateFx(), and renders it on top with drawFx().

// How much of a particle's velocity survives each frame (0..1, per frame).
const PARTICLE_DRAG = 0.94;
// How strongly gravity pulls particles down, pixels per second squared.
const PARTICLE_GRAVITY = 340;
// How long a floating text stays on screen, in seconds.
const TEXT_LIFETIME = 1.4;
// How fast a floating text rises, in pixels per second.
const TEXT_RISE_SPEED = 36;
// Maximum shake offset in pixels when shake is at full strength.
const SHAKE_MAX_OFFSET = 9;
// How fast shake decays toward zero, per second.
const SHAKE_DECAY = 3.4;
// Fastest a burst particle can fly, in pixels per second.
const BURST_MAX_SPEED = 260;
// Slowest a burst particle can fly, in pixels per second.
const BURST_MIN_SPEED = 70;
// Longest a burst particle lives, in seconds.
const BURST_MAX_LIFE = 0.9;
// Shortest a burst particle lives, in seconds.
const BURST_MIN_LIFE = 0.35;
// Largest a burst particle can be, in pixels.
const BURST_MAX_SIZE = 5;
// Smallest a burst particle can be, in pixels.
const BURST_MIN_SIZE = 2;

// Create a fresh effects state. Keep one per game and pass it to every
// function in this module.
export function createFx() {
  return {
    particles: [],
    texts: [],
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };
}

// Spawn a burst of n particles at (x, y) in the given color. Particles fly
// out in random directions, slow down, fall slightly, and fade away.
export function spawnBurst(fx, x, y, color, n) {
  const count = Math.max(1, Math.floor(n));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed =
      BURST_MIN_SPEED + Math.random() * (BURST_MAX_SPEED - BURST_MIN_SPEED);
    const life =
      BURST_MIN_LIFE + Math.random() * (BURST_MAX_LIFE - BURST_MIN_LIFE);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life,
      maxLife: life,
      size: BURST_MIN_SIZE + Math.random() * (BURST_MAX_SIZE - BURST_MIN_SIZE),
      color,
    });
  }
}

// Spawn a small sparkle: a short, gentle burst used for pickups and ambience.
export function spawnSparkle(fx, x, y, color) {
  spawnBurst(fx, x, y, color, 6);
  for (let i = fx.particles.length - 6; i < fx.particles.length; i++) {
    const p = fx.particles[i];
    p.vx *= 0.45;
    p.vy *= 0.45;
    p.size *= 0.8;
  }
}

// Add a floating text at (x, y). It rises and fades over TEXT_LIFETIME.
export function spawnText(fx, x, y, str, color) {
  fx.texts.push({
    x,
    y,
    str: String(str),
    color: color || "#ffffff",
    life: TEXT_LIFETIME,
    maxLife: TEXT_LIFETIME,
  });
}

// Add screen shake. The strongest recent shake wins; it decays in updateFx.
// Amount is 0..1 (1 = full shake). Values above 1 are clamped.
export function addShake(fx, amount) {
  const a = Math.max(0, Math.min(1, amount));
  if (a > fx.shake) {
    fx.shake = a;
  }
}

// Advance all effects by dt seconds. Call once per frame from the game loop.
export function updateFx(fx, dt) {
  const step = Math.max(0, Math.min(0.05, dt));

  // Particles: move, drag, gravity, age out.
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= step;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.vx *= PARTICLE_DRAG;
    p.vy = p.vy * PARTICLE_DRAG + PARTICLE_GRAVITY * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
  }

  // Floating texts: rise and age out.
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= step;
    if (t.life <= 0) {
      fx.texts.splice(i, 1);
      continue;
    }
    t.y -= TEXT_RISE_SPEED * step;
  }

  // Shake: decay, then compute the current random offset.
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - SHAKE_DECAY * step);
    const mag = fx.shake * SHAKE_MAX_OFFSET;
    fx.shakeX = (Math.random() * 2 - 1) * mag;
    fx.shakeY = (Math.random() * 2 - 1) * mag;
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
}

// Draw all live particles and floating texts. Call after the world is drawn
// so effects appear on top. The caller applies fx.shakeX / fx.shakeY to the
// camera transform before drawing the world.
export function drawFx(ctx, fx) {
  // Particles as fading circles.
  for (const p of fx.particles) {
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating texts, centered, fading as they rise.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 13px monospace";
  for (const t of fx.texts) {
    const alpha = Math.max(0, Math.min(1, t.life / t.maxLife));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x, t.y);
  }

  ctx.globalAlpha = 1;
}

// Clear every particle and text and stop any shake immediately.
export function clearFx(fx) {
  fx.particles.length = 0;
  fx.texts.length = 0;
  fx.shake = 0;
  fx.shakeX = 0;
  fx.shakeY = 0;
}
