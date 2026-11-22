import { CANAL, PIER, ROAD_XS, ROAD_ZS } from './layout.js';

const RANGE = 78;

export function drawMinimap(canvas, player, world, extras) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(0, 0, w, h);

  const toX = (x) => w / 2 + ((x - player.x) / RANGE) * (w / 2);
  const toY = (z) => h / 2 - ((z - player.z) / RANGE) * (h / 2);

  ctx.fillStyle = '#7fd4ea';
  ctx.fillRect(0, toY(-146), w, h);
  ctx.fillStyle = '#f3d39a';
  ctx.fillRect(0, toY(-104), w, toY(-146) - toY(-104));

  ctx.fillStyle = '#49b7cf';
  ctx.fillRect(toX(CANAL.x0), toY(CANAL.z1), toX(CANAL.x1) - toX(CANAL.x0), toY(CANAL.z0) - toY(CANAL.z1));

  ctx.strokeStyle = '#5c6974';
  ctx.lineWidth = 6;
  ctx.lineCap = 'square';
  for (const z of ROAD_ZS) {
    ctx.beginPath();
    ctx.moveTo(toX(-104), toY(z));
    ctx.lineTo(toX(104), toY(z));
    ctx.stroke();
  }
  for (const x of ROAD_XS) {
    ctx.beginPath();
    ctx.moveTo(toX(x), toY(-104));
    ctx.lineTo(toX(x), toY(104));
    ctx.stroke();
  }

  ctx.fillStyle = '#efd0a0';
  ctx.fillRect(
    toX(PIER.x - PIER.halfW),
    toY(PIER.zStart),
    toX(PIER.x + PIER.halfW) - toX(PIER.x - PIER.halfW),
    toY(PIER.zEnd) - toY(PIER.zStart),
  );

  ctx.fillStyle = 'rgba(244, 184, 196, 0.95)';
  for (const b of world.buildings) {
    const x = toX(b.x - b.w / 2);
    const y = toY(b.z + b.d / 2);
    ctx.fillRect(x, y, toX(b.x + b.w / 2) - x, toY(b.z - b.d / 2) - y);
  }

  ctx.fillStyle = '#ffb7a2';
  for (const shell of extras.shells) {
    ctx.beginPath();
    ctx.arc(toX(shell.x), toY(shell.z), 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffe08a';
  for (const marker of extras.markers) {
    ctx.beginPath();
    ctx.arc(toX(marker.x), toY(marker.z), 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (extras.target) {
    ctx.strokeStyle = '#ff7f66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(toX(extras.target.x), toY(extras.target.z), 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-player.yaw);
  ctx.fillStyle = '#1b3944';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, 5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, -5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,250,244,0.95)';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, w, h);
}
