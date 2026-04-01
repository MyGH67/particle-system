const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

const mouse = {
  x: 0,
  y: 0,
  radius: 150,
  active: false,
};

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  centerX: window.innerWidth * 0.5,
  centerY: window.innerHeight * 0.5,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  particles: [],
  fieldRotation: 0,
  particleCount: 0,
  linkDistance: 70,
  staticBackdrop: null,
  particleSprites: new Map(),
  coreSprite: null,
};

class Particle {
  constructor(index, total) {
    const spread = Math.min(state.width, state.height) * 0.36;
    const band = (index / total) * spread;
    const radiusBias = Math.pow(Math.random(), 0.6);
    this.orbitRadius = 40 + band + radiusBias * spread * 0.32;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0.0008 + Math.random() * 0.0016;
    this.size = 1 + Math.random() * 2.8;
    this.offset = Math.random() * Math.PI * 2;
    this.wobble = 8 + Math.random() * 22;
    this.wobbleSpeed = 0.6 + Math.random() * 1.6;
    this.pull = 0.022 + Math.random() * 0.018;
    this.damping = 0.92 + Math.random() * 0.04;
    this.x = state.centerX;
    this.y = state.centerY;
    this.vx = 0;
    this.vy = 0;
    this.isWarm = Math.random() <= 0.16;
    this.alpha = 0.34 + Math.random() * 0.42;
  }

  update(time, rotation) {
    this.angle += this.speed;

    const wobbleAngle = time * 0.001 * this.wobbleSpeed + this.offset;
    const wobbleX = Math.cos(wobbleAngle) * this.wobble;
    const wobbleY = Math.sin(wobbleAngle * 1.3) * this.wobble * 0.55;

    const targetX =
      state.centerX + Math.cos(this.angle + rotation) * this.orbitRadius + wobbleX;
    const targetY =
      state.centerY + Math.sin(this.angle + rotation) * this.orbitRadius * 0.52 + wobbleY;

    const dx = targetX - this.x;
    const dy = targetY - this.y;

    this.vx += dx * this.pull;
    this.vy += dy * this.pull;

    if (mouse.active) {
      const repelX = this.x - mouse.x;
      const repelY = this.y - mouse.y;
      const distance = Math.hypot(repelX, repelY) || 1;

      if (distance < mouse.radius) {
        const strength = (1 - distance / mouse.radius) ** 2;
        const impulse = 1.8 + strength * 10;
        this.vx += (repelX / distance) * impulse;
        this.vy += (repelY / distance) * impulse;
      }
    }

    this.vx *= this.damping;
    this.vy *= this.damping;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(time) {
    const pulse = 0.72 + (Math.sin(time * 0.003 + this.offset) + 1) * 0.18;
    const radius = this.size * pulse;
    const family = this.isWarm ? "warm" : "cool";
    const sprite = state.particleSprites.get(family);

    ctx.globalAlpha = this.alpha;
    ctx.drawImage(sprite, this.x - radius * 4, this.y - radius * 4, radius * 8, radius * 8);
  }
}

function createParticleSprite(innerColor, outerColor) {
  const spriteSize = 64;
  const spriteCanvas = document.createElement("canvas");
  const spriteCtx = spriteCanvas.getContext("2d");

  spriteCanvas.width = spriteSize;
  spriteCanvas.height = spriteSize;

  const gradient = spriteCtx.createRadialGradient(
    spriteSize * 0.5,
    spriteSize * 0.5,
    spriteSize * 0.05,
    spriteSize * 0.5,
    spriteSize * 0.5,
    spriteSize * 0.5,
  );
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.18, outerColor);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  spriteCtx.fillStyle = gradient;
  spriteCtx.beginPath();
  spriteCtx.arc(spriteSize * 0.5, spriteSize * 0.5, spriteSize * 0.5, 0, Math.PI * 2);
  spriteCtx.fill();

  return spriteCanvas;
}

function rebuildBackdrop() {
  const backdrop = document.createElement("canvas");
  const backdropCtx = backdrop.getContext("2d", { alpha: false });
  const glowRadius = Math.min(state.width, state.height) * 0.22;

  backdrop.width = Math.max(1, Math.floor(state.width));
  backdrop.height = Math.max(1, Math.floor(state.height));

  const outer = backdropCtx.createRadialGradient(
    state.centerX,
    state.centerY,
    0,
    state.centerX,
    state.centerY,
    glowRadius * 2.4,
  );
  outer.addColorStop(0, "rgba(118, 215, 255, 0.16)");
  outer.addColorStop(0.35, "rgba(48, 145, 191, 0.08)");
  outer.addColorStop(1, "rgba(2, 5, 11, 0)");

  backdropCtx.fillStyle = "#02050b";
  backdropCtx.fillRect(0, 0, state.width, state.height);
  backdropCtx.fillStyle = outer;
  backdropCtx.fillRect(0, 0, state.width, state.height);

  state.staticBackdrop = backdrop;
}

function rebuildSprites() {
  state.particleSprites.set(
    "cool",
    createParticleSprite("rgba(236, 250, 255, 1)", "rgba(112, 218, 255, 0.52)"),
  );
  state.particleSprites.set(
    "warm",
    createParticleSprite("rgba(255, 241, 220, 1)", "rgba(255, 184, 107, 0.48)"),
  );
  state.coreSprite = createParticleSprite(
    "rgba(255, 246, 230, 1)",
    "rgba(120, 214, 255, 0.3)",
  );
}

function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.centerX = state.width * 0.5;
  state.centerY = state.height * 0.5;
  const performanceFactor = window.innerWidth < 900 ? 1 : 1.5;
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, performanceFactor);

  canvas.width = Math.floor(state.width * state.pixelRatio);
  canvas.height = Math.floor(state.height * state.pixelRatio);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);

  const area = state.width * state.height;
  const hardware = navigator.hardwareConcurrency || 4;
  const densityDivisor = hardware <= 4 ? 9000 : 7000;
  state.particleCount = Math.max(120, Math.min(240, Math.floor(area / densityDivisor)));
  state.linkDistance = state.width < 768 ? 52 : 68;
  rebuildBackdrop();
  rebuildSprites();
  state.particles = Array.from(
    { length: state.particleCount },
    (_, index) => new Particle(index, state.particleCount),
  );
}

function drawBackdrop(time) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(state.staticBackdrop, 0, 0, state.width, state.height);

  const glowRadius = Math.min(state.width, state.height) * 0.22;
  const pulse = 0.96 + Math.sin(time * 0.0012) * 0.04;
  const coreSize = glowRadius * pulse * 2;
  ctx.globalAlpha = 0.94;
  ctx.drawImage(
    state.coreSprite,
    state.centerX - coreSize,
    state.centerY - coreSize,
    coreSize * 2,
    coreSize * 2,
  );
}

function drawLinks() {
  ctx.save();
  ctx.lineWidth = 0.8;

  const cellSize = state.linkDistance;
  const maxDistanceSq = cellSize * cellSize;
  const grid = new Map();

  for (let index = 0; index < state.particles.length; index += 1) {
    const particle = state.particles[index];
    const cellX = Math.floor(particle.x / cellSize);
    const cellY = Math.floor(particle.y / cellSize);
    const key = `${cellX},${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }

    grid.get(key).push(particle);
  }

  const neighborOffsets = [
    [0, 0],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const [key, bucket] of grid) {
    const [cellX, cellY] = key.split(",").map(Number);

    for (const [offsetX, offsetY] of neighborOffsets) {
      const neighborKey = `${cellX + offsetX},${cellY + offsetY}`;
      const neighborBucket = grid.get(neighborKey);

      if (!neighborBucket) {
        continue;
      }

      const sameBucket = neighborKey === key;

      for (let aIndex = 0; aIndex < bucket.length; aIndex += 1) {
        const a = bucket[aIndex];
        const startIndex = sameBucket ? aIndex + 1 : 0;

        for (let bIndex = startIndex; bIndex < neighborBucket.length; bIndex += 1) {
          const b = neighborBucket[bIndex];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq > maxDistanceSq) {
            continue;
          }

          const alpha = 0.13 * (1 - distanceSq / maxDistanceSq);
          ctx.strokeStyle = `rgba(123, 212, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  ctx.restore();
}

function animate(time) {
  state.fieldRotation += 0.00055;
  drawBackdrop(time);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const particle of state.particles) {
    particle.update(time, state.fieldRotation);
  }

  drawLinks();

  for (const particle of state.particles) {
    particle.draw(time);
  }

  ctx.restore();
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize, { passive: true });

window.addEventListener("pointermove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;
}, { passive: true });

window.addEventListener("pointerleave", () => {
  mouse.active = false;
}, { passive: true });

window.addEventListener("touchend", () => {
  mouse.active = false;
}, { passive: true });

resize();
requestAnimationFrame(animate);