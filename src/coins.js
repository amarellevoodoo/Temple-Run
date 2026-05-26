// ============================================
// coins.js — Coin spawning, collection, drawing
// ============================================

(function() {
  const { LANES, PLAYER_T, COIN_INTERVAL_MIN, COIN_INTERVAL_RANGE,
          laneToScreen } = TD;

  TD.coins = [];
  TD.coinTimer = 30;
  TD.totalCoins = 0;

  TD.coinsReset = function() {
    TD.coins = [];
    TD.coinTimer = 20;
    TD.totalCoins = 0;
  };

  TD.coinsUpdate = function(speed) {
    TD.coinTimer--;

    if (TD.coinTimer <= 0) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      TD.coins.push({ lane, t: 0, collected: false });
      TD.coinTimer = COIN_INTERVAL_MIN + Math.floor(Math.random() * COIN_INTERVAL_RANGE);
    }

    for (let c of TD.coins) c.t += speed;

    // Collection
    const p = TD.player;
    for (let c of TD.coins) {
      if (c.collected) continue;
      if (Math.abs(c.t - PLAYER_T) < 0.06 && Math.abs(c.lane - p.targetLane) < 0.6) {
        c.collected = true;
        TD.totalCoins++;
        TD.state.score += 100;
        TD.sfxCoin();
        const s = laneToScreen(c.lane, c.t);
        TD.spawnParticles(s.x, s.y - 15, '#ffd700', 6);
      }
    }

    TD.coins = TD.coins.filter(c => c.t < 1.3);
  };

  TD.drawCoin = function(ctx, c) {
    if (c.collected || c.t < 0 || c.t > 1.1) return;
    const s = laneToScreen(c.lane, c.t);
    const scale = c.t;
    const r = 3 + 5 * scale;
    const bob = Math.sin(Date.now() * 0.005 + c.lane * 2) * 3 * scale;

    // Glow
    const gl = ctx.createRadialGradient(s.x, s.y - 12*scale + bob, 0, s.x, s.y - 12*scale + bob, r * 2.5);
    gl.addColorStop(0, 'rgba(255,215,0,0.25)');
    gl.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(s.x - r*3, s.y - 12*scale + bob - r*3, r*6, r*6);

    // Spinning coin
    const spin = Math.sin(Date.now() * 0.004 + c.lane);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 12*scale + bob, r * Math.abs(spin), r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#daa520';
    if (Math.abs(spin) > 0.3) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 12*scale + bob, r * Math.abs(spin) * 0.5, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
})();
