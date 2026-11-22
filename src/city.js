import * as THREE from 'three';
import { box, cone, cylinder, mergeSolid, makeLabel } from './geom.js';
import {
  BRIDGES,
  CANAL,
  PIER,
  ROAD_W,
  ROAD_XS,
  ROAD_ZS,
  staticColliders,
} from './layout.js';

const ROAD = '#556170';
const BEACH_ROAD = '#5e6c78';
const BRIDGE = '#6b7682';
const SAND = '#f6d7a4';
const GROUND = '#f3e6cf';

function roadPiece(x, z, w, d, color, y = 0.06) {
  return box(w, 0.12, d, x, y, z, color);
}

function mountRoads(geos, marks) {
  const half = ROAD_W / 2;
  const addX = (x0, x1, z, color) => {
    if (x1 - x0 < 0.4) return;
    geos.push(roadPiece((x0 + x1) / 2, z, x1 - x0, ROAD_W, color));
    dashLine(marks, x0, x1, z, true);
  };
  const addZ = (z0, z1, x, color) => {
    if (z1 - z0 < 0.4) return;
    geos.push(roadPiece(x, (z0 + z1) / 2, ROAD_W, z1 - z0, color));
    dashLine(marks, z0, z1, x, false);
  };

  for (const z of ROAD_ZS) {
    const color = z === -96 ? BEACH_ROAD : ROAD;
    for (let i = 0; i < ROAD_XS.length - 1; i += 1) {
      let a = ROAD_XS[i] + half;
      let b = ROAD_XS[i + 1] - half;
      if (z === 0) {
        if (b > CANAL.x0 && a < CANAL.x1) {
          if (a < CANAL.x0) addX(a, Math.min(b, CANAL.x0), z, color);
          if (b > CANAL.x1) addX(Math.max(a, CANAL.x1), b, z, color);
          continue;
        }
      }
      addX(a, b, z, color);
    }
  }

  for (const x of ROAD_XS) {
    const crosses = x > CANAL.x0 && x < CANAL.x1;
    for (let j = 0; j < ROAD_ZS.length - 1; j += 1) {
      let a = ROAD_ZS[j] + half;
      let b = ROAD_ZS[j + 1] - half;
      if (crosses && a < 20 && b > -20) {
        if (a < -20) addZ(a, -20, x, ROAD);
        if (b > 20) addZ(20, b, x, ROAD);
        continue;
      }
      addZ(a, b, x, ROAD);
    }
  }

  for (const x of ROAD_XS) {
    for (const z of ROAD_ZS) {
      if (z === 0 && x > CANAL.x0 && x < CANAL.x1) continue;
      geos.push(roadPiece(x, z, ROAD_W, ROAD_W, z === -96 ? BEACH_ROAD : ROAD));
    }
  }

  for (const x of BRIDGES) {
    geos.push(roadPiece(x, 0, ROAD_W - 0.2, 40.8, BRIDGE, 0.09));
    dashLine(marks, -18, 18, x, false);
  }
}

function dashLine(marks, from, to, fixed, alongX) {
  const step = 7.5;
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  for (let t = start + 2; t < end - 1; t += step) {
    if (alongX) marks.push(box(2.1, 0.04, 0.26, t, 0.14, fixed, '#f6e7b0'));
    else marks.push(box(0.26, 0.04, 2.1, fixed, 0.14, t, '#f6e7b0'));
  }
}

function addBuilding(geos, b) {
  if (b.kind === 'hotel') {
    const baseH = 9;
    const midH = 8;
    const topH = 8;
    geos.push(box(b.w, baseH, b.d, b.x, baseH / 2, b.z, '#f4b8c8'));
    geos.push(box(b.w * 0.7, midH, b.d * 0.7, b.x, baseH + midH / 2, b.z, '#fff0e4'));
    geos.push(box(b.w * 0.42, topH, b.d * 0.42, b.x, baseH + midH + topH / 2, b.z, '#f7c6d4'));
    geos.push(box(0.4, topH + 3, b.d * 0.42, b.x, baseH + midH + topH, b.z, '#fff6ea'));
    stripe(geos, b.x, b.z, b.w, b.d, baseH, '#9fd8ee');
    return;
  }
  geos.push(box(b.w, b.h, b.d, b.x, b.h / 2, b.z, b.color));
  geos.push(box(b.w * 0.96, 0.28, b.d * 0.96, b.x, b.h + 0.1, b.z, b.roof));
  if (b.h > 10) {
    const uh = b.h * 0.38;
    geos.push(box(b.w * 0.62, uh, b.d * 0.62, b.x, b.h + uh / 2, b.z, b.roof));
  }
  if (b.style === 1) {
    geos.push(box(0.28, b.h * 0.45, b.d * 0.7, b.x + b.w * 0.28, b.h + b.h * 0.18, b.z, b.roof));
  }
  const glass = b.windows === 'warm' ? '#ffe3b0' : '#c7ebf8';
  stripe(geos, b.x, b.z, b.w, b.d, b.h, glass);
}

function stripe(geos, x, z, w, d, h, color) {
  const rows = h > 12 ? 3 : 2;
  for (let i = 0; i < rows; i += 1) {
    const y = 1.4 + i * Math.min(2.4, (h - 2) / rows);
    if (y > h - 0.5) continue;
    geos.push(box(w * 0.7, 0.26, 0.08, x, y, z + d / 2 + 0.03, color));
    geos.push(box(w * 0.7, 0.26, 0.08, x, y, z - d / 2 - 0.03, color));
    geos.push(box(0.08, 0.26, d * 0.62, x + w / 2 + 0.03, y, z, color));
    geos.push(box(0.08, 0.26, d * 0.62, x - w / 2 - 0.03, y, z, color));
  }
}

function addLandmark(scene, geos, mark) {
  if (mark.kind === 'umbrella') {
    geos.push(cylinder(0.06, 0.07, 1.7, 5, mark.x, 0.85, mark.z, '#fffaf3'));
    geos.push(cone(1.15, 0.55, 8, mark.x, 1.85, mark.z, mark.tint));
    return;
  }
  if (mark.kind === 'fountain') {
    geos.push(cylinder(1.5, 1.7, 0.45, 10, mark.x, 0.28, mark.z, '#f7f1e8'));
    geos.push(cylinder(1.05, 1.05, 0.28, 10, mark.x, 0.5, mark.z, '#8fd8ea'));
    geos.push(cylinder(0.18, 0.22, 1.1, 6, mark.x, 0.9, mark.z, '#d9efe8'));
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 3.4, mark.z);
    scene.add(label);
    return;
  }
  if (mark.kind === 'park') {
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 3.2, mark.z);
    scene.add(label);
    return;
  }
  if (mark.kind === 'lighthouse') {
    const group = new THREE.Group();
    group.position.set(mark.x, 0, mark.z);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.55, 12, 8),
      new THREE.MeshLambertMaterial({ color: '#fff7ee' }),
    );
    tower.position.y = 6;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.7, 8),
      new THREE.MeshLambertMaterial({ color: '#ff8d7a' }),
    );
    band.position.y = 8.2;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 1.8, 8),
      new THREE.MeshLambertMaterial({ color: '#f08a7b' }),
    );
    cap.position.y = 12.6;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#fff3c4' }),
    );
    lamp.position.y = 11.3;
    group.add(tower, band, cap, lamp);
    const label = makeLabel(mark.name);
    label.position.y = 15;
    group.add(label);
    scene.add(group);
    return;
  }
  if (mark.kind === 'stand') {
    geos.push(box(2.2, 1.1, 1.5, mark.x, 0.55, mark.z, '#fff6ea'));
    geos.push(box(2.5, 0.12, 1.8, mark.x, 1.2, mark.z, '#ff8d7a'));
    geos.push(box(2.4, 0.35, 1.6, mark.x, 1.45, mark.z, '#ffe08a'));
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 3.3, mark.z);
    scene.add(label);
    return;
  }
  if (mark.kind === 'arch') {
    geos.push(box(1.1, 4.6, 1.1, mark.x, 2.3, mark.z - 10.6, '#fff3e4'));
    geos.push(box(1.1, 4.6, 1.1, mark.x, 2.3, mark.z + 10.6, '#fff3e4'));
    geos.push(box(1.3, 0.45, 23.2, mark.x, 4.7, mark.z, '#ff8d7a'));
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 6.4, mark.z);
    scene.add(label);
  }
}

function addPier(scene, geos) {
  const length = Math.abs(PIER.zEnd - PIER.zStart);
  const z = (PIER.zStart + PIER.zEnd) / 2;
  geos.push(box(PIER.halfW * 2, 0.14, length, PIER.x, 0.08, z, '#efd0a0'));
  const posts = 7;
  for (let i = 0; i < posts; i += 1) {
    const pz = PIER.zStart - 4 - i * (length / posts);
    geos.push(box(0.28, 1.5, 0.28, PIER.x - PIER.halfW + 0.2, -0.5, pz, '#c9a074'));
    geos.push(box(0.28, 1.5, 0.28, PIER.x + PIER.halfW - 0.2, -0.5, pz, '#c9a074'));
  }
  const label = makeLabel('Pelican Pier');
  label.position.set(PIER.x - 14, 4.2, -108);
  scene.add(label);
}

function addRails(geos) {
  for (const b of staticColliders()) {
    const w = b.maxX - b.minX;
    const d = b.maxZ - b.minZ;
    const x = (b.minX + b.maxX) / 2;
    const z = (b.minZ + b.maxZ) / 2;
    const h = z < -140 ? 0.55 : 0.72;
    const color = z < -140 ? '#d7f3ee' : '#f7f2e8';
    geos.push(box(w, h, d, x, h / 2, z, color));
  }
}

function addPalms(scene, palms) {
  if (!palms.length) return;
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 4.1, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: '#c48a4a' });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const frondGeo = new THREE.ConeGeometry(0.34, 1.85, 4);
  frondGeo.translate(0, 0.92, 0);
  frondGeo.rotateX(-Math.PI / 2);
  const frondMat = new THREE.MeshLambertMaterial({ color: '#2f9d62' });
  const frondCount = 6;
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palms.length * frondCount);
  const dummy = new THREE.Object3D();
  palms.forEach((palm, index) => {
    dummy.position.set(palm.x, 2.05 * palm.scale, palm.z);
    dummy.rotation.set(0, palm.rot, 0);
    dummy.scale.setScalar(palm.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    for (let k = 0; k < frondCount; k += 1) {
      const yaw = palm.rot + (k / frondCount) * Math.PI * 2;
      const crown = 3.9 * palm.scale;
      dummy.position.set(palm.x, crown, palm.z);
      dummy.scale.setScalar(palm.scale);
      dummy.lookAt(
        palm.x + Math.sin(yaw) * 3,
        crown + 0.55,
        palm.z + Math.cos(yaw) * 3,
      );
      dummy.updateMatrix();
      fronds.setMatrixAt(index * frondCount + k, dummy.matrix);
    }
  });
  trunks.instanceMatrix.needsUpdate = true;
  fronds.instanceMatrix.needsUpdate = true;
  trunks.frustumCulled = false;
  fronds.frustumCulled = false;
  scene.add(trunks, fronds);
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#79c8ee');
  grd.addColorStop(0.42, '#b7e7f8');
  grd.addColorStop(0.7, '#ffe3bf');
  grd.addColorStop(1, '#ffd09a');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function oceanMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#1f86b0') },
      uShallow: { value: new THREE.Color('#7fe3f2') },
    },
    vertexShader: `
      uniform float uTime;
      out float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.045 + uTime * 1.2) * 0.22 + cos(p.z * 0.05 + uTime * 0.85) * 0.16;
        p.y += w;
        vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      in float vWave;
      out vec4 fragColor;
      void main() {
        float f = smoothstep(-0.22, 0.24, vWave);
        fragColor = vec4(mix(uDeep, uShallow, f), 1.0);
      }
    `,
  });
}

export function mountCity(scene, world) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xc5e7f6, 70, 230);

  const hemi = new THREE.HemisphereLight(0xfff4dd, 0x8fbf9a, 0.85);
  const sun = new THREE.DirectionalLight(0xfff7ea, 1.15);
  sun.position.set(40, 70, 24);
  scene.add(hemi, sun);

  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(8, 12, 12),
    new THREE.MeshBasicMaterial({ color: '#ffe08a' }),
  );
  sunBall.position.set(70, 48, -20);
  scene.add(sunBall);

  const groundGeo = new THREE.PlaneGeometry(460, 360);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: GROUND }));
  ground.position.set(0, 0, 0);
  scene.add(ground);

  const sandGeo = new THREE.PlaneGeometry(260, 52);
  sandGeo.rotateX(-Math.PI / 2);
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshLambertMaterial({ color: SAND }));
  sand.position.set(0, 0.015, -124);
  scene.add(sand);

  const waterMat = oceanMaterial();
  const oceanGeo = new THREE.PlaneGeometry(640, 260, 48, 24);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(oceanGeo, waterMat);
  ocean.position.set(0, -1.05, -276);
  scene.add(ocean);

  const canalGeo = new THREE.PlaneGeometry(CANAL.x1 - CANAL.x0, CANAL.z1 - CANAL.z0, 24, 8);
  canalGeo.rotateX(-Math.PI / 2);
  const canal = new THREE.Mesh(canalGeo, waterMat);
  canal.position.set(0, -0.55, 0);
  scene.add(canal);

  const geos = [];
  const marks = [];
  mountRoads(geos, marks);
  addRails(geos);
  addPier(scene, geos);
  for (const building of world.buildings) {
    addBuilding(geos, building);
    if (building.kind === 'hotel') {
      const label = makeLabel(building.name);
      label.position.set(building.x, 28, building.z);
      scene.add(label);
    }
  }
  for (const mark of world.landmarks) addLandmark(scene, geos, mark);

  const solidGeo = mergeSolid(geos);
  if (solidGeo) {
    scene.add(new THREE.Mesh(solidGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  }
  const markGeo = mergeSolid(marks);
  if (markGeo) {
    scene.add(new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: '#f6e7b0' })));
  }

  addPalms(scene, world.palms);

  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#fffdf8' });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(3.2, 7, 6), mat);
    const puffB = new THREE.Mesh(new THREE.SphereGeometry(2.2, 7, 6), mat);
    puffB.position.set(3.2, -0.4, 0.4);
    const puffC = new THREE.Mesh(new THREE.SphereGeometry(1.7, 6, 5), mat);
    puffC.position.set(-2.8, -0.3, 0.2);
    cloud.add(puff, puffB, puffC);
    cloud.position.set(-80 + i * 34, 36 + (i % 3) * 4, -30 - (i % 2) * 25);
    scene.add(cloud);
    clouds.push(cloud);
  }

  return { waterMat, clouds };
}
