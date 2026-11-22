/** All sound is synthesized in the browser. Nothing is fetched. */

export class AudioBus {
  constructor(isMuted) {
    this.muted = isMuted;
    this.ctx = null;
    this.master = null;
    this.engineGain = null;
    this.musicGain = null;
    this.filter = null;
    this.oscA = null;
    this.oscB = null;
    this.nextTime = 0;
    this.step = 0;
    this.ready = false;
    this.lastBonk = 0;
  }

  start() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.22;
    master.connect(comp);
    comp.connect(ctx.destination);

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.7;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'triangle';
    oscA.frequency.value = 48;
    oscB.frequency.value = 24;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    oscA.start();
    oscB.start();

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.engineGain = engineGain;
    this.musicGain = musicGain;
    this.filter = filter;
    this.oscA = oscA;
    this.oscB = oscB;
    this.nextTime = ctx.currentTime + 0.12;
    this.step = 0;
    this.ready = true;
    ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  update() {
    if (!this.ready) return;
    const horizon = this.ctx.currentTime + 0.35;
    const stepDur = 0.23;
    while (this.nextTime < horizon) {
      this.playStep(this.nextTime, this.step % 32);
      this.step += 1;
      this.nextTime += stepDur;
    }
  }

  setEngine(speed, throttle) {
    if (!this.ready) return;
    const s = Math.abs(speed);
    const now = this.ctx.currentTime;
    const freq = 42 + s * 6.5 + (throttle > 0 ? 16 : 0);
    this.oscA.frequency.setTargetAtTime(freq, now, 0.08);
    this.oscB.frequency.setTargetAtTime(freq * 0.5, now, 0.08);
    this.filter.frequency.setTargetAtTime(160 + s * 55 + (throttle > 0 ? 80 : 0), now, 0.08);
    const vol = Math.min(0.16, 0.03 + s * 0.006 + (throttle > 0.2 ? 0.03 : 0));
    this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
  }

  blip(freq = 740) {
    if (!this.ready) return;
    this.tone(freq, 0.09, 0.08, 'sine');
  }

  chime() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.tone(freq, 0.18, 0.07, 'triangle', now + i * 0.09);
    });
  }

  bonk() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBonk < 0.18) return;
    this.lastBonk = now;
    const length = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + 0.14);
  }

  tone(freq, dur, volume, type, when) {
    const ctx = this.ctx;
    const t = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.musicGain ? this.master : ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playStep(time, step) {
    const chords = [
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 392],
    ];
    const melody = [
      523.25, 0, 659.25, 587.33, 523.25, 0, 392, 440,
      523.25, 0, 493.88, 440, 392, 0, 329.63, 349.23,
      440, 0, 523.25, 440, 349.23, 0, 392, 493.88,
      523.25, 587.33, 523.25, 392, 329.63, 0, 392, 523.25,
    ];
    const chord = chords[Math.floor(step / 8) % 4];
    if (step % 4 === 0) {
      for (const freq of chord) this.pluck(time, freq, 0.42, 0.045);
      this.pluck(time, chord[0] / 2, 0.48, 0.05);
    }
    const note = melody[step];
    if (note) this.pluck(time, note, 0.28, 0.06);
  }

  pluck(time, freq, dur, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
