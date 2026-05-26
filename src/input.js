// ============================================
// input.js — Keyboard & touch input
// ============================================

(function() {
  const { LANES, JUMP_VEL } = TD;

  document.addEventListener('keydown', e => {
    if (!TD.state.running) return;
    const p = TD.player;

    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { p.targetLane = Math.max(-1, p.targetLane - 1); TD.sfxSwipe(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { p.targetLane = Math.min( 1, p.targetLane + 1); TD.sfxSwipe(); }
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !p.jumping) {
      p.jumping = true;
      p.jumpVel = JUMP_VEL;
      TD.sfxJump();
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
    if (!TD.state.running) return;
    const p = TD.player;
    const dx = e.changedTouches[0].clientX - swX;
    const dy = e.changedTouches[0].clientY - swY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30)       { p.targetLane = Math.min(1, p.targetLane + 1); TD.sfxSwipe(); }
      else if (dx < -30) { p.targetLane = Math.max(-1, p.targetLane - 1); TD.sfxSwipe(); }
    } else if (dy < -30 && !p.jumping) {
      p.jumping = true;
      p.jumpVel = JUMP_VEL;
      TD.sfxJump();
    }
  });
})();
