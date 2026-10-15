'use strict';

// =====================================================================
//  HINTERGRUNDMUSIK – kleiner Chiptune-Sequenzer per WebAudio
//  Noten als MIDI-Nummern (60 = C4), null = Pause. Eine Zeile = ein Takt
//  in Sechzehnteln (Melodie) bzw. Achteln (Bass). Schlagzeug pro Stück:
//  kick/snare auf den Vierteln, hihat in Achteln oder Sechzehnteln.
// =====================================================================

const MUSIC_VOLUME = 0.09;

// Wiederkehrende Bausteine: C – G – Am – F mit Bass im Oktavsprung
const BASS_POP = [
  [48, 60, 48, 60, 48, 60, 48, 60],
  [43, 55, 43, 55, 43, 55, 43, 55],
  [45, 57, 45, 57, 45, 57, 45, 57],
  [41, 53, 41, 53, 43, 55, 43, 55]
];
// Ohrwurm-Hook (Takte 5–8 des Level-Stücks, auch im Menü)
const HOOK = [
  [64, null, 64, null, 62, 64, null, 67, null, 64, 62, 60, 62, null, 60, null],
  [62, null, 62, null, 60, 62, null, 67, null, 71, 69, 67, 69, null, 67, null],
  [64, null, 64, null, 62, 64, null, 69, null, 72, 71, 69, 71, null, 69, null],
  [65, null, 69, null, 72, null, 71, null, 67, null, 71, null, 74, 76, 79, null]
];

const MUSIC_TRACKS = Object.freeze({
  menu: {
    bpm: 132,
    leadWave: 'square',
    melody: HOOK,
    bass: BASS_POP,
    drums: { kick: true, snare: false, hihat: 8 }
  },
  // Vorlesung & Treppenhaus: schnelle Arpeggio-Läufe, dann der Hook
  upbeat: {
    bpm: 156,
    leadWave: 'square',
    melody: [
      [60, 64, 67, 72, 67, 64, 60, 64, 67, 72, 76, 72, 67, 64, 67, null],
      [59, 62, 67, 71, 67, 62, 59, 62, 67, 71, 74, 71, 67, 62, 67, null],
      [57, 60, 64, 69, 64, 60, 57, 60, 64, 69, 72, 69, 64, 60, 64, null],
      [53, 57, 60, 65, 60, 57, 53, 57, 55, 59, 62, 67, 62, 59, 62, 67],
      ...HOOK
    ],
    bass: [...BASS_POP, ...BASS_POP],
    drums: { kick: true, snare: true, hihat: 16 }
  },
  // Hörsaal: hektisch-schleichend in Moll (Am – Em – F – E)
  sneaky: {
    bpm: 140,
    leadWave: 'square',
    melody: [
      [57, null, 60, null, 64, null, 60, null, 57, null, 60, 64, null, 69, null, null],
      [52, null, 55, null, 59, null, 55, null, 52, null, 55, 59, null, 64, null, null],
      [53, null, 57, null, 60, null, 57, null, 53, null, 57, 60, null, 65, null, null],
      [52, null, 56, null, 59, null, 62, null, 64, null, 62, 59, null, 56, null, null]
    ],
    bass: [
      [45, null, 45, 57, 45, null, 45, 57],
      [40, null, 40, 52, 40, null, 40, 52],
      [41, null, 41, 53, 41, null, 41, 53],
      [40, null, 40, 52, 44, null, 44, 56]
    ],
    drums: { kick: true, snare: false, hihat: 16 }
  }
});

const Music = {
  wanted: null,     // welches Stück laufen soll (startet, sobald Sound erlaubt ist)
  current: null,
  master: null,
  step: 0,
  nextNoteTime: 0,
  timer: null,
  paused: false,
  tempoFactor: 1,   // > 1 = schneller (z. B. bei viel Dopamin)

  // Stück wechseln; läuft dasselbe schon, spielt es einfach weiter
  play(trackName) {
    this.wanted = trackName;
    this.paused = false;
    this.ensureRunning();
  },

  stop() {
    this.wanted = null;
    this.halt();
  },

  setTempo(factor) {
    this.tempoFactor = factor;
  },

  // Stumm schalten ohne den Takt zu verlieren (z. B. wenn der Dozent herschaut).
  // Es werden auch keine neuen Noten mehr gespielt – so ist es sicher still.
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.setVolume(0);
  },

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.setVolume(MUSIC_VOLUME);
  },

  // Wird von SFX.init aufgerufen, sobald der Browser Sound erlaubt
  ensureRunning() {
    const ctx = SFX.ctx;
    if (!ctx || !this.wanted) return;
    if (this.current === this.wanted && this.master) {
      this.setVolume(this.paused ? 0 : MUSIC_VOLUME);
      return;
    }
    this.halt();
    this.current = this.wanted;
    this.master = ctx.createGain();
    this.master.gain.value = this.paused ? 0 : MUSIC_VOLUME;
    this.master.connect(ctx.destination);
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => {
      try {
        this.schedule();
      } catch (e) {
        SFX.reportError('Musik', e);
        clearInterval(this.timer);
      }
    }, 25);
  },

  halt() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.master) {
      const master = this.master;
      master.gain.value = 0;
      setTimeout(() => master.disconnect(), 300);
    }
    this.master = null;
    this.current = null;
  },

  // Direkt setzen statt Rampe – funktioniert in allen Browsern zuverlässig
  setVolume(volume) {
    if (!this.master || !SFX.ctx) return;
    this.master.gain.cancelScheduledValues(SFX.ctx.currentTime);
    this.master.gain.value = volume;
  },

  // Plant die Noten der nächsten ~120 ms voraus (gleichmäßiger Takt trotz Timer-Schwankungen)
  schedule() {
    const ctx = SFX.ctx;
    const track = MUSIC_TRACKS[this.current];
    if (!ctx || !track) return;
    const sixteenth = 60 / (track.bpm * this.tempoFactor) / 4;
    const stepsPerLoop = track.melody.length * 16;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      if (!this.paused) this.playStep(track, this.step, this.nextNoteTime, sixteenth);
      this.nextNoteTime += sixteenth;
      this.step = (this.step + 1) % stepsPerLoop;
    }
  },

  playStep(track, step, time, sixteenth) {
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const lead = track.melody[bar][inBar];
    if (lead !== null) this.note(lead, sixteenth * 0.9, track.leadWave, 0.45, time);
    if (inBar % 2 === 0) {
      const bass = track.bass[bar][inBar / 2];
      if (bass !== null) this.note(bass, sixteenth * 1.7, 'triangle', 0.9, time);
    }
    const { kick, snare, hihat } = track.drums;
    if (kick && inBar % 8 === 0) this.kick(time);
    if (snare && inBar % 8 === 4) this.snare(time);
    if (hihat === 16 || (hihat === 8 && inBar % 2 === 0)) this.hihat(time, inBar % 4 === 2 ? 0.2 : 0.1);
  },

  note(midi, duration, wave, volume, time) {
    const ctx = SFX.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  },

  kick(time) {
    const ctx = SFX.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.17);
  },

  snare(time) {
    this.noiseBurst(time, 0.12, 0.6);
    this.note(50, 0.06, 'triangle', 0.4, time);
  },

  hihat(time, volume) {
    this.noiseBurst(time, 0.03, volume);
  },

  noiseBurst(time, duration, volume) {
    const ctx = SFX.ctx;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(gain).connect(this.master);
    source.start(time);
  }
};
