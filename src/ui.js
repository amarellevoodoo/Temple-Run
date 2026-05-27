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
  const $highScore      = document.getElementById('highScore');
  const $worldBest      = document.getElementById('worldBest');
  const $startBtn       = document.getElementById('startBtn');
  const $leaderboardList= document.getElementById('leaderboardList');
  const $versionDisplay = document.getElementById('versionDisplay');
  const $overlayVersion = document.getElementById('overlayVersion');
  const $overlayVersionLarge = document.getElementById('overlayVersionLarge');

  // ---- Overlay ----
  TD.showOverlay = function(showScore) {
    $overlay.classList.remove('hidden');
    $hud.style.display = 'none';

    if (showScore) {
      $finalScore.style.display = 'block';
      $finalScore.textContent =
        'Score: ' + TD.state.score.toLocaleString() + '  -  Coins: ' + TD.totalCoins;
      $highScore.style.display = 'block';
      $highScore.textContent = 'Best: ' + TD.state.highScore.toLocaleString();
      $startBtn.textContent = 'RUN AGAIN';
      refreshLeaderboard();
    } else {
      $finalScore.style.display = 'none';
      $highScore.style.display = 'none';
      $startBtn.textContent = 'RUN';
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

  function renderEntries(entries) {
    if (!entries || entries.length === 0) {
      renderEmpty('No scores yet. Be the first!');
      $worldBest.textContent = '';
      return;
    }
    const myName = TD.leaderboard.getPlayerName();
    $worldBest.textContent = 'World Best: ' + entries[0].name + ' - ' + entries[0].score.toLocaleString();
    const items = entries.map(e => {
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
      return;
    }
    renderEmpty('Loading top runners...');
    TD.leaderboard.fetchTop(10)
      .then(renderEntries)
      .catch(() => renderEmpty('Could not load leaderboard.'));
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
