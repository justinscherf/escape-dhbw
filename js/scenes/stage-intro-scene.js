'use strict';

// =====================================================================
//  ZWISCHENKARTE – erklärt Ziel und Steuerung vor jedem Schritt
// =====================================================================

class StageIntroScene extends ScreenScene {
  constructor() { super(SCENES.intro); }

  init(data) {
    this.stage = STAGES[data.stage];
  }

  create() {
    this.setupScreen(TIMING.introInputLockMs);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black).setOrigin(0);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 380, COLORS.charcoal).setStrokeStyle(4, COLORS.floor);

    this.add.text(GAME_WIDTH / 2, 120, this.stage.title, textStyle(34, CSS.white)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 205, this.stage.text, {
      ...textStyle(19, CSS.white, FONT_BODY),
      align: 'center',
      wordWrap: { width: 680 }
    }).setOrigin(0.5);
    const controls = TouchControls.enabled ? this.stage.touchControls : this.stage.controls;
    controls.forEach((line, i) => {
      this.add.text(GAME_WIDTH / 2, 280 + i * 26, line, textStyle(15, CSS.accent, FONT_BODY)).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, 365,
      `Leben: ${'♥'.repeat(GameState.lives)}     Score: ${GameState.score}     Zeit: ${formatTime(GameState.elapsedMs)}`,
      textStyle(16, CSS.gray, FONT_BODY)).setOrigin(0.5);

    if (GameState.hasUmbrella && this.stage.sceneKey === SCENES.platform) {
      const swingKey = TouchControls.enabled ? 'Button ☂' : 'LEERTASTE   ·   Controller: X / Y';
      this.add.text(GAME_WIDTH / 2, 390, `☂ DHBW-Schirm schwingen:  ${swingKey}  –  wehrt Papierflieger ab und betäubt Dozenten`,
        textStyle(15, CSS.accent, FONT_BODY)).setOrigin(0.5);
    }

    addBlinkingText(this, GAME_WIDTH / 2, 420, TouchControls.enabled ? 'Bereit? WEITER tippen' : 'Bereit? LEERTASTE / A', textStyle(22, CSS.success));
  }

  update() {
    this.inputs.update();
    if (this.menuPressed()) {
      this.scene.start(SCENES.menu);
    } else if (this.confirmPressed()) {
      SFX.click();
      this.scene.start(this.stage.sceneKey);
    }
  }
}
