'use strict';

// =====================================================================
//  TOUCH-STEUERUNG – Bildschirm-Buttons für Handy und Tablet
//  Die Buttons sind normale HTML-Elemente über dem Spiel (siehe index.html).
//  Jede Szene wählt mit setLayout() die passenden Buttons. Gedrückte Buttons
//  landen als dieselben Aktionen in GameInput wie Tastatur und Controller.
//  Sichtbar auf Geräten mit Touchscreen, nach der ersten Berührung oder mit ?touch=1.
// =====================================================================

// Welche Buttons es pro Szene gibt: links (Richtungen) und rechts (Aktionen)
const TOUCH_LAYOUTS = Object.freeze({
  menu: { left: [], right: [{ action: 'action', label: 'START', className: 'big wide' }], menuButton: false },
  screen: { left: [], right: [{ action: 'action', label: 'WEITER', className: 'big wide' }], menuButton: true },
  lecture: {
    left: [{ action: 'down', label: '📱<br>Handy', className: 'big' }],
    right: [{ action: 'action', label: '👆<br>Scroll', className: 'big' }],
    menuButton: true
  },
  // Bewegen per Finger direkt aufs Spielfeld (siehe SneakScene.fingerDirection)
  sneak: {
    left: [],
    right: [{ action: 'action', label: '🤫<br>Ducken', className: 'big' }],
    menuButton: true
  },
  platform: {
    left: [{ action: 'left', label: '◀', className: 'big' }, { action: 'right', label: '▶', className: 'big' }],
    right: [
      { action: 'swing', label: '☂', className: '', needsUmbrella: true },
      { action: 'jump', label: '⤒<br>Sprung', className: 'big' }
    ],
    menuButton: true
  },
  kart: {
    left: [{ action: 'left', label: '◀', className: 'big' }, { action: 'right', label: '▶', className: 'big' }],
    right: [
      { action: 'down', label: 'BREMSEN', className: '' },
      { action: 'action', label: 'GAS', className: 'big' }
    ],
    menuButton: true
  }
});

const TouchControls = {
  enabled: false,
  held: {},             // Aktion → Button gerade gedrückt
  tapped: new Set(),    // Aktionen, die seit dem letzten Frame neu gedrückt wurden
  layoutName: null,
  layoutOptions: {},

  init() {
    this.left = document.getElementById('touch-left');
    this.right = document.getElementById('touch-right');
    if (!this.left || !this.right) return;

    const forced = new URLSearchParams(window.location.search).get('touch') === '1';
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (forced || coarsePointer) this.enable();
    // Laptops mit Touchscreen: Buttons erst nach der ersten Berührung zeigen
    window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });

    this.menuButton = this.createButton({ action: 'menu', label: '☰' });
    this.menuButton.id = 'touch-menu';
    document.getElementById('touch').appendChild(this.menuButton);
  },

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('touch');
    if (this.layoutName) this.setLayout(this.layoutName, this.layoutOptions);
  },

  // Buttons für eine Szene aufbauen (z. B. 'lecture'); options.umbrella blendet ☂ ein
  setLayout(name, options = {}) {
    this.layoutName = name;
    this.layoutOptions = options;
    this.held = {};
    if (!this.left) return;
    const layout = TOUCH_LAYOUTS[name] || TOUCH_LAYOUTS.screen;
    const visible = (button) => !button.needsUmbrella || options.umbrella;
    this.left.replaceChildren(...layout.left.filter(visible).map((button) => this.createButton(button)));
    this.right.replaceChildren(...layout.right.filter(visible).map((button) => this.createButton(button)));
    this.menuButton.style.display = layout.menuButton ? 'flex' : 'none';
  },

  createButton({ action, label, className = '' }) {
    const button = document.createElement('button');
    button.className = `touch-btn ${className}`.trim();
    button.dataset.action = action;
    button.innerHTML = label;
    const press = (event) => {
      event.preventDefault();
      // Finger festhalten, damit Loslassen auch außerhalb des Buttons ankommt (nicht überall möglich)
      try {
        button.setPointerCapture(event.pointerId);
      } catch (e) {
        // ohne Capture geht es trotzdem
      }
      button.classList.add('active');
      this.held[action] = true;
      this.tapped.add(action);
    };
    const release = () => {
      button.classList.remove('active');
      this.held[action] = false;
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    return button;
  },

  // Von GameInput einmal pro Frame abgeholt
  takeTapped() {
    const tapped = new Set(this.tapped);
    this.tapped.clear();
    return tapped;
  }
};
