// ============================================
// environment.js — Sky, ground, walls, trees
// ============================================

(function() {
  const { W, H, VP_X, VP_Y, GROUND_BOTTOM, LANE_W, pathHalfW } = TD;

  // ---- Palette (jungle biome) ----
  TD.activePalette = function() {
    return {
      skyTop:      '#081520',
      skyMid:      '#0d2535',
      skyBottom:   '#0e2a40',
      canopyFar:   '#050f08',
      canopyNear:  '#030a05',
      fog:         'rgba(30,80,120,0.35)',
      seaDeep:     '#07121e',
      seaMid:      '#0a1c30',
      seaNear:     '#0d2238',
      pathStone:   '#9a8045',
      pathOverlay: ['rgba(220,185,110,0.12)', 'rgba(200,165,90,0.18)', 'rgba(180,145,70,0.22)'],
      pathBorder:  '#c8a060',
      wallMoss:    'rgba(45,95,25,0.26)',
      treeTrunk:   '#2a1a08',
      treeCanopy:  ['#1e3d10', '#162e0c', '#265015'],
      vignette:    'rgba(0,2,8,0.62)',
      tint:        'rgba(0,8,18,0.05)',
    };
  };

  // Parallax trees
  TD.trees = [];
  for (let i = 0; i < 18; i++) {
    TD.trees.push({
      side:    i % 2 === 0 ? -1 : 1,
      t:       Math.random(),
      variant: Math.floor(Math.random() * 3),
      xOff:    15 + Math.random() * 40
    });
  }

  TD.treesUpdate = function(speed) {
    for (let tr of TD.trees) {
      tr.t += speed * 0.6;
      if (tr.t > 1.1) {
        tr.t -= 1.1;
        tr.variant = Math.floor(Math.random() * 3);
        tr.xOff    = 15 + Math.random() * 40;
      }
    }
  };

  // ---- Sky ----
  TD.drawSky = function(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createLinearGradient(0, 0, 0, VP_Y + 20);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.5, pal.skyMid);
    g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, VP_Y + 20);

    // Distant ruins silhouette
    ctx.fillStyle = '#050f18';
    for (let i = 0; i < 6; i++) {
      const bx = 60 + i * 130, bh = 18 + Math.sin(i * 1.3) * 12;
      ctx.fillRect(bx, VP_Y - bh - 3, 28 + i * 4, bh);
      for (let j = 0; j < 3; j++) ctx.fillRect(bx + j * 9, VP_Y - bh - 9, 5, 6);
    }

    // Canopy silhouettes
    ctx.fillStyle = pal.canopyFar;
    for (let i = 0; i < 12; i++) {
      const cx = i * 75 - 20, cy = VP_Y - 10 + Math.sin(i * 1.7) * 15;
      ctx.beginPath(); ctx.arc(cx, cy, 40 + Math.sin(i * 2.3) * 15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = pal.canopyNear;
    for (let i = 0; i < 10; i++) {
      const cx = i * 90 + 30, cy = VP_Y - 25 + Math.sin(i * 2.1 + 1) * 12;
      ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.sin(i * 1.3) * 10, 0, Math.PI * 2); ctx.fill();
    }

    // Sea horizon glow
    const fog = ctx.createLinearGradient(0, VP_Y - 40, 0, VP_Y + 25);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.6, pal.fog);
    fog.addColorStop(1, 'rgba(20,60,100,0.55)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, VP_Y - 40, W, 65);
  };

  // ---- Ground / Runway ----
  TD.drawGround = function(ctx, distance) {
    const pal = TD.activePalette();

    // Sea base — deep blue gradient
    const sg = ctx.createLinearGradient(0, VP_Y, 0, H);
    sg.addColorStop(0,   pal.seaDeep);
    sg.addColorStop(0.4, pal.seaMid);
    sg.addColorStop(1,   pal.seaNear);
    ctx.fillStyle = sg;
    ctx.fillRect(0, VP_Y, W, H - VP_Y);

    // Scrolling waves — perspective-scaled
    const wScroll = distance * 2200;
    const waveCount = 16;
    for (let i = 0; i < waveCount; i++) {
      const rawT = ((i / waveCount) + (wScroll % waveCount) / waveCount) % 1;
      if (rawT < 0.015) continue;
      const wy = VP_Y + (H - VP_Y) * rawT;
      if (wy > H) continue;

      const amp   = 1.5 + 7.5 * rawT;
      const freq  = Math.PI * 2 / (65 + 210 * rawT);
      const phase = wScroll * 0.9 + i * 1.4;
      const alpha = 0.06 + rawT * 0.22;

      // Dark trough shadow
      ctx.fillStyle = `rgba(4,12,24,${alpha * 0.45})`;
      ctx.fillRect(0, wy, W, amp * 1.8);

      // Wave crest line
      ctx.strokeStyle = `rgba(28,88,155,${alpha})`;
      ctx.lineWidth = Math.max(0.7, 2 * rawT);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const yw = wy + Math.sin(x * freq + phase) * amp;
        x === 0 ? ctx.moveTo(x, yw) : ctx.lineTo(x, yw);
      }
      ctx.stroke();

      // Foam highlight (close waves only)
      if (rawT > 0.28) {
        ctx.strokeStyle = `rgba(105,178,228,${alpha * 0.4})`;
        ctx.lineWidth = Math.max(0.5, rawT);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const yw = wy + Math.sin(x * freq + phase) * amp - amp * 0.45;
          x === 0 ? ctx.moveTo(x, yw) : ctx.lineTo(x, yw);
        }
        ctx.stroke();
      }
    }

    // Light reflection band near horizon
    const refG = ctx.createLinearGradient(0, VP_Y, 0, VP_Y + 30);
    refG.addColorStop(0, 'rgba(60,130,200,0.18)');
    refG.addColorStop(1, 'rgba(60,130,200,0)');
    ctx.fillStyle = refG;
    ctx.fillRect(0, VP_Y, W, 30);

    const phT = 8, phB = pathHalfW(1);

    // Stone path base — warm sandy/golden
    const pg = ctx.createLinearGradient(0, VP_Y, 0, H);
    pg.addColorStop(0, '#7a6535'); pg.addColorStop(0.4, pal.pathStone); pg.addColorStop(1, '#b09050');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    // Warm highlight overlay
    const hl = ctx.createLinearGradient(0, VP_Y, 0, H);
    hl.addColorStop(0, pal.pathOverlay[0]); hl.addColorStop(0.5, pal.pathOverlay[1]); hl.addColorStop(1, pal.pathOverlay[2]);
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    // Path border lines
    ctx.strokeStyle = pal.pathBorder; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X - phB, GROUND_BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VP_X + phT, VP_Y); ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.stroke();

    // Lane dividers
    ctx.strokeStyle = 'rgba(90,70,30,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([8, 14]);
    for (let l of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(VP_X + l * phT * 0.7, VP_Y); ctx.lineTo(VP_X + l * LANE_W * 1.15, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Scrolling stone tiles
    const scroll = (distance * 4000) % 1;
    const tileCount = 12;
    ctx.lineWidth = 1;
    for (let i = 0; i < tileCount; i++) {
      const t = ((i / tileCount) + scroll / tileCount) % 1;
      if (t < 0.015) continue;
      const y  = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
      if (y > H) continue;
      const hw = pathHalfW(t);
      const alpha = 0.28 + t * 0.4;

      // Horizontal mortar
      ctx.strokeStyle = `rgba(70,50,20,${alpha})`;
      ctx.beginPath(); ctx.moveTo(VP_X - hw, y); ctx.lineTo(VP_X + hw, y); ctx.stroke();

      // Vertical divisions
      if (t > 0.1) {
        const isOffset = i % 2 === 0;
        const nextT  = ((i + 1) / tileCount + scroll / tileCount) % 1;
        const nextY  = VP_Y + (GROUND_BOTTOM - VP_Y) * nextT;
        const nextHw = pathHalfW(nextT);
        ctx.strokeStyle = `rgba(70,50,20,${alpha * 0.65})`;
        for (let v = 1; v <= 2; v++) {
          const ratio = isOffset ? (v / 3) + 0.08 : v / 3;
          ctx.beginPath();
          ctx.moveTo(VP_X - hw + hw * 2 * ratio, y);
          ctx.lineTo(VP_X - nextHw + nextHw * 2 * ratio, Math.min(nextY, H));
          ctx.stroke();
        }
      }
    }

    // Moss patches
    ctx.fillStyle = 'rgba(35,65,18,0.16)';
    for (let i = 0; i < 8; i++) {
      const mt = 0.3 + i * 0.09;
      const my = VP_Y + (GROUND_BOTTOM - VP_Y) * mt;
      if (my > H) continue;
      const mhw = pathHalfW(mt), mw = mhw * 0.1 + 4;
      ctx.fillRect(VP_X - mhw * 0.25 + i * 9, my - mw * 0.25, mw, mw * 0.35);
    }
  };

  // ---- Side Walls ----
  TD.drawWalls = function(ctx) {
    const pal = TD.activePalette();
    const steps = 40;

    for (let side of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i + 1) / steps;
        if (t0 < 0.01) continue;
        const y0 = VP_Y + (GROUND_BOTTOM - VP_Y) * t0;
        const y1 = VP_Y + (GROUND_BOTTOM - VP_Y) * t1;
        if (y0 > H + 5) continue;

        const hw0 = pathHalfW(t0), hw1 = pathHalfW(t1);
        const wallH0 = 6 + 105 * t0, wallH1 = 6 + 105 * t1;
        const wallW0 = 3 + 20  * t0, wallW1 = 3 + 20  * t1;
        const x0 = VP_X + side * hw0, x1 = VP_X + side * hw1;
        const outerX0 = x0 + side * wallW0, outerX1 = x1 + side * wallW1;

        // Inner face — solid color per segment (no gradient creation in loop)
        const r = Math.floor(108 + t0 * 72);
        const gv = Math.floor(84 + t0 * 58);
        const b = Math.floor(40 + t0 * 32);
        ctx.fillStyle = `rgb(${r},${gv},${b})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(x1, y1 - wallH1);
        ctx.lineTo(x1, y1); ctx.lineTo(x0, y0);
        ctx.fill();

        // Outer face
        ctx.fillStyle = `rgb(${Math.floor(38 + t0*20)},${Math.floor(28+t0*15)},${Math.floor(12+t0*8)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();

        // Top surface
        ctx.fillStyle = `rgb(${Math.floor(175+t0*25)},${Math.floor(145+t0*20)},${Math.floor(72+t0*18)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();

        // Stone block mortar (only for close segments)
        if (t0 > 0.2) {
          ctx.strokeStyle = `rgba(55,40,15,${0.2 + t0 * 0.25})`;
          ctx.lineWidth = Math.max(0.5, 1.2 * t0);
          const blockH = Math.max(5, 14 + t0 * 8);
          for (let bh = blockH; bh < wallH0 - 2; bh += blockH) {
            const by = y0 - wallH0 + bh;
            if (by > y0) break;
            ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x1, by); ctx.stroke();
          }
        }

        // Moss patches
        if (t0 > 0.18) {
          ctx.fillStyle = pal.wallMoss;
          const sw = Math.abs(x1 - x0);
          ctx.fillRect(x0 + sw * 0.08, y0 - wallH0 * 0.7, sw * 0.28, wallH0 * 0.3);
        }
      }

      // Crenellations
      for (let i = 8; i < steps; i += 2) {
        const t0 = i / steps;
        if (t0 < 0.22) continue;
        const y0 = VP_Y + (GROUND_BOTTOM - VP_Y) * t0;
        if (y0 > H + 5) continue;
        const hw0    = pathHalfW(t0);
        const wallH0 = 6 + 105 * t0;
        const x0     = VP_X + side * hw0;
        const t1     = (i + 1) / steps;
        const x1     = VP_X + side * pathHalfW(t1);
        const segW   = Math.abs(x1 - x0);
        const crenH  = Math.max(2, 8 * t0);
        const crenW  = Math.max(2, segW * 0.55);
        const cx     = side > 0 ? x0 : x1 - crenW;
        ctx.fillStyle = `rgb(${Math.floor(185+t0*15)},${Math.floor(150+t0*12)},${Math.floor(74+t0*10)})`;
        ctx.fillRect(cx, y0 - wallH0 - crenH, crenW, crenH);
      }

      // Moss drips
      for (let i = 0; i < 8; i++) {
        const t = 0.22 + i * 0.1;
        const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
        if (y > H) continue;
        const hw = pathHalfW(t), wallH = 6 + 105 * t;
        const x  = VP_X + side * hw;
        ctx.fillStyle = `rgba(38,85,22,${0.16 + t * 0.12})`;
        ctx.fillRect(x - (1.5 + 3 * t) * 0.5, y - wallH * 0.5, 1.5 + 3 * t, 5 + 12 * t);
      }
    }
  };

  // ---- Trees ----
  TD.drawTrees = function(ctx) {
    const pal = TD.activePalette();
    for (let tr of TD.trees) {
      if (tr.t < 0.02 || tr.t > 1.05) continue;
      const hw = pathHalfW(tr.t);
      const y  = VP_Y + (GROUND_BOTTOM - VP_Y) * tr.t;
      if (y > H + 10) continue;
      const x  = VP_X + tr.side * (hw + (tr.xOff + 22) * tr.t);
      const s  = tr.t;
      const trunkH = 55 * s + 18, trunkW = 7 * s + 3;

      // Roots
      if (s > 0.3) {
        ctx.strokeStyle = '#1a0f05'; ctx.lineWidth = Math.max(1, 2.5 * s);
        for (let r = -1; r <= 1; r++) {
          ctx.beginPath();
          ctx.moveTo(x, y - trunkH * 0.2);
          ctx.quadraticCurveTo(x + r * trunkW * 2.5, y - trunkH * 0.05, x + r * trunkW * 3.5, y);
          ctx.stroke();
        }
      }

      // Trunk
      ctx.fillStyle = pal.treeTrunk;
      ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

      // Layered foliage
      const cr = 20 * s + 9;
      for (let layer = 2; layer >= 0; layer--) {
        ctx.fillStyle = pal.treeCanopy[layer];
        const lx = x + (layer % 2 === 0 ? -cr * 0.12 : cr * 0.14);
        const ly = y - trunkH - cr * (0.35 + layer * 0.22);
        ctx.beginPath(); ctx.arc(lx, ly, cr * (1.05 - layer * 0.12), 0, Math.PI * 2); ctx.fill();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(x + cr * 0.28, y - trunkH - cr * 0.28, cr * 0.72, 0, Math.PI * 2); ctx.fill();

      // Hanging vines
      if (s > 0.4) {
        ctx.strokeStyle = `rgba(35,75,18,${0.35 + s * 0.3})`; ctx.lineWidth = 1;
        for (let v = 0; v < 2; v++) {
          const vx = x + (v === 0 ? -cr * 0.3 : cr * 0.25);
          const vLen = (10 + v * 6) * s;
          ctx.beginPath();
          ctx.moveTo(vx, y - trunkH + 2);
          ctx.quadraticCurveTo(vx + 4 * s, y - trunkH + vLen * 0.5, vx - 3 * s, y - trunkH + vLen);
          ctx.stroke();
        }
      }
    }
  };

  // ---- Vignette & post-processing ----
  TD.drawVignette = function(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createRadialGradient(W/2, H/2, H * 0.18, W/2, H/2, H * 0.88);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, pal.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const leftG = ctx.createLinearGradient(0, 0, W * 0.22, 0);
    leftG.addColorStop(0, 'rgba(0,0,0,0.38)'); leftG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftG; ctx.fillRect(0, 0, W * 0.22, H);

    const rightG = ctx.createLinearGradient(W, 0, W * 0.78, 0);
    rightG.addColorStop(0, 'rgba(0,0,0,0.38)'); rightG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightG; ctx.fillRect(W * 0.78, 0, W * 0.22, H);

    ctx.fillStyle = pal.tint;
    ctx.fillRect(0, 0, W, H);
  };
})();
