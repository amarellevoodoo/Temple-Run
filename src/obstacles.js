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
      const type = Math.random() < 0.5 ? 'hole' : 'root';
      const obs = { t: 0, hit: false, type };
      if (type === 'hole') {
        obs.holeDepth = 0.055 + Math.random() * 0.035;
        obs.jagsNear  = makeJags(9);
        obs.jagsFar   = makeJags(9);
      } else {
        obs.rootSide = Math.random() < 0.5 ? -1 : 1;
      }
      TD.obstacles.push(obs);
      TD.obsTimer = OBS_INTERVAL;
    }

    for (let o of TD.obstacles) o.t += speed;
    TD.obstacles = TD.obstacles.filter(o => o.t < 1.3);
  };

  // Both obstacle types require jumping to clear
  TD.obstaclesCheckCollision = function() {
    const p = TD.player;
    for (let o of TD.obstacles) {
      if (o.hit) continue;
      if (Math.abs(o.t - PLAYER_T) < 0.045) {
        if (p.jumpT < JUMP_CLEAR_THRESHOLD) {
          o.hit = true;
          return true;
        }
      }
    }
    return false;
  };

  TD.drawObstacle = function(ctx, obs) {
    if (obs.t < 0.02 || obs.t > 1.15) return;
    if (obs.type === 'hole') drawHole(ctx, obs);
    else                     drawRoot(ctx, obs);
  };

  // ---- Hole ----
  function drawHole(ctx, obs) {
    const t = obs.t;
    const y    = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw   = pathHalfW(t);
    const tFar = Math.max(0.01, t - obs.holeDepth);
    const yFar = VP_Y + (GROUND_BOTTOM - VP_Y) * tFar;
    const hwFar = pathHalfW(tFar);
    const n  = obs.jagsNear.length - 1;

    // Dark void
    ctx.fillStyle = '#04080a';
    ctx.beginPath();
    // Near jagged edge (bottom of hole on screen)
    for (let i = 0; i <= n; i++) {
      const x = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    // Far edge (top of hole, closer to horizon)
    for (let i = n; i >= 0; i--) {
      const x = VP_X - hwFar + (i / n) * hwFar * 2 + obs.jagsFar[i] * hwFar * 0.4;
      const yj = yFar + obs.jagsFar[i] * 4 * tFar;
      ctx.lineTo(x, yj);
    }
    ctx.closePath();
    ctx.fill();

    // Depth gradient inside hole
    const dg = ctx.createLinearGradient(0, yFar, 0, y);
    dg.addColorStop(0, 'rgba(0,0,0,0.9)');
    dg.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(VP_X - hw, y); ctx.lineTo(VP_X + hw, y);
    ctx.lineTo(VP_X + hwFar, yFar); ctx.lineTo(VP_X - hwFar, yFar);
    ctx.closePath();
    ctx.fill();

    // Near broken edge line
    ctx.strokeStyle = `rgba(195,162,80,${0.55 + t * 0.35})`;
    ctx.lineWidth = Math.max(1.5, 3.5 * t);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = VP_X - hw + (i / n) * hw * 2 + obs.jagsNear[i] * hw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // Far edge line
    ctx.strokeStyle = `rgba(130,105,50,${0.35 + t * 0.2})`;
    ctx.lineWidth = Math.max(1, 2 * t);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = VP_X - hwFar + (i / n) * hwFar * 2 + obs.jagsFar[i] * hwFar * 0.4;
      const yj = yFar + obs.jagsFar[i] * 4 * tFar;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // Broken stone chunks on near edge
    if (t > 0.18) {
      const cr = Math.floor(145 + t * 45), cg = Math.floor(112 + t * 33), cb = Math.floor(55 + t * 18);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      for (let i = 0; i < 5; i++) {
        const cx2  = VP_X - hw * 0.75 + i * hw * 0.37;
        const size = (3 + t * 7) * (0.5 + Math.abs(Math.sin(i * 2.1)) * 0.7);
        const angle = obs.jagsNear[i] * 0.8;
        ctx.save();
        ctx.translate(cx2, y - size * 0.2);
        ctx.rotate(angle);
        ctx.fillRect(-size / 2, -size * 0.4, size, size * 0.7);
        ctx.restore();
      }
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

})();
