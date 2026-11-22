/** Pure world layout for Coral Vista. No Three.js, so paths can be audited in Node. */

export const ROAD_XS = [-96, -48, 0, 48, 96];
export const ROAD_ZS = [-96, -48, 0, 48, 96];
export const ROAD_W = 14;

export const CANAL = { x0: -84, x1: 84, z0: -18, z1: 18 };
export const BRIDGES = [-48, 0, 48];
export const BRIDGE_GAP = 18;

export const PIER = { x: -60, halfW: 5.5, zStart: -100, zEnd: -170, railFrom: -110 };

export const SPAWN = { x: -36, z: -96, yaw: 0 };

export const SHELLS = [
  { id: 'shell-1', x: -36, z: -118 },
  { id: 'shell-2', x: -10, z: -126 },
  { id: 'shell-3', x: 20, z: -116 },
  { id: 'shell-4', x: 56, z: -124 },
  { id: 'shell-5', x: 92, z: -120 },
  { id: 'shell-6', x: -86, z: -122 },
  { id: 'shell-7', x: -60, z: -138 },
  { id: 'shell-8', x: 0, z: -6 },
  { id: 'shell-9', x: -48, z: 74 },
  { id: 'shell-10', x: 48, z: -48 },
  { id: 'shell-11', x: -96, z: 48 },
  { id: 'shell-12', x: 28, z: 96 },
];

export const MISSIONS = [
  {
    id: 'sprint',
    type: 'race',
    name: 'Seaglass Sprint',
    reward: 250,
    time: 75,
    blurb: 'Follow the golden arches along the water.',
    start: { x: 18, z: -88, r: 6.2 },
    checkpoints: [
      { x: 48, z: -96 },
      { x: 96, z: -96 },
      { x: 96, z: -48 },
      { x: 96, z: 0 },
      { x: 96, z: 48 },
      { x: 48, z: 48 },
      { x: 0, z: 48 },
      { x: 0, z: 0 },
    ],
  },
  {
    id: 'scoop',
    type: 'delivery',
    name: 'Scoop Run',
    reward: 200,
    time: 60,
    blurb: 'Grab a cooler at Scoop Jetty and drop it at The Pink Marlin.',
    start: { x: -48, z: -48, r: 6.5 },
    drop: { x: 0, z: 48, r: 6.5 },
  },
  {
    id: 'postcard',
    type: 'photo',
    name: 'Pier Postcard',
    reward: 180,
    time: null,
    blurb: 'Stop at the end of Pelican Pier and take the photo.',
    start: { x: -60, z: -114, r: 6 },
    spot: { x: -60, z: -154, r: 6.5 },
    caption: 'Pelican Pier · Coral Vista',
  },
];

const WALLS = ['#f7c6cf', '#ffe3a3', '#c9f0e2', '#f6d6f2', '#d5e4fb', '#ffd0b5', '#fff1dc', '#bfe7f5', '#f9c8a4', '#e7d4ff'];
const ROOFS = ['#f08a7b', '#f2c14e', '#7ec8b3', '#e29ad4', '#8fb4ef', '#f0a36a', '#e6d3b0', '#6eb7d6'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function blockBounds(i, j) {
  const x0 = ROAD_XS[i] + ROAD_W / 2;
  const x1 = ROAD_XS[i + 1] - ROAD_W / 2;
  let z0 = ROAD_ZS[j] + ROAD_W / 2;
  let z1 = ROAD_ZS[j + 1] - ROAD_W / 2;
  if (j === 1) z1 = Math.min(z1, CANAL.z0 - 1.5);
  if (j === 2) z0 = Math.max(z0, CANAL.z1 + 1.5);
  return { x0, x1, z0, z1, i, j };
}

function box(x, z, w, d) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function pushBox(list, x, z, w, d) {
  if (w <= 0 || d <= 0) return;
  list.push(box(x, z, w, d));
}

/** Rail and boundary colliders that match the visual city. */
export function staticColliders() {
  const boxes = [];

  // Canal banks, with openings at the three bridges.
  for (const z of [CANAL.z0, CANAL.z1]) {
    let cursor = CANAL.x0;
    const gaps = BRIDGES.map((b) => [b - BRIDGE_GAP / 2, b + BRIDGE_GAP / 2]);
    for (const [g0, g1] of gaps) {
      if (g0 > cursor) pushBox(boxes, (cursor + g0) / 2, z, g0 - cursor, 0.9);
      cursor = Math.max(cursor, g1);
    }
    if (cursor < CANAL.x1) pushBox(boxes, (cursor + CANAL.x1) / 2, z, CANAL.x1 - cursor, 0.9);
  }
  // Dead ends where Seaglass's cross-street meets the canal.
  pushBox(boxes, CANAL.x0, 0, 1.2, 16);
  pushBox(boxes, CANAL.x1, 0, 1.2, 16);

  // Bridge side rails. Inner gap stays wider than a car.
  for (const bx of BRIDGES) {
    pushBox(boxes, bx - 8.3, 0, 0.45, 42);
    pushBox(boxes, bx + 8.3, 0, 0.45, 42);
  }

  // Ocean wall, open at the pier.
  const pierL = PIER.x - PIER.halfW - 1.2;
  const pierR = PIER.x + PIER.halfW + 1.2;
  pushBox(boxes, (-120 + pierL) / 2, -146, pierL - -120, 1.3);
  pushBox(boxes, (pierR + 120) / 2, -146, 120 - pierR, 1.3);
  const pierRailLen = Math.abs(PIER.zEnd - PIER.railFrom);
  const pierRailZ = (PIER.railFrom + PIER.zEnd) / 2;
  pushBox(boxes, PIER.x, PIER.zEnd + 1.2, PIER.halfW * 2 + 1.4, 1.2);
  pushBox(boxes, PIER.x - PIER.halfW - 0.35, pierRailZ, 0.5, pierRailLen);
  pushBox(boxes, PIER.x + PIER.halfW + 0.35, pierRailZ, 0.5, pierRailLen);

  // City edge rails (beach side stays open down to the sand).
  pushBox(boxes, 0, 108, 224, 1.1);
  pushBox(boxes, -112, 2, 1.1, 214);
  pushBox(boxes, 112, 2, 1.1, 214);

  return boxes;
}

export function createWorld(seed = 11) {
  const rand = mulberry32(seed);
  const buildings = [];
  const landmarks = [];

  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 4; i += 1) {
      const b = blockBounds(i, j);
      if (i === 2 && j === 2) {
        const margin = 2.6;
        buildings.push({
          kind: 'hotel',
          name: 'The Pink Marlin',
          x: (b.x0 + b.x1) / 2,
          z: (b.z0 + b.z1) / 2,
          w: b.x1 - b.x0 - margin * 2,
          d: b.z1 - b.z0 - margin * 2,
          h: 26,
          color: '#f7b7c6',
          roof: '#fff0e4',
        });
        continue;
      }
      if (i === 1 && j === 0) {
        landmarks.push({
          kind: 'fountain',
          name: 'Shell Plaza',
          x: (b.x0 + b.x1) / 2,
          z: (b.z0 + b.z1) / 2,
        });
        continue;
      }
      if (i === 0 && j === 3) {
        landmarks.push({
          kind: 'park',
          name: 'Mango Park',
          x: (b.x0 + b.x1) / 2,
          z: (b.z0 + b.z1) / 2,
        });
        continue;
      }
      const W = b.x1 - b.x0;
      const D = b.z1 - b.z0;
      const w = Math.min(18, Math.max(8, W - 10));
      const d = Math.min(16, Math.max(7, D - 10));
      if (w < 7 || d < 7 || W < 12 || D < 12) continue;
      const shrink = 0.78 + rand() * 0.22;
      buildings.push({
        kind: 'block',
        x: (b.x0 + b.x1) / 2,
        z: (b.z0 + b.z1) / 2,
        w: w * shrink,
        d: d * shrink,
        h: 5 + rand() * (D < 26 ? 8 : 14),
        color: WALLS[Math.floor(rand() * WALLS.length)],
        roof: ROOFS[Math.floor(rand() * ROOFS.length)],
        style: Math.floor(rand() * 4),
        windows: rand() > 0.4 ? 'cool' : 'warm',
      });
    }
  }

  landmarks.push(
    { kind: 'lighthouse', name: 'Mango Light', x: 86, z: -128 },
    { kind: 'stand', name: 'Scoop Jetty', x: -58, z: -58 },
    { kind: 'arch', name: 'Coral Vista', x: 70, z: -96 },
    { kind: 'umbrella', x: -18, z: -128, tint: '#ff8d7a' },
    { kind: 'umbrella', x: 36, z: -132, tint: '#ffd166' },
    { kind: 'umbrella', x: 8, z: -122, tint: '#7ee0c8' },
    { kind: 'umbrella', x: -48, z: -130, tint: '#d7b4f3' },
  );

  const palms = [];
  const occupied = (x, z, pad) => {
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true;
    }
    return false;
  };
  const randPalm = mulberry32(99);
  const addPalmDet = (x, z) => {
    const scale = 0.82 + randPalm() * 0.45;
    if (x < -108 || x > 108 || z < -142 || z > 104) return;
    if (Math.abs(x - PIER.x) < PIER.halfW + 2.2 && z < -96) return;
    if (Math.abs(x - 86) < 5 && Math.abs(z + 128) < 5) return;
    if (occupied(x, z, 2.4)) return;
    // Keep the driving lanes clear.
    for (const rx of ROAD_XS) {
      if (Math.abs(x - rx) < ROAD_W / 2 + 2.2 && z > -104 && z < 108) return;
    }
    for (const rz of ROAD_ZS) {
      if (Math.abs(z - rz) < ROAD_W / 2 + 2.2 && x > -112 && x < 112) return;
    }
    if (Math.abs(z) < 22 && x > CANAL.x0 - 2 && x < CANAL.x1 + 2) return;
    palms.push({ x, z, scale, rot: randPalm() * Math.PI * 2 });
  };

  for (let x = -100; x <= 100; x += 14) {
    addPalmDet(x, -116 - ((x / 14) % 2) * 8);
    addPalmDet(x + 7, -130);
  }
  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 4; i += 1) {
      const b = blockBounds(i, j);
      addPalmDet(b.x0 + 2.2, b.z0 + 2.2);
      addPalmDet(b.x1 - 2.2, b.z1 - 2.2);
      if (i === 0 && j === 3) {
        addPalmDet((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
        addPalmDet(b.x0 + 6, b.z1 - 6);
        addPalmDet(b.x1 - 6, b.z0 + 6);
      }
    }
  }

  const colliders = staticColliders();
  for (const b of buildings) colliders.push(box(b.x, b.z, b.w, b.d));
  for (const mark of landmarks) {
    if (mark.kind === 'lighthouse') colliders.push(box(mark.x, mark.z, 4.2, 4.2));
    if (mark.kind === 'fountain') colliders.push(box(mark.x, mark.z, 3.4, 3.4));
    if (mark.kind === 'stand') colliders.push(box(mark.x, mark.z, 2.6, 2.4));
    if (mark.kind === 'arch') {
      colliders.push(box(mark.x, mark.z - 10.6, 1.3, 1.3));
      colliders.push(box(mark.x, mark.z + 10.6, 1.3, 1.3));
    }
  }

  return { buildings, landmarks, palms, colliders };
}

export function circleHitsAABB(x, z, r, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

export function segmentClear(x0, z0, x1, z1, radius, boxes, step = 1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len / step));
  const hits = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    for (const b of boxes) {
      if (circleHitsAABB(x, z, radius, b)) {
        hits.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
        break;
      }
    }
  }
  return hits;
}

export function onPier(x, z) {
  return Math.abs(x - PIER.x) <= PIER.halfW - 0.2 && z <= PIER.zStart + 2 && z >= PIER.zEnd + 2;
}

export function onSand(x, z) {
  return z < -104 && z > -148 && !onPier(x, z);
}
