'use strict';

// =====================================================================
//  EINGABE
//  Pro Aktion genau eine Taste – siehe CONTROLS in config.js:
//    Tastatur:   Pfeiltasten + LEERTASTE (ESC = Menü)
//    Controller: Stick / Steuerkreuz + A (+ = Menü)
//  Mehrere verbundene Controller werden zusammengeführt.
//  Welche Controller-Taste "A" ist, nummerieren Browser unterschiedlich. Deshalb
//  merkt sich das Spiel die Taste, mit der im Menü gestartet wird.

// =====================================================================

const INPUT_ACTIONS = Object.freeze(['left', 'right', 'up', 'down', 'action', 'swing', 'menu']);

class GameInput {
  constructor(scene) {
    this.keys = scene.input.keyboard.addKeys(CONTROLS.keyboard);
    this.held = {};
    this.pressed = {};
    this.stick = { x: 0, y: 0 };
    this.hasGamepad = false;
    this.isFirstUpdate = true;
    this.padButtons = [];
    this.previousPadButtons = [];
    // Sehr kurze Tastendrücke können zwischen zwei Frames liegen – deshalb per Ereignis merken
    this.tappedKeys = new Set();
    INPUT_ACTIONS.forEach((action) => {
      this.keys[action].on('down', () => this.tappedKeys.add(action));
    });
  }

  // Einmal pro Frame aufrufen, bevor Eingaben abgefragt werden
  update() {
    const pad = GameInput.readGamepads();
    this.hasGamepad = pad.connected;
    this.stick = pad.stick;
    this.previousPadButtons = this.isFirstUpdate ? pad.buttons : this.padButtons;
    this.padButtons = pad.buttons;
    const previous = this.held;
    this.held = {};
    this.pressed = {};
    INPUT_ACTIONS.forEach((action) => {
      this.held[action] = this.keys[action].isDown || pad.buttons[GameInput.buttonFor(action)] === true;
      // Tasten, die beim Szenenwechsel noch gedrückt sind, zählen nicht als neuer Druck
      const newlyHeld = !this.isFirstUpdate && this.held[action] && !previous[action];
      this.pressed[action] = newlyHeld || this.tappedKeys.has(action);
    });
    this.tappedKeys.clear();
    this.isFirstUpdate = false;
    // Browser erlauben Sound erst nach einer Eingabe
    if (INPUT_ACTIONS.some((action) => this.pressed[action])) SFX.init();
  }

  isHeld(action) {
    return this.held[action] === true;
  }

  // Nur im Frame des Drückens true
  wasPressed(action) {
    return this.pressed[action] === true;
  }

  // Erste der angegebenen Controller-Tasten, die gerade neu gedrückt wurde (oder null)
  newlyPressedPadButton(candidates) {
    const index = candidates.find((i) => this.padButtons[i] === true && this.previousPadButtons[i] !== true);
    return index === undefined ? null : index;
  }

  // ---------- Aktionstaste des Controllers ----------
  static buttonFor(action) {
    if (action === 'action') return GameInput.actionButton;
    // Schwingen: Y – außer Y wurde im Menü als Aktionstaste gelernt, dann X
    if (action === 'swing' && CONTROLS.gamepad.swing === GameInput.actionButton) return 3;
    return CONTROLS.gamepad[action];
  }

  static setActionButton(index) {
    GameInput.actionButton = index;
    Storage.save(STORAGE_KEYS.padActionButton, index);
  }

  // Richtung als Vektor mit Länge ≤ 1 (Stick analog, Tasten/Steuerkreuz digital)
  direction() {
    let x = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    let y = (this.held.down ? 1 : 0) - (this.held.up ? 1 : 0);
    if (Math.hypot(this.stick.x, this.stick.y) > CONTROLS.stickDeadzone) {
      x = this.stick.x;
      y = this.stick.y;
    }
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  downHeld() {
    return this.direction().y > CONTROLS.downThreshold;
  }

  // ---------- Controller ----------
  static connectedGamepads() {
    if (!navigator.getGamepads) return [];
    try {
      return Array.from(navigator.getGamepads()).filter((pad) => pad && pad.connected);
    } catch (e) {
      return [];
    }
  }

  static readButtons(pad) {
    const buttons = pad.buttons.map((button) => button.pressed || button.value > 0.5);
    if (pad.mapping !== 'standard') GameInput.applyHatFallback(pad, buttons);
    return buttons;
  }

  // Manche Treiber melden das Steuerkreuz als "Hat"-Achse (meist Achse 9)
  static applyHatFallback(pad, buttons) {
    const hat = pad.axes[9];
    if (hat === undefined || Math.abs(hat) > 1.05) return;
    const near = (value) => Math.abs(hat - value) < 0.15;
    const dpad = CONTROLS.gamepad;
    if (near(-1) || near(-0.714) || near(1)) buttons[dpad.up] = true;
    if (near(-0.714) || near(-0.428) || near(-0.142)) buttons[dpad.right] = true;
    if (near(-0.142) || near(0.142) || near(0.428)) buttons[dpad.down] = true;
    if (near(0.428) || near(0.714) || near(1)) buttons[dpad.left] = true;
  }

  // Alle Controller zusammenführen: Eine Taste zählt, wenn sie auf irgendeinem gedrückt ist;
  // beim Stick gewinnt der stärkste Ausschlag
  static readGamepads() {
    const pads = GameInput.connectedGamepads();
    const buttons = [];
    const stick = { x: 0, y: 0 };
    pads.forEach((pad) => {
      GameInput.readButtons(pad).forEach((down, i) => {
        if (down) buttons[i] = true;
      });
      const x = pad.axes[0] || 0;
      const y = pad.axes[1] || 0;
      if (Math.hypot(x, y) > Math.hypot(stick.x, stick.y)) {
        stick.x = x;
        stick.y = y;
      }
    });
    return { connected: pads.length > 0, buttons, stick };
  }

  // Kurzbeschreibung für die Live-Anzeige im Menü
  static describeGamepads() {
    if (!navigator.getGamepads) return ['Dieser Browser unterstützt keine Controller.'];
    const pads = GameInput.connectedGamepads();
    if (pads.length === 0) return ['Kein Controller erkannt – mit der Seite im Vordergrund eine Controller-Taste drücken.'];
    return pads.map((pad) => {
      const pressed = GameInput.readButtons(pad)
        .map((down, i) => (down ? i : null))
        .filter((i) => i !== null);
      const name = pad.id.replace(/\s*\(.*\)\s*/, '').slice(0, 28) || 'Controller';
      return `🎮 ${pad.index + 1}: ${name} [${pad.mapping || 'nicht-standard'}]  Tasten: ${pressed.length ? pressed.join(', ') : '–'}`;
    });
  }
}

GameInput.actionButton = Storage.load(STORAGE_KEYS.padActionButton, CONTROLS.gamepad.action);
