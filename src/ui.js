// ============================================
// ui.js — Overlay screens, HUD updates, leaderboard rendering
// ============================================

(function() {
  // ---- DOM refs (cached) ----
  const $overlay        = document.getElementById('overlay');
  const $hud            = document.getElementById('hud');
  const $scoreDisplay   = document.getElementById('scoreDisplay');
  const $distDisplay    = document.getElementById('distDisplay');
  const $coinDisplay    = document.getElementById('coinDisplay');
  const $biomeChip      = document.getElementById('biomeChip');
  const $biomeBanner    = document.getElementById('biomeBanner');
  const $streakBar      = document.getElementById('streakBar');
  const $streakFill     = document.getElementById('streakFill');
  const $streakLabel    = document.getElementById('streakLabel');
  const $invincibleTimer= document.getElementById('invincibleTimer');
  const $invincibleCount= document.getElementById('invincibleCount');
  const $finalScore     = document.getElementById('finalScore');
  const $outrunPct      = document.getElementById('outrunPct');
  const $highScore      = document.getElementById('highScore');
  const $worldBest      = document.getElementById('worldBest');
  const $startBtn       = document.getElementById('startBtn');
  const $leaderboardList= document.getElementById('leaderboardList');
  const $versionDisplay = document.getElementById('versionDisplay');
  const $overlayVersion = document.getElementById('overlayVersion');
  const $overlayVersionLarge = document.getElementById('overlayVersionLarge');
  const $muteBtn        = document.getElementById('muteBtn');

  // Whether the "You've outrun XX% of your colleagues!" line should appear
  // once the leaderboard pool resolves. Only true between a game-over and the
  // next RUN click, so the initial start screen never shows it.
  let _pendingOutrun = false;

  // ---- Overlay ----
  TD.showOverlay = function(showScore) {
    $overlay.classList.remove('hidden');
    $hud.style.display = 'none';

    if (showScore) {
      $finalScore.style.display = 'block';
      $finalScore.textContent =
        'Score: ' + TD.state.score.toLocaleString() + '  -  Coins: ' + TD.totalCoins;
      // Hide until the leaderboard (or fallback) tells us where the score sits.
      if ($outrunPct) $outrunPct.style.display = 'none';
      $highScore.style.display = 'block';
      $highScore.textContent = 'Best: ' + TD.state.highScore.toLocaleString();
      $startBtn.textContent = 'RUN AGAIN';
      _pendingOutrun = true;
      refreshLeaderboard();
    } else {
      $finalScore.style.display = 'none';
      if ($outrunPct) $outrunPct.style.display = 'none';
      $highScore.style.display = 'none';
      $startBtn.textContent = 'RUN';
      _pendingOutrun = false;
    }
  };

  // ---- HUD ----
  let _lastStreak = 0;
  let _missClearTimer = null;

  TD.updateHUD = function() {
    $scoreDisplay.textContent = TD.state.score.toLocaleString();
    $distDisplay.textContent  = Math.floor(TD.state.distance * 100).toLocaleString();
    $coinDisplay.textContent  = TD.totalCoins;
    const biome = TD.biomes && TD.biomes[TD.state.activeBiomeIndex || 0];
    if (biome) $biomeChip.textContent = biome.name;
    if ($versionDisplay) $versionDisplay.textContent = TD.VERSION;

    // ---- Power-up HUD: coin streak bar / invincibility countdown ----
    if ($streakBar && $invincibleTimer) {
      const goal      = TD.COIN_STREAK_GOAL || 10;
      const streak    = TD.state.coinStreak || 0;
      const invFrames = TD.state.invincibleFrames || 0;

      if (invFrames > 0) {
        // Active power-up: show the countdown badge, hide the streak bar
        $streakBar.style.display = 'none';
        $invincibleTimer.style.display = 'flex';
        $invincibleCount.textContent = Math.ceil(invFrames / 60);
      } else {
        $invincibleTimer.style.display = 'none';
        $streakBar.style.display = 'flex';

        const pct = Math.min(100, (streak / goal) * 100);
        $streakFill.style.width = pct + '%';
        $streakLabel.textContent = streak + ' / ' + goal;

        // Flash + shake the bar briefly whenever the streak drops (missed coin)
        if (streak < _lastStreak) {
          $streakBar.classList.add('miss');
          clearTimeout(_missClearTimer);
          _missClearTimer = setTimeout(() => $streakBar.classList.remove('miss'), 450);
        }
      }
      _lastStreak = streak;
    }
  };

  // ---- Biome banner ----
  let bannerTimer = null;
  TD.showBiomeBanner = function(name) {
    if (!$biomeBanner) return;
    $biomeBanner.textContent = 'Entering: ' + name;
    $biomeBanner.classList.remove('show');
    void $biomeBanner.offsetWidth;
    $biomeBanner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $biomeBanner.classList.remove('show'), 2000);
  };

  // ---- Leaderboard rendering ----
  function renderEmpty(message) {
    $leaderboardList.innerHTML = '<li class="leaderboard-empty">' + message + '</li>';
  }

  // Synthetic "colleagues" distribution used for the outrun percentile when
  // the live leaderboard is unavailable (not configured / empty / fetch failed).
  // Hand-tuned to feel like a believable spread of casual players: lots of
  // beginners at the low end, a long tail of regulars, and a few veterans.
  const FAKE_COLLEAGUES = [
    120,  240,  380,   510,   660,   820,   990,   1180,  1400,  1640,
    1900, 2200, 2550,  2950,  3400,  3900,  4500,  5200,  6000,  6900,
    7900, 9000, 10300, 11800, 13500, 15400, 17600, 20100, 23000, 26500,
  ];

  function showOutrunFromScores(scores) {
    if (!_pendingOutrun || !$outrunPct) return;
    if (!scores || scores.length === 0) {
      $outrunPct.style.display = 'none';
      return;
    }
    const myScore = TD.state.score || 0;
    const beaten = scores.filter(s => s < myScore).length;
    const pct = Math.round((beaten / scores.length) * 100);
    $outrunPct.textContent = "You've outrun " + pct + '% of your colleagues!';
    $outrunPct.style.display = 'block';
  }

  function renderEntries(entries) {
    if (!entries || entries.length === 0) {
      renderEmpty('No scores yet. Be the first!');
      $worldBest.textContent = '';
      // No real competitors yet — fall back to the synthetic pool so the
      // percentile line still appears after a run.
      showOutrunFromScores(FAKE_COLLEAGUES);
      return;
    }
    const myName = TD.leaderboard.getPlayerName();
    $worldBest.textContent = 'World Best: ' + entries[0].name + ' - ' + entries[0].score.toLocaleString();

    // Percentile against everyone except the player's own leaderboard entry
    // (that entry stores their best-ever score, which would unfairly skew any
    // non-record run). If the player is literally the only entry, fall back.
    const competitors = entries.filter(e => e.name !== myName).map(e => e.score);
    showOutrunFromScores(competitors.length > 0 ? competitors : FAKE_COLLEAGUES);

    // Visible list still shows only the top 10; the rest of the fetched pool
    // is only used for the percentile above.
    const visible = entries.slice(0, 10);
    const items = visible.map(e => {
      const isMine = e.name === myName;
      return '<li class="' + (isMine ? 'own' : '') + '">'
           +   '<span class="rank">#' + e.rank + '</span>'
           +   '<span class="name">' + escapeHtml(e.name) + '</span>'
           +   '<span class="score">' + e.score.toLocaleString() + '</span>'
           + '</li>';
    });
    $leaderboardList.innerHTML = items.join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function refreshLeaderboard() {
    if (!TD.leaderboard || !TD.leaderboard.isConfigured()) {
      renderEmpty('Leaderboard offline (configure src/leaderboard.js).');
      $worldBest.textContent = '';
      // Offline mode: still show the percentile against the synthetic pool.
      showOutrunFromScores(FAKE_COLLEAGUES);
      return;
    }
    renderEmpty('Loading top runners...');
    // Fetch 100 entries so the percentile reflects a meaningful pool; the
    // visible list still shows only the top 10.
    TD.leaderboard.fetchTop(100)
      .then(renderEntries)
      .catch(() => {
        renderEmpty('Could not load leaderboard.');
        showOutrunFromScores(FAKE_COLLEAGUES);
      });
  }

  // ---- Start button ----
  $startBtn.addEventListener('click', () => {
    if (TD.leaderboard && TD.leaderboard.isConfigured()) {
      TD.leaderboard.getPlayerName();
    }
    $overlay.classList.add('hidden');
    TD.init();
    TD.playIntro(() => {
      $hud.style.display = 'flex';
      TD.state.running = true;
      if (TD.biomes && TD.showBiomeBanner) {
        TD.showBiomeBanner(TD.biomes[0].name);
      }
      if (TD.tutorialStart) TD.tutorialStart();
    });
  });

  // ---- Mute toggle ----
  if ($muteBtn) {
    $muteBtn.addEventListener('click', () => {
      TD.audio.toggle();
      TD.music.setMuted(TD.audio.muted);
      $muteBtn.textContent = TD.audio.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    });
  }

  // ---- Version display on overlay ----
  if ($overlayVersion) $overlayVersion.textContent = TD.VERSION;
  if ($overlayVersionLarge) $overlayVersionLarge.textContent = TD.VERSION;

  // ---- On load ----
  // Show local best if we have one.
  const hs = parseInt(localStorage.getItem('tdH2') || '0');
  if (hs > 0) {
    $highScore.style.display = 'block';
    $highScore.textContent = 'Best: ' + hs.toLocaleString();
  }
  // Fetch global leaderboard immediately so it's ready on the start screen.
  refreshLeaderboard();
})();
