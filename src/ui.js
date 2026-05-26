// ============================================
// ui.js — Overlay screens, HUD updates
// ============================================

(function() {
  TD.showOverlay = function(showScore) {
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('hud').style.display = 'none';

    if (showScore) {
      document.getElementById('finalScore').style.display = 'block';
      document.getElementById('finalScore').textContent =
        'Score: ' + TD.state.score.toLocaleString() + ' — 🪙 ' + TD.totalCoins;
      document.getElementById('highScore').style.display = 'block';
      document.getElementById('highScore').textContent =
        'Best: ' + TD.state.highScore.toLocaleString();
      document.getElementById('startBtn').textContent = 'RUN AGAIN';
    } else {
      document.getElementById('finalScore').style.display = 'none';
      document.getElementById('highScore').style.display = 'none';
      document.getElementById('startBtn').textContent = 'RUN';
    }
  };

  TD.updateHUD = function() {
    document.getElementById('scoreDisplay').textContent = TD.state.score.toLocaleString();
    document.getElementById('distDisplay').textContent =
      Math.floor(TD.state.distance * 100) + 'm  🪙 ' + TD.totalCoins;
    document.getElementById('versionDisplay').textContent = TD.VERSION;
  };

  // Start button
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';
    TD.init();
    TD.state.running = true;
  });

  // Show version on overlay
  document.getElementById('overlayVersion').textContent = TD.VERSION;

  // Show high score on load
  const hs = parseInt(localStorage.getItem('tdH2') || '0');
  if (hs > 0) {
    document.getElementById('highScore').style.display = 'block';
    document.getElementById('highScore').textContent = 'Best: ' + hs.toLocaleString();
  }
})();
