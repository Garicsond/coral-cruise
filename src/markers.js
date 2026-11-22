import * as THREE from 'three';
import { makeLabel } from './geom.js';

function ringMaterial(color) {
  return new THREE.MeshBasicMaterial({ color });
}

export function makeMarker(scene, x, z, color, text) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.13, 6, 18), ringMaterial(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.45;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 7, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  beam.position.y = 3.6;
  group.add(ring, beam);
  if (text) {
    const label = makeLabel(text);
    label.position.y = 6.4;
    group.add(label);
    group.userData.label = label;
  }
  group.userData.ring = ring;
  group.userData.base = 1;
  scene.add(group);
  return group;
}

export function makeArch(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffe08a' });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 0.28), mat);
  const right = left.clone();
  left.position.set(0, 1.6, 3.1);
  right.position.set(0, 1.6, -3.1);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 6.6), mat);
  bar.position.y = 3.2;
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.08, 5, 16),
    new THREE.MeshBasicMaterial({ color: '#fff4c2' }),
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.4;
  group.add(left, right, bar, glow);
  group.visible = false;
  scene.add(group);
  return group;
}

export function makeShell(scene, shell) {
  const group = new THREE.Group();
  group.position.set(shell.x, 1.15, shell.z);
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 8, 6),
    new THREE.MeshLambertMaterial({ color: '#ffb7a2' }),
  );
  body.scale.set(1.15, 0.72, 0.95);
  const lip = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 7, 5),
    new THREE.MeshLambertMaterial({ color: '#fff6ee' }),
  );
  lip.position.set(0.12, 0.05, 0);
  group.add(body, lip);
  scene.add(group);
  return { ...shell, group, spin: shell.x * 0.2 };
}

export function bobMarkers(groups, time) {
  for (const group of groups) {
    if (!group.visible) continue;
    const ring = group.userData.ring;
    if (!ring) continue;
    const s = 1 + Math.sin(time * 3 + group.position.x) * 0.08;
    ring.scale.setScalar(s);
    ring.position.y = 0.45 + Math.sin(time * 2.2 + group.position.z) * 0.12;
  }
}

export function bobShells(shells, time) {
  for (const shell of shells) {
    shell.group.position.y = 1.15 + Math.sin(time * 2 + shell.spin) * 0.18;
    shell.group.rotation.y = time * 0.8 + shell.spin;
  }
}
