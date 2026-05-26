// ============================================
// player.js — Player state, physics, drawing
// ============================================

(function() {
  const { GRAV, PLAYER_T, SLIDE_DURATION, SLIDE_ACTIVE_START, SLIDE_ACTIVE_END,
          laneToScreen } = TD;

  TD.player = {
    targetLane: 0,
    lane: 0,        // smooth interpolated lane
    jumping: false,
    jumpT: 0,
    jumpVel: 0,
    sliding: false,
    slideT: 0,      // frame counter through the slide
  };

  TD.playerReset = function() {
    const p = TD.player;
    p.targetLane = 0;
    p.lane = 0;
    p.jumping = false;
    p.jumpT = 0;
    p.jumpVel = 0;
    p.sliding = false;
    p.slideT = 0;
  };

  // External trigger from input layer. Slide is grounded-only; ignored mid-air.
  TD.playerStartSlide = function() {
    const p = TD.player;
    if (p.sliding) return;
    if (p.jumping) return;
    p.sliding = true;
    p.slideT = 0;
  };

  // True when the player's hitbox is low enough to pass under an overhead beam.
  TD.playerIsLow = function() {
    const p = TD.player;
    return p.sliding && p.slideT >= SLIDE_ACTIVE_START && p.slideT <= SLIDE_ACTIVE_END;
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

    // Slide timer
    if (p.sliding) {
      p.slideT++;
      if (p.slideT >= SLIDE_DURATION) {
        p.sliding = false;
        p.slideT = 0;
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
    const bob = (p.jumping || p.sliding) ? 0 : Math.abs(Math.sin(t * 2)) * 1.5;

    const depthScale = 1.1 + runnerT * 0.5;

    ctx.save();

    // Slide compresses the upright frame vertically; a smooth ease-in/out keeps it readable.
    let slideCompress = 1;
    if (p.sliding) {
      const half = SLIDE_DURATION / 2;
      const norm = 1 - Math.abs(p.slideT - half) / half;     // 0..1..0
      slideCompress = 1 - 0.62 * Math.max(0, Math.min(1, norm));
    }

    // Shadow — grows when sliding (body close to ground), shrinks when jumping.
    const shadowPs = laneToScreen(p.lane, PLAYER_T);
    const shAlpha = Math.max(0.06, 0.35 - p.jumpT * 2.5);
    const shSize = (16 - p.jumpT * 25) * (p.sliding ? 1.5 : 1);
    ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
    ctx.beginPath();
    ctx.ellipse(shadowPs.x, shadowPs.y, Math.max(5, shSize), Math.max(2, shSize * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    // Character — seen from behind
    const s = depthScale;
    const headR = 5 * s;
    const standBodyH = 30 * s;
    const standHipH = 12 * s;
    const bodyH = standBodyH * slideCompress;
    const hipH = standHipH * slideCompress;
    const bodyTop = baseY - bodyH - bob;
    const hipY = baseY - hipH - bob;
    const shoulderY = bodyTop + 4 * s * slideCompress;
    const headY = bodyTop - headR * slideCompress;
    const legSw = (p.sliding ? 4 : Math.sin(t) * 8) * s;
    const armSw = (p.sliding ? 6 : Math.sin(t) * 10) * s;

    // Legs — splayed forward while sliding for a "dive" silhouette.
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
    if (p.sliding) {
      ctx.beginPath(); ctx.moveTo(cx - 3*s, hipY); ctx.lineTo(cx - 10*s, baseY - bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3*s, hipY); ctx.lineTo(cx + 10*s, baseY - bob); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(cx - 3*s, hipY); ctx.lineTo(cx - 3*s - legSw, baseY - bob); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3*s, hipY); ctx.lineTo(cx + 3*s + legSw, baseY - bob); ctx.stroke();
    }

    // Torso
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - 6*s, shoulderY, 12*s, hipY - shoulderY);

    // Arms
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(cx - 6*s, shoulderY + 3*s * slideCompress); ctx.lineTo(cx - 8*s + armSw, shoulderY + 16*s * slideCompress); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6*s, shoulderY + 3*s * slideCompress); ctx.lineTo(cx + 8*s - armSw, shoulderY + 16*s * slideCompress); ctx.stroke();

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

    // Slide dust streaks behind the player for feedback.
    if (p.sliding) {
      ctx.fillStyle = 'rgba(220,210,170,0.35)';
      for (let i = 0; i < 3; i++) {
        const off = (i + 1) * 4 * s;
        ctx.beginPath();
        ctx.ellipse(cx + (Math.sin((t + i) * 3) * 1.5 - 8) * s, baseY - 1 - bob, off, off * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + (Math.sin((t + i) * 3) * 1.5 + 8) * s, baseY - 1 - bob, off, off * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };
})();
