// ============================================
// obstacles.js — Holes and tree roots
// ============================================

(function() {
  const { OBS_INTERVAL, PLAYER_T, JUMP_CLEAR_THRESHOLD,
          VP_X, VP_Y, GROUND_BOTTOM, pathHalfW } = TD;

  TD.obstacles = [];
  TD.obsTimer = 0;

  TD.obstaclesReset = function() {
    TD.obstacles = [];
    TD.obsTimer = Math.floor(OBS_INTERVAL * 0.7);
  };

  // Pre-generate jagged edge points at spawn so they don't change each frame
  function makeJags(count) {
    const jags = [];
    for (let i = 0; i <= count; i++) jags.push((Math.random() - 0.5) * 0.35);
    return jags;
  }

  TD.obstaclesUpdate = function(speed) {
    TD.obsTimer--;

    if (TD.obsTimer <= 0) {
      const roll = Math.random();
      const type = roll < 0.33 ? 'hole' : roll < 0.66 ? 'root' : 'tunnel';
      const obs = { t: 0, hit: false, type };
      if (type === 'hole') {
        obs.holeDepth = 0.10 + Math.random() * 0.06;
        obs.jagsNear  = makeJags(9);
        obs.jagsFar   = makeJags(9);
      } else if (type === 'root') {
        obs.rootSide = Math.random() < 0.5 ? -1 : 1;
      }
      TD.obstacles.push(obs);
      TD.obsTimer = OBS_INTERVAL;
    }

    for (let o of TD.obstacles) o.t += speed;
    TD.obstacles = TD.obstacles.filter(o => o.t < 1.3 && !o.smashed);
  };

  // Holes/roots need a jump; tunnels need a slide. Invincibility smashes on failure.
  TD.obstaclesCheckCollision = function() {
    const p = TD.player;
    const invincible = TD.state.invincibleFrames > 0;
    for (let o of TD.obstacles) {
      if (o.hit || o.smashed) continue;
      if (Math.abs(o.t - PLAYER_T) < 0.045) {
        let failed = false;
        if (o.type === 'tunnel') {
          // Must be sliding — TD.player.sliding is set by Person 1 (input.js + player.js)
          failed = TD.player.sliding !== true;
        } else {
          // hole and root require jumping
          failed = p.jumpT < JUMP_CLEAR_THRESHOLD;
        }
        if (!failed) continue;

        if (invincible) {
          o.smashed = true;
          const ps = TD.laneToScreen(p.targetLane, PLAYER_T);
          TD.spawnParticles(ps.x, ps.y - 20, '#ffd700', 10);
          TD.spawnParticles(ps.x, ps.y - 20, '#ffffff', 6);
          continue;
        }
        o.hit = true;
        return true;
      }
    }
    return false;
  };

  TD.drawObstacle = function(ctx, obs) {
    if (obs.t < 0.02 || obs.t > 1.15 || obs.smashed) return;
    if (obs.type === 'hole')        drawHole(ctx, obs);
    else if (obs.type === 'tunnel') drawTunnel(ctx, obs);
    else                            drawRoot(ctx, obs);
  };

  // ---- Hole ----
  function drawHole(ctx, obs) {
    const t     = obs.t;
    const y     = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw    = pathHalfW(t);
    const tFar  = Math.max(0.01, t * (1 - obs.holeDepth));
    const yFar  = VP_Y + (GROUND_BOTTOM - VP_Y) * tFar;
    const hwFar = pathHalfW(tFar);
    const n     = obs.jagsNear.length - 1;
    const now   = Date.now() * 0.001;

    // Build the hole outline as a reusable path
    function traceHole() {
      for (let i = 0; i <= n; i++) {
        const x  = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
        const yj = y + obs.jagsNear[i] * 6 * t;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      for (let i = n; i >= 0; i--) {
        const x  = VP_X - hwFar + (i / n) * hwFar * 2 + obs.jagsFar[i] * hwFar * 0.35;
        const yj = yFar + obs.jagsFar[i] * 4 * tFar;
        ctx.lineTo(x, yj);
      }
      ctx.closePath();
    }

    // ---- 1. Sea visible through the hole (clipped) ----
    ctx.save();
    ctx.beginPath(); traceHole(); ctx.clip();

    // Sea base gradient
    const seaG = ctx.createLinearGradient(0, yFar, 0, y);
    seaG.addColorStop(0, '#081828');
    seaG.addColorStop(0.5, '#0c2238');
    seaG.addColorStop(1, '#102a44');
    ctx.fillStyle = seaG;
    ctx.fillRect(VP_X - hw, yFar, hw * 2, y - yFar + 10);

    // Animated waves inside hole
    ctx.lineCap = 'round';
    for (let w = 0; w < 4; w++) {
      const wy    = yFar + (y - yFar) * (0.2 + w * 0.22);
      const amp   = (0.8 + 1.8 * t) * (1 - w * 0.15);
      const phase = now * 2.2 + w * 1.4;
      ctx.strokeStyle = `rgba(30,95,165,${0.35 + w * 0.08})`;
      ctx.lineWidth = Math.max(0.7, 1.4 * t);
      ctx.beginPath();
      for (let x = VP_X - hw; x <= VP_X + hw; x += 5) {
        const wv = wy + Math.sin(x * 0.055 + phase) * amp;
        x === VP_X - hw ? ctx.moveTo(x, wv) : ctx.lineTo(x, wv);
      }
      ctx.stroke();
    }

    // Light sparkle on water surface
    if (t > 0.22) {
      const sparkAlpha = 0.18 + 0.12 * Math.sin(now * 3.5);
      const sg = ctx.createRadialGradient(VP_X, yFar + (y - yFar) * 0.38, 0, VP_X, yFar + (y - yFar) * 0.38, hw * 0.55);
      sg.addColorStop(0, `rgba(130,210,250,${sparkAlpha})`);
      sg.addColorStop(1, 'rgba(130,210,250,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(VP_X - hw, yFar, hw * 2, y - yFar);
    }

    ctx.restore();

    // ---- 2. Stone path cross-section (thickness visible at near edge) ----
    const thickness = Math.max(2, 7 * t);
    const sr = Math.floor(88 + t * 32), sg2 = Math.floor(70 + t * 25), sb = Math.floor(36 + t * 14);
    ctx.fillStyle = `rgb(${sr},${sg2},${sb})`;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    for (let i = n; i >= 0; i--) {
      const x  = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t + thickness;
      ctx.lineTo(x, yj);
    }
    ctx.closePath();
    ctx.fill();

    // ---- 3. Near broken edge highlight ----
    ctx.strokeStyle = `rgba(215,182,88,${0.65 + t * 0.28})`;
    ctx.lineWidth = Math.max(2, 4.5 * t);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // ---- 4. Far edge line ----
    ctx.strokeStyle = `rgba(145,115,55,${0.32 + t * 0.22})`;
    ctx.lineWidth = Math.max(1, 2 * t);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - hwFar + (i / n) * hwFar * 2 + obs.jagsFar[i] * hwFar * 0.35;
      const yj = yFar + obs.jagsFar[i] * 4 * tFar;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // ---- 5. Stone debris chunks ----
    if (t > 0.15) {
      const numChunks = 8;
      for (let i = 0; i < numChunks; i++) {
        const cx2   = VP_X - hw * 0.85 + i * (hw * 1.7 / (numChunks - 1));
        const cy2   = y + obs.jagsNear[Math.min(i, n)] * 6 * t;
        const size  = (2.5 + t * 9) * (0.35 + Math.abs(Math.sin(i * 1.8 + 0.4)) * 0.85);
        const angle = obs.jagsNear[i % (n + 1)] * 1.3;
        const cr2   = Math.floor(158 + t * 38), cg3 = Math.floor(126 + t * 26), cb2 = Math.floor(60 + t * 14);
        ctx.fillStyle = `rgb(${cr2},${cg3},${cb2})`;
        ctx.save();
        ctx.translate(cx2, cy2 - size * 0.12);
        ctx.rotate(angle);
        ctx.fillRect(-size * 0.55, -size * 0.45, size, size * 0.7);
        ctx.restore();
        // Chunk shadow
        ctx.fillStyle = `rgba(0,0,0,${0.18 + t * 0.1})`;
        ctx.save();
        ctx.translate(cx2 + t, cy2 + size * 0.28);
        ctx.rotate(angle);
        ctx.fillRect(-size * 0.55, -size * 0.08, size, size * 0.16);
        ctx.restore();
      }
    }

    // ---- 6. Foam/spray where sea meets stone ----
    if (t > 0.28) {
      const foamAlpha = 0.14 + 0.1 * Math.sin(now * 4.5);
      ctx.strokeStyle = `rgba(185,228,250,${foamAlpha})`;
      ctx.lineWidth = Math.max(1, 1.8 * t);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x  = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
        const yj = y + obs.jagsNear[i] * 6 * t + 2;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      ctx.stroke();
    }
  }

  // ---- Tree Root ----
  function drawRoot(ctx, obs) {
    const t    = obs.t;
    const y    = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw   = pathHalfW(t);
    const side = obs.rootSide;
    const rootH = 9 + 20 * t;

    // Root body — gnarled wood, solid color (no gradient in loop)
    const rr = Math.floor(72 + t * 22), rg = Math.floor(50 + t * 15), rb = Math.floor(18 + t * 8);
    ctx.fillStyle = `rgb(${rr},${rg},${rb})`;
    ctx.beginPath();
    ctx.moveTo(VP_X - hw, y);
    ctx.lineTo(VP_X + hw, y);
    // Gnarled top edge — bumpy profile
    const bumps = 6;
    for (let i = bumps; i >= 0; i--) {
      const bx   = VP_X - hw + (i / bumps) * hw * 2;
      const bump = rootH * (0.55 + Math.sin(i * 1.6 + side * 0.9) * 0.45);
      ctx.lineTo(bx, y - bump);
    }
    ctx.closePath();
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = `rgba(18,10,3,0.45)`;
    ctx.lineWidth = Math.max(0.5, 1.2 * t);
    for (let i = 0; i < 3; i++) {
      const lx = VP_X - hw * 0.5 + i * hw * 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.quadraticCurveTo(lx + side * 4 * t, y - rootH * 0.55, lx - side * 2 * t, y - rootH * 0.85);
      ctx.stroke();
    }

    // Top highlight
    ctx.strokeStyle = `rgba(${Math.floor(rr + 40)},${Math.floor(rg + 28)},${Math.floor(rb + 10)},0.6)`;
    ctx.lineWidth = Math.max(0.8, 1.5 * t);
    ctx.beginPath();
    ctx.moveTo(VP_X - hw, y - rootH * 0.7);
    ctx.lineTo(VP_X + hw, y - rootH * 0.65);
    ctx.stroke();

    // Shadow cast below root
    const sg = ctx.createLinearGradient(0, y, 0, y + 9 * t);
    sg.addColorStop(0, 'rgba(0,0,0,0.38)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(VP_X - hw, y, hw * 2, 9 * t);

    // Tree trunk at the side the root comes from
    const trunkX  = VP_X + side * hw;
    const trunkW  = 6 + 13 * t;
    const trunkH  = 45 + 85 * t;
    const trunkLeft = side > 0 ? trunkX : trunkX - trunkW;

    ctx.fillStyle = `rgb(${Math.floor(38+t*12)},${Math.floor(24+t*8)},${Math.floor(8+t*4)})`;
    ctx.fillRect(trunkLeft, y - trunkH, trunkW, trunkH + rootH);

    // Bark lines on trunk
    if (t > 0.15) {
      ctx.strokeStyle = 'rgba(12,7,2,0.45)';
      ctx.lineWidth = Math.max(0.5, t);
      for (let i = 1; i <= 3; i++) {
        const by = y - trunkH * (i / 4);
        ctx.beginPath();
        ctx.moveTo(trunkLeft, by); ctx.lineTo(trunkLeft + trunkW, by);
        ctx.stroke();
      }
    }

    // Foliage at top of trunk
    if (t > 0.22) {
      const cr2  = 12 + 22 * t;
      const fcx  = trunkLeft + trunkW / 2;
      const fcy  = y - trunkH - cr2 * 0.3;
      ctx.fillStyle = '#162e0c';
      ctx.beginPath(); ctx.arc(fcx, fcy, cr2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e3d10';
      ctx.beginPath(); ctx.arc(fcx - cr2 * 0.3 * side, fcy - cr2 * 0.3, cr2 * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(fcx + cr2 * 0.25, fcy + cr2 * 0.1, cr2 * 0.65, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- Tunnel (massive tree trunk, low root arch — must slide) ----
  function drawTunnel(ctx, obs) {
    const t      = obs.t;
    const y      = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw     = pathHalfW(t);
    const archH  = 14 + 30 * t;   // low arch forces sliding
    const rootW  = Math.max(3, 5 + 14 * t);
    const trunkH = 90 + 130 * t;

    const tr = Math.floor(40 + t * 20);
    const tg = Math.floor(25 + t * 13);
    const tb = Math.floor(8  + t * 5);

    // ---- Massive trunk (full width) ----
    ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
    ctx.fillRect(VP_X - hw, y - trunkH, hw * 2, trunkH);

    // Bark — vertical curved lines
    if (t > 0.12) {
      ctx.strokeStyle = `rgba(12,6,2,0.32)`;
      ctx.lineWidth = Math.max(0.5, t * 0.9);
      const lines = Math.max(3, Math.floor(hw / 7));
      for (let i = 1; i < lines; i++) {
        const bx = VP_X - hw + (i / lines) * hw * 2;
        const cv = Math.sin(i * 0.9) * 4 * t;
        ctx.beginPath();
        ctx.moveTo(bx + cv, y - trunkH);
        ctx.quadraticCurveTo(bx - cv, y - trunkH * 0.5, bx + cv * 0.5, y);
        ctx.stroke();
      }
    }

    // Horizontal bark rings
    if (t > 0.2) {
      ctx.strokeStyle = `rgba(12,6,2,0.18)`;
      ctx.lineWidth = Math.max(0.5, t);
      for (let i = 1; i <= 4; i++) {
        const by = y - trunkH * (i / 5);
        ctx.beginPath(); ctx.moveTo(VP_X - hw, by); ctx.lineTo(VP_X + hw, by); ctx.stroke();
      }
    }

    // ---- Tunnel opening (dark arch over trunk) ----
    const innerHw   = hw - rootW;
    const innerArchH = Math.max(2, archH - rootW * 0.6);

    ctx.fillStyle = 'rgba(3,5,8,0.96)';
    ctx.beginPath();
    ctx.moveTo(VP_X - innerHw, y);
    ctx.lineTo(VP_X + innerHw, y);
    ctx.ellipse(VP_X, y, innerHw, innerArchH, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Faint light at far end of tunnel
    const lg = ctx.createRadialGradient(VP_X, y - innerArchH * 0.48, 0, VP_X, y - innerArchH * 0.48, innerHw * 0.45);
    lg.addColorStop(0, `rgba(55,110,170,${0.12 + t * 0.08})`);
    lg.addColorStop(1, 'rgba(55,110,170,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(VP_X, y - innerArchH * 0.48, innerHw * 0.45, innerArchH * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Root arch outline ----
    const rootDark = `rgb(${Math.floor(tr*0.62)},${Math.floor(tg*0.62)},${Math.floor(tb*0.62)})`;
    ctx.strokeStyle = rootDark;
    ctx.lineWidth = rootW * 1.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(VP_X - innerHw - rootW * 0.5, y);
    ctx.ellipse(VP_X, y, innerHw + rootW * 0.5, archH, 0, Math.PI, 0, false);
    ctx.lineTo(VP_X + innerHw + rootW * 0.5, y);
    ctx.stroke();

    // Root highlight
    ctx.strokeStyle = `rgba(${tr + 22},${tg + 14},${tb + 5},0.38)`;
    ctx.lineWidth = rootW * 0.38;
    ctx.beginPath();
    ctx.ellipse(VP_X, y, innerHw + rootW * 0.25, archH * 0.88, 0, Math.PI * 0.78, Math.PI * 0.22, false);
    ctx.stroke();

    // Lateral roots visible on ground on each side
    if (t > 0.15) {
      ctx.strokeStyle = rootDark;
      ctx.lineWidth = Math.max(2, rootW * 0.6);
      for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(VP_X + side * hw, y);
        ctx.quadraticCurveTo(
          VP_X + side * (hw * 1.05), y - archH * 0.35,
          VP_X + side * (hw * 0.85), y - archH * 0.7
        );
        ctx.stroke();
      }
    }

    // ---- Foliage canopy ----
    if (t > 0.06) {
      const cr  = 28 + 75 * t;
      const fcy = y - trunkH - cr * 0.35;
      ctx.fillStyle = '#0b2006'; ctx.beginPath(); ctx.arc(VP_X, fcy, cr * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14300a'; ctx.beginPath(); ctx.arc(VP_X - cr * 0.42, fcy - cr * 0.18, cr * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a3c0e'; ctx.beginPath(); ctx.arc(VP_X + cr * 0.35, fcy - cr * 0.12, cr * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(VP_X + cr * 0.22, fcy + cr * 0.12, cr * 0.68, 0, Math.PI * 2); ctx.fill();
    }

    // Ground shadow
    ctx.fillStyle = `rgba(0,0,0,${0.14 + t * 0.18})`;
    ctx.fillRect(VP_X - hw, y, hw * 2, 9 * t);
  }

})();
