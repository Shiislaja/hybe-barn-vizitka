let font;
let introPoints = [];
let introAlpha = 255;
let introActive = true;
let showVizitka = false;
let introStart;
let introFinished = false;
let introFadeOut = false;
let fadeOutSpeed = 5;
let ambientSound;
let ambientStarted = false;
let muted = false;
let muteButton;
let volumeSlider;
let dynamicBg;
let anyHovered = false;

let angleOffset = 0;
let smoothedOffsetX = 0;
let smoothedOffsetY = 0;

let introExploding = false;
let particlesStarted = false;
let particleSpawnInterval;
let particlesToSpawn = 120;
let particlesPerBatch = 4;
let spawnDelay = 50;

let angleSpeed = 0.004;

let links = [
  { label: "DOMOV", url: "https://hybebarn.eu" },
  { label: "GALÉRIA", url: "https://hybebarn.eu/gallery" },
  { label: "NEWSLETTER", url: "https://hybebarn.eu/newsletter" },
  { label: "INSTAGRAM", url: "https://instagram.com/hybebarn" },
  { label: "KONTAKT", url: "mailto:hybe.barn@outlook.com" }
];

let positions = [];
let particles = [];

function preload() {
  font = loadFont("assets/Tanker-Regular.ttf");
  ambientSound = loadSound('assets/ambient.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textAlign(CENTER, CENTER);
  colorMode(HSB, 360, 100, 100, 100);
  userStartAudio().then(() => {
    ambientSound.setVolume(0);
    ambientSound.loop();
    ambientSound.fade(0.05, 3);
  });

  let h = new Date().getHours();
  if (h >= 6 && h < 12) {
    dynamicBg = color("#8FCB9B");
  } else if (h >= 12 && h < 18) {
    dynamicBg = color("#5A8E6F");
  } else {
    dynamicBg = color("#0C2F26");
  }

  let bounds = font.textBounds("HYBE BARN", 0, 0, 160);
  let pts = font.textToPoints("HYBE BARN", width / 2 - bounds.w / 2, height / 2 + bounds.h / 2, 160, {
    sampleFactor: 0.18
  });

  for (let pt of pts) {
    introPoints.push({
      x: random(width),
      y: random(height),
      tx: pt.x,
      ty: pt.y,
      vx: random(-2, 2),
      vy: random(-2, 2)
    });
  }

  for (let i = 0; i < 120; i++) {
    particles.push(new Particle());
  }

  introStart = millis();

  muteButton = createButton("🔊");
  muteButton.position(20, 20);
  muteButton.style("font-family", "Tanker");
  muteButton.style("font-size", "18px");
  muteButton.style("background", "none");
  muteButton.style("color", "white");
  muteButton.style("border", "1px solid white");
  muteButton.style("padding", "4px 8px");
  muteButton.style("cursor", "pointer");
  muteButton.mousePressed(toggleMute);

  volumeSlider = createSlider(0, 1, 0.05, 0.01);
  volumeSlider.position(90, 25);
  volumeSlider.style("width", "80px");
  volumeSlider.style("background", "white");
}

function toggleMute() {
  if (muted) {
    ambientSound.setVolume(volumeSlider.value());
    muteButton.html("🔊");
  } else {
    ambientSound.setVolume(0);
    muteButton.html("🔇");
  }
  muted = !muted;
}

function draw() {
  let hueValue = map(mouseX, 0, width, 60, 160);
  let brightness = map(mouseY, 0, height, 95, 30);
  background(hueValue, 40, brightness);

  if (!muted) {
    ambientSound.setVolume(volumeSlider.value());
  }

  if (introActive) {
    drawIntro();
    return;
  }

  for (let p of particles) {
    p.update();
    p.display();
  }

  let center = createVector(width / 2, height / 2);
  let radius = min(width, height) * 0.33;
  anyHovered = false;

  let minDist = Infinity;
  for (let pos of positions) {
    let d = dist(mouseX, mouseY, pos.x, pos.y);
    if (d < minDist) minDist = d;
  }

  let maxStopDist = 60;
  let rotSpeed = map(minDist, 0, maxStopDist, 0, angleSpeed);
  rotSpeed = constrain(rotSpeed, 0, angleSpeed);
  angleOffset += rotSpeed;

  let dx = mouseX - center.x;
  let dy = mouseY - center.y;
  let tiltMagnitude = 20;
  let offsetVec = createVector(dx, dy).limit(tiltMagnitude);
  smoothedOffsetX = lerp(smoothedOffsetX, offsetVec.x, 0.05);
  smoothedOffsetY = lerp(smoothedOffsetY, offsetVec.y, 0.05);

  positions = [];

  for (let i = 0; i < links.length; i++) {
    let angle = TWO_PI * i / links.length + angleOffset;
    let baseX = cos(angle) * radius + center.x + smoothedOffsetX;
    let baseY = sin(angle) * radius + center.y + smoothedOffsetY;

    let d = dist(mouseX, mouseY, baseX, baseY);
    let isHovered = d < 80;
    if (isHovered) anyHovered = true;

    let attractStrength = map(d, 0, 80, 12, 0);
    let magnetX = lerp(baseX, mouseX, constrain(attractStrength / 100, 0, 0.3));
    let magnetY = lerp(baseY, mouseY, constrain(attractStrength / 100, 0, 0.3));

    let size = isHovered ? 32 + sin(frameCount * 0.2 + i) * 4 : 26;
    textSize(size);

    for (let g = 5; g > 0; g--) {
      fill(0, 0, 100, 6 * g);
      text(links[i].label, magnetX, magnetY);
    }

    fill(255);
    text(links[i].label, magnetX, magnetY);

    positions.push({ x: magnetX, y: magnetY, w: textWidth(links[i].label), h: size, url: links[i].url });

    for (let p of particles) {
      let dLine = dist(p.pos.x, p.pos.y, magnetX, magnetY);
      if (dLine < 70) {
        stroke(255, map(dLine, 0, 70, 80, 0));
        line(p.pos.x, p.pos.y, magnetX, magnetY);
      }
    }
    noStroke();
  }

  cursor(anyHovered ? "pointer" : "default");

  fill(255, 90);
  textSize(16);
  text("© Hybe Barn", width / 2, height - 24);

  if (!introActive && showVizitka) {
    for (let pt of introPoints) {
      pt.x += random(-0.5, 0.5);
      pt.y += random(-0.5, 0.5);

      fill(255, map(sin(frameCount * 0.05), -1, 1, 20, 60));
      noStroke();
      ellipse(pt.x, pt.y, 2, 2);
    }
    fill(255, 50);
    textSize(160);
    text("HYBE BARN", width / 2, height / 2);
  }
}

function drawIntro() {
  for (let pt of introPoints) {
    if (introExploding) {
      let dir = createVector(pt.x - mouseX, pt.y - mouseY).normalize().mult(2);
      pt.vx += dir.x + random(-0.5, 0.5);
      pt.vy += dir.y + random(-0.5, 0.5);
    } else {
      let dx = pt.tx - pt.x;
      let dy = pt.ty - pt.y;
      pt.vx += dx * 0.01;
      pt.vy += dy * 0.01;
    }

    pt.vx *= 0.9;
    pt.vy *= 0.9;
    pt.x += pt.vx;
    pt.y += pt.vy;

    noStroke();
    fill(255, introAlpha);
    ellipse(pt.x, pt.y, 2.8, 2.8);
  }

  if (introExploding) {
    introAlpha -= fadeOutSpeed;
    if (introAlpha <= 0) {
      introActive = false;
      showVizitka = true;
      if (!particlesStarted) {
        startParticleSpawn();
        particlesStarted = true;
      }
    }
  } else if (!introFadeOut && millis() - introStart > 4500) {
    introFinished = true;
  }

  if (introFadeOut) {
    introAlpha -= fadeOutSpeed;
    if (introAlpha <= 0) {
      introActive = false;
      showVizitka = true;
      if (!particlesStarted) {
        startParticleSpawn();
        particlesStarted = true;
      }
    }
  }

  if (introFinished && !introFadeOut && !introExploding) {
    introFadeOut = true;
  }
} // ← musí tu byť iba jedna uzatváracia zátvorka

function startParticleSpawn() {
  let spawned = 0;
  particleSpawnInterval = setInterval(() => {
    for (let i = 0; i < particlesPerBatch && spawned < particlesToSpawn; i++) {
      particles.push(new Particle());
      spawned++;
    }
    if (spawned >= particlesToSpawn) {
      clearInterval(particleSpawnInterval);
    }
  }, spawnDelay);
}

function mouseMoved() {
  if (introFinished && !introFadeOut && !introExploding) {
    introExploding = true;
  }
}

function mousePressed() {
  if (!ambientStarted && ambientSound && !ambientSound.isPlaying()) {
    ambientStarted = true;
    ambientSound.setVolume(0, 0);
    ambientSound.loop();
    ambientSound.fade(0.2, 3);
  }

  if (!showVizitka) return;

  for (let pos of positions) {
    if (abs(mouseX - pos.x) < pos.w / 2 && abs(mouseY - pos.y) < pos.h / 2) {
      window.open(pos.url, "_blank");
    }
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(0.5);
    this.offset = random(1000);
  }

  update() {
    let angle = noise(this.pos.x * 0.002, this.pos.y * 0.002, frameCount * 0.004 + this.offset) * TWO_PI * 2;
    let force = p5.Vector.fromAngle(angle).mult(0.15);
    this.vel.add(force);
    this.vel.limit(0.8);
    this.pos.add(this.vel);

    let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    if (d < 80) {
      let repel = p5.Vector.sub(this.pos, createVector(mouseX, mouseY)).setMag(0.8);
      this.vel.add(repel);
    }
    this.wrap();
  }

  wrap() {
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  display() {
    fill(0, 0, 100, 80);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 3.5, 3.5);

    let hue = map(this.pos.x, 0, width, 180, 360);
    let bri = map(this.pos.y, 0, height, 40, 100);
    fill(hue, 80, bri, 60);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 2.5, 2.5);
  }
}
