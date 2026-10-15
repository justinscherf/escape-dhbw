'use strict';

// =====================================================================
//  FIGUREN – Zeichenfunktionen für Dozent und Kommilitonen
//  Reine Darstellung: bekommen ein Graphics-Objekt und malen hinein.
// =====================================================================

// ---------- Dozent in der Ego-Ansicht (Ursprung = zwischen den Füßen) ----------
function drawLecturerLegs(g) {
  g.fillStyle(COLORS.charcoal, 1);
  g.fillRect(-26, -70, 20, 70);
  g.fillRect(6, -70, 20, 70);
  g.fillStyle(COLORS.black, 1);
  g.fillRect(-30, -8, 26, 8);
  g.fillRect(4, -8, 26, 8);
}

// Rücken zur Klasse, schreibt mit erhobenem Arm an die Tafel
function drawLecturerBack(g) {
  drawLecturerLegs(g);
  g.fillStyle(COLORS.suit, 1);
  g.fillRoundedRect(-45, -185, 90, 125, 18);
  g.lineStyle(18, COLORS.suit, 1);
  g.lineBetween(35, -170, 70, -232);
  g.lineBetween(-40, -165, -48, -92);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(72, -238, 9);
  g.fillCircle(-48, -86, 9);
  g.fillRect(-10, -198, 20, 16);
  g.fillCircle(-30, -220, 6);
  g.fillCircle(30, -220, 6);
  g.fillStyle(COLORS.marker, 1);
  g.fillRect(74, -254, 6, 16);
  g.fillStyle(COLORS.grayHair, 1);
  g.fillCircle(0, -222, 30);
  g.fillStyle(COLORS.skin, 1);
  g.fillEllipse(0, -238, 30, 16); // Glatze
}

// Halb umgedreht (Profil)
function drawLecturerSide(g) {
  drawLecturerLegs(g);
  g.fillStyle(COLORS.suit, 1);
  g.fillRoundedRect(-30, -185, 60, 125, 16);
  g.lineStyle(18, COLORS.suit, 1);
  g.lineBetween(0, -165, 8, -92);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(8, -86, 9);
  g.fillRect(-8, -198, 18, 16);
  g.fillStyle(COLORS.grayHair, 1);
  g.fillCircle(-6, -226, 29);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(5, -220, 25);
  g.fillTriangle(26, -228, 40, -214, 26, -208);
  g.fillStyle(COLORS.black, 1);
  g.fillCircle(16, -226, 3.5);
  g.lineStyle(2, COLORS.black, 1);
  g.strokeCircle(16, -226, 8);
  g.lineBetween(10, -238, 24, -236);
}

// Schaut in die Klasse – mit Brille und strengem Blick
function drawLecturerFront(g) {
  drawLecturerLegs(g);
  g.fillStyle(COLORS.suit, 1);
  g.fillRoundedRect(-45, -185, 90, 125, 18);
  g.fillStyle(COLORS.white, 1);
  g.fillTriangle(-18, -185, 18, -185, 0, -128);
  g.fillStyle(COLORS.black, 1);
  g.fillTriangle(-6, -182, 6, -182, 0, -120);
  g.lineStyle(18, COLORS.suit, 1);
  g.lineBetween(-40, -168, -50, -92);
  g.lineBetween(40, -168, 50, -92);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(-50, -86, 9);
  g.fillCircle(50, -86, 9);
  g.fillRect(-10, -198, 20, 16);
  g.fillCircle(0, -222, 28);
  g.fillStyle(COLORS.grayHair, 1);
  g.fillEllipse(0, -248, 54, 18);
  g.fillCircle(-26, -230, 8);
  g.fillCircle(26, -230, 8);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(-10, -224, 7);
  g.fillCircle(10, -224, 7);
  g.fillStyle(COLORS.black, 1);
  g.fillCircle(-8, -222, 3.5);
  g.fillCircle(12, -222, 3.5);
  g.lineStyle(2, COLORS.black, 1);
  g.strokeCircle(-10, -224, 10);
  g.strokeCircle(10, -224, 10);
  g.lineStyle(3, COLORS.black, 1);
  g.lineBetween(-21, -240, -4, -234);
  g.lineBetween(4, -234, 21, -240);
  g.lineBetween(-8, -205, 8, -207);
}

// ---------- Kommilitone von hinten (Ego-Ansicht) ----------
function drawStudentBack(g, x, y, scale, hairColor, shirtColor) {
  g.fillStyle(shirtColor, 1);
  g.fillRoundedRect(x - 30 * scale, y, 60 * scale, 44 * scale, 14 * scale);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(x - 17 * scale, y - 12 * scale, 4 * scale);
  g.fillCircle(x + 17 * scale, y - 12 * scale, 4 * scale);
  g.fillStyle(hairColor, 1);
  g.fillCircle(x, y - 14 * scale, 18 * scale);
}

// ---------- Draufsicht (Schritt 2) ----------
// Dozent schaut nach rechts (+x); gedreht wird über den Container
function drawLecturerTopDown(g) {
  g.fillStyle(COLORS.suit, 1);
  g.fillEllipse(0, 0, 24, 40);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(12, 0, 3);
  g.fillStyle(COLORS.grayHair, 1);
  g.fillCircle(2, 0, 11);
}

// Sitzender Kommilitone, schaut zur Tafel (nach oben)
function drawStudentTopDown(g, x, y, shirtColor) {
  g.fillStyle(shirtColor, 1);
  g.fillEllipse(x, y + 2, 28, 20);
  g.fillStyle(COLORS.black, 1);
  g.fillCircle(x, y - 1, 8);
}
