// ============================================
// player.js — Player state, physics, drawing
// ============================================

(function() {
  const { GRAV, PLAYER_T, SLIDE_DURATION, laneToScreen } = TD;

  TD.player = {
    targetLane: 0,
    lane: 0,        // smooth interpolated lane
    jumping: false,
    jumpT: 0,
    jumpVel: 0,
    sliding: false,
    slideFrames: 0,
  };

  TD.playerReset = function() {
    const p = TD.player;
    p.targetLane = 0;
    p.lane = 0;
    p.jumping = false;
    p.jumpT = 0;
    p.jumpVel = 0;
    p.sliding = false;
    p.slideFrames = 0;
  };

  TD.playerStartSlide = function() {
    const p = TD.player;
    if (p.sliding || p.jumping) return;
    p.sliding    = true;
    p.slideFrames = SLIDE_DURATION;
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

    // Slide countdown
    if (p.slideFrames > 0) {
      p.slideFrames--;
      if (p.slideFrames <= 0) {
        p.sliding    = false;
        p.slideFrames = 0;
      }
    }
  };

  // Returns the effective T (depth) of the player accounting for forward jump
  TD.playerEffectiveT = function() {
    return PLAYER_T - TD.player.jumpT * 2.7 * 0.18;
  };

  TD.drawRunner = function(ctx) {
    const p = TD.player;
    const jumpForward = p.jumpT * 2.7;
    const runnerT = PLAYER_T - jumpForward * 0.18;
    const ps = laneToScreen(p.lane, runnerT);
    const cx = ps.x, footY = ps.y;
    const jumpPx = p.jumpT * 240;
    const baseY = footY - jumpPx;
    const t = Date.now() * 0.014;
    const bob = p.jumping ? 0 : Math.abs(Math.sin(t * 2)) * 1.5;

    const depthScale = (1.1 + runnerT * 0.5) * 1.75;
    const invincible = TD.state && TD.state.invincibleFrames > 0;
    const shimmer = invincible ? (0.55 + 0.45 * Math.sin(Date.now() * 0.02)) : 0;

    ctx.save();

    const s = depthScale;

    // ---- Slide pose ----
    if (p.sliding || p.slideFrames > 0) {
      drawRunnerSlide(ctx, p, cx, baseY, s, invincible, shimmer);
      ctx.restore();
      return;
    }

    // Character — seen from behind (shadow drawn in game.js z-sort pass)
    const headR = 5 * s;
    const bodyTop = baseY - 30 * s - bob;
    const hipY = baseY - 12 * s - bob;
    const shoulderY = bodyTop + 4 * s;
    const headY = bodyTop - headR;
    const runPhase = p.jumping ? 0 : t * 1.6;
    const sinR = Math.sin(runPhase);
    const cosR = Math.cos(runPhase);

    // Golden aura behind the character while invincible
    if (invincible) {
      const auraX = cx;
      const auraY = (bodyTop + hipY) / 2;
      const auraR = 38 * s;
      const grad = ctx.createRadialGradient(auraX, auraY, 2, auraX, auraY, auraR);
      grad.addColorStop(0,    `rgba(255,243,150,${0.45 * shimmer + 0.25})`);
      grad.addColorStop(0.55, `rgba(255,200,60,${0.25 * shimmer + 0.10})`);
      grad.addColorStop(1,    'rgba(255,180,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(auraX, auraY, auraR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs — two-segment with knee bend for realistic running stride
    const thighLen = 10 * s;
    const shinLen = 10 * s;
    ctx.strokeStyle = invincible ? '#d4b070' : '#6a4a2a';
    ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';

    // Left leg
    const lThighAngle = sinR * 0.7;
    const lKneeX = cx - 3*s + Math.sin(lThighAngle) * thighLen;
    const lKneeY = hipY + Math.cos(lThighAngle) * thighLen;
    const lKneeBend = p.jumping ? 0.2 : 0.3 + Math.max(0, -sinR) * 0.8;
    const lFootX = lKneeX + Math.sin(lThighAngle - lKneeBend) * shinLen;
    const lFootY = lKneeY + Math.cos(lThighAngle - lKneeBend) * shinLen;
    ctx.beginPath(); ctx.moveTo(cx - 3*s, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();

    // Right leg
    const rThighAngle = -sinR * 0.7;
    const rKneeX = cx + 3*s + Math.sin(rThighAngle) * thighLen;
    const rKneeY = hipY + Math.cos(rThighAngle) * thighLen;
    const rKneeBend = p.jumping ? 0.2 : 0.3 + Math.max(0, sinR) * 0.8;
    const rFootX = rKneeX + Math.sin(rThighAngle - rKneeBend) * shinLen;
    const rFootY = rKneeY + Math.cos(rThighAngle - rKneeBend) * shinLen;
    ctx.beginPath(); ctx.moveTo(cx + 3*s, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();

    // Torso — tinted gold while invincible
    ctx.fillStyle = invincible ? '#8a6a2a' : '#4a4a4a';
    ctx.fillRect(cx - 6*s, shoulderY, 12*s, hipY - shoulderY);
    if (invincible) {
      ctx.fillStyle = `rgba(255,243,180,${0.35 + 0.35 * shimmer})`;
      ctx.fillRect(cx - 2*s, shoulderY, 1.5*s, hipY - shoulderY);
    }

    // Arms — sprinter style: bent elbows pumping forward/back
    const upperArmLen = 8 * s;
    const forearmLen = 7 * s;
    ctx.strokeStyle = invincible ? '#a88040' : '#6a5a4a'; ctx.lineWidth = 3 * s;

    // Left arm (opposite phase to left leg)
    const lArmSwing = p.jumping ? 0 : -sinR * 0.8;
    const lElbowX = cx - 6*s + Math.sin(lArmSwing) * upperArmLen;
    const lElbowY = shoulderY + 3*s + Math.cos(lArmSwing) * upperArmLen;
    const lHandX = lElbowX + Math.sin(lArmSwing + 1.5) * forearmLen;
    const lHandY = lElbowY + Math.cos(lArmSwing + 1.5) * forearmLen;
    ctx.beginPath(); ctx.moveTo(cx - 6*s, shoulderY + 3*s); ctx.lineTo(lElbowX, lElbowY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lElbowX, lElbowY); ctx.lineTo(lHandX, lHandY); ctx.stroke();

    // Right arm
    const rArmSwing = p.jumping ? 0 : sinR * 0.8;
    const rElbowX = cx + 6*s + Math.sin(rArmSwing) * upperArmLen;
    const rElbowY = shoulderY + 3*s + Math.cos(rArmSwing) * upperArmLen;
    const rHandX = rElbowX + Math.sin(rArmSwing + 1.5) * forearmLen;
    const rHandY = rElbowY + Math.cos(rArmSwing + 1.5) * forearmLen;
    ctx.beginPath(); ctx.moveTo(cx + 6*s, shoulderY + 3*s); ctx.lineTo(rElbowX, rElbowY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rElbowX, rElbowY); ctx.lineTo(rHandX, rHandY); ctx.stroke();

    // Head
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();

    if (invincible) {
      drawHelmet(ctx, cx, headY, headR, s, shimmer);
    } else {
      drawFedora(ctx, cx, headY, headR, s);
    }

    ctx.restore();

    // Occasional sparkle particles while invincible
    if (invincible && Math.random() < 0.35 && TD.spawnParticles) {
      const sx = cx + (Math.random() - 0.5) * 30 * s;
      const sy = headY + (Math.random() - 0.5) * 40 * s;
      TD.spawnParticles(sx, sy, '#fff3c0', 1);
    }
  };

  // Crouched slide pose — character squishes low, arms wide for balance.
  function drawRunnerSlide(ctx, p, cx, baseY, s, invincible, shimmer) {
    const elapsed = SLIDE_DURATION - p.slideFrames;
    const easeIn  = Math.min(1, elapsed / 4);
    const easeOut = p.slideFrames <= 4 ? p.slideFrames / 4 : 1;
    const squat   = easeIn * easeOut;       // 0→1 crouching in, 1→0 standing back up
    const sq      = 1 - squat * 0.68;      // height factor: 1.0=upright → 0.32=fully crouched

    const bodyH    = 30 * s * sq;
    const bodyTop  = baseY - bodyH;
    const hipY     = baseY - bodyH * 0.42;
    const shoulderY = bodyTop + 2 * s;
    const headR    = 4.5 * s;
    const headY    = bodyTop - headR * 0.6;

    // Invincible aura (scaled down for crouch)
    if (invincible) {
      const auraR = 28 * s;
      const auraY = (bodyTop + hipY) / 2;
      const grad  = ctx.createRadialGradient(cx, auraY, 2, cx, auraY, auraR);
      grad.addColorStop(0,    `rgba(255,243,150,${0.45 * shimmer + 0.25})`);
      grad.addColorStop(0.55, `rgba(255,200,60,${0.25 * shimmer + 0.10})`);
      grad.addColorStop(1,    'rgba(255,180,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, auraY, auraR, 0, Math.PI * 2); ctx.fill();
    }

    // Legs splayed wide
    ctx.strokeStyle = invincible ? '#d4b070' : '#6a4a2a';
    ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 3*s, hipY); ctx.lineTo(cx - 13*s, baseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 3*s, hipY); ctx.lineTo(cx + 13*s, baseY); ctx.stroke();

    // Torso (wider, lower)
    ctx.fillStyle = invincible ? '#8a6a2a' : '#4a4a4a';
    ctx.fillRect(cx - 7*s, shoulderY, 14*s, hipY - shoulderY);
    if (invincible) {
      ctx.fillStyle = `rgba(255,243,180,${0.35 + 0.35 * shimmer})`;
      ctx.fillRect(cx - 2*s, shoulderY, 1.5*s, hipY - shoulderY);
    }

    // Arms wide for balance
    ctx.strokeStyle = invincible ? '#a88040' : '#6a5a4a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(cx - 7*s, shoulderY + 2*s); ctx.lineTo(cx - 18*s, shoulderY + 6*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 7*s, shoulderY + 2*s); ctx.lineTo(cx + 18*s, shoulderY + 6*s); ctx.stroke();

    // Head
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();

    if (invincible) {
      drawHelmet(ctx, cx, headY, headR, s, shimmer);
    } else {
      drawFedora(ctx, cx, headY, headR, s);
    }

    if (invincible && Math.random() < 0.35 && TD.spawnParticles) {
      TD.spawnParticles(cx + (Math.random() - 0.5) * 30 * s, headY + (Math.random() - 0.5) * 20 * s, '#fff3c0', 1);
    }
  }

  // Indiana Jones-style fedora — seen from behind
  function drawFedora(ctx, cx, headY, headR, s) {
    ctx.save();

    // Brim — wide ellipse
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.55, headR * 1.7, headR * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown — rounded dome
    const crownGrad = ctx.createLinearGradient(cx, headY - headR * 2, cx, headY - headR * 0.5);
    crownGrad.addColorStop(0, '#7a5a2a');
    crownGrad.addColorStop(0.5, '#6a4a20');
    crownGrad.addColorStop(1, '#5a3a1a');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.8, headR * 1.05, headR * 1.1, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Crown dent
    ctx.fillStyle = '#4a2a10';
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 1.6, headR * 0.45, headR * 0.18, 0, 0, Math.PI);
    ctx.fill();

    // Hatband
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(cx - headR * 1.05, headY - headR * 0.85, headR * 2.1, headR * 0.25);

    // Highlight
    ctx.fillStyle = 'rgba(255,240,200,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.3, headY - headR * 1.2, headR * 0.4, headR * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Golden explorer helmet — drawn from behind, sitting on top of the head.
  function drawHelmet(ctx, cx, headY, headR, s, shimmer) {
    const top = headY - headR * 0.95;

    ctx.save();

    // Dome — fills the upper half of the head plus a little extra
    const grad = ctx.createLinearGradient(cx, top, cx, headY + headR * 0.1);
    grad.addColorStop(0,   '#fff3c0');
    grad.addColorStop(0.5, '#f0c860');
    grad.addColorStop(1,   '#a8801a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.15, headR * 1.18, headR * 1.1, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Rim band across the brow
    ctx.fillStyle = '#7a5a18';
    ctx.fillRect(cx - headR * 1.18, headY - headR * 0.15, headR * 2.36, headR * 0.32);
    ctx.fillStyle = `rgba(255,243,180,${0.55 + 0.3 * shimmer})`;
    ctx.fillRect(cx - headR * 1.18, headY - headR * 0.15, headR * 2.36, headR * 0.10);

    // Top crest spike
    ctx.fillStyle = '#c8a84e';
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.18, top);
    ctx.lineTo(cx + headR * 0.18, top);
    ctx.lineTo(cx,                 top - headR * 0.55);
    ctx.closePath();
    ctx.fill();

    // Shimmer highlight on the dome
    ctx.fillStyle = `rgba(255,255,230,${0.4 + 0.45 * shimmer})`;
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.35, top + headR * 0.3, headR * 0.35, headR * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
})();
