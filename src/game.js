import * as THREE from 'three';
import { loadGameAssets } from './assets.js';
import { AudioBus } from './audio.js';
import { createVehicle, disposeVehicle, placeVehicle, setCargo, updateVehicle } from './car.js';
import { carById, colorById, COLORS, CARS, SHELL_VALUE } from './catalog.js';
import { mountCity } from './city.js';
import { createUI } from './ui.js';
import { Input } from './input.js';
import { createWorld, MISSIONS, SHELLS, SPAWN } from './layout.js';
import { bobMarkers, bobShells, makeArch, makeMarker, makeShell } from './markers.js';
import { drawMinimap } from './minimap.js';
import { presetFor, resolveQuality } from './quality.js';
import { loadSave, writeSave } from './save.js';

function dist(x, z, point) {
  return Math.hypot(x - point.x, z - point.z);
}

function money(n) {
  return `$${n}`;
}

export function boot() {
  const ui = createUI({
    onPlay: () => game?.play(),
    onMute: () => game?.toggleMute(),
    onGarage: () => game?.openGarage(),
    onCamera: () => game?.requestSnap(),
    onDismiss: () => game?.resume(),
    onQuality: (level) => game?.setQuality(level),
  });
  const game = new Game(ui);
  try {
    game.init();
  } catch {
    ui.setReady('This browser could not start the 3D view.');
    return game;
  }
  window.__coral = {
    getState: () => game.getState(),
    missions: MISSIONS,
    shells: SHELLS,
    spawn: SPAWN,
  };
  return game;
}

class Game {
  constructor(ui) {
    this.ui = ui;
    this.save = loadSave();
    this.audio = new AudioBus(this.save.muted);
    this.input = new Input();
    this.mode = 'menu';
    this.active = null;
    this.canSnap = false;
    this.snapRequested = false;
    this.car = null;
    this.last = 0;
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsStamp = 0;
  }

  async init() {
    const level = resolveQuality(this.save.quality);
    this.preset = presetFor(level);
    const canvas = document.getElementById('view');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.preset.antialias,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.preset.shadowSoft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.setClearColor(0xd5e6f2, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 480);
    this.world = createWorld(11);
    this.ui.setLoad(0.04, 'Loading Coral Vista…');
    let assets;
    try {
      assets = await loadGameAssets(this.renderer, this.preset, (progress) => {
        this.ui.setLoad(progress, 'Loading Coral Vista…');
      });
    } catch {
      this.ui.setReady('The city assets could not be loaded.');
      return;
    }
    this.library = assets;
    if (assets.envMap) this.scene.environment = assets.envMap;
    this.city = mountCity(this.scene, this.world, {
      renderer: this.renderer,
      preset: this.preset,
      maps: assets.maps,
      models: assets.models,
      envMap: assets.envMap,
    });
    this.spawnCar();
    this.buildActivities();
    this.input.attachTouch();
    this.ui.setMuted(this.save.muted);
    this.ui.setGraphics(this.preset.level);
    this.ui.setWallet(`Wallet ${money(this.save.cash)} · ${carById(this.save.car).name}`);
    this.ui.setMode('menu');
    this.ui.setLoad(1, 'Ready');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.code === 'KeyM') this.toggleMute();
      if (event.code === 'KeyG' && this.mode === 'play') this.openGarage();
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioCap));
    this.renderer.setSize(width, height, false);
  }

  spawnCar() {
    if (this.car) {
      this.scene.remove(this.car.group);
      disposeVehicle(this.car);
    }
    const spec = carById(this.save.car);
    const color = colorById(this.save.color);
    this.car = createVehicle(spec, color.hex, this.library?.models?.[spec.id]);
    const pose = this.pose || SPAWN;
    placeVehicle(this.car, pose.x, pose.z, pose.yaw ?? 0);
    this.car.speed = 0;
    this.scene.add(this.car.group);
    if (this.active?.def.type === 'delivery') setCargo(this.car, true);
  }

  rememberPose() {
    this.pose = { x: this.car.x, z: this.car.z, yaw: this.car.yaw };
  }

  buildActivities() {
    this.markerGroups = [];
    this.startMarkers = MISSIONS.map((mission) => {
      const colors = { race: '#ffe08a', delivery: '#7ee0c8', photo: '#e2c2fb' };
      const star = this.save.cleared.includes(mission.id) ? ' ★' : '';
      const marker = makeMarker(
        this.scene,
        mission.start.x,
        mission.start.z,
        colors[mission.type] || '#ffe08a',
        `${mission.name}${star}`,
      );
      marker.userData.id = mission.id;
      this.markerGroups.push(marker);
      return marker;
    });
    const sprint = MISSIONS.find((mission) => mission.type === 'race');
    this.arches = sprint.checkpoints.map((point) => makeArch(this.scene, point.x, point.z));
    this.dropRing = makeMarker(this.scene, MISSIONS[1].drop.x, MISSIONS[1].drop.z, '#7ee0c8', 'Drop off');
    this.photoRing = makeMarker(this.scene, MISSIONS[2].spot.x, MISSIONS[2].spot.z, '#e2c2fb', 'Photo stop');
    this.dropRing.visible = false;
    this.photoRing.visible = false;
    this.markerGroups.push(this.dropRing, this.photoRing);
    this.shells = SHELLS
      .filter((shell) => !this.save.shells.includes(shell.id))
      .map((shell) => makeShell(this.scene, shell));
  }

  play() {
    if (this.mode !== 'menu' || !this.renderer) return;
    this.audio.start();
    this.audio.setMuted(this.save.muted);
    this.mode = 'play';
    this.input.setEnabled(true);
    this.snapCamera();
    this.ui.setMode('play');
    this.refreshHud();
  }

  toggleMute() {
    this.save.muted = !this.save.muted;
    this.save = writeSave(this.save);
    this.audio.setMuted(this.save.muted);
    this.ui.setMuted(this.save.muted);
    if (this.mode !== 'menu') this.audio.blip(520);
  }

  openGarage() {
    if (this.mode !== 'play' && this.mode !== 'garage') return;
    this.mode = 'garage';
    this.input.setEnabled(false);
    this.ui.showGarage(this.garageModel(), {
      onCar: (id) => this.chooseCar(id),
      onColor: (id) => this.chooseColor(id),
      onClose: () => this.resume(),
    });
  }

  garageModel() {
    const jobs = this.save.cleared.length
      ? `Jobs done: ${this.save.cleared.map((id) => MISSIONS.find((m) => m.id === id)?.name || id).join(', ')}`
      : 'Jobs done: none yet';
    return {
      cash: this.save.cash,
      jobs,
      cars: CARS.map((car) => ({
        ...car,
        owned: this.save.cars.includes(car.id),
        selected: this.save.car === car.id,
      })),
      colors: COLORS.map((color) => ({
        ...color,
        owned: this.save.colors.includes(color.id),
        selected: this.save.color === color.id,
      })),
    };
  }

  chooseCar(id) {
    const spec = carById(id);
    if (!this.save.cars.includes(id)) {
      if (this.save.cash < spec.price) return;
      this.save.cash -= spec.price;
      this.save.cars.push(id);
      this.audio.chime();
    }
    this.save.car = id;
    this.save = writeSave(this.save);
    this.rememberPose();
    this.spawnCar();
    this.audio.blip(660);
    this.openGarage();
  }

  chooseColor(id) {
    const color = colorById(id);
    if (this.save.color === id && this.save.colors.includes(id)) return;
    if (!this.save.colors.includes(id)) {
      if (this.save.cash < color.price) return;
      this.save.cash -= color.price;
      this.save.colors.push(id);
      this.audio.chime();
    }
    this.save.color = id;
    this.save = writeSave(this.save);
    this.rememberPose();
    this.spawnCar();
    this.audio.blip(880);
    this.openGarage();
  }

  requestSnap() {
    if (this.mode !== 'play' || !this.canSnap) return;
    this.snapRequested = true;
  }

  resume() {
    if (this.mode === 'menu') return;
    this.mode = 'play';
    this.input.setEnabled(true);
    this.ui.setMode('play');
    this.refreshHud();
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.033, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    const time = now / 1000;

    if (this.mode === 'play') {
      const input = this.input.read();
      const photoHold = this.active?.def.type === 'photo'
        && dist(this.car.x, this.car.z, this.active.def.spot) <= this.active.def.spot.r + 1.5;
      const step = updateVehicle(this.car, dt, input, this.world.colliders, { allowReverse: !photoHold });
      if (step.bumped) this.audio.bonk();
      this.checkShells();
      this.checkMission(dt);
      this.updateChase(dt);
    } else if (this.mode === 'menu') {
      const drift = time * 0.18;
      this.camera.position.set(-52 + Math.sin(drift) * 12, 30, -132);
      this.camera.lookAt(16, 3, -46);
    } else if (this.mode === 'garage') {
      this.updateGarageCamera();
    } else {
      this.updateChase(dt);
    }

    this.audio.update();
    this.audio.setEngine(
      this.mode === 'play' ? this.car.speed : 0,
      this.mode === 'play' ? this.input.throttle : 0,
    );
    this.city.tick(time);
    this.city.updateSun(this.mode === 'menu' ? { x: 8, z: -60 } : this.car);
    this.sampleFps(now);
    for (const cloud of this.city.clouds) {
      cloud.position.x += dt * 1.4;
      if (cloud.position.x > 130) cloud.position.x = -130;
    }
    bobMarkers(this.markerGroups, time);
    bobShells(this.shells, time);
    this.syncActivityVisuals();

    this.renderer.render(this.scene, this.camera);
    if (!this.presented) {
      this.presented = true;
      this.ui.setReady();
    }
    if (this.snapRequested) {
      this.snapRequested = false;
      let url = '';
      try {
        url = this.renderer.domElement.toDataURL('image/jpeg', 0.72);
      } catch {
        url = '';
      }
      this.finishPhoto(url);
    }
    if (this.mode === 'play') {
      drawMinimap(document.getElementById('minimap'), this.car, this.world, {
        shells: this.shells,
        markers: this.visibleMarkers(),
        target: this.currentTarget(),
      });
      this.refreshHud();
    }
  }

  checkShells() {
    const left = [];
    for (const shell of this.shells) {
      if (dist(this.car.x, this.car.z, shell) < 2.5) {
        this.scene.remove(shell.group);
        this.save.shells.push(shell.id);
        this.save.cash += SHELL_VALUE;
        this.save = writeSave(this.save);
        this.audio.blip(1240);
        this.ui.toast(`Seashell +${money(SHELL_VALUE)}`);
      } else {
        left.push(shell);
      }
    }
    this.shells = left;
  }

  checkMission(dt) {
    if (!this.active) {
      for (const mission of MISSIONS) {
        if (dist(this.car.x, this.car.z, mission.start) <= mission.start.r) {
          this.beginMission(mission);
          break;
        }
      }
      this.canSnap = false;
      return;
    }
    const mission = this.active;
    const def = mission.def;
    if (def.type === 'race') {
      const point = def.checkpoints[mission.index];
      if (point && dist(this.car.x, this.car.z, point) <= 6) {
        mission.index += 1;
        this.audio.blip(880);
        if (mission.index >= def.checkpoints.length) {
          this.succeed();
          return;
        }
      }
    } else if (def.type === 'delivery') {
      if (dist(this.car.x, this.car.z, def.drop) <= def.drop.r) {
        this.succeed();
        return;
      }
    } else if (def.type === 'photo') {
      const near = dist(this.car.x, this.car.z, def.spot) <= def.spot.r;
      this.canSnap = near && Math.abs(this.car.speed) < 1.35;
    }
    if (mission.timeLeft != null) {
      mission.timeLeft -= dt;
      if (mission.timeLeft <= 0) this.fail();
    }
  }

  beginMission(def) {
    this.active = {
      def,
      index: 0,
      timeLeft: def.time,
    };
    this.audio.blip(660);
    if (def.type === 'delivery') setCargo(this.car, true);
    const hint = def.type === 'race'
      ? `${def.name} — follow the golden arches`
      : def.type === 'delivery'
        ? `${def.name} — cooler aboard, head to The Pink Marlin`
        : `${def.name} — cruise out to the end of the pier`;
    this.ui.toast(hint);
  }

  succeed() {
    if (!this.active) return;
    const def = this.active.def;
    this.active = null;
    this.canSnap = false;
    setCargo(this.car, false);
    this.save.cash += def.reward;
    if (!this.save.cleared.includes(def.id)) this.save.cleared.push(def.id);
    this.save = writeSave(this.save);
    this.audio.chime();
    this.ui.setCash(money(this.save.cash));
    const marker = this.startMarkers.find((item) => item.userData.id === def.id);
    marker?.userData.label?.userData.setText(`${def.name} ★`);
    this.mode = 'result';
    this.input.setEnabled(false);
    this.ui.showResult({
      title: 'You did it!',
      body: `${def.name} complete. +${money(def.reward)}`,
    });
  }

  fail() {
    if (!this.active) return;
    const name = this.active.def.name;
    this.active = null;
    this.canSnap = false;
    setCargo(this.car, false);
    this.audio.blip(220);
    this.mode = 'result';
    this.input.setEnabled(false);
    this.ui.showResult({
      title: "Time's up",
      body: `${name} can wait. Your cash is safe — try the loop again whenever you like.`,
    });
  }

  finishPhoto(url) {
    if (!this.active || this.active.def.type !== 'photo') return;
    const def = this.active.def;
    this.active = null;
    this.canSnap = false;
    this.save.cash += def.reward;
    if (!this.save.cleared.includes(def.id)) this.save.cleared.push(def.id);
    this.save = writeSave(this.save);
    this.audio.chime();
    this.ui.setCash(money(this.save.cash));
    const marker = this.startMarkers.find((item) => item.userData.id === def.id);
    marker?.userData.label?.userData.setText(`${def.name} ★`);
    this.mode = 'polaroid';
    this.input.setEnabled(false);
    this.ui.flash();
    this.ui.showPolaroid({ url, caption: def.caption, reward: def.reward });
  }

  syncActivityVisuals() {
    const activeId = this.active?.def.id;
    for (const marker of this.startMarkers) marker.visible = marker.userData.id !== activeId;
    this.arches.forEach((arch, index) => {
      const show = activeId === 'sprint' && index >= this.active.index;
      arch.visible = show;
      arch.scale.setScalar(show && index === this.active.index ? 1.18 : 0.86);
    });
    this.dropRing.visible = activeId === 'scoop';
    this.photoRing.visible = activeId === 'postcard';
  }

  visibleMarkers() {
    const points = [];
    for (const marker of this.startMarkers) {
      if (marker.visible) points.push({ x: marker.position.x, z: marker.position.z });
    }
    return points;
  }

  currentTarget() {
    if (!this.car) return null;
    if (!this.active) {
      let best = null;
      let bestD = Infinity;
      for (const mission of MISSIONS) {
        const d = dist(this.car.x, this.car.z, mission.start);
        if (d < bestD) {
          bestD = d;
          best = mission.start;
        }
      }
      return best;
    }
    const def = this.active.def;
    if (def.type === 'race') return def.checkpoints[this.active.index] || null;
    if (def.type === 'delivery') return def.drop;
    return def.spot;
  }

  refreshHud() {
    const target = this.currentTarget();
    let objective = 'Drive into a glowing ring to start a job';
    let timer = '';
    let warn = false;
    if (this.active) {
      const def = this.active.def;
      if (def.type === 'race') {
        objective = `${def.name} · arch ${this.active.index + 1} of ${def.checkpoints.length}`;
      } else if (def.type === 'delivery') {
        objective = `${def.name} · drop the cooler at The Pink Marlin`;
      } else if (this.canSnap) {
        objective = 'Hold still and tap the camera';
      } else {
        objective = `${def.name} · stop at the end of Pelican Pier`;
      }
      if (this.active.timeLeft != null) {
        const secs = Math.max(0, Math.ceil(this.active.timeLeft));
        timer = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        warn = secs <= 10;
      }
    }
    this.ui.setHud({
      cash: money(this.save.cash),
      shells: `Shells ${this.save.shells.length}/${SHELLS.length}`,
      objective,
      timer,
      warn,
    });
    if (target) {
      const dx = target.x - this.car.x;
      const dz = target.z - this.car.z;
      const rel = Math.atan2(dz, dx) - this.car.yaw;
      this.ui.setArrow(true, rel, `${Math.round(Math.hypot(dx, dz))} m`);
    } else {
      this.ui.setArrow(false, 0, '');
    }
    this.ui.setCamera(this.mode === 'play' && this.canSnap);
  }

  snapCamera() {
    const back = 11.5;
    this.camX = this.car.x - Math.cos(this.car.yaw) * back;
    this.camY = 5.5;
    this.camZ = this.car.z - Math.sin(this.car.yaw) * back;
    this.lookX = this.car.x + Math.cos(this.car.yaw) * 7;
    this.lookY = 1.2;
    this.lookZ = this.car.z + Math.sin(this.car.yaw) * 7;
    this.applyCamera();
  }

  updateChase(dt) {
    if (this.camX == null) this.snapCamera();
    const back = 11.5;
    const tx = this.car.x - Math.cos(this.car.yaw) * back;
    const ty = 5.5;
    const tz = this.car.z - Math.sin(this.car.yaw) * back;
    const k = 1 - Math.exp(-4.2 * dt);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.camZ += (tz - this.camZ) * k;
    this.lookX += (this.car.x + Math.cos(this.car.yaw) * 7 - this.lookX) * k;
    this.lookY += (1.2 - this.lookY) * k;
    this.lookZ += (this.car.z + Math.sin(this.car.yaw) * 7 - this.lookZ) * k;
    this.applyCamera();
  }

  updateGarageCamera() {
    const ang = this.car.yaw + 0.9;
    const dist = 6.4;
    this.camera.position.set(
      this.car.x + Math.cos(ang) * dist,
      1.85,
      this.car.z + Math.sin(ang) * dist,
    );
    this.camera.lookAt(this.car.x, 0.85, this.car.z);
  }

  applyCamera() {
    this.camera.position.set(this.camX, this.camY, this.camZ);
    this.camera.lookAt(this.lookX, this.lookY, this.lookZ);
  }

  setQuality(level) {
    if (level !== 'high' && level !== 'low') return;
    const changed = this.preset.level !== level;
    this.save.quality = level;
    this.save = writeSave(this.save);
    this.ui.setGraphics(level);
    if (changed) window.location.reload();
  }

  sampleFps(now) {
    if (!this.fpsStamp) this.fpsStamp = now;
    this.fpsFrames += 1;
    const elapsed = now - this.fpsStamp;
    if (elapsed >= 500) {
      this.fps = (this.fpsFrames * 1000) / elapsed;
      this.fpsFrames = 0;
      this.fpsStamp = now;
    }
  }

  getState() {
    return {
      ready: Boolean(this.renderer),
      x: this.car?.x ?? 0,
      z: this.car?.z ?? 0,
      yaw: this.car?.yaw ?? 0,
      speed: this.car?.speed ?? 0,
      cash: this.save.cash,
      car: this.save.car,
      color: this.save.color,
      cars: [...this.save.cars],
      colors: [...this.save.colors],
      shells: this.save.shells.length,
      shellIds: [...this.save.shells],
      cleared: [...this.save.cleared],
      mode: this.mode,
      muted: this.save.muted,
      quality: this.preset?.level ?? 'high',
      fps: Math.round(this.fps),
      pixelRatio: this.renderer ? this.renderer.getPixelRatio() : 1,
      canSnap: this.canSnap,
      mission: this.active
        ? { id: this.active.def.id, type: this.active.def.type, index: this.active.index, name: this.active.def.name }
        : null,
      target: this.currentTarget(),
    };
  }
}
