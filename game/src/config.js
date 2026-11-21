// Shared tuning and palette for Lantern Fox.
// Everything is drawn with Canvas 2D; there are no external assets.
export const CONFIG = {
  width: 960,
  height: 640,
  hudHeight: 48,

  playerRadius: 11,
  playerSpeed: 154,
  sneakSpeed: 92,

  guardRadius: 14,
  guardViewDistance: 168,
  guardViewHalfAngle: 0.66, // radians, about 38 degrees either side
  detectionSeconds: 0.9, // standing in light this long fills the alert
  sneakDetectionSeconds: 1.35, // prowling is harder to spot
  closeDetectionSeconds: 0.45, // point-blank spotting is fast
  detectionDecaySeconds: 1.25,
  bushRevealDistance: 20, // a keeper this close finds you even in a bush
};

export const COLORS = {
  ink: '#e8f3ff',
  dim: '#9db8d6',
  gold: '#fcd34d',
  pearl: '#a5f3fc',
  danger: '#f87171',
  safe: '#4ade80',
  fox: '#fb923c',
};
