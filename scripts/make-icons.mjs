import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(size, paint) {
  const rgba = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };
  paint(set, size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(set, size) {
  const s = size;
  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const t = y / s;
      const r = Math.round(143 + (255 - 143) * t);
      const g = Math.round(208 + (225 - 208) * t);
      const b = Math.round(238 + (191 - 238) * t);
      set(x, y, r, g, b);
    }
  }
  const sun = { x: s * 0.72, y: s * 0.24, rad: s * 0.1 };
  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      if ((x - sun.x) ** 2 + (y - sun.y) ** 2 < sun.rad ** 2) set(x, y, 255, 224, 138);
    }
  }
  for (let y = Math.floor(s * 0.62); y < s; y += 1) {
    const wave = Math.sin((y / s) * 18) * s * 0.01;
    for (let x = 0; x < s; x += 1) {
      if (y + wave > s * 0.66) set(x, y, 61, 183, 214);
    }
  }
  const carY = Math.floor(s * 0.58);
  const carX = Math.floor(s * 0.18);
  const carW = Math.floor(s * 0.42);
  const carH = Math.floor(s * 0.16);
  for (let y = carY; y < carY + carH; y += 1) {
    for (let x = carX; x < carX + carW; x += 1) set(x, y, 255, 127, 102);
  }
  const wheelR = Math.max(2, Math.floor(s * 0.045));
  for (const cx of [carX + wheelR * 2, carX + carW - wheelR * 2]) {
    const cy = carY + carH;
    for (let y = cy - wheelR; y <= cy + wheelR; y += 1) {
      for (let x = cx - wheelR; x <= cx + wheelR; x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= wheelR ** 2) set(x, y, 27, 57, 68);
      }
    }
  }
}

const dir = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), png(192, draw));
fs.writeFileSync(path.join(dir, 'icon-512.png'), png(512, draw));
fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), png(180, draw));
console.log('icons written');
