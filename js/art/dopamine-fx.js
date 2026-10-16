'use strict';

// =====================================================================
//  DOPAMIN-EFFEKTE (Schritt 1) – je mehr Dopamin, desto bunter und wilder:
//  Sättigung von grau bis knallbunt, Vignette öffnet sich, Herzen und Funken
//  beim Scrollen, Zoom-Puls, pinkes Glühen und ab 75 % flimmernde Farben.
//  Sättigung und Vignette brauchen WebGL – im Canvas-Modus entfallen sie.
// =====================================================================

class DopamineFx {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.colorMatrix = this.camera.postFX.addColorMatrix();
      this.vignette = this.camera.postFX.addVignette(0.5, 0.5, 0.8, 0.3);
    }

    const ext = Display.extent(); // groß genug für jedes Seitenverhältnis
    this.glow = scene.add.rectangle(0, 0, ext.width, ext.height, COLORS.dopamine).setOrigin(0).setScrollFactor(0)
      .setAlpha(0).setDepth(845).setBlendMode(Phaser.BlendModes.ADD);
    this.hearts = scene.add.particles(0, 0, TEX.heart, {
      speed: { min: 80, max: 240 },
      angle: { min: 200, max: 340 },
      scale: { start: hiResScale(0.7), end: hiResScale(0.1) },
      alpha: { start: 1, end: 0 },
      rotate: { min: -40, max: 40 },
      lifespan: 800,
      gravityY: 250,
      emitting: false
    }).setDepth(26);
    this.sparks = scene.add.particles(0, 0, TEX.pixel, {
      speed: { min: 120, max: 320 },
      scale: { start: hiResScale(1.2), end: 0 },
      lifespan: 500,
      tint: [COLORS.dopamine, COLORS.accent, 0x3bb7ff, 0xffffff],
      emitting: false
    }).setDepth(26);
    this.zoomPunch = { factor: 1 };
    this.streakText = scene.add.text(LECTURE_LAYOUT.phone.x, 128, '', textStyle(26, CSS.accent))
      .setOrigin(0.5).setDepth(30).setAlpha(0);
  }

  // 0 unterhalb von "trippyAt", 1 bei vollem Meter
  tripAmount(ratio) {
    return Phaser.Math.Clamp((ratio - DOPAMINE_FX.trippyAt) / (1 - DOPAMINE_FX.trippyAt), 0, 1);
  }

  update(ratio) {
    const time = this.scene.time.now;
    const trip = this.tripAmount(ratio);

    if (this.colorMatrix) {
      this.colorMatrix.reset();
      this.colorMatrix.saturate(Phaser.Math.Linear(DOPAMINE_FX.minSaturation, DOPAMINE_FX.maxSaturation, ratio));
      if (trip > 0) this.colorMatrix.hue(Math.sin(time * 0.003) * DOPAMINE_FX.maxHueShift * trip, true);
    }
    if (this.vignette) {
      // Tunnelblick bei wenig Dopamin, öffnet sich mit steigendem Pegel
      this.vignette.radius = 0.8 + 0.2 * ratio;
      this.vignette.strength = DOPAMINE_FX.maxVignette * (1 - ratio);
    }

    // Pinkes Pulsieren wie ein Herzschlag, schneller bei mehr Dopamin
    const pulse = 0.6 + 0.4 * Math.sin(time * (0.005 + 0.008 * ratio));
    this.glow.setAlpha(ratio > 0.5 ? (ratio - 0.5) * DOPAMINE_FX.maxGlow * 2 * pulse : 0);
  }

  // Kleiner Rausch bei jedem Scroll
  burst(ratio, x, y, isViral) {
    this.hearts.explode(Math.round(1 + ratio * 6 + (isViral ? 10 : 0)), x, y);
    this.sparks.explode(Math.round(4 + ratio * 16), x, y);
    this.scene.tweens.killTweensOf(this.zoomPunch);
    this.zoomPunch.factor = 1;
    this.scene.tweens.add({
      targets: this.zoomPunch,
      factor: 1 + 0.008 + DOPAMINE_FX.maxZoomPunch * ratio,
      duration: 70,
      yoyo: true,
      onUpdate: () => this.applyZoomPunch(),
      onComplete: () => this.applyZoomPunch()
    });
  }

  // Zoomt um die Bildmitte (die Kamera zoomt sonst von der linken oberen Ecke aus);
  // bei factor = 1 liegt der 960 × 540 Bereich wieder mittig in der sichtbaren Fläche
  applyZoomPunch() {
    const factor = this.zoomPunch.factor;
    const { width, height } = Display.view;
    this.camera.setZoom(Display.res * factor);
    this.camera.setScroll(GAME_WIDTH / 2 - width / (2 * factor), GAME_HEIGHT / 2 - height / (2 * factor));
  }

  showStreak(streak) {
    if (streak < LECTURE.streakMinToShow) return;
    this.streakText.setText(`🔥 ${streak}er-Combo`).setAlpha(1).setScale(1.4);
    this.scene.tweens.killTweensOf(this.streakText);
    this.scene.tweens.add({ targets: this.streakText, scale: 1, duration: 150, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.streakText, alpha: 0, delay: 700, duration: 300 });
  }
}
