'use strict';

// =====================================================================
//  HUD – Score, Zeit, Leben und aktueller Schritt am oberen Rand
// =====================================================================

class Hud {
  constructor(scene, stageLabel) {
    this.scene = scene;
    const fixed = (gameObject) => gameObject.setScrollFactor(0).setDepth(DEPTH.hud);

    fixed(scene.add.rectangle(0, 0, GAME_WIDTH, 40, 0x000000, 0.55).setOrigin(0));
    this.scoreText = fixed(scene.add.text(16, 8, '', textStyle(20)));
    this.timeText = fixed(scene.add.text(GAME_WIDTH / 2, 8, '', textStyle(20, CSS.accent)).setOrigin(0.5, 0));
    fixed(scene.add.text(GAME_WIDTH / 2, 44, stageLabel, textStyle(14, CSS.gray, FONT_BODY)).setOrigin(0.5, 0));
    this.extraText = fixed(scene.add.text(16, 46, '', textStyle(16, CSS.accent)));
    this.hearts = [];
    for (let i = 0; i < START_LIVES; i++) {
      this.hearts.push(fixed(scene.add.image(GAME_WIDTH - 90 + i * 30, 20, TEX.heart)));
    }
    this.soundOffText = fixed(scene.add.text(GAME_WIDTH - 16, 46, '🔇 Klick für Ton', textStyle(13, CSS.accent, FONT_BODY)).setOrigin(1, 0));
    this.shownLives = GameState.lives;
    this.update();
  }

  // Zusatzzeile unter dem Score (z. B. ECTS und Kaffee-Timer)
  setExtra(text) {
    this.extraText.setText(text);
  }

  update() {
    this.scoreText.setText(`SCORE ${GameState.score}`);
    this.timeText.setText(`⏱ ${formatTime(GameState.elapsedMs)}`);
    this.hearts.forEach((heart, i) => heart.setAlpha(i < GameState.lives ? 1 : 0.18));
    if (GameState.lives !== this.shownLives) {
      // verlorenes bzw. neu gewonnenes Herz kurz aufploppen lassen
      const changedHeart = this.hearts[Math.min(GameState.lives, this.shownLives)];
      this.scene.tweens.add({ targets: changedHeart, scale: 1.8, duration: 140, yoyo: true, repeat: 1 });
    }
    this.shownLives = GameState.lives;
    this.soundOffText.setVisible(!SFX.isRunning());
  }
}
