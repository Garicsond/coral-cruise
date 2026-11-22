import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { box, cone, cylinder, mergeSolid, makeLabel } from './geom.js';
import { createWaterNormal } from './textures.js';
import {
  BRIDGES,
  CANAL,
  PIER,
  ROAD_W,
  ROAD_XS,
  ROAD_ZS,
  blockBounds,
  staticColliders,
} from './layout.js';

const SUN_DIR = new THREE.Vector3(0.42, 0.84, 0.34).normalize();

function roadPiece(x, z, w, d, color, y = 0.06) {
  return box(w, 0.12, d, x, y, z, color, 4);
}

function mountRoads(roads, marks) {
  const half = ROAD_W / 2;
  const addX = (x0, x1, z, color) => {
    if (x1 - x0 < 0.4) return;
    roads.push(roadPiece((x0 + x1) / 2, z, x1 - x0, ROAD_W, color));
    dashLine(marks, x0, x1, z, true);
  };
  const addZ = (z0, z1, x, color) => {
    if (z1 - z0 < 0.4) return;
    roads.push(roadPiece(x, (z0 + z1) / 2, ROAD_W, z1 - z0, color));
    dashLine(marks, z0, z1, x, false);
  };

  for (const z of ROAD_ZS) {
    const color = '#ffffff';
    for (let i = 0; i < ROAD_XS.length - 1; i += 1) {
      const a = ROAD_XS[i] + half;
      const b = ROAD_XS[i + 1] - half;
      if (z === 0 && b > CANAL.x0 && a < CANAL.x1) {
        if (a < CANAL.x0) addX(a, Math.min(b, CANAL.x0), z, color);
        if (b > CANAL.x1) addX(Math.max(a, CANAL.x1), b, z, color);
        continue;
      }
      addX(a, b, z, color);
    }
  }

  for (const x of ROAD_XS) {
    const crosses = x > CANAL.x0 && x < CANAL.x1;
    for (let j = 0; j < ROAD_ZS.length - 1; j += 1) {
      const a = ROAD_ZS[j] + half;
      const b = ROAD_ZS[j + 1] - half;
      if (crosses && a < 20 && b > -20) {
        if (a < -20) addZ(a, -20, x, '#e7eef3');
        if (b > 20) addZ(20, b, x, '#e7eef3');
        continue;
      }
      addZ(a, b, x, '#e7eef3');
    }
  }

  for (const x of ROAD_XS) {
    for (const z of ROAD_ZS) {
      if (z === 0 && x > CANAL.x0 && x < CANAL.x1) continue;
      roads.push(roadPiece(x, z, ROAD_W, ROAD_W, '#ffffff'));
    }
  }

  for (const x of BRIDGES) {
    roads.push(roadPiece(x, 0, ROAD_W - 0.2, 40.8, '#e4ebf0', 0.09));
    dashLine(marks, -18, 18, x, false);
  }
}

function dashLine(marks, from, to, fixed, alongX) {
  const step = 7.5;
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  for (let t = start + 2; t < end - 1; t += step) {
    if (alongX) marks.push(box(2.1, 0.025, 0.22, t, 0.132, fixed, '#ffffff', 1));
    else marks.push(box(0.22, 0.025, 2.1, fixed, 0.132, t, '#ffffff', 1));
  }
}

function addBuilding(facades, trim, building) {
  if (building.kind === 'hotel') {
    const baseH = 9;
    const midH = 8;
    const topH = 8;
    facades.push(box(building.w, baseH, building.d, building.x, baseH / 2, building.z, '#f4b8c8', 3.2));
    facades.push(box(building.w * 0.7, midH, building.d * 0.7, building.x, baseH + midH / 2, building.z, '#fff0e4', 3.2));
    facades.push(box(building.w * 0.42, topH, building.d * 0.42, building.x, baseH + midH + topH / 2, building.z, '#f7c6d4', 3.2));
    trim.push(box(0.45, topH + 2.4, building.d * 0.5, building.x, baseH + midH + topH * 0.7, building.z, '#fff6ea', 2));
    trim.push(box(building.w + 0.2, 0.28, building.d + 0.2, building.x, baseH - 0.2, building.z, '#fff8f2', 2));
    return;
  }
  facades.push(box(building.w, building.h, building.d, building.x, building.h / 2, building.z, building.color, 3.2));
  trim.push(box(building.w * 1.02, 0.28, building.d * 1.02, building.x, building.h + 0.08, building.z, building.roof, 2));
  trim.push(box(building.w + 0.16, 0.18, building.d + 0.16, building.x, Math.max(1.2, building.h - 0.35), building.z, '#fff7ef', 2));
  if (building.h > 10) {
    const upper = building.h * 0.38;
    facades.push(box(building.w * 0.62, upper, building.d * 0.62, building.x, building.h + upper / 2, building.z, building.roof, 3.2));
  }
  if (building.style === 1) {
    trim.push(box(0.28, building.h * 0.4, building.d * 0.72, building.x + building.w * 0.28, building.h + building.h * 0.12, building.z, building.roof, 2));
  }
}

function addSidewalks(walks, curbs) {
  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 4; i += 1) {
      const block = blockBounds(i, j);
      const width = block.x1 - block.x0;
      const depth = block.z1 - block.z0;
      if (width < 8 || depth < 8) continue;
      const walkW = Math.min(2.7, width * 0.28, depth * 0.28);
      const curbW = 0.36;
      const cx = (block.x0 + block.x1) / 2;
      const cz = (block.z0 + block.z1) / 2;
      walks.push(box(width, 0.16, walkW, cx, 0.08, block.z0 + walkW / 2, '#ffffff', 2));
      walks.push(box(width, 0.16, walkW, cx, 0.08, block.z1 - walkW / 2, '#ffffff', 2));
      curbs.push(box(width, 0.24, curbW, cx, 0.12, block.z0 + curbW / 2, '#f2f2f2', 1));
      curbs.push(box(width, 0.24, curbW, cx, 0.12, block.z1 - curbW / 2, '#f2f2f2', 1));
      const side = depth - walkW * 2;
      if (side > 1.2) {
        walks.push(box(walkW, 0.16, side, block.x0 + walkW / 2, 0.08, cz, '#ffffff', 2));
        walks.push(box(walkW, 0.16, side, block.x1 - walkW / 2, 0.08, cz, '#ffffff', 2));
        curbs.push(box(curbW, 0.24, side, block.x0 + curbW / 2, 0.12, cz, '#f2f2f2', 1));
        curbs.push(box(curbW, 0.24, side, block.x1 - curbW / 2, 0.12, cz, '#f2f2f2', 1));
      }
    }
  }
}

function placeFitted(template, x, z, maxW, maxD, yaw = 0, castShadow = false) {
  const model = template.clone(true);
  model.rotation.y = yaw;
  model.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(model);
  const size = raw.getSize(new THREE.Vector3());
  const scale = Math.min(maxW / Math.max(size.x, 0.01), maxD / Math.max(size.z, 0.01)) * 0.94;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  model.position.x -= (fitted.min.x + fitted.max.x) / 2 - x;
  model.position.z -= (fitted.min.z + fitted.max.z) / 2 - z;
  model.position.y -= fitted.min.y;
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = true;
  });
  return model;
}

function placeBuildings(scene, buildings, models, castShadow) {
  buildings.forEach((building, index) => {
    let key = 'apartment';
    if (building.kind === 'hotel') key = 'motel';
    else if (building.w < 12 && building.h > 11) key = 'pencil';
    else if (building.h > 13) key = index % 2 === 0 ? 'tower' : 'apartment';
    else key = index % 2 === 0 ? 'apartment' : 'motel';
    const template = models[key] || models.apartment;
    scene.add(placeFitted(template, building.x, building.z, building.w * 0.98, building.d * 0.98, (index % 4) * 0.15, castShadow));
    if (building.kind === 'hotel') {
      const label = makeLabel(building.name);
      label.position.set(building.x, 16, building.z);
      scene.add(label);
    }
  });
}

function placePalms(scene, template, palms) {
  const chosen = palms.filter((palm, index) => palm.z < -108 || index % 6 === 0).slice(0, 14);
  if (!chosen.length || !template) return;
  const probe = template.clone(true);
  const height = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3()).y || 5;
  for (const palm of chosen) {
    const tree = template.clone(true);
    const scale = (7.4 / height) * (0.82 + (palm.scale || 1) * 0.2);
    tree.scale.setScalar(scale);
    tree.rotation.y = palm.rot || 0;
    tree.position.set(palm.x, 0, palm.z);
    tree.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = true;
    });
    scene.add(tree);
  }
}

function addLandmark(scene, trim, mark) {
  if (mark.kind === 'umbrella') {
    trim.push(cylinder(0.06, 0.07, 1.7, 6, mark.x, 0.85, mark.z, '#fffaf3'));
    trim.push(cone(1.15, 0.55, 8, mark.x, 1.85, mark.z, mark.tint));
    return;
  }
  if (mark.kind === 'fountain') {
    trim.push(cylinder(1.5, 1.7, 0.45, 12, mark.x, 0.28, mark.z, '#f7f1e8'));
    trim.push(cylinder(1.05, 1.05, 0.28, 12, mark.x, 0.5, mark.z, '#9fd8ea'));
    trim.push(cylinder(0.18, 0.22, 1.1, 6, mark.x, 0.9, mark.z, '#d9efe8'));
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
      new THREE.CylinderGeometry(1.15, 1.55, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#fff7ee', roughness: 0.72, metalness: 0.02 }),
    );
    tower.position.y = 6;
    tower.castShadow = true;
    tower.receiveShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.22, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: '#ff8d7a', roughness: 0.55, metalness: 0.04 }),
    );
    band.position.y = 8.2;
    band.castShadow = true;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: '#f08a7b', roughness: 0.5, metalness: 0.05 }),
    );
    cap.position.y = 12.6;
    cap.castShadow = true;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 8),
      new THREE.MeshStandardMaterial({
        color: '#fff3c4',
        emissive: '#fff1b8',
        emissiveIntensity: 2.4,
        roughness: 0.35,
      }),
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
    trim.push(box(2.2, 1.1, 1.5, mark.x, 0.55, mark.z, '#fff6ea', 1.2));
    trim.push(box(2.5, 0.12, 1.8, mark.x, 1.2, mark.z, '#ff8d7a', 1.2));
    trim.push(box(2.4, 0.35, 1.6, mark.x, 1.45, mark.z, '#ffe08a', 1.2));
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 3.3, mark.z);
    scene.add(label);
    return;
  }
  if (mark.kind === 'arch') {
    trim.push(box(1.1, 4.6, 1.1, mark.x, 2.3, mark.z - 10.6, '#fff3e4', 1.5));
    trim.push(box(1.1, 4.6, 1.1, mark.x, 2.3, mark.z + 10.6, '#fff3e4', 1.5));
    trim.push(box(1.3, 0.45, 23.2, mark.x, 4.7, mark.z, '#ff8d7a', 2));
    const label = makeLabel(mark.name);
    label.position.set(mark.x, 6.4, mark.z);
    scene.add(label);
  }
}

function addPier(scene, trim) {
  const length = Math.abs(PIER.zEnd - PIER.zStart);
  const z = (PIER.zStart + PIER.zEnd) / 2;
  trim.push(box(PIER.halfW * 2, 0.14, length, PIER.x, 0.08, z, '#efd0a0', 1.4));
  const posts = 7;
  for (let i = 0; i < posts; i += 1) {
    const pz = PIER.zStart - 4 - i * (length / posts);
    trim.push(box(0.28, 1.5, 0.28, PIER.x - PIER.halfW + 0.2, -0.5, pz, '#c9a074', 1));
    trim.push(box(0.28, 1.5, 0.28, PIER.x + PIER.halfW - 0.2, -0.5, pz, '#c9a074', 1));
  }
  const label = makeLabel('Pelican Pier');
  label.position.set(PIER.x - 14, 4.2, -108);
  scene.add(label);
}

function addRails(trim) {
  for (const collider of staticColliders()) {
    const w = collider.maxX - collider.minX;
    const d = collider.maxZ - collider.minZ;
    const x = (collider.minX + collider.maxX) / 2;
    const z = (collider.minZ + collider.maxZ) / 2;
    const h = z < -140 ? 0.55 : 0.72;
    const color = z < -140 ? '#d7f3ee' : '#f7f2e8';
    trim.push(box(w, h, d, x, h / 2, z, color, 1.5));
  }
}

function addPalms(scene, palms, frondMap) {
  if (!palms.length) return;
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.28, 4.4, 6);
  trunkGeo.translate(0.12, 2.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#b88345', roughness: 0.86, metalness: 0 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const frondGeo = new THREE.PlaneGeometry(0.85, 2.15);
  frondGeo.translate(0, 1.05, 0);
  const frondMat = new THREE.MeshStandardMaterial({
    map: frondMap,
    alphaTest: 0.35,
    roughness: 0.62,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const directions = 5;
  const frondCount = directions * 2;
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palms.length * frondCount);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const aim = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  palms.forEach((palm, index) => {
    dummy.position.set(palm.x, 0, palm.z);
    dummy.rotation.set(0, palm.rot, 0);
    dummy.scale.setScalar(palm.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    for (let k = 0; k < directions; k += 1) {
      const yaw = palm.rot + (k / directions) * Math.PI * 2;
      const crown = 4.05 * palm.scale;
      const dir = new THREE.Vector3(Math.sin(yaw), 0.42, Math.cos(yaw)).normalize();
      aim.setFromUnitVectors(up, dir);
      for (let side = 0; side < 2; side += 1) {
        twist.setFromAxisAngle(up, side * Math.PI / 2);
        dummy.quaternion.copy(aim).multiply(twist);
        dummy.position.set(palm.x, crown, palm.z);
        dummy.scale.setScalar(palm.scale * (side === 0 ? 1 : 0.86));
        dummy.updateMatrix();
        fronds.setMatrixAt(index * frondCount + k * 2 + side, dummy.matrix);
      }
    }
  });
  trunks.instanceMatrix.needsUpdate = true;
  fronds.instanceMatrix.needsUpdate = true;
  trunks.frustumCulled = false;
  fronds.frustumCulled = false;
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  scene.add(trunks, fronds);
}

function fallbackSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#79c8ee');
  gradient.addColorStop(0.45, '#d5eef8');
  gradient.addColorStop(0.72, '#ffe3bf');
  gradient.addColorStop(1, '#f0c99a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function makeWaterMaterial(normalMap) {
  const material = new THREE.MeshStandardMaterial({
    color: '#2f9ec4',
    roughness: 0.07,
    metalness: 0.22,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    envMapIntensity: 1.55,
  });
  normalMap.repeat.set(16, 10);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.y += sin(position.x * 0.05 + uTime * 1.15) * 0.2 + cos(position.z * 0.045 + uTime * 0.82) * 0.14;`,
    );
    material.userData.shader = shader;
  };
  return material;
}

function addMerged(scene, geometries, material, { cast = false, receive = true } = {}) {
  const geometry = mergeSolid(geometries);
  if (!geometry) return null;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  return mesh;
}

export function mountCity(scene, world, { preset, maps, models, envMap }) {
  const waterNormal = createWaterNormal();
  if (envMap) scene.environment = envMap;

  if (preset.sky) {
    const sky = new Sky();
    sky.scale.setScalar(400);
    sky.frustumCulled = false;
    sky.material.uniforms.turbidity.value = 3.4;
    sky.material.uniforms.rayleigh.value = 1.35;
    sky.material.uniforms.mieCoefficient.value = 0.0045;
    sky.material.uniforms.mieDirectionalG.value = 0.72;
    sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
    scene.add(sky);
  } else {
    scene.background = fallbackSky();
  }

  scene.fog = new THREE.Fog(0xd5e6f2, 70, 250);

  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x6d845c, 0.22);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(preset.shadowSize, preset.shadowSize);
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.02;
  const extent = preset.shadowExtent;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  scene.add(hemi, sun, sun.target);

  const sandMat = new THREE.MeshStandardMaterial({
    map: maps.sand.map,
    normalMap: maps.sand.normalMap,
    roughnessMap: maps.sand.roughnessMap,
    roughness: 1,
    metalness: 0,
  });
  maps.sand.map.repeat.set(14, 10);
  maps.sand.normalMap.repeat.copy(maps.sand.map.repeat);
  maps.sand.roughnessMap.repeat.copy(maps.sand.map.repeat);

  const groundGeo = new THREE.PlaneGeometry(460, 360);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, sandMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const sandGeo = new THREE.PlaneGeometry(260, 52);
  sandGeo.rotateX(-Math.PI / 2);
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.position.set(0, 0.02, -124);
  sand.receiveShadow = true;
  scene.add(sand);

  const waterMat = makeWaterMaterial(waterNormal);
  const oceanGeo = new THREE.PlaneGeometry(640, 260, preset.waterSegX, preset.waterSegY);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(oceanGeo, waterMat);
  ocean.position.set(0, -1.05, -276);
  scene.add(ocean);

  const canalGeo = new THREE.PlaneGeometry(CANAL.x1 - CANAL.x0, CANAL.z1 - CANAL.z0, 20, 6);
  canalGeo.rotateX(-Math.PI / 2);
  const canal = new THREE.Mesh(canalGeo, waterMat);
  canal.position.set(0, -0.55, 0);
  scene.add(canal);

  const roads = [];
  const marks = [];
  const trim = [];
  const walks = [];
  const curbs = [];
  mountRoads(roads, marks);
  addSidewalks(walks, curbs);
  addRails(trim);
  addPier(scene, trim);
  for (const mark of world.landmarks) addLandmark(scene, trim, mark);
  const castBuildings = Boolean(preset.shadowSoft);
  placeBuildings(scene, world.buildings, models, castBuildings);
  placePalms(scene, models.palm, world.palms);

  const concrete = new THREE.MeshStandardMaterial({
    map: maps.concrete.map,
    normalMap: maps.concrete.normalMap,
    roughnessMap: maps.concrete.roughnessMap,
    roughness: 1,
    metalness: 0.02,
  });
  const curbMat = concrete.clone();
  curbMat.color.set('#d5d0c8');

  addMerged(scene, roads, new THREE.MeshStandardMaterial({
    map: maps.asphalt.map,
    normalMap: maps.asphalt.normalMap,
    roughnessMap: maps.asphalt.roughnessMap,
    vertexColors: true,
    roughness: 1,
    metalness: 0.04,
    normalScale: new THREE.Vector2(0.7, 0.7),
  }), { receive: true });
  addMerged(scene, walks, concrete, { receive: true });
  addMerged(scene, curbs, curbMat, { cast: true, receive: true });
  addMerged(scene, trim, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.04,
    envMapIntensity: 0.4,
  }), { cast: true, receive: true });
  addMerged(scene, marks, new THREE.MeshStandardMaterial({
    color: '#f7f7f4',
    roughness: 0.45,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), { receive: true });

  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 7),
    new THREE.MeshBasicMaterial({ color: '#f7fbff', transparent: true, opacity: 0.42, depthWrite: false }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, -0.82, -148);
  scene.add(foam);

  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fffdf8', roughness: 0.95, metalness: 0 });
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Group();
    const puff = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), cloudMat);
    const puffB = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), cloudMat);
    puffB.position.set(3.2, -0.4, 0.4);
    const puffC = new THREE.Mesh(new THREE.SphereGeometry(1.7, 7, 5), cloudMat);
    puffC.position.set(-2.8, -0.3, 0.2);
    cloud.add(puff, puffB, puffC);
    cloud.position.set(-80 + i * 34, 42 + (i % 3) * 4, -30 - (i % 2) * 25);
    scene.add(cloud);
    clouds.push(cloud);
  }

  return {
    clouds,
    sun,
    sunDir: SUN_DIR,
    waterMat,
    tick(time) {
      const shader = waterMat.userData.shader;
      if (shader) shader.uniforms.uTime.value = time;
      waterNormal.offset.set((time * 0.018) % 1, (time * 0.011) % 1);
    },
    updateSun(focus) {
      const distance = 40;
      sun.position.set(
        focus.x + SUN_DIR.x * distance,
        SUN_DIR.y * distance,
        focus.z + SUN_DIR.z * distance,
      );
      sun.target.position.set(focus.x, 0, focus.z);
      sun.target.updateMatrixWorld();
    },
  };
}
