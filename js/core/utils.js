'use strict';

// =====================================================================
//  HILFSFUNKTIONEN – ohne eigenen Spielzustand
// =====================================================================

// localStorage kann fehlen oder gesperrt sein (z. B. privater Modus)
const Storage = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // nicht speicherbar – das Spiel läuft trotzdem weiter
    }
  }
};

function formatTime(ms) {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total * 10) % 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(list) {
  return Phaser.Utils.Array.GetRandom(list);
}

function textStyle(size, color = CSS.white, font = FONT) {
  return {
    fontFamily: font,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: Math.max(2, Math.round(size / 6))
  };
}

// Kurz aufsteigender, verblassender Text (z. B. „+1 ECTS“)
function floatText(scene, x, y, text, color = CSS.white, size = 22) {
  const label = scene.add.text(x, y, text, textStyle(size, color)).setOrigin(0.5).setDepth(DEPTH.effects);
  scene.tweens.add({
    targets: label,
    y: y - 50,
    alpha: 0,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy()
  });
}

// Großer Text in der Bildschirmmitte, der kurz aufploppt und wieder verschwindet
function showBanner(scene, text, color = CSS.white, duration = 1300, size = 46) {
  const banner = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, textStyle(size, color))
    .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.banner).setScale(0.3);
  scene.tweens.add({ targets: banner, scale: 1, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: banner,
    alpha: 0,
    delay: duration,
    duration: 300,
    onComplete: () => banner.destroy()
  });
}

// Blinkender Hinweis (z. B. „LEERTASTE / A → Start“)
function addBlinkingText(scene, x, y, text, style, minAlpha = 0.3) {
  const label = scene.add.text(x, y, text, style).setOrigin(0.5);
  scene.tweens.add({ targets: label, alpha: minAlpha, duration: 600, yoyo: true, repeat: -1 });
  return label;
}

// Schnittpunkt eines Strahls mit einem achsenparallelen Rechteck (Slab-Methode).
// Liefert die Distanz t >= 0 oder null, wenn der Strahl das Rechteck nicht trifft.
function rayRectDistance(ox, oy, dx, dy, rect) {
  let tMin = -Infinity;
  let tMax = Infinity;
  const slabs = [
    [ox, dx, rect.x, rect.right],
    [oy, dy, rect.y, rect.bottom]
  ];
  for (const [origin, direction, min, max] of slabs) {
    if (Math.abs(direction) < 1e-9) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let t1 = (min - origin) / direction;
    let t2 = (max - origin) / direction;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
  }
  if (tMax < Math.max(tMin, 0)) return null;
  return tMin >= 0 ? tMin : null;
}
