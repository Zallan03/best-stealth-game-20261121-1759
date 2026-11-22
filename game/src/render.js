// Lantern Fox renderer — everything is drawn with Canvas 2D, no external assets.
// Draws the moonlit garden, the patrolling keepers, the fox, and the HUD.
import { CONFIG, COLORS } from './config.js';

const TAU = Math.PI * 2;

function fmtTime(t) {
  const s = Math.max(0, Math.floor(t || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  g.addColorStop(0, '#0a1a2c');
  g.addColorStop(0.55, '#0a2030');
  g.addColorStop(1, '#071018');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  // Faint moon glow in the upper right.
  const glow = ctx.createRadialGradient(830, 90, 8, 830, 90, 190);
  glow.addColorStop(0, 'rgba(190, 227, 255, 0.20)');
  glow.addColorStop(1, 'rgba(190, 227, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(620, 0, 340, 300);
  // Subtle ground grid.
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < CONFIG.width; x += 40) {
    ctx.moveTo(x, CONFIG.hudHeight);
    ctx.lineTo(x, CONFIG.height);
  }
  for (let y = CONFIG.hudHeight + 40; y < CONFIG.height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.width, y);
  }
  ctx.stroke();
}

function drawDecor(ctx, world) {
  // Grass tufts.
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.30)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const t of world.decor.grass) {
    const x = t.x;
    const y = t.y;
    const s = t.s;
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s * 0.4, y - s * 1.6);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - s * 1.9);
    ctx.moveTo(x + s, y);
    ctx.lineTo(x + s * 0.4, y - s * 1.6);
  }
  ctx.stroke();
  // Flowers.
  for (const f of world.decor.flowers) {
    ctx.fillStyle = f.c;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.s, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Pebbles.
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  for (const p of world.decor.pebbles) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.s, p.s * 0.65, 0.6, 0, TAU);
    ctx.fill();
  }
}

function drawSolids(ctx, world) {
  for (const s of world.solids) {
    if (s.kind === 'wall') {
      ctx.fillStyle = '#1e3a52';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2b4a67';
      ctx.fillRect(s.x, s.y, s.w, 3);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    } else if (s.kind === 'hedge') {
      ctx.fillStyle = '#14532d';
      roundRectPath(ctx, s.x, s.y, s.w, s.h, 6);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      const step = 14;
      for (let x = s.x + 7; x < s.x + s.w; x += step) {
        ctx.arc(x, s.y + s.h / 2, 4, 0, TAU);
      }
      ctx.fill();
    } else {
      // Crate.
      ctx.fillStyle = '#7c4a21';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y + 4);
      ctx.lineTo(s.x + s.w - 4, s.y + s.h - 4);
      ctx.moveTo(s.x + s.w - 4, s.y + 4);
      ctx.lineTo(s.x + 4, s.y + s.h - 4);
      ctx.stroke();
    }
  }
}

function drawBushes(ctx, world) {
  for (const b of world.bushes) {
    const r = b.r;
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(b.x - r * 0.45, b.y + r * 0.2, r * 0.62, 0, TAU);
    ctx.arc(b.x + r * 0.45, b.y + r * 0.2, r * 0.62, 0, TAU);
    ctx.arc(b.x, b.y - r * 0.35, r * 0.66, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(b.x - r * 0.3, b.y - r * 0.1, r * 0.28, 0, TAU);
    ctx.arc(b.x + r * 0.32, b.y - r * 0.2, r * 0.24, 0, TAU);
    ctx.arc(b.x, b.y + r * 0.3, r * 0.26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 252, 231, 0.85)';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('bush', b.x, b.y + r * 0.05);
  }
}

function drawLanterns(ctx, world) {
  for (const L of world.lanterns) {
    const glow = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, 42);
    glow.addColorStop(0, 'rgba(252, 211, 77, 0.5)');
    glow.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(L.x, L.y, 42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.fillRect(L.x - 1.5, L.y - 14, 3, 8);
    ctx.fillStyle = '#fcd34d';
    roundRectPath(ctx, L.x - 6, L.y - 8, 12, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(L.x - 3, L.y - 5, 6, 8);
  }
}

function drawPearlAndShrine(ctx, world) {
  // Shrine pedestal.
  ctx.fillStyle = '#334155';
  roundRectPath(ctx, world.pearl.x - 22, world.pearl.y - 14, 44, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.fillRect(world.pearl.x - 22, world.pearl.y - 14, 44, 6);
  if (!world.hasPearl) {
    const pulse = 1 + Math.sin(world.time * 3) * 0.12;
    const glow = ctx.createRadialGradient(
      world.pearl.x, world.pearl.y, 2,
      world.pearl.x, world.pearl.y, 34 * pulse,
    );
    glow.addColorStop(0, 'rgba(165, 243, 252, 0.85)');
    glow.addColorStop(1, 'rgba(165, 243, 252, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(world.pearl.x, world.pearl.y, 34 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.arc(world.pearl.x, world.pearl.y, world.pearl.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(world.pearl.x - 3, world.pearl.y - 3, 4, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(165, 243, 252, 0.9)';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SHRINE', world.pearl.x, world.pearl.y + 30);
}

function drawExit(ctx, world) {
  const e = world.exit;
  const open = world.hasPearl;
  ctx.fillStyle = open ? '#14532d' : '#1e293b';
  roundRectPath(ctx, e.x, e.y, e.w, e.h, 8);
  ctx.fill();
  ctx.strokeStyle = open ? '#4ade80' : '#64748b';
  ctx.lineWidth = 2;
  roundRectPath(ctx, e.x + 1, e.y + 1, e.w - 2, e.h - 2, 7);
  ctx.stroke();
  if (open) {
    const glow = ctx.createRadialGradient(e.cx, e.cy, 4, e.cx, e.cy, 44);
    glow.addColorStop(0, 'rgba(74, 222, 128, 0.55)');
    glow.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, 44, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#bbf7d0';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN GATE', e.cx, e.cy + 4);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GATE', e.cx, e.cy + 4);
  }
}

function drawVisionCone(ctx, guard) {
  const dist = CONFIG.guardViewDistance;
  const half = CONFIG.guardViewHalfAngle;
  const base = guard.color;
  const alpha = guard.state === 'alert' ? 0.34 : guard.state === 'suspicious' ? 0.26 : 0.16;
  ctx.fillStyle = hexA(base, alpha);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, dist, guard.angle - half, guard.angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hexA(base, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  drawVisionCone(ctx, guard);
  // Body.
  ctx.fillStyle = guard.color;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Face: two eyes looking along the facing angle.
  const ex = Math.cos(guard.angle);
  const ey = Math.sin(guard.angle);
  const px = -ey;
  const py = ex;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(guard.x + ex * 4 + px * 4, guard.y + ey * 4 + py * 4, 2.2, 0, TAU);
  ctx.arc(guard.x + ex * 4 - px * 4, guard.y + ey * 4 - py * 4, 2.2, 0, TAU);
  ctx.fill();
  // Lantern dot on the chest.
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(guard.x + ex * 7, guard.y + ey * 7, 2.6, 0, TAU);
  ctx.fill();
  // Suspicion arc above the head.
  if (guard.suspicion > 0.02) {
    const col = guard.state === 'alert' ? COLORS.danger : COLORS.gold;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * guard.suspicion);
    ctx.stroke();
    if (guard.state === 'alert') {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - guard.r - 12);
    }
  }
  // Name tag.
  ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.font = '9px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + guard.r + 13);
}

function drawPlayer(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Tail.
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.ellipse(-p.r - 4, 4, 9, 5, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fdba74';
  ctx.beginPath();
  ctx.ellipse(-p.r - 8, 6, 4, 2.5, 0.5, 0, TAU);
  ctx.fill();
  // Body.
  ctx.fillStyle = p.hidden ? hexA(COLORS.fox, 0.55) : COLORS.fox;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124, 45, 18, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Ears.
  ctx.fillStyle = COLORS.fox;
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(-10, -17);
  ctx.lineTo(-3, -11);
  ctx.closePath();
  ctx.moveTo(7, -8);
  ctx.lineTo(10, -17);
  ctx.lineTo(3, -11);
  ctx.closePath();
  ctx.fill();
  // Face.
  const fx = p.moving ? Math.cos(p.angle) : 0;
  const fy = p.moving ? Math.sin(p.angle) : 0;
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.arc(fx * 3, fy * 3 + 2, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(fx * 4 - 3, fy * 4 - 2, 1.8, 0, TAU);
  ctx.arc(fx * 4 + 3, fy * 4 - 2, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (p.hidden) {
    ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', p.x, p.y - p.r - 8);
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    const a = Math.max(0, 1 - pt.life / pt.maxLife);
    ctx.fillStyle = hexA(pt.color, a);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0b1524';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.hudHeight);
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.hudHeight);
  ctx.lineTo(CONFIG.width, CONFIG.hudHeight);
  ctx.stroke();
  // Left: title.
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LANTERN FOX', 16, 21);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('MOONLIT GARDEN', 16, 37);
  // Center: objective / message.
  const mid = world.hasPearl ? '◆ MOON-PEARL STOLEN ◆' : '◇ FIND THE MOON-PEARL ◇';
  ctx.fillStyle = world.hasPearl ? COLORS.pearl : COLORS.ink;
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(mid, CONFIG.width / 2, 21);
  const msg = world.messageTime > 0 ? world.message : '';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText(msg, CONFIG.width / 2, 38);
  // Right: alert meter + timer.
  const alertW = 130;
  const ax = CONFIG.width - alertW - 16;
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textAlign = 'left';
  const label = world.alert >= 0.99 ? 'CAUGHT' : world.alert >= 0.32 ? 'SPOTTED' : world.alert > 0.02 ? 'SUSPICIOUS' : 'UNSEEN';
  ctx.fillText('ALERT', ax, 14);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(ax, 18, alertW, 9);
  const aw = alertW * Math.max(0, Math.min(1, world.alert));
  ctx.fillStyle = world.alert >= 0.32 ? COLORS.danger : COLORS.safe;
  ctx.fillRect(ax, 18, aw, 9);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(label, ax + alertW, 14);
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText(fmtTime(world.time), CONFIG.width - 16, 42);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('SHIFT prowl · R restart', CONFIG.width - 16, 14);
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(3, 7, 18, 0.72)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LANTERN FOX', CONFIG.width / 2, 210);
  ctx.fillStyle = COLORS.pearl;
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('— Steal the Moon-Pearl —', CONFIG.width / 2, 250);
  ctx.fillStyle = COLORS.ink;
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Slip past the Lantern Keepers. Hide in the moon-bushes.', CONFIG.width / 2, 300);
  ctx.fillText('Steal the pearl from its shrine, then escape through the north-east gate.', CONFIG.width / 2, 324);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('WASD / Arrows to move · Hold Shift to prowl quietly · R to restart', CONFIG.width / 2, 372);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px Arial, sans-serif';
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink || world.time === 0) {
    ctx.fillText('Click or press Enter to start', CONFIG.width / 2, 420);
  }
}

function drawEnd(ctx, world) {
  const won = world.state === 'won';
  ctx.fillStyle = won ? 'rgba(6, 40, 22, 0.78)' : 'rgba(60, 8, 8, 0.78)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = won ? COLORS.safe : COLORS.danger;
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    won ? 'THE PEARL IS YOURS!' : 'CAUGHT!',
    CONFIG.width / 2, 250,
  );
  ctx.fillStyle = COLORS.ink;
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(
    won
      ? 'You stole the Moon-Pearl in ' + fmtTime(world.time) + '. The garden is yours.'
      : 'Caught by the ' + world.caughtBy + '. The lanterns never sleep.',
    CONFIG.width / 2, 296,
  );
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Press R to play again · Enter to restart', CONFIG.width / 2, 344);
}

export function drawGame(ctx, world, screen) {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  drawBackground(ctx);
  drawDecor(ctx, world);
  drawSolids(ctx, world);
  drawBushes(ctx, world);
  drawLanterns(ctx, world);
  drawPearlAndShrine(ctx, world);
  drawExit(ctx, world);
  for (const guard of world.guards) {
    drawGuard(ctx, guard);
  }
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawHud(ctx, world);
  if (screen === 'title') {
    drawTitle(ctx, world);
  } else if (world.state === 'won' || world.state === 'lost') {
    drawEnd(ctx, world);
  }
}
