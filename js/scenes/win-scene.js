'use strict';

// =====================================================================
//  GEWONNEN – zuhause auf dem Sofa, mit Endabrechnung und Rekorden
// =====================================================================

class WinScene extends ScreenScene {
  constructor() { super(SCENES.win); }

  create() {
    this.setupScreen(TIMING.resultInputLockMs);
    const result = GameState.calculateResult();
    const records = Records.submit(result.total, GameState.elapsedMs);

    this.drawHome();
    this.add.text(GAME_WIDTH / 2, 60, 'ZUHAUSE! 🛋️', textStyle(54, CSS.success)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 110, 'Du bist der DHBW entkommen. Die Vorlesungsfolien liest du … irgendwann.',
      textStyle(17, CSS.white, FONT_BODY)).setOrigin(0.5);

    const [lecture = 0, hall = 0, stairs = 0] = GameState.stageSplits();
    const lines = [
      `Zeit gesamt: ${formatTime(GameState.elapsedMs)}${records.isNewBestTime ? '   ★ NEUE BESTZEIT' : ''}`,
      `  Vorlesung ${formatTime(lecture)} · Hörsaal ${formatTime(hall)} · Treppenhaus ${formatTime(stairs)}`,
      `Punkte im Spiel: ${GameState.score}   (ECTS gesammelt: ${GameState.ects})`,
      `Zeitbonus: +${result.timeBonus}`,
      `Lebensbonus: ${GameState.lives} × ${SCORING.lifeBonus} = +${result.lifeBonus}`,
      `Erwischt worden: ${GameState.catches}×${GameState.hasUmbrella ? `   ·   Papierflieger abgewehrt: ${GameState.planesDeflected}` : ''}`
    ];
    lines.forEach((line, i) => {
      this.add.text(GAME_WIDTH / 2, 160 + i * 28, line, textStyle(17, i === 0 ? CSS.accent : CSS.white, FONT_BODY)).setOrigin(0.5);
    });

    const scoreText = this.add.text(GAME_WIDTH / 2, 345, `ENDSTAND: ${result.total}`, textStyle(40, CSS.accent)).setOrigin(0.5);
    this.tweens.add({ targets: scoreText, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    if (records.isNewHighscore) {
      this.add.text(GAME_WIDTH / 2, 385, '★ NEUER HIGHSCORE ★', textStyle(22, CSS.dopamine)).setOrigin(0.5);
    }
    addBlinkingText(this, GAME_WIDTH / 2, 515, 'LEERTASTE / A  →  Menü', textStyle(18, CSS.white));

    this.launchConfetti();
    Music.stop();
    SFX.win();
    this.time.delayedCall(1800, () => Music.play('menu'));
  }

  drawHome() {
    const g = this.add.graphics().setDepth(-1);
    g.fillStyle(0x1b1b1b, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(0, 460, GAME_WIDTH, 80);
    // Sofa
    g.fillStyle(0x6b6b6b, 1);
    g.fillRoundedRect(330, 400, 300, 70, 14);
    g.fillStyle(0x8a8a8a, 1);
    g.fillRoundedRect(310, 420, 40, 60, 10);
    g.fillRoundedRect(610, 420, 40, 60, 10);
    // Spieler liegt auf dem Sofa
    hiRes(this.add.image(470, 400, TEX.playerIdle), 1.4).setAngle(-80);
    this.add.text(545, 380, 'Zzz', textStyle(18, CSS.gray));
  }

  launchConfetti() {
    const emitter = this.add.particles(0, -10, TEX.pixel, {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 80, max: 200 },
      speedX: { min: -40, max: 40 },
      rotate: { min: 0, max: 360 },
      lifespan: 4000,
      scale: hiResScale(1),
      quantity: 2,
      frequency: 60,
      tint: [COLORS.accent, COLORS.dopamine, COLORS.floorLight, COLORS.success, COLORS.white]
    });
    this.time.delayedCall(3500, () => emitter.stop());
  }

  update() {
    this.inputs.update();
    if (this.confirmPressed() || this.menuPressed()) {
      SFX.click();
      this.scene.start(SCENES.menu);
    }
  }
}
