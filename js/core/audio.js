'use strict';

// =====================================================================
//  SOUND – per WebAudio erzeugt, keine Audiodateien nötig
//  Browser (vor allem Safari) erlauben Ton nur, wenn er direkt in einem Klick-
//  oder Tastatur-Ereignis gestartet wird. Controller-Tasten zählen NICHT –
//  ohne einen Klick oder Tastendruck bleibt das Spiel stumm.
//  unlock() wird deshalb in main.js direkt aus diesen Ereignissen aufgerufen.
// =====================================================================

const SFX_VOLUME = 5;   // Lautstärke aller Effekte (gegenüber der Musik)

const SFX = {
  ctx: null,
  out: null,
  lastError: null,   // für die Ton-Diagnose im Menü

  reportError(where, error) {
    this.lastError = `${where}: ${error && error.message ? error.message : error}`;
    console.error(`Audio-Fehler (${where})`, error);
  },

  // Kurzbeschreibung für die Ton-Diagnose im Menü
  describe() {
    const state = this.ctx ? this.ctx.state : 'noch nicht gestartet';
    const music = Music.current ? `${Music.current}${Music.paused ? ' (pausiert)' : ''}` : '–';
    return `Ton: ${state}  ·  Musik: ${music}${this.lastError ? `  ·  Fehler: ${this.lastError}` : ''}`;
  },

  // Gemeinsamer Ausgang aller Effekte: lauter gedreht, Kompressor gegen Übersteuern
  output() {
    if (!this.out) {
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.connect(this.ctx.destination);
      this.out = this.ctx.createGain();
      this.out.gain.value = SFX_VOLUME;
      this.out.connect(compressor);
    }
    return this.out;
  },

  isRunning() {
    return this.ctx !== null && this.ctx.state === 'running';
  },

  // Nur aus einem echten Klick-/Tastatur-Ereignis aufrufen: erzeugt bzw. weckt den
  // AudioContext und spielt einen stummen Ton – so gibt Safari den Ton frei
  unlock() {
    try {
      this.unlockUnsafe();
    } catch (e) {
      this.reportError('Freischalten', e);
    }
  },

  unlockUnsafe() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = AudioCtx ? new AudioCtx() : null;
      } catch (e) {
        this.ctx = null;
      }
      if (!this.ctx) return;
      this.ctx.addEventListener('statechange', () => {
        console.info(`Audio: ${this.ctx.state}`);
        Music.ensureRunning();
      });
    }
    const silence = this.ctx.createBufferSource();
    silence.buffer = this.ctx.createBuffer(1, 1, 22050);
    silence.connect(this.ctx.destination);
    silence.start(0);
    this.init();
  },

  // Darf auch außerhalb von Ereignissen aufgerufen werden (z. B. nach Controller-Eingaben):
  // weckt einen schon vorhandenen AudioContext, erzeugt aber keinen neuen
  init() {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    Music.ensureRunning();
  },

  tone(freq, duration, type = 'square', volume = 0.06, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    try {
      this.toneUnsafe(freq, duration, type, volume, slideTo, delay);
    } catch (e) {
      this.reportError('Effekt', e);
    }
  },

  toneUnsafe(freq, duration, type, volume, slideTo, delay) {
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.output());
    osc.start(start);
    osc.stop(start + duration + 0.02);
  },

  noise(duration, volume = 0.05, delay = 0) {
    if (!this.ctx) return;
    try {
      this.noiseUnsafe(duration, volume, delay);
    } catch (e) {
      this.reportError('Rauschen', e);
    }
  },

  noiseUnsafe(duration, volume, delay) {
    const start = this.ctx.currentTime + delay;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain).connect(this.output());
    source.start(start);
  },

  // Tonfolge, z. B. für Jingles
  melody(freqs, duration, type, volume, gap) {
    freqs.forEach((freq, i) => this.tone(freq, duration, type, volume, null, i * gap));
  },

  click() { this.tone(660, 0.06, 'square', 0.04); },
  stamp() { this.tone(90, 0.25, 'sine', 0.2, 40); this.noise(0.12, 0.12); },
  denied() { this.tone(160, 0.12, 'square', 0.04); },
  ad() { this.melody([784, 988, 1175, 1568], 0.12, 'triangle', 0.05, 0.09); },
  // Scroll-"Bloop": steigt mit dem Dopamin-Pegel (pitch 0…1) an
  scroll(pitch = 0) { this.tone(520 + pitch * 500, 0.07, 'square', 0.05, 1040 + pitch * 800); },
  phoneUp() { this.noise(0.08, 0.03); this.tone(300, 0.08, 'triangle', 0.04, 600); },
  viral() { this.tone(800, 0.12, 'square', 0.05, 1600); this.tone(1600, 0.1, 'triangle', 0.04, null, 0.1); },
  warn() { this.tone(320, 0.18, 'sawtooth', 0.04, 220); },
  caught() { this.tone(240, 0.4, 'sawtooth', 0.08, 70); this.noise(0.25, 0.06); },
  rustle() { this.noise(0.2, 0.07); this.noise(0.15, 0.05, 0.12); },
  jump() { this.tone(380, 0.12, 'square', 0.04, 720); },
  coin() { this.tone(988, 0.06, 'square', 0.04); this.tone(1319, 0.12, 'square', 0.04, null, 0.06); },
  powerup() { this.melody([523, 659, 784, 1047], 0.1, 'triangle', 0.05, 0.07); },
  stageClear() { this.melody([392, 523, 659, 784], 0.16, 'square', 0.05, 0.1); },
  win() { this.melody([523, 659, 784, 1047, 784, 1047], 0.18, 'triangle', 0.06, 0.12); },
  lose() { this.melody([392, 330, 262, 196], 0.25, 'sawtooth', 0.05, 0.18); }
};
