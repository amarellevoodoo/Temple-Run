// ============================================
// particles.js — Particle system
// ============================================

(function() {
  TD.particles = [];

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

  TD.particlesUpdate = function() {
    TD.particles = TD.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      return --p.life > 0;
    });
  };

  TD.drawParticles = function(ctx) {
    for (let p of TD.particles) {
      ctx.globalAlpha = p.life / p.ml;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;
  };

  TD.particlesReset = function() {
    TD.particles = [];
  };
})();
