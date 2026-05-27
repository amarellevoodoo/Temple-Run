// ============================================
// game.js — Main loop, init, update, draw
// ============================================

(function() {
  const { W, H, BASE_SPEED, MAX_SPEED, SPEED_INCREMENT, SPEED_RAMP_START_METERS,
          INVINCIBLE_FRAMES, PLAYER_T, laneToScreen, pathHalfW } = TD;

  const canvas = TD.canvas;
  const ctx = canvas.getContext('2d');

  // Shared game state
  TD.state = {
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('tdH2') || '0'),
    speed: 0,
    distance: 0,
    screenShake: 0,
    activeBiomeIndex: 0,
    coinStreak: 0,         // consecutive coins collected without missing any
    invincibleFrames: 0,   // remaining frames of the invincibility power-up
  };

  // ---- Init ----
  TD.init = function() {
    const s = TD.state;
    s.score = 0;
    s.distance = 0;
    s.speed = BASE_SPEED;
    s.screenShake = 0;
    s.gameOver = false;
    s.paused = false;
    s.activeBiomeIndex = 0;
    s.coinStreak = 0;
    s.invincibleFrames = 0;

    TD.playerReset();
    TD.obstaclesReset();
    TD.coinsReset();
    TD.particlesReset();
    if (TD.pathDecorReset) TD.pathDecorReset();
    if (TD.ambientReset) TD.ambientReset();
    if (TD.syncVisualBiome) TD.syncVisualBiome();
  };

  // ---- Invincibility power-up ----
  // Triggered from coins.js when the player completes a coin streak.
  // Spawns a sparkle burst at the player's feet and starts the countdown.
  TD.activateInvincibility = function() {
    const s = TD.state;
    s.invincibleFrames = INVINCIBLE_FRAMES;
    s.coinStreak = 0;
    const ps = laneToScreen(TD.player.targetLane, PLAYER_T);
    TD.spawnParticles(ps.x, ps.y - 30, '#ffd700', 18);
    TD.spawnParticles(ps.x, ps.y - 30, '#fff3c0', 10);
  };

  // ---- Pause ----
  TD.togglePause = function() {
    const s = TD.state;
    if (!s.running || s.gameOver) return;
    s.paused = !s.paused;
    if (TD.renderPauseUI) TD.renderPauseUI();
  };

  // ---- Die ----
  function die() {
    const s = TD.state;
    s.gameOver = true;
    s.running = false;
    s.screenShake = 12;

    TD.sfxDeath();
    TD.music.stop();
    if (TD.tutorialEnd) TD.tutorialEnd();

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

    // While paused, freeze world state — no speed ramp, no spawns, no movement.
    if (s.paused) return;

    s.distance += s.speed;
    s.score = Math.floor(s.distance * 400);

    // Biome transition detection (distance is in game units; *100 == meters)
    const meters = s.distance * 100;

    // Speed ramp: hold at BASE_SPEED until the warm-up distance is cleared,
    // then accelerate gradually up to MAX_SPEED.
    if (meters >= SPEED_RAMP_START_METERS) {
      s.speed = Math.min(MAX_SPEED, s.speed + SPEED_INCREMENT);
    }

    // Tick down the invincibility timer
    if (s.invincibleFrames > 0) s.invincibleFrames--;
    const newBiomeIdx = TD.getActiveBiomeIndex(meters);
    if (newBiomeIdx !== s.activeBiomeIndex) {
      s.activeBiomeIndex = newBiomeIdx;
      if (TD.syncVisualBiome) TD.syncVisualBiome();
      if (TD.showBiomeBanner) TD.showBiomeBanner(TD.biomes[newBiomeIdx].name);
    }

    TD.playerUpdate();
    TD.obstaclesUpdate(s.speed);
    TD.coinsUpdate(s.speed);
    TD.treesUpdate(s.speed);

    // Onboarding hints — only active for the first ~10 s of a fresh run.
    if (TD.tutorialUpdate) TD.tutorialUpdate();

    // Collision
    if (TD.obstaclesCheckCollision()) {
      die();
      return;
    }

    TD.particlesUpdate();
    if (TD.ambientUpdate) TD.ambientUpdate();
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
      if (item.type === 'player') {
        const p = TD.player;
        const sp = laneToScreen(p.lane, PLAYER_T);
        TD.drawGroundShadow(ctx, sp.x, sp.y, PLAYER_T, {
          alpha: Math.max(0.06, 0.35 - p.jumpT * 2.5),
          rx: Math.max(5, 16 - p.jumpT * 25),
          ry: Math.max(2, (16 - p.jumpT * 25) * 0.3),
        });
      } else if (item.type === 'coin') {
        const c = item.obj;
        const s = laneToScreen(c.lane, c.t);
        TD.drawGroundShadow(ctx, s.x, s.y, c.t, {
          rx: (5 + 9 * c.t) * 0.65,
          ry: (2 + 4 * c.t) * 0.32,
          alpha: 0.08 + c.t * 0.14,
        });
      } else if (item.type === 'obs') {
        const o = item.obj;
        if (o.t > 0.4 && !o.smashed) {
          const ps = laneToScreen(0, o.t);
          const hw = pathHalfW(o.t);
          const wallW = 3 + 20 * o.t;
          TD.drawGroundShadow(ctx, VP_X, ps.y, o.t, {
            rx: (hw + wallW) * 0.5,
            ry: 3 + 6 * o.t,
            alpha: 0.1 + o.t * 0.16,
          });
        }
      }

      if      (item.type === 'obs')    TD.drawObstacle(ctx, item.obj);
      else if (item.type === 'coin')   TD.drawCoin(ctx, item.obj);
      else                             TD.drawRunner(ctx);
    }

    TD.drawParticles(ctx);
    if (TD.drawAmbient) TD.drawAmbient(ctx);
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
