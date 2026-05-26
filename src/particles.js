// ============================================
// particles.js — Particle system + ambient dust/leaves
// ============================================

(function() {
  const { W, H, VP_X, VP_Y, GROUND_BOTTOM, pathHalfW } = TD;

  TD.particles = [];
  TD.ambient = [];

  TD.spawnParticles = function(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      TD.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 25 + Math.random() * 20,
        ml: 45,
        col,
        sz: 1.5 + Math.random() * 2.5
      });
    }
  };

  TD.ambientReset = function() {
    TD.ambient = [];
  };

  TD.ambientUpdate = function() {
    const s = TD.state;
    if (!s || !s.running || s.paused) return;

    const biome = s.activeBiomeIndex || 0;
    const spawnChance = biome === 1 ? 0.32 : biome === 2 ? 0.22 : 0.18;
    if (Math.random() > spawnChance) return;

    const t = 0.25 + Math.random() * 0.65;
    const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw = pathHalfW(t);
    const x = VP_X + (Math.random() - 0.5) * hw * 1.6;

    let col, vy, vx;
    if (biome === 1) {
      col = Math.random() < 0.5 ? '#3a7a28' : '#5a9a35';
      vy = 0.4 + Math.random() * 0.8;
      vx = (Math.random() - 0.5) * 0.6;
    } else if (biome === 2) {
      col = 'rgba(220,235,245,0.85)';
      vy = 0.2 + Math.random() * 0.5;
      vx = (Math.random() - 0.5) * 0.4;
    } else if (biome === 3) {
      col = Math.random() < 0.5 ? '#ff8844' : '#ffcc66';
      vy = -0.3 - Math.random() * 0.6;
      vx = (Math.random() - 0.5) * 0.5;
    } else {
      col = 'rgba(180,200,220,0.55)';
      vy = 0.25 + Math.random() * 0.55;
      vx = (Math.random() - 0.5) * 0.45;
    }

    TD.ambient.push({
      x, y,
      vx, vy,
      life: 40 + Math.random() * 35,
      ml: 75,
      col,
      sz: 1 + Math.random() * 2.2,
    });
  };

  TD.particlesUpdate = function() {
    TD.particles = TD.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      return --p.life > 0;
    });

    TD.ambient = TD.ambient.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      return --p.life > 0;
    });
  };

  TD.drawParticles = function(ctx) {
    for (const p of TD.particles) {
      ctx.globalAlpha = p.life / p.ml;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;
  };

  TD.drawAmbient = function(ctx) {
    for (const p of TD.ambient) {
      ctx.globalAlpha = (p.life / p.ml) * 0.65;
      ctx.fillStyle = p.col;
      if (TD.state.activeBiomeIndex === 1) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.sz, p.sz * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      }
    }
    ctx.globalAlpha = 1;
  };

  TD.particlesReset = function() {
    TD.particles = [];
    TD.ambient = [];
  };
})();
