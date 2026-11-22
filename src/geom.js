import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function paint(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.getAttribute('position').count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geometry;
}

function scaleBoxUVs(geometry, w, h, d, tile) {
  const uv = geometry.getAttribute('uv');
  const faces = [
    [d / tile, h / tile],
    [d / tile, h / tile],
    [w / tile, d / tile],
    [w / tile, d / tile],
    [w / tile, h / tile],
    [w / tile, h / tile],
  ];
  for (let face = 0; face < 6; face += 1) {
    const [su, sv] = faces[face];
    for (let i = 0; i < 4; i += 1) {
      const index = face * 4 + i;
      uv.setXY(index, uv.getX(index) * su, uv.getY(index) * sv);
    }
  }
  uv.needsUpdate = true;
}

export function box(w, h, d, x, y, z, color, tile = 2) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  scaleBoxUVs(geometry, w, h, d, tile);
  geometry.translate(x, y, z);
  return paint(geometry, color);
}

export function cylinder(radiusTop, radiusBottom, height, segments, x, y, z, color) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  geometry.translate(x, y, z);
  return paint(geometry, color);
}

export function cone(radius, height, segments, x, y, z, color) {
  const geometry = new THREE.ConeGeometry(radius, height, segments);
  geometry.translate(x, y, z);
  return paint(geometry, color);
}

export function mergeSolid(geometries) {
  const list = geometries.filter(Boolean);
  if (!list.length) return null;
  const merged = mergeGeometries(list, false);
  for (const geometry of list) geometry.dispose();
  return merged;
}

export function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse((node) => {
    if (node.geometry && !geometries.has(node.geometry)) {
      geometries.add(node.geometry);
      node.geometry.dispose();
    }
    const mats = node.material
      ? (Array.isArray(node.material) ? node.material : [node.material])
      : [];
    for (const material of mats) {
      if (materials.has(material)) continue;
      materials.add(material);
      if (material.map) material.map.dispose();
      material.dispose();
    }
  });
}

export function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const draw = (value) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 250, 244, 0.94)';
    roundRect(ctx, 8, 20, 496, 88, 28);
    ctx.fill();
    ctx.fillStyle = '#1b3944';
    ctx.font = '700 40px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, 256, 64);
    texture.needsUpdate = true;
  };
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(6.4, 1.6, 1);
  sprite.position.y = 5.2;
  draw(text);
  sprite.userData.setText = draw;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
