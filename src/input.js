const DRIVE = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.enabled = false;
    this.joyX = 0;
    this.gas = false;
    this.brake = false;
    this.steer = 0;
    this.throttle = 0;
    this.braking = false;
    this._joyId = null;

    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      if (DRIVE.has(event.code)) event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => this.keys.clear());

    const block = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
      event.preventDefault();
    };
    document.addEventListener('touchmove', block, { passive: false });
    document.addEventListener('gesturestart', (event) => event.preventDefault());
    document.addEventListener('gesturechange', (event) => event.preventDefault());
    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  attachTouch() {
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    const gas = document.getElementById('pedal-gas');
    const brake = document.getElementById('pedal-brake');
    const maxR = 48;

    const moveJoy = (event) => {
      const rect = joy.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      let dx = event.clientX - originX;
      let dy = event.clientY - originY;
      const mag = Math.hypot(dx, dy) || 1;
      if (mag > maxR) {
        dx = (dx / mag) * maxR;
        dy = (dy / mag) * maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joyX = dx / maxR;
    };
    const endJoy = () => {
      this._joyId = null;
      this.joyX = 0;
      knob.style.transform = 'translate(0px, 0px)';
    };
    joy.addEventListener('pointerdown', (event) => {
      this._joyId = event.pointerId;
      joy.setPointerCapture(event.pointerId);
      moveJoy(event);
    });
    joy.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this._joyId) return;
      moveJoy(event);
    });
    joy.addEventListener('pointerup', endJoy);
    joy.addEventListener('pointercancel', endJoy);

    this.bindPedal(gas, (down) => { this.gas = down; });
    this.bindPedal(brake, (down) => { this.brake = down; });
  }

  bindPedal(el, setDown) {
    const down = (event) => {
      event.preventDefault();
      el.setPointerCapture(event.pointerId);
      setDown(true);
      el.classList.add('held');
    };
    const up = () => {
      setDown(false);
      el.classList.remove('held');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.gas = false;
      this.brake = false;
      this.joyX = 0;
      this.steer = 0;
      this.throttle = 0;
      this.braking = false;
      const knob = document.getElementById('joy-knob');
      if (knob) knob.style.transform = 'translate(0px, 0px)';
      document.getElementById('pedal-gas')?.classList.remove('held');
      document.getElementById('pedal-brake')?.classList.remove('held');
    }
  }

  read() {
    if (!this.enabled) {
      this.steer = 0;
      this.throttle = 0;
      this.braking = false;
      return this;
    }
    let steer = this.joyX;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) steer -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) steer += 1;
    this.steer = clamp(steer, -1, 1);

    let throttle = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.gas) throttle += 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) throttle -= 1;
    this.braking = this.keys.has('Space') || this.brake;
    if (this.braking && throttle > 0) throttle = 0;
    this.throttle = clamp(throttle, -1, 1);
    return this;
  }
}
