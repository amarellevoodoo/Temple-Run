// ============================================
// game.js — Main loop, init, update, draw
// ============================================

(function() {
  const { W, H, BASE_SPEED, MAX_SPEED, SPEED_INCREMENT, PLAYER_T, laneToScreen } = TD;

  const canvas = TD.canvas;
  const ctx = canvas.getContext('2d');

  // Shared game state
  TD.state = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('tdH2') || '0'),
    speed: 0,
    distance: 0,
    screenShake: 0,
    activeBiomeIndex: 0,
  };

  // ---- Init ----
  TD.init = function() {
    const s = TD.state;
    s.score = 0;
    s.distance = 0;
    s.speed = BASE_SPEED;
    s.screenShake = 0;
    s.gameOver = false;
    s.activeBiomeIndex = 0;

    TD.playerReset();
    TD.obstaclesReset();
    TD.coinsReset();
    TD.particlesReset();
  };

  // ---- Die ----
  function die() {
    const s = TD.state;
    s.gameOver = true;
    s.running = false;
    s.screenShake = 12;

    TD.sfxDeath();
    TD.music.stop();

    const ps = laneToScreen(TD.player.targetLane, PLAYER_T);
    TD.spawnParticles(ps.x, ps.y - 25, '#ff4400', 18);
    TD.spawnParticles(ps.x, ps.y - 25, '#ffaa00', 10);

    if (s.score > s.highScore) {
      s.highScore = s.score;
      localStorage.setItem('tdH2', s.highScore.toString());
    }

    // Submit to global leaderboard (fire-and-forget; gracefully no-ops if not configured)
    if (TD.leaderboard && typeof TD.leaderboard.submit === 'function' && s.score > 0) {
      const name = TD.leaderboard.getPlayerName();
      TD.leaderboard.submit(name, s.score).catch(() => { /* ignore network errors */ });
    }

    setTimeout(() => TD.showOverlay(true), 700);
  }

  // ---- Update ----
  function update() {
    const s = TD.state;

    if (!s.running) {
      TD.particlesUpdate();
      if (s.screenShake > 0) s.screenShake--;
      return;
    }

    // Speed ramp
    s.speed = Math.min(MAX_SPEED, s.speed + SPEED_INCREMENT);
    s.distance += s.speed;
    s.score = Math.floor(s.distance * 400);

    // Biome transition detection (distance is in game units; *100 == meters)
    const meters = s.distance * 100;
    const newBiomeIdx = TD.getActiveBiomeIndex(meters);
    if (newBiomeIdx !== s.activeBiomeIndex) {
      s.activeBiomeIndex = newBiomeIdx;
      if (TD.showBiomeBanner) TD.showBiomeBanner(TD.biomes[newBiomeIdx].name);
    }

    TD.playerUpdate();
    TD.obstaclesUpdate(s.speed);
    TD.coinsUpdate(s.speed);
    TD.treesUpdate(s.speed);

    // Collision
    if (TD.obstaclesCheckCollision()) {
      die();
      return;
    }

    TD.particlesUpdate();
    if (s.screenShake > 0) s.screenShake--;
  }

  // ---- Draw ----
  function draw() {
    const s = TD.state;

    ctx.save();
    if (s.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * s.screenShake, (Math.random() - 0.5) * s.screenShake);
    }

    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, 0, W, H);

    TD.drawSky(ctx);
    TD.drawGround(ctx, s.distance);
    TD.drawWalls(ctx);
    TD.drawTrees(ctx);

    // Z-sorted draw list
    const drawList = [];
    for (const o of TD.obstacles)  drawList.push({ t: o.t, type: 'obs',  obj: o });
    for (const c of TD.coins)      if (!c.collected) drawList.push({ t: c.t, type: 'coin', obj: c });
    drawList.push({ t: TD.playerEffectiveT(), type: 'player' });
    drawList.sort((a, b) => a.t - b.t);

    for (const item of drawList) {
      if      (item.type === 'obs')    TD.drawObstacle(ctx, item.obj);
      else if (item.type === 'coin')   TD.drawCoin(ctx, item.obj);
      else                             TD.drawRunner(ctx);
    }

    TD.drawParticles(ctx);
    TD.drawVignette(ctx);

    // Death flash
    if (s.gameOver && s.screenShake > 4) {
      ctx.fillStyle = `rgba(255,0,0,${(s.screenShake - 4) / 14})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
    TD.updateHUD();
  }

  // ---- Loop ----
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
})();
