import { createWorld, MISSIONS, SHELLS, SPAWN, circleHitsAABB, segmentClear } from '../src/layout.js';

const world = createWorld(11);
const boxes = world.colliders;
const radius = 1.65;
let failed = 0;

function report(name, hits) {
  if (!hits.length) {
    console.log(`ok  ${name}`);
    return;
  }
  failed += 1;
  console.log(`FAIL ${name} (${hits.length} samples)`, hits.slice(0, 4));
}

function path(name, points) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    report(`${name} ${i}`, segmentClear(a.x, a.z, b.x, b.z, radius, boxes, 0.8));
  }
}

const sprint = MISSIONS.find((mission) => mission.id === 'sprint');
const scoop = MISSIONS.find((mission) => mission.id === 'scoop');
const photo = MISSIONS.find((mission) => mission.id === 'postcard');

report('spawn', segmentClear(SPAWN.x, SPAWN.z, SPAWN.x, SPAWN.z, radius, boxes));
report('south road', segmentClear(-100, -96, 100, -96, radius, boxes));
path('sprint', [sprint.start, ...sprint.checkpoints]);
path('scoop', [scoop.start, { x: -48, z: 48 }, scoop.drop]);
path('photo', [{ x: -60, z: -96 }, photo.start, photo.spot, { x: -60, z: -160 }]);

for (const shell of SHELLS) {
  const hit = boxes.some((box) => circleHitsAABB(shell.x, shell.z, 0.6, box));
  report(`shell ${shell.id}`, hit ? [{ x: shell.x, z: shell.z }] : []);
}

for (const mission of MISSIONS) {
  const hit = boxes.some((box) => circleHitsAABB(mission.start.x, mission.start.z, 1.2, box));
  report(`marker ${mission.id}`, hit ? [mission.start] : []);
}

console.log(`buildings ${world.buildings.length}, palms ${world.palms.length}, colliders ${boxes.length}`);
if (failed) {
  console.error(`${failed} path checks failed`);
  process.exit(1);
}
