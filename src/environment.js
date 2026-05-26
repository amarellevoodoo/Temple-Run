// ============================================
// environment.js — Sky, ground, walls, trees
// ============================================

(function() {
  const { W, H, VP_X, VP_Y, GROUND_BOTTOM, LANE_W, pathHalfW } = TD;

  // Parallax trees
  TD.trees = [];
  for (let i = 0; i < 18; i++) {
    TD.trees.push({
      side: i % 2 === 0 ? -1 : 1,
      t: Math.random(),
      variant: Math.floor(Math.random() * 3),
      xOff: 15 + Math.random() * 40
    });
  }

  TD.treesUpdate = function(speed) {
    for (let tr of TD.trees) {
      tr.t += speed * 0.6;
      if (tr.t > 1.1) {
        tr.t -= 1.1;
        tr.variant = Math.floor(Math.random() * 3);
        tr.xOff = 15 + Math.random() * 40;
      }
    }
  };

  // ---- Sky ----
  TD.drawSky = function(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VP_Y + 20);
    g.addColorStop(0, '#1a3a2a');
    g.addColorStop(0.5, '#2a5a3a');
    g.addColorStop(1, '#3a6a3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, VP_Y + 20);

    // Canopy silhouettes
    ctx.fillStyle = '#1a3a1a';
    for (let i = 0; i < 12; i++) {
      const cx = i * 75 - 20, cy = VP_Y - 10 + Math.sin(i * 1.7) * 15;
      ctx.beginPath(); ctx.arc(cx, cy, 40 + Math.sin(i * 2.3) * 15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#0d2d12';
    for (let i = 0; i < 10; i++) {
      const cx = i * 90 + 30, cy = VP_Y - 25 + Math.sin(i * 2.1 + 1) * 12;
      ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.sin(i * 1.3) * 10, 0, Math.PI * 2); ctx.fill();
    }

    // Fog
    const fog = ctx.createLinearGradient(0, VP_Y - 40, 0, VP_Y + 20);
    fog.addColorStop(0, 'rgba(60,100,60,0)');
    fog.addColorStop(1, 'rgba(60,100,60,0.3)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, VP_Y - 40, W, 60);
  };

  // ---- Ground / Runway ----
  TD.drawGround = function(ctx, distance) {
    const g = ctx.createLinearGradient(0, VP_Y, 0, H);
    g.addColorStop(0, '#3a5a2a'); g.addColorStop(0.3, '#2a4a1a'); g.addColorStop(1, '#1a3a0a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, VP_Y); ctx.lineTo(W, VP_Y); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    const phT = 8, phB = pathHalfW(1);

    // Stone path surface
    ctx.fillStyle = '#5a6a5a';
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    // Mossy texture
    const pg = ctx.createLinearGradient(0, VP_Y, 0, H);
    pg.addColorStop(0, 'rgba(90,110,80,0.6)'); pg.addColorStop(0.5, 'rgba(70,90,65,0.4)'); pg.addColorStop(1, 'rgba(60,80,55,0.3)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    // Borders
    ctx.strokeStyle = '#4a5a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X - phB, GROUND_BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VP_X + phT, VP_Y); ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.stroke();

    // Lane dividers
    ctx.strokeStyle = 'rgba(80,100,70,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([6, 10]);
    for (let l of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(VP_X + l * phT * 0.7, VP_Y); ctx.lineTo(VP_X + l * LANE_W * 1.15, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Scrolling tiles
    ctx.strokeStyle = 'rgba(80,100,70,0.15)'; ctx.lineWidth = 1;
    const scroll = (distance * 6000) % 1;
    for (let i = 0; i < 18; i++) {
      let t = ((i / 18) + scroll * (1 / 18)) % 1;
      if (t < 0.015) continue;
      const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
      if (y > H) continue;
      const hw = pathHalfW(t);
      ctx.beginPath(); ctx.moveTo(VP_X - hw, y); ctx.lineTo(VP_X + hw, y); ctx.stroke();
    }
  };

  // ---- Side Walls ----
  TD.drawWalls = function(ctx) {
    const steps = 40;
    for (let side of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i + 1) / steps;
        if (t0 < 0.01) continue;
        const y0 = VP_Y + (GROUND_BOTTOM - VP_Y) * t0;
        const y1 = VP_Y + (GROUND_BOTTOM - VP_Y) * t1;
        if (y0 > H + 5) continue;
        const hw0 = pathHalfW(t0), hw1 = pathHalfW(t1);
        const wallH0 = 3 + 14 * t0, wallH1 = 3 + 14 * t1;
        const x0 = VP_X + side * hw0, x1 = VP_X + side * hw1;
        const wallW0 = 2 + 6 * t0, wallW1 = 2 + 6 * t1;

        // Inner face
        const g = ctx.createLinearGradient(0, y0 - wallH0, 0, y0);
        g.addColorStop(0, '#6a7a5a'); g.addColorStop(0.6, '#5a6a4a'); g.addColorStop(1, '#4a5a3a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(x1, y1 - wallH1);
        ctx.lineTo(x1, y1); ctx.lineTo(x0, y0);
        ctx.fill();

        // Outer face
        const outerX0 = x0 + side * wallW0, outerX1 = x1 + side * wallW1;
        ctx.fillStyle = '#3a4a2a';
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();

        // Top
        ctx.fillStyle = '#7a8a6a';
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();
      }

      // Moss
      for (let i = 0; i < 8; i++) {
        const t = 0.15 + i * 0.11;
        const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
        if (y > H) continue;
        const hw = pathHalfW(t), wallH = 3 + 14 * t;
        const x = VP_X + side * hw;
        const mw = 3 + 5 * t, mh = 2 + 4 * t;
        ctx.fillStyle = 'rgba(40,90,25,0.3)';
        ctx.fillRect(x - mw * 0.5 * (1 - side) * 0.5, y - wallH * 0.6, mw, mh);
      }
    }
  };

  // ---- Trees ----
  TD.drawTrees = function(ctx) {
    for (let tr of TD.trees) {
      if (tr.t < 0.02 || tr.t > 1.05) continue;
      const hw = pathHalfW(tr.t);
      const y = VP_Y + (GROUND_BOTTOM - VP_Y) * tr.t;
      if (y > H + 10) continue;
      const x = VP_X + tr.side * (hw + tr.xOff * tr.t);
      const s = tr.t;
      const trunkH = 30 * s + 10, trunkW = 4 * s + 2;

      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

      const cr = 12 * s + 6;
      ctx.fillStyle = tr.variant === 0 ? '#2a5a1a' : tr.variant === 1 ? '#1a4a15' : '#3a6a25';
      ctx.beginPath(); ctx.arc(x, y - trunkH - cr * 0.4, cr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.arc(x + cr * 0.2, y - trunkH - cr * 0.2, cr * 0.7, 0, Math.PI * 2); ctx.fill();

      if (s > 0.3) {
        ctx.strokeStyle = '#2a5a1a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - cr * 0.5, y - trunkH - cr * 0.2);
        ctx.quadraticCurveTo(x - cr * 0.7, y - trunkH + 8*s, x - cr * 0.4, y - trunkH + 15*s);
        ctx.stroke();
      }
    }
  };

  // ---- Vignette & post-processing ----
  TD.drawVignette = function(ctx) {
    const g = ctx.createRadialGradient(W/2, H/2, H * 0.25, W/2, H/2, H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,10,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(0,30,0,0.08)';
    ctx.fillRect(0, 0, W, H);
  };
})();
