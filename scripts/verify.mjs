import { chromium } from 'playwright';
import fs from 'fs';

const url = process.argv[2];
const outDir = process.argv[3] || '/opt/cursor/artifacts';
if (!url) {
  console.error('usage: node scripts/verify.mjs <url> [outdir]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});

page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});

const held = new Set();
async function setKeys(codes) {
  const want = new Set(codes);
  for (const code of [...held]) {
    if (!want.has(code)) {
      await page.keyboard.up(code);
      held.delete(code);
    }
  }
  for (const code of want) {
    if (!held.has(code)) {
      await page.keyboard.down(code);
      held.add(code);
    }
  }
}

async function state() {
  return page.evaluate(() => window.__coral.getState());
}

async function driveTo(x, z, radius = 4.5, timeout = 25000) {
  const started = Date.now();
  let stuck = 0;
  let prev = null;
  while (Date.now() - started < timeout) {
    const s = await state();
    if (s.mode === 'result' || s.mode === 'polaroid') {
      await setKeys([]);
      return s;
    }
    const dx = x - s.x;
    const dz = z - s.z;
    const distance = Math.hypot(dx, dz);
    if (distance < radius && Math.abs(s.speed) < 8) {
      await setKeys([]);
      return s;
    }
    let diff = Math.atan2(dz, dx) - s.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const keys = [];
    if (Math.abs(diff) > 1.15) {
      keys.push('Space');
      keys.push(diff > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      const close = distance < 14;
      keys.push(close && Math.abs(s.speed) > 7 ? 'Space' : 'ArrowUp');
      if (!close && Math.abs(diff) > 0.9) keys[0] = 'Space';
      if (diff > 0.16) keys.push('ArrowRight');
      else if (diff < -0.16) keys.push('ArrowLeft');
    }
    await setKeys(keys);
    if (prev && Math.hypot(s.x - prev.x, s.z - prev.z) < 0.08 && Math.abs(s.speed) < 0.5) {
      stuck += 1;
      if (stuck === 6) {
        await setKeys(['ArrowDown', diff > 0 ? 'ArrowLeft' : 'ArrowRight']);
        await page.waitForTimeout(350);
      }
    } else {
      stuck = 0;
    }
    prev = s;
    await page.waitForTimeout(50);
  }
  const s = await state();
  throw new Error(`stuck going to ${x},${z}. now ${s.x.toFixed(1)},${s.z.toFixed(1)} speed ${s.speed.toFixed(2)} mode ${s.mode} mission ${JSON.stringify(s.mission)}`);
}

async function dismissResult() {
  await page.waitForSelector('#result:not([hidden])', { timeout: 8000 });
  await page.click('#result-ok');
  await page.waitForFunction(() => window.__coral.getState().mode === 'play');
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 20000 });
  await page.waitForSelector('#play-btn');
  const title = await page.locator('h1').innerText();
  if (title !== 'Coral Cruise') throw new Error(`unexpected title ${title}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/coral-start.png` });

  await page.click('#play-btn');
  await page.waitForFunction(() => window.__coral.getState().mode === 'play');

  const cdp = await page.context().newCDPSession(page);
  const joy = await page.locator('#joy').boundingBox();
  const beforeYaw = (await state()).yaw;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: joy.x + joy.width / 2, y: joy.y + joy.height / 2, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: joy.x + joy.width / 2 + 46, y: joy.y + joy.height / 2, id: 1 }],
  });
  await page.waitForTimeout(500);
  const steered = await state();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (Math.abs(steered.yaw - beforeYaw) < 0.05) {
    throw new Error(`joystick did not steer (yaw ${beforeYaw} -> ${steered.yaw})`);
  }

  const gas = await page.locator('#pedal-gas').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: gas.x + gas.width / 2, y: gas.y + gas.height / 2, id: 1 }],
  });
  await page.waitForTimeout(700);
  const gassed = await state();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (gassed.speed < 2) throw new Error(`gas pedal did not accelerate (speed ${gassed.speed})`);

  await driveTo(-36, -118, 2.2);
  await page.waitForTimeout(200);
  const shelled = await state();
  if (!shelled.shellIds.includes('shell-1') && shelled.shells < 1) {
    throw new Error(`shell not collected: ${JSON.stringify(shelled.shellIds)}`);
  }
  await driveTo(0, -96, 5);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/coral-driving.png` });

  const missions = await page.evaluate(() => window.__coral.missions);
  const sprint = missions.find((mission) => mission.id === 'sprint');
  await driveTo(sprint.start.x, sprint.start.z, 4);
  await page.waitForFunction(() => window.__coral.getState().mission?.id === 'sprint', null, { timeout: 4000 });
  for (const point of sprint.checkpoints) {
    const s = await driveTo(point.x, point.z, 4.2, 20000);
    if (s.mode === 'result') break;
  }
  await dismissResult();
  const afterSprint = await state();
  if (!afterSprint.cleared.includes('sprint')) throw new Error('sprint did not pay');
  if (afterSprint.cash < 250) throw new Error(`cash after sprint ${afterSprint.cash}`);

  const scoop = missions.find((mission) => mission.id === 'scoop');
  await driveTo(0, -48, 4);
  await driveTo(scoop.start.x, scoop.start.z, 4);
  await page.waitForFunction(() => window.__coral.getState().mission?.id === 'scoop');
  await driveTo(-48, 48, 4);
  await driveTo(scoop.drop.x, scoop.drop.z, 4);
  await dismissResult();
  if (!(await state()).cleared.includes('scoop')) throw new Error('scoop did not pay');

  const photo = missions.find((mission) => mission.id === 'postcard');
  await driveTo(0, -96, 4);
  await driveTo(-60, -96, 4);
  await driveTo(photo.start.x, photo.start.z, 4);
  await page.waitForFunction(() => window.__coral.getState().mission?.id === 'postcard');
  await driveTo(photo.spot.x, photo.spot.z, 3.2);
  await setKeys([]);
  await page.waitForFunction(() => {
    const s = window.__coral.getState();
    return s.canSnap && s.mission?.id === 'postcard';
  }, null, { timeout: 8000 });
  await page.click('#cam-btn');
  await page.waitForSelector('#polaroid:not([hidden])');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/coral-photo.png` });
  await page.click('#polaroid-ok');
  await page.waitForFunction(() => window.__coral.getState().mode === 'play');
  const afterPhoto = await state();
  if (!afterPhoto.cleared.includes('postcard')) throw new Error('photo did not pay');
  const cashBeforeShop = afterPhoto.cash;

  await page.click('#garage-btn');
  await page.waitForSelector('#garage:not([hidden])');
  await page.click('#color-seafoam');
  await page.click('#car-sundart');
  const shopped = await state();
  if (shopped.car !== 'sundart') throw new Error(`car is ${shopped.car}`);
  if (shopped.color !== 'seafoam') throw new Error(`color is ${shopped.color}`);
  if (!shopped.cars.includes('sundart')) throw new Error('sundart locked');
  if (shopped.cash >= cashBeforeShop) throw new Error('shop did not spend cash');
  await page.click('#garage-close');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__coral && window.__coral.getState().ready && document.body.classList.contains('ready'));
  const saved = await state();
  if (saved.car !== 'sundart' || saved.color !== 'seafoam') {
    throw new Error(`save lost car/color ${saved.car} ${saved.color}`);
  }
  if (saved.cash !== shopped.cash) throw new Error(`save lost cash ${saved.cash} != ${shopped.cash}`);
  if (!saved.shellIds.includes('shell-1')) throw new Error('save lost shell');
  if (saved.cleared.length < 3) throw new Error(`save lost jobs ${saved.cleared}`);

  const realErrors = errors.filter((line) => !/favicon|Download the React DevTools/i.test(line));
  if (realErrors.length) {
    console.error(realErrors.join('\n'));
    throw new Error(`${realErrors.length} console errors`);
  }
  console.log(JSON.stringify({
    ok: true,
    cash: saved.cash,
    car: saved.car,
    color: saved.color,
    shells: saved.shells,
    cleared: saved.cleared,
  }, null, 2));
} finally {
  await browser.close();
}
