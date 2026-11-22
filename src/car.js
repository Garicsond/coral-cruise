import * as THREE from 'three';
import { disposeTree } from './geom.js';
import { onSand } from './layout.js';

const WHEEL_R = 0.34;

function wheelMesh() {
  const geo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.24, 8);
  geo.rotateZ(Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ color: '#2c3138' });
  const mesh = new THREE.Mesh(geo, mat);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 6);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, new THREE.MeshLambertMaterial({ color: '#efe6d4' }));
  mesh.add(hub);
  return mesh;
}

function light(x, y, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.16, 0.28),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function shadowBlob() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(40, 50, 60, 0.38)');
  grd.addColorStop(1, 'rgba(40, 50, 60, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.14;
  return mesh;
}

function buildBreeze(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.48, 1.7), bodyMat);
  body.position.set(0, 0.62, 0);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.74), bodyMat);
  skirt.position.set(0, 0.42, 0);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.5), bodyMat);
  nose.position.set(1.85, 0.52, 0);
  const wind = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.42, 1.35),
    new THREE.MeshLambertMaterial({ color: '#d7f4ff' }),
  );
  wind.position.set(0.72, 0.98, 0);
  wind.rotation.z = -0.45;
  const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.48), new THREE.MeshLambertMaterial({ color: '#fffaf3' }));
  const seatR = seatL.clone();
  seatL.position.set(-0.15, 0.9, 0.32);
  seatR.position.set(-0.15, 0.9, -0.32);
  group.add(body, skirt, nose, wind, seatL, seatR, shadowBlob());
  group.add(light(1.78, 0.66, 0.55, '#fff6cf'), light(1.78, 0.66, -0.55, '#fff6cf'));
  group.add(light(-1.72, 0.66, 0.55, '#ff8d7a'), light(-1.72, 0.66, -0.55, '#ff8d7a'));
  return { group, bodyMat, roofY: 1.15 };
}

function buildSundart(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const shape = new THREE.Shape();
  shape.moveTo(-2.05, 0.32);
  shape.lineTo(2.15, 0.34);
  shape.lineTo(1.15, 0.78);
  shape.lineTo(-0.35, 1.12);
  shape.lineTo(-2.05, 0.95);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.72, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -0.86);
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, bodyMat);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.32, 1.35),
    new THREE.MeshLambertMaterial({ color: '#c9eefc' }),
  );
  glass.position.set(-0.15, 0.98, 0);
  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 0.08), bodyMat);
  const finR = finL.clone();
  finL.position.set(-1.7, 1.05, 0.7);
  finR.position.set(-1.7, 1.05, -0.7);
  group.add(body, glass, finL, finR, shadowBlob());
  group.add(light(2.05, 0.5, 0.55, '#fff6cf'), light(2.05, 0.5, -0.55, '#fff6cf'));
  group.add(light(-1.95, 0.55, 0.62, '#ff6d7a'), light(-1.95, 0.55, -0.62, '#ff6d7a'));
  return { group, bodyMat, roofY: 1.25 };
}

function buildPalmetto(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.7, 1.82), bodyMat);
  body.position.set(0, 0.7, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.7), bodyMat);
  cabin.position.set(-0.25, 1.28, 0);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.42, 1.5),
    new THREE.MeshLambertMaterial({ color: '#d7f4ff' }),
  );
  glass.position.set(0.15, 1.32, 0);
  const rackL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.08), new THREE.MeshLambertMaterial({ color: '#6d6048' }));
  const rackR = rackL.clone();
  rackL.position.set(-0.2, 1.68, 0.45);
  rackR.position.set(-0.2, 1.68, -0.45);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.38), new THREE.MeshLambertMaterial({ color: '#3ec6c0' }));
  board.position.set(-0.15, 1.78, 0);
  board.rotation.y = 0.08;
  group.add(body, cabin, glass, rackL, rackR, board, shadowBlob());
  group.add(light(1.95, 0.72, 0.58, '#fff6cf'), light(1.95, 0.72, -0.58, '#fff6cf'));
  group.add(light(-1.92, 0.72, 0.58, '#ff8d7a'), light(-1.92, 0.72, -0.58, '#ff8d7a'));
  return { group, bodyMat, roofY: 1.95 };
}

const BUILDERS = {
  breeze: buildBreeze,
  sundart: buildSundart,
  palmetto: buildPalmetto,
};

export function createVehicle(spec, hex) {
  const built = (BUILDERS[spec.id] || buildBreeze)(hex);
  const wheels = [];
  const front = [];
  const spots = [
    { x: 1.15, z: 0.78, steer: true },
    { x: 1.15, z: -0.78, steer: true },
    { x: -1.15, z: 0.78, steer: false },
    { x: -1.15, z: -0.78, steer: false },
  ];
  for (const spot of spots) {
    const pivot = new THREE.Group();
    pivot.position.set(spot.x, 0.12 + WHEEL_R, spot.z);
    const mesh = wheelMesh();
    pivot.add(mesh);
    built.group.add(pivot);
    wheels.push(mesh);
    if (spot.steer) front.push(pivot);
  }
  return {
    spec,
    group: built.group,
    bodyMat: built.bodyMat,
    roofY: built.roofY,
    wheels,
    front,
    x: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    spin: 0,
    cargo: null,
  };
}

export function setCargo(vehicle, on) {
  if (vehicle.cargo) {
    vehicle.group.remove(vehicle.cargo);
    vehicle.cargo.geometry.dispose();
    vehicle.cargo.material.dispose();
    vehicle.cargo = null;
  }
  if (!on) return;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.4, 0.48),
    new THREE.MeshLambertMaterial({ color: '#7ee0c8' }),
  );
  mesh.position.set(-0.35, vehicle.roofY + 0.22, 0);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.1, 0.5),
    new THREE.MeshLambertMaterial({ color: '#ff8d7a' }),
  );
  stripe.position.y = 0.08;
  mesh.add(stripe);
  vehicle.group.add(mesh);
  vehicle.cargo = mesh;
}

export function disposeVehicle(vehicle) {
  disposeTree(vehicle.group);
}

export function resolveCircle(x, z, radius, boxes) {
  let hit = false;
  let nx = 0;
  let nz = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      let dx = x - cx;
      let dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      hit = true;
      if (d2 < 1e-8) {
        const left = x - b.minX;
        const right = b.maxX - x;
        const south = z - b.minZ;
        const north = b.maxZ - z;
        const m = Math.min(left, right, south, north);
        if (m === left) { x = b.minX - radius; nx = -1; nz = 0; }
        else if (m === right) { x = b.maxX + radius; nx = 1; nz = 0; }
        else if (m === south) { z = b.minZ - radius; nx = 0; nz = -1; }
        else { z = b.maxZ + radius; nx = 0; nz = 1; }
      } else {
        const d = Math.sqrt(d2);
        const push = radius - d;
        dx /= d;
        dz /= d;
        x += dx * push;
        z += dz * push;
        nx = dx;
        nz = dz;
      }
    }
  }
  return { x, z, hit, nx, nz };
}

export function updateVehicle(vehicle, dt, input, boxes, options = {}) {
  const spec = vehicle.spec;
  const braking = input.braking;
  const throttle = input.throttle;
  vehicle.brakeHold = braking ? (vehicle.brakeHold || 0) + dt : 0;
  const allowReverse = options.allowReverse !== false;
  const wantReverse = throttle < 0 || (allowReverse && braking && vehicle.brakeHold > 0.7 && vehicle.speed < 1);

  if (throttle > 0 && !braking) {
    vehicle.speed = Math.min(spec.max, vehicle.speed + spec.accel * dt);
  } else if (wantReverse) {
    if (vehicle.speed > 0.35) vehicle.speed = Math.max(0, vehicle.speed - spec.brake * dt);
    else vehicle.speed = Math.max(-spec.reverse, vehicle.speed - spec.accel * 0.65 * dt);
  } else {
    const rate = braking ? spec.brake : spec.coast;
    if (Math.abs(vehicle.speed) <= rate * dt) vehicle.speed = 0;
    else vehicle.speed -= Math.sign(vehicle.speed) * rate * dt;
  }

  if (onSand(vehicle.x, vehicle.z) && vehicle.speed > spec.max * 0.48) {
    vehicle.speed -= spec.coast * dt;
  }

  const speedFactor = Math.min(1, Math.abs(vehicle.speed) / 4);
  const turn = input.steer * spec.turn * (0.42 + 0.58 * speedFactor);
  const reverseSteer = vehicle.speed < -0.25 ? -1 : 1;
  vehicle.yaw += turn * reverseSteer * dt;

  let x = vehicle.x + Math.cos(vehicle.yaw) * vehicle.speed * dt;
  let z = vehicle.z + Math.sin(vehicle.yaw) * vehicle.speed * dt;
  const resolved = resolveCircle(x, z, spec.radius, boxes);
  if (resolved.hit) {
    const vx = Math.cos(vehicle.yaw) * vehicle.speed;
    const vz = Math.sin(vehicle.yaw) * vehicle.speed;
    const into = vx * resolved.nx + vz * resolved.nz;
    if (into < 0) {
      const rx = vx - into * resolved.nx;
      const rz = vz - into * resolved.nz;
      vehicle.speed = (rx * Math.cos(vehicle.yaw) + rz * Math.sin(vehicle.yaw)) * 0.55;
    }
    x = resolved.x;
    z = resolved.z;
  }

  x = Math.max(-120, Math.min(120, x));
  z = Math.max(-176, Math.min(116, z));
  vehicle.x = x;
  vehicle.z = z;
  vehicle.spin += (vehicle.speed * dt) / WHEEL_R;
  syncVehicle(vehicle, input.steer);
  return { bumped: resolved.hit && Math.abs(vehicle.speed) > 1.2 };
}

export function syncVehicle(vehicle, steer = 0) {
  vehicle.group.position.set(vehicle.x, 0, vehicle.z);
  vehicle.group.rotation.y = -vehicle.yaw;
  for (const wheel of vehicle.wheels) wheel.rotation.x = vehicle.spin;
  for (const pivot of vehicle.front) pivot.rotation.y = steer * 0.38;
}

export function placeVehicle(vehicle, x, z, yaw) {
  vehicle.x = x;
  vehicle.z = z;
  vehicle.yaw = yaw;
  vehicle.speed = 0;
  syncVehicle(vehicle, 0);
}
