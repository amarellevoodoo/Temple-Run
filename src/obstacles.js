// ============================================
// obstacles.js — Holes and tree roots
// ============================================

(function() {
  const { OBS_INTERVAL, PLAYER_T, JUMP_CLEAR_THRESHOLD,
          VP_X, VP_Y, GROUND_BOTTOM, LANE_W, pathHalfW } = TD;

  TD.obstacles = [];
  TD.obsTimer = 0;
  TD.tunnelCooldown = 0;
  TD.collapseCooldown = 0;

  const TUNNEL_COOLDOWN_FRAMES = 180;
  // Collapse obstacles are very long (depth 0.35-0.45) and require the player
  // to be in a specific lane. Back-to-back collapses with different safe lanes
  // are impossible to survive, so space them far apart (~5 s at 60 fps).
  const COLLAPSE_COOLDOWN_FRAMES = 300;

  TD.obstaclesReset = function() {
    TD.obstacles = [];
    TD.obsTimer = Math.floor(OBS_INTERVAL * 0.7);
    TD.tunnelCooldown = 0;
    TD.collapseCooldown = 0;
  };

  // Pre-generate jagged edge points at spawn so they don't change each frame
  function makeJags(count) {
    const jags = [];
    for (let i = 0; i <= count; i++) jags.push((Math.random() - 0.5) * 0.35);
    return jags;
  }

  TD.obstaclesUpdate = function(speed) {
    TD.obsTimer--;
    if (TD.tunnelCooldown > 0) TD.tunnelCooldown--;
    if (TD.collapseCooldown > 0) TD.collapseCooldown--;

    if (TD.obsTimer <= 0) {
      const roll = Math.random();
      let type = roll < 0.25 ? 'hole' : roll < 0.50 ? 'root' : roll < 0.75 ? 'tunnel' : 'collapse';
      if (type === 'tunnel' && TD.tunnelCooldown > 0) {
        type = Math.random() < 0.5 ? 'hole' : 'root';
      }
      if (type === 'collapse' && TD.collapseCooldown > 0) {
        type = Math.random() < 0.5 ? 'hole' : 'root';
      }
      if (type === 'tunnel') TD.tunnelCooldown = TUNNEL_COOLDOWN_FRAMES;
      if (type === 'collapse') TD.collapseCooldown = COLLAPSE_COOLDOWN_FRAMES;
      const obs = { t: 0, hit: false, type };
      if (type === 'hole') {
        obs.holeDepth = 0.10 + Math.random() * 0.06;
        obs.jagsNear  = makeJags(9);
        obs.jagsFar   = makeJags(9);
      } else if (type === 'root') {
        obs.rootSide = Math.random() < 0.5 ? -1 : 1;
      } else if (type === 'collapse') {
        const lanes = [-1, 0, 1];
        const safeLane = lanes[Math.floor(Math.random() * 3)];
        // 60% chance only 1 safe lane, 40% chance 2 safe lanes
        if (Math.random() < 0.4) {
          const remaining = lanes.filter(l => l !== safeLane);
          const secondSafe = remaining[Math.floor(Math.random() * 2)];
          obs.blockedLanes = lanes.filter(l => l !== safeLane && l !== secondSafe);
        } else {
          obs.blockedLanes = lanes.filter(l => l !== safeLane);
        }
        obs.safeLanes = lanes.filter(l => !obs.blockedLanes.includes(l));
        obs.collapseDepth = 0.35 + Math.random() * 0.10;
        obs.jagsPerLane = {};
        obs.flameSeeds = {};
        for (const l of obs.blockedLanes) {
          obs.jagsPerLane[l] = makeJags(7);
          const seeds = [];
          for (let i = 0; i < 8; i++) {
            seeds.push({ phase: Math.random() * Math.PI * 2, speed: 2.5 + Math.random() * 2, xOff: (Math.random() - 0.5) * 0.8 });
          }
          obs.flameSeeds[l] = seeds;
        }
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
      const hitWindow = o.type === 'tunnel' ? 0.025 : 0.045;
      const inRange = o.type === 'collapse'
        ? (o.t * (1 - o.collapseDepth)) <= PLAYER_T && PLAYER_T <= o.t
        : Math.abs(o.t - PLAYER_T) < hitWindow;
      if (inRange) {
        let failed = false;
        if (o.type === 'tunnel') {
          failed = TD.player.sliding !== true;
        } else if (o.type === 'collapse') {
          failed = o.blockedLanes.includes(p.targetLane);
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
    if (obs.t < 0.02 || obs.smashed) return;
    // Tunnel disappears as soon as the player has passed through it,
    // so obstacles behind it become immediately visible.
    const maxT = obs.type === 'tunnel' ? PLAYER_T + 0.05 : 1.15;
    if (obs.t > maxT) return;
    if (obs.type === 'hole')            drawHole(ctx, obs);
    else if (obs.type === 'tunnel')     drawTunnel(ctx, obs);
    else if (obs.type === 'collapse')   drawCollapse(ctx, obs);
    else                                drawRoot(ctx, obs);
  };

  // ---- Hole ----
  function drawHole(ctx, obs) {
    const t      = obs.t;
    const y      = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw     = pathHalfW(t);
    const wallW  = 3 + 20 * t;
    const wallH  = 6 + 105 * t;
    const totalHw = hw + wallW;                         // full width incl. walls

    const tFar      = Math.max(0.01, t * (1 - obs.holeDepth));
    const yFar      = VP_Y + (GROUND_BOTTOM - VP_Y) * tFar;
    const hwFar     = pathHalfW(tFar);
    const wallWFar  = 3 + 20 * tFar;
    const wallHFar  = 6 + 105 * tFar;
    const totalHwFar = hwFar + wallWFar;

    const n   = obs.jagsNear.length - 1;
    const now = Date.now() * 0.001;

    // Full-width hole outline (path + wall footprint on the ground plane)
    function traceHole() {
      for (let i = 0; i <= n; i++) {
        const x  = VP_X - totalHw + (i / n) * totalHw * 2 + obs.jagsNear[i] * totalHw * 0.5;
        const yj = y + obs.jagsNear[i] * 6 * t;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      for (let i = n; i >= 0; i--) {
        const x  = VP_X - totalHwFar + (i / n) * totalHwFar * 2 + obs.jagsFar[i] * totalHwFar * 0.35;
        const yj = yFar + obs.jagsFar[i] * 4 * tFar;
        ctx.lineTo(x, yj);
      }
      ctx.closePath();
    }

    // ---- 1. Wall gap — cover the wall segments above ground ----
    // Drawn first so stone cross-sections overlay on top.
    for (const side of [-1, 1]) {
      const xiNear = VP_X + side * hw;
      const xoNear = VP_X + side * totalHw;
      const xiFar  = VP_X + side * hwFar;
      const xoFar  = VP_X + side * totalHwFar;
      const ytNear = y    - wallH;
      const ytFar  = yFar - wallHFar;

      // Top face of the gap (looking down into the destroyed wall section)
      ctx.fillStyle = '#060f1c';
      ctx.beginPath();
      ctx.moveTo(xiNear, ytNear); ctx.lineTo(xoNear, ytNear);
      ctx.lineTo(xoFar,  ytFar);  ctx.lineTo(xiFar,  ytFar);
      ctx.closePath(); ctx.fill();

      // Inner face (path-side face of the missing wall section — recedes into distance)
      const gInner = ctx.createLinearGradient(0, ytNear, 0, y);
      gInner.addColorStop(0, '#040c18');
      gInner.addColorStop(1, '#0c2238');
      ctx.fillStyle = gInner;
      ctx.beginPath();
      ctx.moveTo(xiNear, y);    ctx.lineTo(xiNear, ytNear);
      ctx.lineTo(xiFar,  ytFar); ctx.lineTo(xiFar,  yFar);
      ctx.closePath(); ctx.fill();
    }

    // ---- 2. Sea visible through the ground hole (clipped to full-width outline) ----
    ctx.save();
    ctx.beginPath(); traceHole(); ctx.clip();

    const seaG = ctx.createLinearGradient(0, yFar, 0, y);
    seaG.addColorStop(0,   '#081828');
    seaG.addColorStop(0.5, '#0c2238');
    seaG.addColorStop(1,   '#102a44');
    ctx.fillStyle = seaG;
    ctx.fillRect(VP_X - totalHw, yFar, totalHw * 2, y - yFar + 10);

    ctx.lineCap = 'round';
    for (let w = 0; w < 4; w++) {
      const wy    = yFar + (y - yFar) * (0.2 + w * 0.22);
      const amp   = (0.8 + 1.8 * t) * (1 - w * 0.15);
      const phase = now * 2.2 + w * 1.4;
      ctx.strokeStyle = `rgba(30,95,165,${0.35 + w * 0.08})`;
      ctx.lineWidth = Math.max(0.7, 1.4 * t);
      ctx.beginPath();
      for (let x = VP_X - totalHw; x <= VP_X + totalHw; x += 5) {
        const wv = wy + Math.sin(x * 0.055 + phase) * amp;
        x === VP_X - totalHw ? ctx.moveTo(x, wv) : ctx.lineTo(x, wv);
      }
      ctx.stroke();
    }

    if (t > 0.22) {
      const sparkAlpha = 0.18 + 0.12 * Math.sin(now * 3.5);
      const sparkG = ctx.createRadialGradient(
        VP_X, yFar + (y - yFar) * 0.38, 0,
        VP_X, yFar + (y - yFar) * 0.38, totalHw * 0.55
      );
      sparkG.addColorStop(0, `rgba(130,210,250,${sparkAlpha})`);
      sparkG.addColorStop(1, 'rgba(130,210,250,0)');
      ctx.fillStyle = sparkG;
      ctx.fillRect(VP_X - totalHw, yFar, totalHw * 2, y - yFar);
    }
    ctx.restore();

    // ---- 3. Stone path cross-section (near edge, full width) ----
    const thickness = Math.max(2, 7 * t);
    const sr  = Math.floor(88 + t * 32);
    const sgr = Math.floor(70 + t * 25);
    const sbv = Math.floor(36 + t * 14);
    ctx.fillStyle = `rgb(${sr},${sgr},${sbv})`;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - totalHw + (i / n) * totalHw * 2 + obs.jagsNear[i] * totalHw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    for (let i = n; i >= 0; i--) {
      const x  = VP_X - totalHw + (i / n) * totalHw * 2 + obs.jagsNear[i] * totalHw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t + thickness;
      ctx.lineTo(x, yj);
    }
    ctx.closePath();
    ctx.fill();

    // ---- 4. Wall cross-sections (broken wall face at near edge, both sides) ----
    const wr  = Math.floor(108 + t * 72);
    const wgr = Math.floor(84  + t * 58);
    const wbv = Math.floor(40  + t * 32);
    for (const side of [-1, 1]) {
      const rectX  = VP_X + side * hw + (side > 0 ? 0 : -wallW);
      const jagIdx = side > 0 ? n : 0;
      const jagY   = y + obs.jagsNear[jagIdx] * 6 * t;

      // Stone face
      ctx.fillStyle = `rgb(${wr},${wgr},${wbv})`;
      ctx.fillRect(rectX, jagY - wallH, wallW, wallH + thickness);

      // Top highlight
      ctx.fillStyle = `rgb(${Math.floor(175 + t * 25)},${Math.floor(145 + t * 20)},${Math.floor(72 + t * 18)})`;
      ctx.fillRect(rectX, jagY - wallH, wallW, Math.max(2, 4 * t));

      // Mortar lines on cross-section
      if (t > 0.2) {
        ctx.strokeStyle = `rgba(55,40,15,${0.2 + t * 0.25})`;
        ctx.lineWidth = Math.max(0.5, 1.2 * t);
        const blockH = Math.max(5, 14 + t * 8);
        for (let bh = blockH; bh < wallH - 2; bh += blockH) {
          const by = jagY - wallH + bh;
          ctx.beginPath();
          ctx.moveTo(rectX, by); ctx.lineTo(rectX + wallW, by); ctx.stroke();
        }
      }
    }

    // ---- 5. Near broken edge highlight (full width) ----
    ctx.strokeStyle = `rgba(215,182,88,${0.65 + t * 0.28})`;
    ctx.lineWidth = Math.max(2, 4.5 * t);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - totalHw + (i / n) * totalHw * 2 + obs.jagsNear[i] * totalHw * 0.5;
      const yj = y + obs.jagsNear[i] * 6 * t;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // ---- 6. Far edge line (full width) ----
    ctx.strokeStyle = `rgba(145,115,55,${0.32 + t * 0.22})`;
    ctx.lineWidth = Math.max(1, 2 * t);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x  = VP_X - totalHwFar + (i / n) * totalHwFar * 2 + obs.jagsFar[i] * totalHwFar * 0.35;
      const yj = yFar + obs.jagsFar[i] * 4 * tFar;
      i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
    }
    ctx.stroke();

    // ---- 7. Stone debris (spread across full width) ----
    if (t > 0.15) {
      const numChunks = 10;
      for (let i = 0; i < numChunks; i++) {
        const cx2   = VP_X - totalHw * 0.9 + i * (totalHw * 1.8 / (numChunks - 1));
        const cy2   = y + obs.jagsNear[Math.min(Math.floor(i * n / numChunks), n)] * 6 * t;
        const size  = (2.5 + t * 9) * (0.35 + Math.abs(Math.sin(i * 1.8 + 0.4)) * 0.85);
        const angle = obs.jagsNear[i % (n + 1)] * 1.3;
        const cr2 = Math.floor(158 + t * 38), cg3 = Math.floor(126 + t * 26), cb2 = Math.floor(60 + t * 14);
        ctx.fillStyle = `rgb(${cr2},${cg3},${cb2})`;
        ctx.save();
        ctx.translate(cx2, cy2 - size * 0.12);
        ctx.rotate(angle);
        ctx.fillRect(-size * 0.55, -size * 0.45, size, size * 0.7);
        ctx.restore();
        ctx.fillStyle = `rgba(0,0,0,${0.18 + t * 0.1})`;
        ctx.save();
        ctx.translate(cx2 + t, cy2 + size * 0.28);
        ctx.rotate(angle);
        ctx.fillRect(-size * 0.55, -size * 0.08, size, size * 0.16);
        ctx.restore();
      }
    }

    // ---- 8. Foam/spray ----
    if (t > 0.28) {
      const foamAlpha = 0.14 + 0.1 * Math.sin(now * 4.5);
      ctx.strokeStyle = `rgba(185,228,250,${foamAlpha})`;
      ctx.lineWidth = Math.max(1, 1.8 * t);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x  = VP_X - totalHw + (i / n) * totalHw * 2 + obs.jagsNear[i] * totalHw * 0.5;
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

  // ---- Collapse (lane crumbles — must dodge to safe lane) ----
  function drawCollapse(ctx, obs) {
    const t = obs.t;
    const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const depth = obs.collapseDepth;
    const tFar = Math.max(0.01, t * (1 - depth));
    const yFar = VP_Y + (GROUND_BOTTOM - VP_Y) * tFar;
    const now = Date.now() * 0.001;

    for (const lane of obs.blockedLanes) {
      const laneCenter = VP_X + lane * LANE_W * t;
      const laneCenterFar = VP_X + lane * LANE_W * tFar;
      // Full lane width — no shrink factor, fills the entire lane
      const halfW = LANE_W * t * 0.5;
      const halfWFar = LANE_W * tFar * 0.5;
      const jags = obs.jagsPerLane[lane];
      const n = jags.length - 1;
      const gapH = y - yFar;

      // Clipped abyss region
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = laneCenter - halfW + (i / n) * halfW * 2 + jags[i] * halfW * 0.2;
        const yj = y + jags[i] * 3 * t;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      for (let i = n; i >= 0; i--) {
        const x = laneCenterFar - halfWFar + (i / n) * halfWFar * 2 + jags[i] * halfWFar * 0.15;
        const yj = yFar + jags[i] * 2 * tFar;
        ctx.lineTo(x, yj);
      }
      ctx.closePath();
      ctx.clip();

      // Deep dark abyss with lava glow at bottom
      const abyssG = ctx.createLinearGradient(0, yFar, 0, y);
      abyssG.addColorStop(0, '#1a0500');
      abyssG.addColorStop(0.3, '#0a0200');
      abyssG.addColorStop(0.7, '#080808');
      abyssG.addColorStop(1, '#0c0c0c');
      ctx.fillStyle = abyssG;
      ctx.fillRect(laneCenter - halfW, yFar, halfW * 2, gapH + 5);

      // Lava pool at the bottom
      if (t > 0.06) {
        const lavaY = yFar + gapH * 0.55;
        const lavaG = ctx.createLinearGradient(0, lavaY, 0, y);
        lavaG.addColorStop(0, `rgba(200,60,10,${0.4 + 0.2 * Math.sin(now * 2.5 + lane)})`);
        lavaG.addColorStop(0.4, `rgba(240,110,15,${0.35 + 0.15 * Math.sin(now * 3.2 + lane * 2)})`);
        lavaG.addColorStop(1, `rgba(255,160,30,${0.25 + 0.12 * Math.sin(now * 4 + lane)})`);
        ctx.fillStyle = lavaG;
        ctx.fillRect(laneCenter - halfW, lavaY, halfW * 2, y - lavaY);
      }

      // Tall flames distributed across the full lane, along the entire gap length
      if (t > 0.04) {
        const flames = obs.flameSeeds[lane];
        const cols = 3;
        const rows = flames.length;
        for (let f = 0; f < rows; f++) {
          const seed = flames[f];
          const rowFrac = f / rows;
          const sliceT = tFar + (t - tFar) * rowFrac;
          const sliceY = yFar + gapH * rowFrac;
          const sliceCenter = laneCenterFar + (laneCenter - laneCenterFar) * rowFrac;
          const sliceHalfW = halfWFar + (halfW - halfWFar) * rowFrac;

          for (let c = 0; c < cols; c++) {
            const xFrac = -0.7 + c * 0.7;
            const baseX = sliceCenter + xFrac * sliceHalfW;
            const baseY = sliceY;

            const flameH = (25 + 70 * sliceT) * (0.55 + 0.45 * Math.sin(now * seed.speed + seed.phase + c * 2.1));
            const flameW = sliceHalfW * (0.45 + 0.15 * Math.sin(now * seed.speed * 1.4 + seed.phase + c));
            const flicker = Math.sin(now * seed.speed * 1.2 + seed.phase + c * 1.7);

            ctx.beginPath();
            ctx.moveTo(baseX - flameW, baseY);
            ctx.quadraticCurveTo(
              baseX - flameW * 0.5, baseY - flameH * 0.55,
              baseX + flicker * flameW * 0.25, baseY - flameH
            );
            ctx.quadraticCurveTo(
              baseX + flameW * 0.5, baseY - flameH * 0.55,
              baseX + flameW, baseY
            );
            ctx.closePath();

            const flameG = ctx.createLinearGradient(0, baseY, 0, baseY - flameH);
            const alphaBase = Math.min(1, 0.55 + 0.35 * sliceT);
            flameG.addColorStop(0, `rgba(255,220,60,${alphaBase})`);
            flameG.addColorStop(0.3, `rgba(255,140,25,${alphaBase * 0.9})`);
            flameG.addColorStop(0.6, `rgba(220,50,10,${alphaBase * 0.6})`);
            flameG.addColorStop(1, 'rgba(80,10,5,0)');
            ctx.fillStyle = flameG;
            ctx.fill();
          }
        }

        // Ambient heat glow
        const heatAlpha = 0.12 + 0.08 * Math.sin(now * 2.8 + lane * 1.5);
        const heatG = ctx.createLinearGradient(0, yFar + gapH * 0.4, 0, yFar);
        heatG.addColorStop(0, `rgba(255,120,30,${heatAlpha})`);
        heatG.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = heatG;
        ctx.fillRect(laneCenter - halfW, yFar, halfW * 2, gapH * 0.6);
      }

      ctx.restore();

      // Near broken edge cross-section
      const thickness = Math.max(2, 6 * t);
      const er = Math.floor(88 + t * 32);
      const eg = Math.floor(70 + t * 25);
      const eb = Math.floor(36 + t * 14);
      ctx.fillStyle = `rgb(${er},${eg},${eb})`;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = laneCenter - halfW + (i / n) * halfW * 2 + jags[i] * halfW * 0.2;
        const yj = y + jags[i] * 3 * t;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      for (let i = n; i >= 0; i--) {
        const x = laneCenter - halfW + (i / n) * halfW * 2 + jags[i] * halfW * 0.2;
        const yj = y + jags[i] * 3 * t + thickness;
        ctx.lineTo(x, yj);
      }
      ctx.closePath();
      ctx.fill();

      // Bright edge highlight (near)
      ctx.strokeStyle = `rgba(255,200,80,${0.5 + t * 0.35})`;
      ctx.lineWidth = Math.max(1.5, 3.5 * t);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = laneCenter - halfW + (i / n) * halfW * 2 + jags[i] * halfW * 0.2;
        const yj = y + jags[i] * 3 * t;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      ctx.stroke();

      // Far edge highlight
      ctx.strokeStyle = `rgba(180,100,30,${0.3 + t * 0.2})`;
      ctx.lineWidth = Math.max(1, 2 * t);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = laneCenterFar - halfWFar + (i / n) * halfWFar * 2 + jags[i] * halfWFar * 0.15;
        const yj = yFar + jags[i] * 2 * tFar;
        i === 0 ? ctx.moveTo(x, yj) : ctx.lineTo(x, yj);
      }
      ctx.stroke();

      // Embers/sparks floating up (unclipped, above the gap)
      if (t > 0.10) {
        for (let e = 0; e < 6; e++) {
          const seed = obs.flameSeeds[lane][e % obs.flameSeeds[lane].length];
          const ex = laneCenter + (seed.xOff * 0.8 + (e - 3) * 0.12) * halfW;
          const sparkT = (now * seed.speed * 0.4 + seed.phase + e * 0.8) % 1;
          const ey = y - sparkT * 40 * t;
          const sparkSize = Math.max(1, 3 * t * (1 - sparkT));
          const sparkAlpha = (1 - sparkT) * (0.7 + 0.3 * t);
          ctx.fillStyle = `rgba(255,${Math.floor(180 + 75 * sparkT)},${Math.floor(40 + 60 * sparkT)},${sparkAlpha})`;
          ctx.beginPath();
          ctx.arc(ex, ey, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ---- Tunnel (tree arch — must slide) ----
  function drawTunnel(ctx, obs) {
    const t   = obs.t;
    const y   = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
    const hw  = pathHalfW(t);
    // archH scaled for the bigger player (2.2× depthScale) so the crouched
    // character visually fits under the opening.
    const archH  = 14 + 42 * t;
    const rootW  = Math.max(3, 6 + 14 * t);
    const trunkH = 55 + 85 * t;

    const tr = Math.floor(40 + t * 20);
    const tg = Math.floor(25 + t * 13);
    const tb = Math.floor(8  + t * 5);
    const rootDark = `rgb(${Math.floor(tr*0.62)},${Math.floor(tg*0.62)},${Math.floor(tb*0.62)})`;

    // ---- Trunk + bark ----
    ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
    ctx.fillRect(VP_X - hw, y - trunkH, hw * 2, trunkH);

    // Bark vertical lines
    if (t > 0.12) {
      ctx.strokeStyle = 'rgba(12,6,2,0.32)';
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
      ctx.strokeStyle = 'rgba(12,6,2,0.18)';
      ctx.lineWidth = Math.max(0.5, t);
      for (let i = 1; i <= 4; i++) {
        const by = y - trunkH * (i / 5);
        ctx.beginPath(); ctx.moveTo(VP_X - hw, by); ctx.lineTo(VP_X + hw, by); ctx.stroke();
      }
    }

    // ---- Tunnel opening (dark arch) — always visible as early warning ----
    const innerHw    = hw - rootW;
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

    // ---- Root arch outline — always visible ----
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

    // Lateral roots on ground
    if (t > 0.15) {
      ctx.strokeStyle = rootDark;
      ctx.lineWidth = Math.max(2, rootW * 0.6);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(VP_X + side * hw, y);
        ctx.quadraticCurveTo(
          VP_X + side * (hw * 1.05), y - archH * 0.35,
          VP_X + side * (hw * 0.85), y - archH * 0.7
        );
        ctx.stroke();
      }
    }

    // ---- Canopy ----
    if (t > 0.06) {
      const cr  = 20 + 48 * t;
      const fcy = y - trunkH - cr * 0.35;
      ctx.fillStyle = '#0b2006'; ctx.beginPath(); ctx.arc(VP_X, fcy, cr * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14300a'; ctx.beginPath(); ctx.arc(VP_X - cr * 0.42, fcy - cr * 0.18, cr * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a3c0e'; ctx.beginPath(); ctx.arc(VP_X + cr * 0.35, fcy - cr * 0.12, cr * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(VP_X + cr * 0.22, fcy + cr * 0.12, cr * 0.68, 0, Math.PI * 2); ctx.fill();
    }
  }

})();
