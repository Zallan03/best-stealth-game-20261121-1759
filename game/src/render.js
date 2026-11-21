import { CONFIG, COLORS } from './config.js';
import { clamp, distance, hasLineOfSight } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawFloor(ctx, world) {
  const grad = ctx.createLinearGradient(0, CONFIG.hudHeight, 0, CONFIG.height);
  grad.addColorStop(0, '#0d2b2a');
  grad.addColorStop(0.55, '#0a2433');
  grad.addColorStop(1, '#071826');
  ctx.fillStyle = grad;
  ctx.fillRect(0, CONFIG.hudHeight, CONFIG.width, CONFIG.height - CONFIG.hudHeight);

  ctx.fillStyle = 'rgba(125, 211, 252, 0.065)';
  ctx.fillRect(32, 76, 896, 44);
  ctx.fillRect(32, 196, 896, 44);
  ctx.fillRect(32, 411, 896, 34);
  ctx.fillRect(32, 542, 896, 52);
  ctx.fillRect(58, 66, 38, 540);
  ctx.fillRect(256, 196, 38, 240);
  ctx.fillRect(678, 76, 38, 360);
  ctx.fillRect(864, 66, 48, 500);
  ctx.strokeStyle = 'rgba(219, 234, 254, 0.045)';
  ctx.lineWidth = 1;
  for (let x = 32; x <= 928; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x, 606); ctx.stroke();
  }
  for (let y = 66; y <= 606; y += 40) {
    ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(928, y); ctx.stroke();
  }

  for (const g of world.decor.grass) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.a);
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-g.s, 0); ctx.lineTo(0, -g.s); ctx.lineTo(g.s, 0);
    ctx.stroke();
    ctx.restore();
  }
  for (const p of world.decor.pebbles) {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.20)';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of world.decor.flowers) {
    ctx.fillStyle = f.c;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * f.s, f.y + Math.sin(a) * f.s, f.s * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath(); ctx.arc(f.x, f.y, 1.25, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLanternGlow(ctx, world) {
  for (const l of world.lanterns) {
    const glow = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 58);
    glow.addColorStop(0, 'rgba(252, 211, 77, 0.34)');
    glow.addColorStop(0.35, 'rgba(251, 146, 60, 0.13)');
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(l.x, l.y, 58, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSolid(ctx, s) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  if (s.kind === 'crate') {
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, s.x, s.y, s.w, s.h, 4); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#5f3a17'; ctx.lineWidth = 2;
    roundRect(ctx, s.x + 2, s.y + 2, s.w - 4, s.h - 4, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x + 4, s.y + 4); ctx.lineTo(s.x + s.w - 4, s.y + s.h - 4);
    ctx.moveTo(s.x + s.w - 4, s.y + 4); ctx.lineTo(s.x + 4, s.y + s.h - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(254, 215, 170, 0.35)';
    ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, 3);
  } else if (s.kind === 'hedge') {
    ctx.fillStyle = '#14532d';
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#22c55e';
    const n = Math.max(3, Math.floor((s.w + s.h) / 18));
    for (let i = 0; i < n; i += 1) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const cx = s.w >= s.h ? s.x + 8 + t * (s.w - 16) : s.x + s.w / 2;
      const cy = s.w >= s.h ? s.y + s.h / 2 : s.y + 8 + t * (s.h - 16);
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#052e16'; ctx.lineWidth = 2;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.stroke();
  } else {
    ctx.fillStyle = '#365a78';
    roundRect(ctx, s.x, s.y, s.w, s.h, 4); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#466e91';
    ctx.fillRect(s.x + 3, s.y + 3, Math.max(0, s.w - 6), 4);
    ctx.strokeStyle = '#162c42'; ctx.lineWidth = 2;
    roundRect(ctx, s.x, s.y, s.w, s.h, 4); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(219,234,254,0.16)';
  ctx.lineWidth = 1;
  if (s.w > s.h) {
    for (let x = s.x + 28; x < s.x + s.w - 6; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, s.y + 3); ctx.lineTo(x, s.y + s.h - 3); ctx.stroke();
    }
  } else {
    for (let y = s.y + 28; y < s.y + s.h - 6; y += 30) {
      ctx.beginPath(); ctx.moveTo(s.x + 3, y); ctx.lineTo(s.x + s.w - 3, y); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBushes(ctx, world) {
  for (const b of world.bushes) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.30)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;
    const blobs = [[0, 0, 1], [-17, 5, 0.72], [17, 6, 0.75], [-8, -12, 0.68], [11, -11, 0.7], [0, 13, 0.78]];
    for (const [ox, oy, scale] of blobs) {
      ctx.fillStyle = '#166534';
      ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, b.r * 0.62 * scale, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < 4; i += 1) {
      const a = i * 2.399 + b.x * 0.01;
      const rr = b.r * (0.25 + (i % 4) * 0.15);
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * rr * 0.55, b.y + Math.sin(a) * rr * 0.42, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#bbf7d0';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('bush', b.x, b.y + 3);
    ctx.restore();
  }
}

function drawLanterns(ctx, world) {
  for (const l of world.lanterns) {
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(l.x, l.y + 12); ctx.lineTo(l.x, l.y - 9); ctx.stroke();
    ctx.fillStyle = '#451a03';
    roundRect(ctx, l.x - 6, l.y - 14, 12, 15, 3); ctx.fill();
    const flicker = 1 + Math.sin(world.time * 7 + l.x * 0.07) * 0.12;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(l.x, l.y - 6, 4.4 * flicker, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(l.x, l.y + 12, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawExit(ctx, world) {
  const e = world.exit;
  ctx.save();
  const open = world.hasPearl;
  ctx.fillStyle = open ? 'rgba(74, 222, 128, 0.28)' : 'rgba(30, 41, 59, 0.88)';
  roundRect(ctx, e.x, e.y, e.w, e.h, 7); ctx.fill();
  ctx.strokeStyle = open ? COLORS.safe : '#64748b';
  ctx.lineWidth = 3;
  roundRect(ctx, e.x, e.y, e.w, e.h, 7); ctx.stroke();
  ctx.strokeStyle = open ? '#bbf7d0' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(e.x + 12, e.y + e.h - 5); ctx.lineTo(e.x + 12, e.y + 16);
  ctx.quadraticCurveTo(e.cx, e.y - 4, e.x + e.w - 12, e.y + 16);
  ctx.lineTo(e.x + e.w - 12, e.y + e.h - 5);
  ctx.stroke();
  if (open) {
    ctx.fillStyle = 'rgba(187, 247, 208, 0.30)';
    ctx.fillRect(e.cx - 3, e.y + 12, 6, e.h - 16);
  } else {
    ctx.fillStyle = COLORS.gold;
    roundRect(ctx, e.cx - 8, e.cy - 3, 16, 13, 3); ctx.fill();
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.cx, e.cy - 3, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.beginPath(); ctx.arc(e.cx, e.cy + 3, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = open ? '#dcfce7' : COLORS.dim;
  ctx.font = '700 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'OPEN GATE' : 'EXIT', e.cx, e.y + e.h - 8);
  ctx.restore();
}

function drawPearl(ctx, world) {
  if (world.hasPearl) return;
  const { x, y } = world.pearl;
  ctx.save();
  ctx.fillStyle = '#334155';
  ctx.beginPath(); ctx.ellipse(x, y + 15, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#64748b';
  roundRect(ctx, x - 13, y + 5, 26, 11, 3); ctx.fill();
  const pulse = 1 + Math.sin(world.time * 3.2) * 0.10;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 38 * pulse);
  glow.addColorStop(0, 'rgba(165, 243, 252, 0.55)');
  glow.addColorStop(1, 'rgba(165, 243, 252, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, 38 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.pearl;
  ctx.beginPath(); ctx.arc(x, y, world.pearl.r * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - 3.5, y - 4, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, world.pearl.r * pulse + 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#cffafe';
  ctx.font = '700 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOON-PEARL', x, y + 31);
  ctx.restore();
}

function drawVision(ctx, world, guard) {
  const steps = 26;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = guard.angle - CONFIG.guardViewHalfAngle
      + (i / steps) * CONFIG.guardViewHalfAngle * 2;
    let len = CONFIG.guardViewDistance;
    for (let d = 8; d <= CONFIG.guardViewDistance; d += 8) {
      const px = guard.x + Math.cos(a) * d;
      const py = guard.y + Math.sin(a) * d;
      if (!hasLineOfSight(world, guard.x, guard.y, px, py)) { len = Math.max(8, d - 8); break; }
      len = d;
    }
    points.push([guard.x + Math.cos(a) * len, guard.y + Math.sin(a) * len]);
  }
  ctx.save();
  let fill = 'rgba(45, 212, 191, 0.14)';
  if (guard.state === 'alert') fill = 'rgba(248, 113, 113, 0.30)';
  else if (guard.state === 'suspicious') fill = 'rgba(252, 211, 77, 0.25)';
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = guard.state === 'alert' ? 'rgba(254, 202, 202, 0.42)' : 'rgba(204, 251, 241, 0.20)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, world, guard) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(0, 11, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(guard.angle);
  ctx.fillStyle = guard.color;
  ctx.beginPath(); ctx.arc(0, 0, guard.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.65)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath(); ctx.arc(-3, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(guard.r + 7, 0); ctx.lineTo(guard.r - 3, -5); ctx.lineTo(guard.r - 3, 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffcc7';
  ctx.beginPath(); ctx.arc(8, -10, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(5, -4, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-1, 4, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.beginPath(); ctx.arc(6, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  roundRect(ctx, -30, -34, 60, 12, 6); ctx.fill();
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '700 7.5px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name.replace(' Keeper', '').toUpperCase(), 0, -25.5);
  if (guard.suspicion > 0.02) {
    ctx.fillStyle = 'rgba(2,6,23,0.78)';
    roundRect(ctx, -19, 20, 38, 6, 3); ctx.fill();
    ctx.fillStyle = guard.state === 'alert' ? COLORS.danger : (guard.state === 'suspicious' ? COLORS.gold : COLORS.safe);
    roundRect(ctx, -18, 21, 38 * clamp(guard.suspicion, 0, 1), 4, 2); ctx.fill();
  }
  if (guard.state !== 'patrol') {
    ctx.fillStyle = guard.state === 'alert' ? COLORS.danger : COLORS.gold;
    ctx.font = '900 22px Arial, sans-serif';
    ctx.fillText(guard.state === 'alert' ? '!!' : '!', 0, -40);
  }
  ctx.restore();
}

function drawFox(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y + (p.moving ? Math.sin(p.stepAcc * 0.32) * 1.1 : 0));
  ctx.rotate(p.angle);
  if (p.sneaking) ctx.scale(1.06, 0.84);
  if (p.hidden) ctx.globalAlpha = 0.58;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 3); ctx.quadraticCurveTo(-20, 7, -24, 1); ctx.stroke();
  ctx.strokeStyle = '#ffedd5'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-22, 2); ctx.lineTo(-25, 0); ctx.stroke();
  ctx.fillStyle = COLORS.fox;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, -7); ctx.lineTo(10, -15); ctx.lineTo(14, -6);
  ctx.moveTo(4, 7); ctx.lineTo(9, 14); ctx.lineTo(14, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffedd5';
  ctx.beginPath(); ctx.arc(9, 0, 7.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.fox;
  ctx.beginPath(); ctx.arc(7, 0, 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath(); ctx.ellipse(13.5, 0, 4.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f11827';
  ctx.beginPath(); ctx.arc(17.4, 0, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -3.2, 1.35, 0, Math.PI * 2); ctx.fill();
  if (world.hasPearl) {
    ctx.fillStyle = COLORS.pearl;
    ctx.beginPath(); ctx.arc(-4, -10, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-5.2, -11.4, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  if (p.hidden) {
    ctx.save();
    ctx.translate(p.x, p.y - 10);
    ctx.fillStyle = '#22c55e';
    for (const [ox, oy, r] of [[-10, 0, 6], [0, -5, 7], [10, 0, 6]]) {
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#dcfce7';
    ctx.font = '700 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', 0, 16);
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.save();
    ctx.globalAlpha = 1 - p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawHud(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(3, 10, 22, 0.96)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.hudHeight);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, CONFIG.hudHeight - 2, CONFIG.width, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = '900 17px Arial, sans-serif';
  ctx.fillText('LANTERN FOX', 16, 20);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText(world.player.sneaking ? 'PROWLING · quieter' : (world.player.hidden ? 'HIDDEN IN BUSH' : 'MOONLIT GARDEN'), 16, 36);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 14px Arial, sans-serif';
  const objective = world.messageTime > 0 ? world.message
    : (world.hasPearl ? 'Escape through the north-east gate' : 'Find the Moon-Pearl in the shrine');
  ctx.fillText(objective, 480, 21);
  ctx.fillStyle = world.hasPearl ? COLORS.pearl : COLORS.dim;
  ctx.font = '700 10.5px Arial, sans-serif';
  ctx.fillText(world.hasPearl ? '◆ MOON-PEARL STOLEN ◆' : '◇ pearl still in the shrine ◇', 480, 37);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '700 10px Arial, sans-serif';
  ctx.fillText('ALERT', 704, 17);
  ctx.fillStyle = 'rgba(148,163,184,0.28)';
  roundRect(ctx, 704, 23, 112, 9, 4); ctx.fill();
  const alertColor = world.alert > 0.72 ? COLORS.danger : (world.alert > 0.3 ? COLORS.gold : COLORS.safe);
  ctx.fillStyle = alertColor;
  if (world.alert > 0.01) { roundRect(ctx, 704, 23, 112 * clamp(world.alert, 0, 1), 9, 4); ctx.fill(); }
  ctx.fillStyle = world.seenBy ? COLORS.danger : COLORS.dim;
  ctx.font = '700 10px Arial, sans-serif';
  ctx.fillText(world.seenBy ? `SEEN × ${world.seenBy}` : 'UNSEEN', 704, 43);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ink;
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText(formatTime(world.time), 944, 22);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText('SHIFT prowl · R restart', 944, 37);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 18, 0.58)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = 'rgba(7, 20, 38, 0.96)';
  roundRect(ctx, 142, 104, 676, 414, 18); ctx.fill();
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2;
  roundRect(ctx, 142, 104, 676, 414, 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(165,243,252,0.28)';
  roundRect(ctx, 154, 116, 652, 390, 13); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.pearl;
  ctx.beginPath(); ctx.arc(480, 157, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(474, 151, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.font = '900 55px Arial, sans-serif';
  ctx.fillText('LANTERN FOX', 480, 224);
  ctx.fillStyle = COLORS.pearl;
  ctx.font = '700 24px Arial, sans-serif';
  ctx.fillText('Steal the Moon-Pearl', 480, 258);
  ctx.fillStyle = COLORS.ink;
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('Slink past the Lantern Keepers, vanish into moon-bushes,', 480, 303);
  ctx.fillText('snatch the pearl from its shrine, and escape north-east.', 480, 327);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13.5px Arial, sans-serif';
  ctx.fillText('WASD / Arrows to move · SHIFT to prowl quietly · R to restart', 480, 365);
  ctx.fillText('Vision cones fill the alert eye. Red means a keeper is charging.', 480, 389);
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, 348, 421, 264, 50, 10); ctx.fill();
  ctx.fillStyle = '#1c1005';
  ctx.font = '900 17px Arial, sans-serif';
  ctx.fillText('▶  START THE HEIST', 480, 453);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Click anywhere or press Enter', 480, 496);
  ctx.restore();
}

function drawEnd(ctx, world) {
  const won = world.state === 'won';
  ctx.save();
  ctx.fillStyle = won ? 'rgba(4, 32, 20, 0.58)' : 'rgba(42, 5, 10, 0.62)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = 'rgba(7, 20, 38, 0.97)';
  roundRect(ctx, 258, 180, 444, 282, 16); ctx.fill();
  ctx.strokeStyle = won ? COLORS.safe : COLORS.danger;
  ctx.lineWidth = 2.5;
  roundRect(ctx, 258, 180, 444, 282, 16); ctx.stroke();
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = COLORS.pearl;
    ctx.beginPath(); ctx.arc(480, 225, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(475, 220, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = won ? COLORS.gold : COLORS.danger;
  ctx.font = '900 37px Arial, sans-serif';
  ctx.fillText(won ? 'PEARL STOLEN!' : 'CAUGHT!', 480, 276);
  ctx.fillStyle = COLORS.ink;
  ctx.font = '16px Arial, sans-serif';
  if (won) {
    ctx.fillText('The little fox slips over the gate, moonlight in her teeth.', 480, 314);
    ctx.fillText(`Escape time ${formatTime(world.time)} · The garden bells never rang.`, 480, 342);
  } else {
    ctx.fillText(`Caught by the ${world.caughtBy || 'Lantern Keeper'}.`, 480, 314);
    ctx.fillText('The Moon-Pearl rolls back to its shrine… this time.', 480, 342);
  }
  ctx.fillStyle = won ? COLORS.safe : COLORS.danger;
  roundRect(ctx, 354, 380, 252, 46, 9); ctx.fill();
  ctx.fillStyle = '#0b130c';
  ctx.font = '900 15px Arial, sans-serif';
  ctx.fillText(won ? '↻  STEAL IT AGAIN' : '↻  TRY AGAIN', 480, 407);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Click or press R', 480, 443);
  ctx.restore();
}

export function drawGame(ctx, world, screen = 'game') {
  ctx.save();
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  drawFloor(ctx, world);
  drawLanternGlow(ctx, world);
  for (const s of world.solids) drawSolid(ctx, s);
  drawBushes(ctx, world);
  drawExit(ctx, world);
  drawPearl(ctx, world);
  for (const guard of world.guards) drawVision(ctx, world, guard);
  drawLanterns(ctx, world);
  for (const guard of world.guards) drawGuard(ctx, world, guard);
  drawFox(ctx, world);
  drawParticles(ctx, world);

  const vignette = ctx.createRadialGradient(480, 330, 230, 480, 330, 650);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  if (screen === 'title') {
    drawTitle(ctx, world);
  } else {
    drawHud(ctx, world);
    if (world.state === 'won' || world.state === 'lost') drawEnd(ctx, world);
  }
  ctx.restore();
}
