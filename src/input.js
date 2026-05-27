// ============================================
// input.js — Keyboard & touch input
// ============================================

(function() {
  const { JUMP_VEL } = TD;

  document.addEventListener('keydown', e => {
    const s = TD.state;

    // Space toggles pause whenever a run is in progress (paused or not),
    // even though all other gameplay input is gated on running + !paused.
    if (e.code === 'Space') {
      if (s.running && !s.gameOver && TD.togglePause) {
        TD.togglePause();
        e.preventDefault();
      }
      return;
    }

    if (!s.running || s.paused) return;
    const p = TD.player;

    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { p.targetLane = Math.max(-1, p.targetLane - 1); TD.sfxSwipe(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { p.targetLane = Math.min( 1, p.targetLane + 1); TD.sfxSwipe(); }
    if ((e.code === 'ArrowUp' || e.code === 'KeyW') && !p.jumping) {
      if (p.sliding) { p.sliding = false; p.slideFrames = 0; }
      p.jumping = true;
      p.jumpVel = JUMP_VEL;
      TD.sfxJump();
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      TD.playerStartSlide();
    }
    e.preventDefault();
  });

  // Touch / swipe
  let swX = 0, swY = 0;

  TD.canvas.addEventListener('touchstart', e => {
    swX = e.touches[0].clientX;
    swY = e.touches[0].clientY;
  });

  TD.canvas.addEventListener('touchend', e => {
    const s = TD.state;
    if (!s.running || s.paused) return;
    const p = TD.player;
    const dx = e.changedTouches[0].clientX - swX;
    const dy = e.changedTouches[0].clientY - swY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30)       { p.targetLane = Math.min(1, p.targetLane + 1); TD.sfxSwipe(); }
      else if (dx < -30) { p.targetLane = Math.max(-1, p.targetLane - 1); TD.sfxSwipe(); }
    } else if (dy < -30 && !p.jumping) {
      if (p.sliding) { p.sliding = false; p.slideFrames = 0; }
      p.jumping = true;
      p.jumpVel = JUMP_VEL;
      TD.sfxJump();
    } else if (dy > 30) {
      TD.playerStartSlide();
    }
  });
})();
