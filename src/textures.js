import * as THREE from 'three';

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function canvasTexture(width, height, draw, { anisotropy = 4, color = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function shade(base, n, amount) {
  const v = (base + (n - 0.5) * amount);
  return Math.max(0, Math.min(255, v));
}

export function createTextures(anisotropy = 4) {
  const asphalt = canvasTexture(512, 512, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = noise(x * 0.08, y * 0.08);
        const grit = noise(x * 0.35, y * 0.35);
        const crack = Math.abs(noise(x * 0.02, y * 0.015) - 0.5) < 0.02 ? -28 : 0;
        const i = (y * w + x) * 4;
        image.data[i] = shade(78, n * 0.7 + grit * 0.3, 36) + crack;
        image.data[i + 1] = shade(82, n * 0.7 + grit * 0.3, 34) + crack;
        image.data[i + 2] = shade(88, n * 0.7 + grit * 0.3, 32) + crack;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { anisotropy });

  const sand = canvasTexture(256, 256, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = noise(x * 0.12, y * 0.12);
        const grit = hash(x, y);
        const i = (y * w + x) * 4;
        image.data[i] = shade(214, n, 28) + (grit - 0.5) * 10;
        image.data[i + 1] = shade(186, n, 24) + (grit - 0.5) * 8;
        image.data[i + 2] = shade(130, n, 18);
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { anisotropy });

  const sidewalk = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e7d8c4';
    ctx.fillRect(0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const seam = x < 3 || y < 3 || x > w - 4 || y > h - 4;
        const n = noise(x * 0.1, y * 0.1);
        const i = (y * w + x) * 4;
        const lift = seam ? -26 : (n - 0.5) * 16;
        image.data[i] = shade(image.data[i], 0.5, 0) + lift;
        image.data[i + 1] = shade(image.data[i + 1], 0.5, 0) + lift;
        image.data[i + 2] = shade(image.data[i + 2], 0.5, 0) + lift;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { anisotropy });

  const plaster = canvasTexture(128, 128, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = noise(x * 0.15, y * 0.15);
        const i = (y * w + x) * 4;
        const v = shade(236, n, 18);
        image.data[i] = v;
        image.data[i + 1] = v - 2;
        image.data[i + 2] = v - 6;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { anisotropy });

  const facade = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4f0e8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e4d3bf';
    ctx.fillRect(0, 0, w, 18);
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#f7c9b4';
    ctx.fillRect(0, 18, w, 8);
    const cols = 4;
    const rows = 8;
    const marginX = 18;
    const marginY = 36;
    const cellW = (w - marginX * 2) / cols;
    const cellH = (h - marginY * 2) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = marginX + col * cellW + cellW * 0.18;
        const y = marginY + row * cellH + cellH * 0.16;
        const ww = cellW * 0.64;
        const hh = cellH * 0.62;
        ctx.fillStyle = '#6f8ea0';
        ctx.fillRect(x, y, ww, hh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 2, y + 2, ww * 0.28, hh - 4);
        ctx.strokeStyle = '#f7f3ec';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, ww + 4, hh + 4);
      }
    }
    ctx.strokeStyle = '#e7d2c0';
    ctx.lineWidth = 3;
    for (let row = 0; row <= rows; row += 1) {
      const y = marginY + row * cellH;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(w - 8, y);
      ctx.stroke();
    }
  }, { anisotropy });

  const ground = canvasTexture(256, 256, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = noise(x * 0.06, y * 0.06);
        const i = (y * w + x) * 4;
        image.data[i] = shade(196, n, 22);
        image.data[i + 1] = shade(176, n, 18);
        image.data[i + 2] = shade(140, n, 14);
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { anisotropy });

  const waterNormal = waterNormalMap();
  const frond = frondTexture();
  const environment = environmentMap();

  return { asphalt, sand, sidewalk, plaster, facade, ground, waterNormal, frond, environment };
}

export function createWaterNormal() {
  return waterNormalMap();
}

function waterNormalMap() {
  const size = 256;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      heights[y * size + x] = Math.sin(x * 0.11) * Math.cos(y * 0.09)
        + Math.sin((x + y) * 0.05) * 0.6
        + noise(x * 0.08, y * 0.08);
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sample = (sx, sy) => heights[((sy + size) % size) * size + ((sx + size) % size)];
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * 1.4;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * 1.4;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      data[i] = (nx / len * 0.5 + 0.5) * 255;
      data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function frondTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 256);
  ctx.translate(64, 240);
  for (let i = -5; i <= 5; i += 1) {
    ctx.save();
    ctx.rotate(i * 0.055);
    ctx.fillStyle = i % 2 === 0 ? '#2f8f45' : '#3eaf58';
    ctx.beginPath();
    ctx.ellipse(0, -100, 7 - Math.abs(i), 108, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#6d4a28';
  ctx.fillRect(-3, -16, 6, 28);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function environmentMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 78);
  sky.addColorStop(0, '#6eb4e4');
  sky.addColorStop(0.45, '#d7ecf8');
  sky.addColorStop(0.72, '#ffe0b0');
  sky.addColorStop(1, '#f2c48a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 78);
  const ground = ctx.createLinearGradient(0, 78, 0, 128);
  ground.addColorStop(0, '#e7c99a');
  ground.addColorStop(0.35, '#3e9eb8');
  ground.addColorStop(1, '#1d6d8c');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 78, 256, 50);
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath();
  ctx.arc(168, 28, 10, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
