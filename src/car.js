import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { disposeTree } from './geom.js';
import { onSand } from './layout.js';

const WHEEL_R = 0.34;

function paintMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.62,
    roughness: 0.26,
    envMapIntensity: 1.15,
  });
}

function glassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#d5f3ff',
    metalness: 0.08,
    roughness: 0.04,
    transparent: true,
    opacity: 0.5,
    envMapIntensity: 1.6,
    depthWrite: false,
  });
}

function trimMaterial(color, roughness = 0.55) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.08, roughness, envMapIntensity: 0.4 });
}

function wheelMesh() {
  const geo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.26, 16);
  geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: '#24282e',
    roughness: 0.86,
    metalness: 0.05,
  }));
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.28, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({
    color: '#efe6d4',
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1,
  }));
  mesh.add(hub);
  return mesh;
}

function lamp(x, y, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.32),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 3.2,
      roughness: 0.35,
    }),
  );
  mesh.position.set(x, y, z);
  mesh.userData.noShadow = true;
  return mesh;
}

function glassPane(w, h, d, x, y, z, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMaterial());
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotZ;
  mesh.userData.noShadow = true;
  return mesh;
}

function buildBreeze(color) {
  const group = new THREE.Group();
  const bodyMat = paintMaterial(color);
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.55, 0.48, 1.72, 2, 0.14), bodyMat);
  body.position.set(0.05, 0.62, 0);
  const nose = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.28, 1.5, 2, 0.08), bodyMat);
  nose.position.set(1.85, 0.52, 0);
  const seatMat = trimMaterial('#fffaf3', 0.7);
  const seatL = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.28, 0.48, 2, 0.06), seatMat);
  const seatR = seatL.clone();
  seatL.position.set(-0.15, 0.92, 0.32);
  seatR.position.set(-0.15, 0.92, -0.32);
  group.add(body, nose, seatL, seatR);
  group.add(glassPane(0.08, 0.42, 1.4, 0.78, 1.0, 0, -0.42));
  group.add(lamp(1.82, 0.66, 0.55, '#fff6cf'), lamp(1.82, 0.66, -0.55, '#fff6cf'));
  group.add(lamp(-1.72, 0.64, 0.58, '#ff5d6a'), lamp(-1.72, 0.64, -0.58, '#ff5d6a'));
  return { group, bodyMat, roofY: 1.15 };
}

function buildSundart(color) {
  const group = new THREE.Group();
  const bodyMat = paintMaterial(color);
  const shape = new THREE.Shape();
  shape.moveTo(-2.05, 0.34);
  shape.bezierCurveTo(-1.2, 0.34, -0.7, 1.08, -0.15, 1.12);
  shape.lineTo(0.85, 0.86);
  shape.quadraticCurveTo(1.7, 0.5, 2.12, 0.36);
  shape.lineTo(-2.05, 0.34);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.68,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.84);
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, bodyMat);
  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.08), bodyMat);
  const finR = finL.clone();
  finL.position.set(-1.65, 1.02, 0.72);
  finR.position.set(-1.65, 1.02, -0.72);
  group.add(body, finL, finR);
  group.add(glassPane(1.05, 0.32, 1.28, -0.05, 0.96, 0));
  group.add(lamp(2.02, 0.5, 0.55, '#fff6cf'), lamp(2.02, 0.5, -0.55, '#fff6cf'));
  group.add(lamp(-1.95, 0.55, 0.62, '#ff5d6a'), lamp(-1.95, 0.55, -0.62, '#ff5d6a'));
  return { group, bodyMat, roofY: 1.25 };
}

function buildPalmetto(color) {
  const group = new THREE.Group();
  const bodyMat = paintMaterial(color);
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.95, 0.62, 1.82, 2, 0.14), bodyMat);
  body.position.set(0, 0.68, 0);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.62, 1.68, 2, 0.12), bodyMat);
  cabin.position.set(-0.2, 1.22, 0);
  const rackMat = trimMaterial('#6d6048', 0.6);
  const rackL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.08), rackMat);
  const rackR = rackL.clone();
  rackL.position.set(-0.2, 1.62, 0.45);
  rackR.position.set(-0.2, 1.62, -0.45);
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(1.7, 0.08, 0.38, 2, 0.03),
    new THREE.MeshStandardMaterial({ color: '#3ec6c0', roughness: 0.4, metalness: 0.05, envMapIntensity: 0.6 }),
  );
  board.position.set(-0.15, 1.72, 0);
  board.rotation.y = 0.08;
  group.add(body, cabin, rackL, rackR, board);
  group.add(glassPane(1.15, 0.4, 1.45, 0.15, 1.24, 0));
  group.add(lamp(1.95, 0.72, 0.58, '#fff6cf'), lamp(1.95, 0.72, -0.58, '#fff6cf'));
  group.add(lamp(-1.92, 0.72, 0.58, '#ff5d6a'), lamp(-1.92, 0.72, -0.58, '#ff5d6a'));
  return { group, bodyMat, roofY: 1.85 };
}

const BUILDERS = {
  breeze: buildBreeze,
  sundart: buildSundart,
  palmetto: buildPalmetto,
};

function clearcoatPaint(hex, source) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    map: source?.map || null,
    normalMap: source?.normalMap || null,
    roughnessMap: source?.roughnessMap || null,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 0.82,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
  });
}

function buildFromTemplate(template, hex) {
  const group = new THREE.Group();
  const model = template.clone(true);
  model.rotation.y = Math.PI / 2;
  const measured = new THREE.Box3().setFromObject(model);
  const size = measured.getSize(new THREE.Vector3());
  const targetLength = 4.05;
  const scale = targetLength / Math.max(size.z, size.x, 0.01);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  model.position.y -= fitted.min.y;
  model.position.x -= (fitted.min.x + fitted.max.x) / 2;
  model.position.z -= (fitted.min.z + fitted.max.z) / 2;
  group.add(model);

  const paintMats = [];
  const seen = new Map();
  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const list = Array.isArray(node.material) ? node.material : [node.material];
    const next = list.map((mat) => {
      if (!mat || !/paint/i.test(mat.name || '')) return mat;
      if (!seen.has(mat.uuid)) {
        const created = clearcoatPaint(hex, mat);
        created.name = mat.name;
        seen.set(mat.uuid, created);
        paintMats.push(created);
      }
      return seen.get(mat.uuid);
    });
    node.material = Array.isArray(node.material) ? next : next[0];
    const applied = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of applied) {
      if (mat && mat.transmission > 0) {
        mat.transmission = 0;
        mat.transparent = true;
        mat.opacity = 0.45;
        mat.depthWrite = false;
        mat.envMapIntensity = 1.4;
      }
    }
    const glass = /glass/i.test(node.material?.name || node.name || '');
    node.castShadow = !glass;
    node.receiveShadow = !glass;
  });

  const spins = [];
  const steers = [];
  model.traverse((node) => {
    if (!node.name) return;
    if (/^wheel_(FL|FR|RL|RR)$/.test(node.name)) {
      spins.push({ node, baseX: node.rotation.x });
    }
    if (/^steer_(FL|FR)$/.test(node.name)) {
      steers.push({ node, baseY: node.rotation.y });
    }
  });
  if (!steers.length) {
    for (const spin of spins) {
      if (/FL|FR/.test(spin.node.name)) steers.push({ node: spin.node, baseY: spin.node.rotation.y });
    }
  }

  const height = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()).y;
  return {
    group,
    bodyMat: paintMats[0] || clearcoatPaint(hex),
    paintMats,
    roofY: Math.max(1.05, height * 0.92),
    spins,
    steers,
    groundY: 0.12,
    yawOffset: 0,
    shared: true,
    wheels: [],
    front: [],
  };
}

export function createVehicle(spec, hex, template) {
  const built = template ? buildFromTemplate(template, hex) : (BUILDERS[spec.id] || buildBreeze)(hex);
  const wheels = [];
  const front = [];
  if (!template) {
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
    built.group.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = !node.userData.noShadow;
      node.receiveShadow = !node.userData.noShadow;
    });
  }
  return {
    spec,
    group: built.group,
    bodyMat: built.bodyMat,
    paintMats: built.paintMats || [],
    roofY: built.roofY,
    wheels,
    front,
    spins: built.spins || null,
    steers: built.steers || null,
    groundY: built.groundY || 0,
    yawOffset: built.yawOffset || 0,
    shared: Boolean(built.shared),
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
    new THREE.MeshStandardMaterial({ color: '#7ee0c8', roughness: 0.45, metalness: 0.05 }),
  );
  mesh.position.set(-0.35, vehicle.roofY + 0.22, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.1, 0.5),
    new THREE.MeshStandardMaterial({ color: '#ff8d7a', roughness: 0.5, metalness: 0.04 }),
  );
  stripe.position.y = 0.08;
  mesh.add(stripe);
  vehicle.group.add(mesh);
  vehicle.cargo = mesh;
}

export function disposeVehicle(vehicle) {
  if (vehicle.shared) {
    vehicle.paintMats?.forEach((material) => material.dispose());
    return;
  }
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
  vehicle.group.position.set(vehicle.x, vehicle.groundY || 0, vehicle.z);
  vehicle.group.rotation.y = -vehicle.yaw + (vehicle.yawOffset || 0);
  if (vehicle.spins) {
    for (const wheel of vehicle.spins) wheel.node.rotation.x = wheel.baseX + vehicle.spin;
    for (const front of vehicle.steers) front.node.rotation.y = front.baseY + steer * 0.42;
    return;
  }
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
