// ============================================
// player.js — Player state, physics, drawing
// ============================================

(function() {
  const { GRAV, PLAYER_T, laneToScreen } = TD;

  TD.player = {
    targetLane: 0,
    lane: 0,        // smooth interpolated lane
    jumping: false,
    jumpT: 0,
    jumpVel: 0,
  };

  TD.playerReset = function() {
    const p = TD.player;
    p.targetLane = 0;
    p.lane = 0;
    p.jumping = false;
    p.jumpT = 0;
    p.jumpVel = 0;
  };

  TD.playerUpdate = function() {
    const p = TD.player;

    // Smooth lane transition
    p.lane += (p.targetLane - p.lane) * 0.18;

    // Jump arc
    if (p.jumping) {
      p.jumpT += p.jumpVel;
      p.jumpVel -= GRAV;
      if (p.jumpT <= 0) {
        p.jumpT = 0;
        p.jumping = false;
        p.jumpVel = 0;
      }
    }
  };

  // Returns the effective T (depth) of the player accounting for forward jump
  TD.playerEffectiveT = function() {
    return PLAYER_T - TD.player.jumpT * 4.5 * 0.18;
  };

  TD.drawRunner = function(ctx) {
    const p = TD.player;
    const jumpForward = p.jumpT * 4.5;
    const runnerT = PLAYER_T - jumpForward * 0.18;
    const ps = laneToScreen(p.lane, runnerT);
    const cx = ps.x, footY = ps.y;
    const jumpPx = p.jumpT * 400;
    const baseY = footY - jumpPx;
    const t = Date.now() * 0.014;
    const bob = p.jumping ? 0 : Math.abs(Math.sin(t * 2)) * 1.5;

    const depthScale = 1.1 + runnerT * 0.5;

    ctx.save();

    // Shadow
    const shadowPs = laneToScreen(p.lane, PLAYER_T);
    const shAlpha = Math.max(0.06, 0.35 - p.jumpT * 2.5);
    const shSize = 16 - p.jumpT * 25;
    ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
    ctx.beginPath();
    ctx.ellipse(shadowPs.x, shadowPs.y, Math.max(5, shSize), Math.max(2, shSize * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // Character — seen from behind
    const s = depthScale;
    const headR = 5 * s;
    const bodyTop = baseY - 30 * s - bob;
    const hipY = baseY - 12 * s - bob;
    const shoulderY = bodyTop + 4 * s;
    const headY = bodyTop - headR;
    const legSw = Math.sin(t) * 8 * s;
    const armSw = Math.sin(t) * 10 * s;

    // Legs
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 3*s, hipY); ctx.lineTo(cx - 3*s - legSw, baseY - bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 3*s, hipY); ctx.lineTo(cx + 3*s + legSw, baseY - bob); ctx.stroke();

    // Torso
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - 6*s, shoulderY, 12*s, hipY - shoulderY);

    // Arms
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(cx - 6*s, shoulderY + 3*s); ctx.lineTo(cx - 8*s + armSw, shoulderY + 16*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6*s, shoulderY + 3*s); ctx.lineTo(cx + 8*s - armSw, shoulderY + 16*s); ctx.stroke();

    // Head
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(cx, headY - 1*s, headR * 1.05, Math.PI * 1.15, Math.PI * 1.85, true); ctx.fill();
    ctx.fillRect(cx - headR * 0.9, headY - headR * 0.3, headR * 1.8, headR * 0.6);

    // Red hat
    const hatBaseY = headY + headR * 0.25;
    ctx.fillStyle = '#cc1100';
    ctx.beginPath();
    ctx.arc(cx, headY - headR * 0.1, headR * 1.05, Math.PI, Math.PI * 2);
    ctx.rect(cx - headR * 1.05, headY - headR * 0.1, headR * 2.1, headR * 0.35);
    ctx.fill();
    ctx.fillStyle = '#aa0e00';
    ctx.beginPath();
    ctx.ellipse(cx, hatBaseY, headR * 1.85, headR * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#881000';
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.1, headR * 1.08, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };
})();
