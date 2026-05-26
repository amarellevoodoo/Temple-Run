// ============================================
// obstacles.js — Wall spawning, gaps, collision, drawing
// ============================================

(function() {
  const { LANES, OBS_INTERVAL, OVERHEAD_CHANCE, PLAYER_T, JUMP_CLEAR_THRESHOLD,
          VP_X, VP_Y, GROUND_BOTTOM, laneToScreen, pathHalfW } = TD;

  TD.obstacles = [];
  TD.obsTimer = 0;

  TD.obstaclesReset = function() {
    TD.obstacles = [];
    TD.obsTimer = Math.floor(OBS_INTERVAL * 0.7);
  };

  TD.obstaclesUpdate = function(speed) {
    TD.obsTimer--;

    if (TD.obsTimer <= 0) {
      if (Math.random() < OVERHEAD_CHANCE) {
        // Overhead beam blocks the full path — must slide to pass.
        TD.obstacles.push({
          t: 0, hit: false,
          type: 'overhead',
          openLanes: [],
          blockedLanes: [...LANES],
        });
      } else {
        // Ground wall: randomly open 1 or 2 lanes out of 3
        const openCount = Math.random() < 0.6 ? 1 : 2;
        const shuffled = [...LANES].sort(() => Math.random() - 0.5);
        const openLanes = shuffled.slice(0, openCount);
        const blockedLanes = LANES.filter(l => !openLanes.includes(l));
        TD.obstacles.push({ t: 0, hit: false, type: 'ground', openLanes, blockedLanes });
      }
      TD.obsTimer = OBS_INTERVAL;
    }

    for (let o of TD.obstacles) o.t += speed;
    TD.obstacles = TD.obstacles.filter(o => o.t < 1.3);
  };

  // Returns true if player died
  TD.obstaclesCheckCollision = function() {
    const p = TD.player;
    const lowNow = TD.playerIsLow();
    for (let o of TD.obstacles) {
      if (o.hit) continue;
      if (Math.abs(o.t - PLAYER_T) >= 0.045) continue;

      if (o.type === 'overhead') {
        // Beam spans every lane; only sliding lets you pass under it.
        if (!lowNow) {
          o.hit = true;
          return true;
        }
      } else {
        const inBlocked = o.blockedLanes.some(bl => Math.abs(bl - p.targetLane) < 0.5);
        if (inBlocked && p.jumpT < JUMP_CLEAR_THRESHOLD) {
          o.hit = true;
          return true;
        }
      }
    }
    return false;
  };

  TD.drawObstacle = function(ctx, obs) {
    if (obs.t < 0 || obs.t > 1.15) return;
    if (obs.type === 'overhead') {
      drawOverheadBeam(ctx, obs);
      return;
    }
    const pal = TD.activePalette();
    const sC = laneToScreen(0, obs.t);
    const scale = obs.t;
    const y = sC.y;

    // Height: tall with reduced perspective
    const perspH = 50 * scale;
    const fixedH = 35;
    const bh = fixedH * 0.5 + perspH * 0.7;
    if (bh < 4) return;

    const hw = pathHalfW(scale);
    const fullLeft = VP_X - hw;
    const fullRight = VP_X + hw;
    const laneW = (fullRight - fullLeft) / 3;

    for (const bl of obs.blockedLanes) {
      const segLeft = fullLeft + (bl + 1) * laneW;
      const segRight = segLeft + laneW;
      const segW = segRight - segLeft;

      // Front face
      const g = ctx.createLinearGradient(segLeft, y - bh, segRight, y);
      g.addColorStop(0,    pal.obstacleFront[0]);
      g.addColorStop(0.35, pal.obstacleFront[1]);
      g.addColorStop(0.65, pal.obstacleFront[2]);
      g.addColorStop(1,    pal.obstacleFront[3]);
      ctx.fillStyle = g;
      ctx.fillRect(segLeft, y - bh, segW, bh);

      // Top surface
      const topD = Math.max(1.5, 4 * scale);
      ctx.fillStyle = pal.obstacleTop;
      ctx.beginPath();
      ctx.moveTo(segLeft, y - bh);
      ctx.lineTo(segLeft + 2 * scale, y - bh - topD);
      ctx.lineTo(segRight - 2 * scale, y - bh - topD);
      ctx.lineTo(segRight, y - bh);
      ctx.fill();

      // Mortar lines
      if (scale > 0.12) {
        ctx.strokeStyle = 'rgba(30,40,20,0.2)';
        ctx.lineWidth = 1;
        const midH = y - bh * 0.5;
        const midH2 = y - bh * 0.75;
        ctx.beginPath(); ctx.moveTo(segLeft, midH); ctx.lineTo(segRight, midH); ctx.stroke();
        if (bh > 20) {
          ctx.beginPath(); ctx.moveTo(segLeft, midH2); ctx.lineTo(segRight, midH2); ctx.stroke();
        }
        const vCount = Math.max(1, Math.floor(segW / (12 + 10 * scale)));
        for (let v = 1; v < vCount + 1; v++) {
          const vx = segLeft + (segW / (vCount + 1)) * v;
          ctx.beginPath(); ctx.moveTo(vx, y - bh); ctx.lineTo(vx, midH); ctx.stroke();
        }
        for (let v = 0; v < vCount + 1; v++) {
          const vx = segLeft + (segW / (vCount + 1)) * (v + 0.5);
          if (vx > segLeft && vx < segRight) {
            ctx.beginPath(); ctx.moveTo(vx, midH); ctx.lineTo(vx, y); ctx.stroke();
          }
        }
      }

      // Moss / biome overgrowth
      if (scale > 0.18) {
        ctx.fillStyle = pal.obstacleMoss;
        ctx.fillRect(segLeft + segW * 0.08, y - bh * 0.65, segW * 0.18, bh * 0.3);
        if (segW > 20) ctx.fillRect(segLeft + segW * 0.6, y - bh * 0.4, segW * 0.15, bh * 0.25);
      }

      // Cracks
      if (scale > 0.25) {
        ctx.strokeStyle = 'rgba(25,35,15,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(segLeft + segW * 0.35, y - bh);
        ctx.lineTo(segLeft + segW * 0.4, y - bh * 0.2);
        ctx.stroke();
      }

      // Edge pillars
      ctx.fillStyle = pal.obstacleEdge;
      const edgeW = Math.max(1, 2 * scale);
      ctx.fillRect(segLeft, y - bh, edgeW, bh);
      ctx.fillRect(segRight - edgeW, y - bh, edgeW, bh);
    }
  };

  // Horizontal beam stretched across the entire path — the player must slide under it.
  function drawOverheadBeam(ctx, obs) {
    const pal = TD.activePalette();
    const scale = obs.t;
    const sC = laneToScreen(0, obs.t);
    const groundY = sC.y;

    const hw = pathHalfW(scale) * 1.05;
    const left = VP_X - hw;
    const right = VP_X + hw;
    const fullW = right - left;

    // Beam sits about player-shoulder height above the ground for this depth.
    const beamCenterY = groundY - 55 * scale - 8;
    const beamH = Math.max(4, 14 * scale + 4);
    const beamTop = beamCenterY - beamH * 0.5;

    // Support columns on either side, leading down to the ground.
    const colW = Math.max(3, 6 * scale + 1);
    ctx.fillStyle = pal.obstacleEdge;
    ctx.fillRect(left, beamTop, colW, groundY - beamTop);
    ctx.fillRect(right - colW, beamTop, colW, groundY - beamTop);

    // Beam front face
    const g = ctx.createLinearGradient(0, beamTop, 0, beamTop + beamH);
    g.addColorStop(0,    pal.obstacleFront[0]);
    g.addColorStop(0.35, pal.obstacleFront[1]);
    g.addColorStop(0.65, pal.obstacleFront[2]);
    g.addColorStop(1,    pal.obstacleFront[3]);
    ctx.fillStyle = g;
    ctx.fillRect(left, beamTop, fullW, beamH);

    // Top facet for a bit of depth
    const topD = Math.max(2, 5 * scale);
    ctx.fillStyle = pal.obstacleTop;
    ctx.beginPath();
    ctx.moveTo(left, beamTop);
    ctx.lineTo(left + 3 * scale, beamTop - topD);
    ctx.lineTo(right - 3 * scale, beamTop - topD);
    ctx.lineTo(right, beamTop);
    ctx.fill();

    // Mortar lines along the beam
    if (scale > 0.15) {
      ctx.strokeStyle = 'rgba(30,40,20,0.25)';
      ctx.lineWidth = 1;
      const segs = Math.max(2, Math.floor(fullW / (30 + 20 * scale)));
      for (let i = 1; i < segs; i++) {
        const vx = left + (fullW / segs) * i;
        ctx.beginPath();
        ctx.moveTo(vx, beamTop);
        ctx.lineTo(vx, beamTop + beamH);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(left, beamCenterY);
      ctx.lineTo(right, beamCenterY);
      ctx.stroke();
    }

    // Hanging moss / vines from the underside as a visual "duck under" cue.
    if (scale > 0.2) {
      ctx.fillStyle = pal.obstacleMoss;
      const vineCount = 5;
      for (let i = 0; i < vineCount; i++) {
        const vx = left + (fullW * (i + 0.5)) / vineCount;
        const vh = (8 + (i % 2) * 6) * scale + 4;
        const vw = Math.max(2, 3 * scale);
        ctx.fillRect(vx - vw * 0.5, beamTop + beamH, vw, vh);
      }
    }
  }
})();
