'use strict';

// =====================================================================
//  GAME OVER – alle Leben verloren: der Exmatrikulationsbescheid
// =====================================================================

class GameOverScene extends ScreenScene {
  constructor() { super(SCENES.gameOver); }

  init(data) {
    this.reason = data.reason || 'Erwischt.';
  }

  create() {
    this.setupScreen(TIMING.resultInputLockMs);
    Music.stop();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x140808).setOrigin(0);

    const letter = this.createLetter();
    letter.setPosition(GAME_WIDTH / 2, 248).setAngle(-1.5).setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: letter, alpha: 1, scale: 1, y: 238, duration: 450, ease: 'Cubic.easeOut' });
    this.time.delayedCall(900, () => this.stampLetter(letter));

    addBlinkingText(this, GAME_WIDTH / 2, 492, 'Nochmal: LEERTASTE / A', textStyle(20, CSS.white));
    this.add.text(GAME_WIDTH / 2, 522, 'Menü: ESC / +', textStyle(14, CSS.gray, FONT_BODY)).setOrigin(0.5);
  }

  // Ein Brief im Behördenstil – alles relativ zur Briefmitte
  createLetter() {
    const width = 560;
    const height = 430;
    const left = -width / 2 + 34;
    const top = -height / 2;
    const serif = (size, color = '#1a1a1a', extra = {}) => ({ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: `${size}px`, color, ...extra });
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const matrikel = Phaser.Math.Between(1000000, 9999999);

    const paper = this.add.graphics();
    paper.fillStyle(0x000000, 0.35);
    paper.fillRect(-width / 2 + 8, top + 8, width, height);
    paper.fillStyle(0xfbfaf6, 1);
    paper.fillRect(-width / 2, top, width, height);
    paper.fillStyle(COLORS.danger, 1);
    paper.fillRect(-width / 2, top, width, 6);
    paper.lineStyle(1, 0xcccccc, 1);
    paper.lineBetween(left, top + 62, width / 2 - 34, top + 62);

    const parts = [paper,
      this.add.text(left, top + 18, 'DHBW Stuttgart · Fakultät Technik', serif(17, '#1a1a1a', { fontStyle: 'bold' })),
      this.add.text(left, top + 40, 'Prüfungsamt – Sprechzeiten: nie', serif(11, '#666666')),
      this.add.text(width / 2 - 34, top + 22, `Stuttgart, ${today}`, serif(12, '#444444')).setOrigin(1, 0),
      this.add.text(width / 2 - 34, top + 40, `Matrikel-Nr. ${matrikel}`, serif(12, '#444444')).setOrigin(1, 0),
      this.add.text(left, top + 78, 'Bescheid über die Exmatrikulation', serif(23, '#1a1a1a', { fontStyle: 'bold' })),
      this.add.text(left, top + 120, 'Sehr geehrte/r Studierende/r,', serif(14)),
      this.add.text(left, top + 144,
        'hiermit werden Sie mit sofortiger Wirkung exmatrikuliert. Sie wurden während der Vorlesung zu oft dabei erwischt, sich ihr zu entziehen.',
        serif(14, '#1a1a1a', { wordWrap: { width: width - 68 } })),
      this.add.text(left, top + 196, 'Begründung:', serif(14, '#1a1a1a', { fontStyle: 'bold' })),
      this.add.text(left + 96, top + 196, this.reason, serif(14, '#1a1a1a', { fontStyle: 'italic', wordWrap: { width: width - 164 } })),
      this.add.text(left, top + 236,
        `Erreichte Punkte: ${GameState.score}   ·   Studiendauer: ${formatTime(GameState.elapsedMs)}\n` +
        `Geschaffte Schritte: ${GameState.stageTimes.length}/3   ·   Erwischt worden: ${GameState.catches}×   ·   ECTS: ${GameState.ects}`,
        serif(13, '#333333', { lineSpacing: 4 })),
      this.add.text(left, top + 290,
        'Rechtsbehelfsbelehrung: Gegen diesen Bescheid kann innerhalb eines Monats Widerspruch eingelegt werden – ' +
        'oder Sie drücken einfach LEERTASTE bzw. A und versuchen es noch einmal.',
        serif(11, '#666666', { wordWrap: { width: width - 68 } })),
      this.add.text(left, top + 384, 'i. A. Prüfungsamt', serif(12, '#444444'))
    ];

    // Unterschrift als Kritzel
    const signature = this.add.graphics();
    signature.lineStyle(2, COLORS.marker, 1);
    signature.beginPath();
    signature.moveTo(left, top + 372);
    for (let i = 1; i <= 24; i++) signature.lineTo(left + i * 6, top + 366 + Math.sin(i * 1.7) * 7 - i * 0.3);
    signature.strokePath();
    parts.push(signature);

    return this.add.container(0, 0, parts);
  }

  // Roter Stempel knallt aufs Papier
  stampLetter(letter) {
    const stamp = this.add.container(125, 150);
    const frame = this.add.graphics();
    frame.lineStyle(4, COLORS.danger, 0.9);
    frame.strokeRoundedRect(-118, -30, 236, 60, 8);
    frame.strokeRoundedRect(-112, -24, 224, 48, 6);
    const label = this.add.text(0, 0, 'EXMATRIKULIERT', { fontFamily: FONT, fontSize: '24px', color: '#e02424' }).setOrigin(0.5);
    stamp.add([frame, label]);
    stamp.setAngle(-14).setScale(2.4).setAlpha(0);
    letter.add(stamp);

    this.tweens.add({
      targets: stamp,
      scale: 1,
      alpha: 0.9,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => {
        SFX.stamp();
        this.cameras.main.shake(180, 0.008);
      }
    });
  }

  update() {
    this.inputs.update();
    if (this.menuPressed()) this.scene.start(SCENES.menu);
    else if (this.confirmPressed()) this.startNewGame();
  }
}
