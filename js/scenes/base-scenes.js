'use strict';

// =====================================================================
//  BASIS-SZENEN
//  LevelScene:  gemeinsamer Rahmen der drei spielbaren Schritte
//               (Eingabe, Zeitmessung, HUD, Erwischt-Ablauf, Levelende)
//  ScreenScene: gemeinsamer Rahmen für Menü und Zwischenbildschirme
// =====================================================================

class LevelScene extends Phaser.Scene {
  // Am Anfang von create() aufrufen
  setupLevel(stageNumber) {
    this.stageNumber = stageNumber;
    this.stageInfo = STAGES[stageNumber];
    Display.setupCamera(this.cameras.main);
    TouchControls.setLayout(this.stageInfo.touchLayout, { umbrella: GameState.hasUmbrella });
    this.inputs = new GameInput(this);
    this.finished = false;
    this.hud = new Hud(this, this.stageInfo.hudLabel);
    const hint = TouchControls.enabled ? this.stageInfo.touchHint : this.stageInfo.hint;
    if (hint) this.showHint(hint);
    this.cameras.main.fadeIn(TIMING.fadeMs);
    Music.play(this.stageInfo.music);
    this.events.once('shutdown', () => {
      Music.resume();
      Music.setTempo(1);
    });
  }

  showHint(text) {
    const hint = this.add.text(0, 0, text, textStyle(15, CSS.white, FONT_BODY))
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hint);
    this.hintText = hint;
    this.layoutHint();
    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: TIMING.hintVisibleMs,
      duration: 800,
      onComplete: () => hint.destroy()
    });
  }

  // Hinweis unten mittig am echten Bildschirmrand (auch nach dem Drehen)
  layoutHint() {
    if (this.hintText && this.hintText.active) this.hintText.setPosition(Display.view.width / 2, Display.view.height - 20);
  }

  // Am Anfang von update() aufrufen. Liefert die Frame-Zeit in ms –
  // oder null, wenn die Szene gerade Richtung Menü verlassen wird.
  beginFrame(delta) {
    this.inputs.update();
    if (this.inputs.wasPressed('menu')) {
      this.scene.start(SCENES.menu);
      return null;
    }
    const dt = Math.min(delta, MAX_FRAME_MS);
    if (!this.finished) GameState.tick(dt);
    return dt;
  }

  endFrame() {
    this.hud.update();
  }

  // Gemeinsamer Ablauf beim Erwischtwerden: Effekte, Punktabzug, Leben weg.
  // Gibt true zurück, wenn das Spiel damit vorbei ist.
  punishPlayer(x, y, gameOverReason) {
    SFX.caught();
    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(200, 255, 60, 60);
    GameState.addScore(-SCORING.caughtPenalty);
    floatText(this, x, y, '-1 ♥', CSS.danger, 30);

    const gameOver = GameState.loseLife();
    this.hud.update();
    if (gameOver) {
      this.finished = true;
      SFX.lose();
      this.time.delayedCall(TIMING.gameOverDelayMs, () => {
        this.scene.start(SCENES.gameOver, { reason: gameOverReason });
      });
    }
    return gameOver;
  }

  // Herz eingesammelt: füllt ein Leben auf – bei vollen Leben gibt es stattdessen Punkte
  collectHeart(x, y) {
    if (GameState.gainLife()) {
      SFX.powerup();
      floatText(this, x, y - 16, '+1 ♥', CSS.danger, 22);
    } else {
      GameState.addScore(SCORING.fullHeartBonus);
      SFX.coin();
      floatText(this, x, y - 16, `Leben voll! +${SCORING.fullHeartBonus}`, CSS.danger, 18);
    }
    this.hud.update();
  }

  // Schritt geschafft: Banner zeigen, dann zur nächsten Zwischenkarte bzw. zum Sieg
  completeStage(bannerText, bannerColor) {
    if (this.finished) return;
    this.finished = true;
    GameState.finishStage();
    SFX.stageClear();
    showBanner(this, bannerText, bannerColor, 1400);
    this.hud.update();
    this.time.delayedCall(TIMING.stageExitDelayMs, () => {
      this.cameras.main.fadeOut(TIMING.fadeMs);
      this.cameras.main.once('camerafadeoutcomplete', () => this.goToNextStage());
    });
  }

  goToNextStage() {
    const nextStage = this.stageNumber + 1;
    if (STAGES[nextStage]) this.scene.start(SCENES.intro, { stage: nextStage });
    else this.scene.start(SCENES.win);
  }
}

class ScreenScene extends Phaser.Scene {
  // Am Anfang von create() aufrufen; Eingaben zählen erst nach inputLockMs
  setupScreen(inputLockMs = 0, touchLayout = 'screen') {
    Display.setupCamera(this.cameras.main);
    TouchControls.setLayout(touchLayout);
    this.inputs = new GameInput(this);
    this.ready = inputLockMs <= 0;
    if (!this.ready) this.time.delayedCall(inputLockMs, () => { this.ready = true; });
    this.cameras.main.fadeIn(TIMING.fadeMs);
  }

  confirmPressed() {
    return this.ready && this.inputs.wasPressed('action');
  }

  menuPressed() {
    return this.ready && this.inputs.wasPressed('menu');
  }

  startNewGame() {
    SFX.click();
    GameState.reset();
    this.scene.start(SCENES.intro, { stage: 1 });
  }
}
