'use strict';

// =====================================================================
//  MENÜ – Titel, Rekorde und Live-Anzeige der erkannten Controller
// =====================================================================

class MenuScene extends ScreenScene {
  constructor() { super(SCENES.menu); }

  create() {
    this.setupScreen(0, 'menu');
    Music.play('menu');
    this.drawBuilding();

    const title = this.add.text(GAME_WIDTH / 2, 110, 'ESCAPE DHBW', textStyle(76, CSS.white)).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 118, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(GAME_WIDTH / 2, 175, 'Raus aus der Vorlesung. Rein ins Sofa.', textStyle(20, CSS.accent, FONT_BODY)).setOrigin(0.5);

    const startHint = TouchControls.enabled ? 'START tippen' : 'LEERTASTE / A  →  Start';
    addBlinkingText(this, GAME_WIDTH / 2, 255, startHint, textStyle(26, CSS.white), 0.25);

    const records = Records.load();
    this.add.text(GAME_WIDTH / 2, 300,
      `Highscore: ${records.highscore}     Bestzeit: ${records.bestTime ? formatTime(records.bestTime) : '--:--'}`,
      textStyle(18, CSS.gray, FONT_BODY)).setOrigin(0.5);

    // Gut sichtbarer Hinweis, solange der Browser den Ton noch sperrt
    this.soundHint = this.add.container(GAME_WIDTH / 2, 214, [
      this.add.rectangle(0, 0, 780, 34, 0x7a1010, 0.9).setStrokeStyle(2, COLORS.accent),
      this.add.text(0, 0, '🔇 Ton ist aus – einmal ins Spiel klicken/tippen oder eine Taste auf der Tastatur drücken (Controller zählt nicht)',
        textStyle(14, CSS.white, FONT_BODY)).setOrigin(0.5)
    ]);
    this.tweens.add({ targets: this.soundHint, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });

    // Ton-Diagnose: zeigt, ob der Browser den Ton freigegeben hat (hilft bei Safari-Problemen)
    this.audioText = this.add.text(GAME_WIDTH / 2, 478, '', textStyle(12, CSS.gray, FONT_BODY)).setOrigin(0.5).setDepth(5);

    this.padText = this.add.text(GAME_WIDTH / 2, 318, '', { ...textStyle(13, CSS.gray, FONT_BODY), align: 'center' })
      .setOrigin(0.5, 0);

    this.add.text(GAME_WIDTH / 2, 505,
      'Pfeiltasten/WASD · ↑/W springen · LEERTASTE = Aktion   ·   Controller: A/B springen, X/Y Schirm   ·   ESC / + = Menü',
      textStyle(13, CSS.white, FONT_BODY)).setOrigin(0.5);
    this.versionText = this.add.text(0, 0, `v${GAME_VERSION}`, textStyle(11, CSS.gray, FONT_BODY)).setOrigin(1, 1).setScrollFactor(0);
    this.onViewResize();
  }

  // Versionsnummer in die echte rechte untere Ecke
  onViewResize() {
    this.versionText.setPosition(Display.view.width - 8, Display.view.height - 6);
  }

  drawBuilding() {
    const ext = Display.extent();
    const g = this.add.graphics();
    g.fillStyle(0x151515, 1);
    g.fillRect(ext.left, ext.top, ext.width, ext.height);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(90, 350, 780, 140);
    g.fillStyle(0x3b3b3b, 1);
    g.fillRect(140, 365, 680, 125);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 14; col++) {
        const isLit = Math.random() < 0.45;
        g.fillStyle(isLit ? 0xe8e8e8 : 0x1c1c1c, 1);
        g.fillRect(160 + col * 47, 378 + row * 34, 30, 20);
      }
    }
    g.fillStyle(COLORS.black, 1);
    g.fillRect(450, 455, 60, 35);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(ext.left, 488, ext.width, ext.bottom - 488);
    g.fillStyle(COLORS.floorLight, 1);
    g.fillRect(ext.left, 488, ext.width, 4);
    this.add.text(GAME_WIDTH / 2, 352, 'DHBW', textStyle(18, CSS.white)).setOrigin(0.5, 0);
  }

  update() {
    this.inputs.update();
    this.soundHint.setVisible(!SFX.isRunning());
    this.audioText.setText(SFX.describe());
    this.audioText.setColor(SFX.lastError ? CSS.danger : CSS.gray);
    this.padText.setText(TouchControls.enabled ? '📱 Touch-Steuerung aktiv' : GameInput.describeGamepads().join('\n'));
    this.padText.setColor(this.inputs.hasGamepad || TouchControls.enabled ? CSS.success : CSS.gray);
    if (this.confirmPressed()) this.startNewGame();
  }
}
