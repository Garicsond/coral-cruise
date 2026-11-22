import { chromium } from 'playwright';
import fs from 'fs';

const url = process.argv[2];
const outDir = process.argv[3] || '/opt/cursor/artifacts';
if (!url) {
  console.error('usage: node scripts/verify-visual.mjs <url> [outdir]');
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
  deviceScaleFactor: 2,
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

async function driveTo(x, z, radius = 5, timeout = 120000) {
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
      keys.push('Space', diff > 0 ? 'ArrowRight' : 'ArrowLeft');
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
    } else stuck = 0;
    prev = s;
    await page.waitForTimeout(50);
  }
  const s = await state();
  throw new Error(`stuck going to ${x},${z} at ${s.x.toFixed(1)},${s.z.toFixed(1)} speed ${s.speed.toFixed(2)}`);
}

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const boot = await state();
  if (!boot.ready) throw new Error('renderer not ready');
  await page.screenshot({ path: `${outDir}/coral-start.png` });

  await page.click('#play-btn');
  await page.waitForFunction(() => window.__coral.getState().mode === 'play');
  await setKeys(['ArrowUp']);
  const samples = [];
  for (let i = 0; i < 8; i += 1) {
    await page.waitForTimeout(250);
    samples.push((await state()).fps);
  }
  await setKeys([]);
  const driving = samples.filter((n) => n > 0);
  const avgFps = driving.length ? driving.reduce((a, b) => a + b, 0) / driving.length : 0;
  const minFps = driving.length ? Math.min(...driving) : 0;

  await driveTo(28, -96, 4);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/coral-beach.png` });

  await driveTo(0, -96, 4);
  await driveTo(0, -42, 4);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/coral-street.png` });

  const photo = await page.evaluate(() => window.__coral.missions.find((mission) => mission.id === 'postcard'));
  await driveTo(0, -96, 4);
  await driveTo(-60, -96, 4);
  await driveTo(photo.start.x, photo.start.z, 4);
  await page.waitForFunction(() => window.__coral.getState().mission?.id === 'postcard');
  await driveTo(photo.spot.x, photo.spot.z, 3.2);
  await setKeys([]);
  await page.waitForFunction(() => window.__coral.getState().canSnap, null, { timeout: 8000 });
  await page.click('#cam-btn');
  await page.waitForSelector('#polaroid:not([hidden])');
  await page.click('#polaroid-ok');
  await page.waitForFunction(() => window.__coral.getState().mode === 'play');
  const done = await state();
  if (!done.cleared.includes('postcard')) throw new Error('photo job did not complete');
  if (done.cash < 180) throw new Error(`cash too low ${done.cash}`);

  await page.evaluate(() => document.getElementById('gfx-low').click());
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__coral?.getState().quality === 'low', null, { timeout: 30000 });
  const savedQuality = await page.evaluate(() => JSON.parse(localStorage.getItem('coral-cruise-save-v1')).quality);
  if (savedQuality !== 'low') throw new Error(`graphics toggle did not save (${savedQuality})`);

  const realErrors = errors.filter((line) => !/favicon|Download the React DevTools/i.test(line));
  if (realErrors.length) {
    console.error(realErrors.join('\n'));
    throw new Error(`${realErrors.length} console errors`);
  }
  console.log(JSON.stringify({
    ok: true,
    quality: done.quality,
    pixelRatio: done.pixelRatio,
    avgFps: Math.round(avgFps),
    minFps: Math.round(minFps),
    samples,
    cash: done.cash,
    cleared: done.cleared,
  }, null, 2));
} finally {
  await browser.close();
}
