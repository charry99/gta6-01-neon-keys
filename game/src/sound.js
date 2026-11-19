// All sound is synthesized with the Web Audio API: engine hum, boat
// engine, sirens, the helicopter, gunshots, pickups, rain and a bass loop.
// Nothing is loaded from a file and nothing leaves the machine.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.heliOsc = null;
    this.musicTimer = null;
    this.rainGain = null;
    this.note = 0;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startMusic();
      this.startRain();
      return true;
    } catch (err) {
      return false;
    }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  noise(dur, vol, freq) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq || 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }
  shot(player) {
    this.noise(0.14, player ? 0.22 : 0.1, 1400);
    this.tone(player ? 160 : 130, 0.1, "sawtooth", 0.08, 60);
  }
  thud() { this.noise(0.12, 0.16, 300); }
  crash() { this.noise(0.3, 0.24, 500); this.tone(90, 0.25, "sawtooth", 0.1, 40); }
  honk() { this.tone(340, 0.16, "square", 0.07); setTimeout(() => this.tone(340, 0.12, "square", 0.06), 130); }
  pickup() { this.tone(660, 0.09, "sine", 0.12); setTimeout(() => this.tone(990, 0.12, "sine", 0.12), 80); }
  missionStart() { this.tone(440, 0.12, "triangle", 0.12); setTimeout(() => this.tone(587, 0.16, "triangle", 0.12), 110); }
  missionDone() {
    this.tone(523, 0.12, "triangle", 0.13);
    setTimeout(() => this.tone(659, 0.12, "triangle", 0.13), 110);
    setTimeout(() => this.tone(784, 0.22, "triangle", 0.13), 220);
  }
  siren(stars) {
    if (!this.ctx || this.muted) return;
    this.tone(720, 0.28, "sine", 0.028, 980);
  }
  engineStart() {
    if (!this.ensure() || this.muted) return;
    this.engineStop();
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 55;
    this.engineGain.gain.value = 0.05;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  engineUpdate(amount, kind) {
    if (!this.engineOsc || !this.ctx) return;
    const base = kind === "boat" ? 70 : 55;
    this.engineOsc.frequency.setTargetAtTime(base + amount * 130, this.ctx.currentTime, 0.08);
  }
  engineStop() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (err) { /* already stopped */ }
      this.engineOsc = null;
    }
  }
  heliStart() {
    if (!this.ensure() || this.muted || this.heliOsc) return;
    this.heliOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    this.heliOsc.type = "square";
    this.heliOsc.frequency.value = 13;
    gain.gain.value = 0.035;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    this.heliOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this.heliOsc.start();
    this.heliGain = gain;
  }
  heliStop() {
    if (this.heliOsc) {
      try { this.heliOsc.stop(); } catch (err) { /* already stopped */ }
      this.heliOsc = null;
    }
  }
  startRain() {
    if (!this.ctx || this.rainGain) return;
    const len = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1600;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    src.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    src.start();
  }
  setRain(amount) {
    if (this.rainGain && this.ctx) this.rainGain.gain.setTargetAtTime(amount * 0.05, this.ctx.currentTime, 0.4);
  }
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = bass[this.note % bass.length];
      this.note++;
      this.tone(f, 0.42, "triangle", 0.07);
      if (this.note % 4 === 0) this.tone(f * 4, 0.2, "sine", 0.03);
    }, 460);
  }
  stopAll() {
    this.engineStop();
    this.heliStop();
  }
}
