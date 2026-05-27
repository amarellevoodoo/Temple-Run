// ============================================
// environment.js — Sky, ground, walls, trees
// ============================================

(function() {
  const { W, H, VP_X, VP_Y, GROUND_BOTTOM, LANE_W, pathHalfW } = TD;

  // ---- Biome system — 20s actif + 10s transition, cycle 90s ----
  // Ordre fixe : 0 = mer, 1 = jungle, 2 = désert
  TD.biome = {
    index: 0,
    startTime: Date.now(),
    transitioning: false,
    transitionProgress: 0,
    nextIndex: -1,
    ACTIVE: 20,
    TRANS:  10,
  };

  TD.biomeUpdate = function() {
    const elapsed = (Date.now() - TD.biome.startTime) / 1000;
    const period  = TD.biome.ACTIVE + TD.biome.TRANS; // 30s
    const cycle   = period * 3;                        // 90s
    const pos     = elapsed % cycle;
    const pIdx    = Math.floor(pos / period);          // 0, 1 ou 2
    const within  = pos % period;

    TD.biome.index = pIdx % 3;
    if (within < TD.biome.ACTIVE) {
      TD.biome.transitioning      = false;
      TD.biome.transitionProgress = 0;
      TD.biome.nextIndex          = -1;
    } else {
      TD.biome.transitioning      = true;
      TD.biome.transitionProgress = (within - TD.biome.ACTIVE) / TD.biome.TRANS;
      TD.biome.nextIndex          = (pIdx + 1) % 3;
    }
  };

  // Compat coéquipier — conservé mais non appelé (biomeUpdate fait ce travail)
  TD.syncVisualBiome = function() {};

  // ---- Utilitaire ombre au sol (ajouté par coéquipier, conservé) ----
  TD.drawGroundShadow = function(ctx, x, y, t, opts) {
    if (t < 0.32) return;
    opts = opts || {};
    const alpha = opts.alpha != null ? opts.alpha : 0.1 + t * 0.24;
    const rx    = opts.rx    != null ? opts.rx    : 7 + 15 * t;
    const ry    = opts.ry    != null ? opts.ry    : (2 + 6 * t) * 0.32;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // ---- Palettes (0 = Mer, 1 = Jungle, 2 = Désert) ----
  const PALETTES = [
    {
      skyTop: '#081520', skyMid: '#0d2535', skyBottom: '#0e2a40',
      canopyFar: '#050f18', canopyNear: '#030a05',
      fog: 'rgba(30,80,120,0.35)',
      pathStone: '#9a8045', pathBorder: '#c8a060',
      wallMoss: 'rgba(45,95,25,0.26)',
      treeTrunk: '#2a1a08', treeCanopy: ['#1e3d10','#162e0c','#265015'],
      vignette: 'rgba(0,2,8,0.62)', tint: 'rgba(0,8,18,0.05)',
    },
    {
      skyTop: '#050e08', skyMid: '#0a1a0e', skyBottom: '#0e2414',
      canopyFar: '#020805', canopyNear: '#040e07',
      fog: 'rgba(15,60,25,0.40)',
      pathStone: '#9a8045', pathBorder: '#c8a060',
      wallMoss: 'rgba(35,110,20,0.45)',
      treeTrunk: '#1a0e04', treeCanopy: ['#1a4a10','#113208','#2a6018'],
      vignette: 'rgba(0,5,2,0.62)', tint: 'rgba(0,10,5,0.06)',
    },
    {
      skyTop: '#1a0e28', skyMid: '#3a1e18', skyBottom: '#7a3a18',
      canopyFar: '#120a05', canopyNear: '#0e0805',
      fog: 'rgba(180,100,40,0.30)',
      pathStone: '#9a8045', pathBorder: '#c8a060',
      wallMoss: 'rgba(150,120,50,0.12)',
      treeTrunk: '#3a2010', treeCanopy: ['#4a3818','#382a10','#5a4820'],
      vignette: 'rgba(8,4,0,0.60)', tint: 'rgba(18,10,0,0.06)',
    },
  ];

  TD.activePalette = function() {
    const vis = PALETTES[TD.biome.index];
    if (typeof TD.getActiveBiome === 'function') {
      try {
        const meters  = TD.state ? TD.state.distance * 100 : 0;
        const gamePal = TD.getActiveBiome(meters).palette;
        return Object.assign({}, vis, {
          pathStone:   gamePal.pathStone,
          pathBorder:  gamePal.pathBorder,
          pathOverlay: gamePal.pathOverlay,
          wallMoss:    gamePal.wallMoss,
          vignette:    gamePal.vignette,
          tint:        gamePal.tint,
        });
      } catch(e) {}
    }
    return vis;
  };

  // ---- Arbres parallaxes (36 instances, plus proches du chemin) ----
  TD.trees = [];
  for (let i = 0; i < 36; i++) {
    TD.trees.push({
      side:    i % 2 === 0 ? -1 : 1,
      t:       Math.random(),
      variant: Math.floor(Math.random() * 3),
      xOff:    5 + Math.random() * 35,
    });
  }

  // ---- Décor de chemin (ajouté par coéquipier, conservé) ----
  TD.pathDecor = [];
  const DECOR_LANES = [-1, 0, 1];
  for (let i = 0; i < 16; i++) {
    TD.pathDecor.push({
      lane:  DECOR_LANES[Math.floor(Math.random() * 3)],
      t:     Math.random() * 0.95 + 0.05,
      kind:  Math.random() < 0.55 ? 'stone' : 'crack',
      seed:  Math.random() * 200,
    });
  }

  TD.pathDecorReset = function() {
    TD.pathDecor = [];
    for (let i = 0; i < 16; i++) {
      TD.pathDecor.push({
        lane:  DECOR_LANES[Math.floor(Math.random() * 3)],
        t:     Math.random() * 0.95 + 0.05,
        kind:  Math.random() < 0.5 ? 'stone' : 'crack',
        seed:  Math.random() * 200,
      });
    }
  };

  TD.pathDecorUpdate = function(speed) {
    for (const d of TD.pathDecor) {
      d.t += speed * 0.58;
      if (d.t > 1.12) {
        d.lane = DECOR_LANES[Math.floor(Math.random() * 3)];
        d.t -= 1.05;
        d.kind = Math.random() < 0.5 ? 'stone' : 'crack';
        d.seed = Math.random() * 200;
      }
    }
  };

  TD.treesUpdate = function(speed) {
    TD.biomeUpdate();           // timer maître (remplace syncVisualBiome)
    TD.pathDecorUpdate(speed);
    for (const tr of TD.trees) {
      tr.t += speed * 0.6;
      if (tr.t > 1.1) {
        tr.t    -= 1.1;
        tr.variant = Math.floor(Math.random() * 3);
        tr.xOff    = 5 + Math.random() * 35;
      }
    }
  };

  // ============================================================
  // SKY
  // ============================================================
  TD.drawSky = function(ctx) {
    const b = TD.biome;
    if      (b.index === 0) drawSkySea(ctx);
    else if (b.index === 1) drawSkyJungle(ctx);
    else                    drawSkyDesert(ctx);

    if (b.transitioning && b.transitionProgress > 0) {
      ctx.save();
      ctx.globalAlpha = Math.pow(b.transitionProgress, 1.4);
      if      (b.nextIndex === 0) drawSkySea(ctx);
      else if (b.nextIndex === 1) drawSkyJungle(ctx);
      else                        drawSkyDesert(ctx);
      ctx.restore();
    }
  };

  function drawSkySea(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createLinearGradient(0, 0, 0, VP_Y + 20);
    g.addColorStop(0, pal.skyTop); g.addColorStop(0.5, pal.skyMid); g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, VP_Y + 20);

    ctx.fillStyle = '#050f18';
    for (let i = 0; i < 6; i++) {
      const bx = 60 + i * 130, bh = 18 + Math.sin(i * 1.3) * 12;
      ctx.fillRect(bx, VP_Y - bh - 3, 28 + i * 4, bh);
      for (let j = 0; j < 3; j++) ctx.fillRect(bx + j * 9, VP_Y - bh - 9, 5, 6);
    }

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

    const fog = ctx.createLinearGradient(0, VP_Y - 40, 0, VP_Y + 25);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.6, pal.fog);
    fog.addColorStop(1, 'rgba(20,60,100,0.55)');
    ctx.fillStyle = fog; ctx.fillRect(0, VP_Y - 40, W, 65);
  }

  function drawSkyJungle(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createLinearGradient(0, 0, 0, VP_Y + 20);
    g.addColorStop(0, pal.skyTop); g.addColorStop(0.5, pal.skyMid); g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, VP_Y + 20);

    ctx.fillStyle = '#020905';
    for (let i = 0; i < 18; i++) {
      const cx = i * 52 - 10, cy = VP_Y - 5 + Math.sin(i * 1.9) * 22;
      ctx.beginPath(); ctx.arc(cx, cy, 50 + Math.sin(i * 2.4) * 18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#04110a';
    for (let i = 0; i < 13; i++) {
      const cx = i * 68 + 15, cy = VP_Y - 24 + Math.sin(i * 1.5 + 0.5) * 15;
      ctx.beginPath(); ctx.arc(cx, cy, 38 + Math.sin(i * 1.8) * 12, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(40,120,30,0.07)';
    for (let i = 0; i < 5; i++) {
      const rx = 80 + i * 165;
      ctx.beginPath();
      ctx.moveTo(rx - 5, 0); ctx.lineTo(rx + 5, 0);
      ctx.lineTo(rx + 22, VP_Y); ctx.lineTo(rx - 22, VP_Y);
      ctx.closePath(); ctx.fill();
    }

    const fog = ctx.createLinearGradient(0, VP_Y - 30, 0, VP_Y + 20);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.6, pal.fog);
    fog.addColorStop(1, 'rgba(10,50,18,0.50)');
    ctx.fillStyle = fog; ctx.fillRect(0, VP_Y - 30, W, 50);
  }

  function drawSkyDesert(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createLinearGradient(0, 0, 0, VP_Y + 20);
    g.addColorStop(0, pal.skyTop); g.addColorStop(0.45, pal.skyMid); g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, VP_Y + 20);

    ctx.fillStyle = 'rgba(255,240,200,0.75)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137) % W, sy = (i * 89) % (VP_Y * 0.7);
      ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,235,180,0.85)';
    ctx.beginPath(); ctx.arc(W * 0.82, VP_Y * 0.28, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a1e18';
    ctx.beginPath(); ctx.arc(W * 0.84, VP_Y * 0.25, 12, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#180c08';
    for (const [px, pw, ph] of [[W*0.12,70,42],[W*0.42,90,55],[W*0.72,60,36]]) {
      ctx.beginPath();
      ctx.moveTo(px,        VP_Y - 3);
      ctx.lineTo(px + pw/2, VP_Y - ph);
      ctx.lineTo(px + pw,   VP_Y - 3);
      ctx.closePath(); ctx.fill();
    }

    const fog = ctx.createLinearGradient(0, VP_Y - 30, 0, VP_Y + 20);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.6, pal.fog);
    fog.addColorStop(1, 'rgba(160,80,20,0.50)');
    ctx.fillStyle = fog; ctx.fillRect(0, VP_Y - 30, W, 50);
  }

  // ============================================================
  // GROUND (extérieur biome + chemin partagé)
  // ============================================================
  TD.drawGround = function(ctx, distance) {
    const b   = TD.biome;
    const idx = b.index;

    if      (idx === 0) drawExteriorSea(ctx, distance);
    else if (idx === 1) drawExteriorJungle(ctx, distance);
    else                drawExteriorDesert(ctx, distance);

    if (b.transitioning) {
      const p = b.transitionProgress;
      if      (idx === 0 && b.nextIndex === 1) drawTransitionSeaJungle(ctx, distance, p);
      else if (idx === 1 && b.nextIndex === 2) drawTransitionJungleDesert(ctx, distance, p);
      else if (idx === 2 && b.nextIndex === 0) drawTransitionDesertSea(ctx, distance, p);
    }

    drawHorizonFog(ctx);
    drawPath(ctx, distance);
  };

  // ---- Transition : Mer → Jungle (îles qui apparaissent) ----
  const ISLANDS = [
    { t: 0.12, side: -1, frac: 0.52 },
    { t: 0.22, side:  1, frac: 0.44 },
    { t: 0.34, side: -1, frac: 0.62 },
    { t: 0.44, side:  1, frac: 0.38 },
    { t: 0.54, side: -1, frac: 0.55 },
    { t: 0.28, side:  1, frac: 0.68 },
  ];

  function drawTransitionSeaJungle(ctx, distance, p) {
    // Îles visibles p 0→0.75, puis la jungle recouvre tout (p 0.6→1)
    const islandAlpha = p < 0.65 ? Math.min(1, p / 0.12) : Math.max(0, 1 - (p - 0.65) / 0.28);

    if (islandAlpha > 0.01) {
      ctx.save(); ctx.globalAlpha = islandAlpha;
      for (const isl of ISLANDS) {
        const hw    = pathHalfW(isl.t);
        const iy    = VP_Y + (GROUND_BOTTOM - VP_Y) * isl.t;
        const ext   = isl.side > 0 ? W - (VP_X + hw) : VP_X - hw;
        const ix    = isl.side > 0 ? VP_X + hw + ext * isl.frac : VP_X - hw - ext * isl.frac;
        const scale = p * isl.t;
        const irx   = (12 + 38 * isl.t) * scale;
        const iry   = (3  + 10 * isl.t) * scale;
        if (irx < 1) continue;

        // Base sablonneuse
        ctx.fillStyle = '#3a2a10';
        ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2); ctx.fill();

        // Végétation sur l'île
        ctx.fillStyle = '#1c3a0e';
        ctx.beginPath(); ctx.ellipse(ix, iy - iry * 0.5, irx * 0.78, iry * 0.9, 0, 0, Math.PI * 2); ctx.fill();

        // Arbre si l'île est assez grande
        if (scale > 0.35 && isl.t > 0.18) {
          const tH  = (6 + 14 * isl.t) * scale;
          const tcr = (4 + 9  * isl.t) * scale;
          ctx.fillStyle = '#1a0e04';
          ctx.fillRect(ix - 1.5 * scale, iy - iry - tH, 3 * scale, tH);
          ctx.fillStyle = '#1e4010';
          ctx.beginPath(); ctx.arc(ix, iy - iry - tH - tcr * 0.35, tcr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#266018';
          ctx.beginPath(); ctx.arc(ix - tcr*0.2, iy - iry - tH - tcr*0.7, tcr*0.6, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // La jungle arrive progressivement en fond (p 0.55 → 1)
    if (p > 0.55) {
      ctx.save(); ctx.globalAlpha = (p - 0.55) / 0.45;
      drawExteriorJungle(ctx, distance);
      ctx.restore();
    }
  }

  // ---- Transition : Jungle → Désert (dunes émergent, arbres disparaissent) ----
  function drawTransitionJungleDesert(ctx, distance, p) {
    // Dunes apparaissent à p 0.25 → 1
    if (p > 0.25) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (p - 0.25) / 0.55);
      drawExteriorDesert(ctx, distance);
      ctx.restore();
    }
  }

  // ---- Transition : Désert → Mer (flaques qui grossissent) ----
  const POOLS = [
    { t: 0.28, side: -1, frac: 0.54 },
    { t: 0.45, side:  1, frac: 0.42 },
    { t: 0.60, side: -1, frac: 0.63 },
    { t: 0.20, side:  1, frac: 0.70 },
    { t: 0.50, side: -1, frac: 0.30 },
    { t: 0.35, side:  1, frac: 0.55 },
  ];

  function drawTransitionDesertSea(ctx, distance, p) {
    const now        = Date.now() * 0.001;
    const poolAlpha  = p < 0.68 ? Math.min(1, p / 0.10) : Math.max(0, 1 - (p - 0.68) / 0.28);

    if (poolAlpha > 0.01) {
      ctx.save(); ctx.globalAlpha = poolAlpha;
      for (const pool of POOLS) {
        const hw  = pathHalfW(pool.t);
        const py  = VP_Y + (GROUND_BOTTOM - VP_Y) * pool.t;
        const ext = pool.side > 0 ? W - (VP_X + hw) : VP_X - hw;
        const px  = pool.side > 0 ? VP_X + hw + ext * pool.frac : VP_X - hw - ext * pool.frac;
        const rx  = (6 + 38 * pool.t) * p;
        const ry  = (2 + 11 * pool.t) * p;
        if (rx < 1) continue;

        // Eau
        ctx.fillStyle = '#0a1c30';
        ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

        // Mini vague
        const wA = 0.18 + 0.12 * Math.sin(now * 2.5 + pool.t * 10);
        ctx.strokeStyle = `rgba(28,88,155,${wA})`;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        for (let wx = px - rx * 0.8; wx <= px + rx * 0.8; wx += 4) {
          const wy = py + Math.sin(wx * 0.22 + now * 2) * ry * 0.22;
          wx === px - rx * 0.8 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        // Reflet
        ctx.fillStyle = `rgba(60,130,200,${0.10 + 0.08 * Math.sin(now * 3 + pool.t * 5)})`;
        ctx.beginPath(); ctx.ellipse(px - rx*0.2, py, rx*0.4, ry*0.4, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // Mer arrive (p 0.58 → 1)
    if (p > 0.58) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (p - 0.58) / 0.42);
      drawExteriorSea(ctx, distance);
      ctx.restore();
    }
  }

  // ---- Brouillard d'horizon (ajouté par coéquipier, conservé) ----
  function drawHorizonFog(ctx) {
    const pal = TD.activePalette();
    const fog = ctx.createLinearGradient(0, VP_Y - 8, 0, VP_Y + 55);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.45, pal.fog);
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, VP_Y - 8, W, 63);
  }

  // ---- Extérieur : Mer / Pont ----
  function drawExteriorSea(ctx, distance) {
    const sg = ctx.createLinearGradient(0, VP_Y, 0, H);
    sg.addColorStop(0, '#07121e'); sg.addColorStop(0.4, '#0a1c30'); sg.addColorStop(1, '#0d2238');
    ctx.fillStyle = sg; ctx.fillRect(0, VP_Y, W, H - VP_Y);

    const wScroll = distance * 2200;
    for (let i = 0; i < 16; i++) {
      const rawT = ((i / 16) + (wScroll % 16) / 16) % 1;
      if (rawT < 0.015) continue;
      const wy    = VP_Y + (H - VP_Y) * rawT;
      if (wy > H) continue;
      const amp   = 1.5 + 7.5 * rawT;
      const freq  = Math.PI * 2 / (65 + 210 * rawT);
      const phase = wScroll * 0.9 + i * 1.4;
      const alpha = 0.06 + rawT * 0.22;
      ctx.fillStyle = `rgba(4,12,24,${alpha * 0.45})`;
      ctx.fillRect(0, wy, W, amp * 1.8);
      ctx.strokeStyle = `rgba(28,88,155,${alpha})`;
      ctx.lineWidth   = Math.max(0.7, 2 * rawT);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const yw = wy + Math.sin(x * freq + phase) * amp;
        x === 0 ? ctx.moveTo(x, yw) : ctx.lineTo(x, yw);
      }
      ctx.stroke();
      if (rawT > 0.28) {
        ctx.strokeStyle = `rgba(105,178,228,${alpha * 0.4})`;
        ctx.lineWidth   = Math.max(0.5, rawT);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const yw = wy + Math.sin(x * freq + phase) * amp - amp * 0.45;
          x === 0 ? ctx.moveTo(x, yw) : ctx.lineTo(x, yw);
        }
        ctx.stroke();
      }
    }

    const refG = ctx.createLinearGradient(0, VP_Y, 0, VP_Y + 30);
    refG.addColorStop(0, 'rgba(60,130,200,0.18)'); refG.addColorStop(1, 'rgba(60,130,200,0)');
    ctx.fillStyle = refG; ctx.fillRect(0, VP_Y, W, 30);

    // Piliers de pont sous les bords du chemin
    for (let i = 2; i <= 10; i++) {
      const at  = i / 10;
      const ay  = VP_Y + (GROUND_BOTTOM - VP_Y) * at;
      if (ay > H) continue;
      const ahw = pathHalfW(at);
      const pw  = Math.max(3, 5 + 12 * at);
      const ph  = 15 + 45 * at;
      const pr  = Math.floor(82 + at * 30), pg = Math.floor(64 + at * 22), pb2 = Math.floor(28 + at * 12);
      ctx.fillStyle = `rgb(${pr},${pg},${pb2})`;
      for (const side of [-1, 1]) {
        const px2 = VP_X + side * ahw + (side > 0 ? 0 : -pw);
        ctx.fillRect(px2, ay, pw, ph);
        ctx.beginPath();
        ctx.ellipse(px2 + pw/2, ay, pw*0.7, ph*0.22, 0, Math.PI, 0, false);
        ctx.fill();
      }
    }
  }

  // ---- Extérieur : Jungle (dense, 4 couches) ----
  function drawExteriorJungle(ctx, distance) {
    const bg = ctx.createLinearGradient(0, VP_Y, 0, H);
    bg.addColorStop(0, '#060f08'); bg.addColorStop(0.5, '#0a1a0c'); bg.addColorStop(1, '#0e2010');
    ctx.fillStyle = bg; ctx.fillRect(0, VP_Y, W, H - VP_Y);

    // 4 couches de feuillage scrollantes (lointain → proche)
    const scroll = distance * 1400;
    const LAYERS = [
      { yT: 0.18, scroll: 0.35, bH: 20, bW: 40, color: '#040e06' },
      { yT: 0.36, scroll: 0.52, bH: 30, bW: 48, color: '#071408' },
      { yT: 0.55, scroll: 0.70, bH: 44, bW: 55, color: '#0b1c0a' },
      { yT: 0.74, scroll: 0.92, bH: 58, bW: 62, color: '#0f240c' },
    ];
    for (const layer of LAYERS) {
      const yBase     = VP_Y + (H - VP_Y) * layer.yT;
      const layScroll = (scroll * layer.scroll) % (W + layer.bW + 80);
      ctx.fillStyle   = layer.color;
      for (let x = -layScroll; x < W + layer.bW + 80; x += layer.bW) {
        const bh = layer.bH * (0.62 + Math.abs(Math.sin((x + layer.yT * 88) * 0.07)) * 0.38);
        ctx.beginPath();
        ctx.arc(x, yBase, bh * 0.88, Math.PI, 0);
        ctx.lineTo(x + bh * 0.88, yBase + 12);
        ctx.lineTo(x - bh * 0.88, yBase + 12);
        ctx.closePath(); ctx.fill();
      }
    }

    // Fleurs colorées dans la couche proche
    const flowerScroll = (scroll * 0.88) % (W + 60);
    for (let x = -flowerScroll + 18; x < W + 60; x += 42) {
      const fy  = VP_Y + (H - VP_Y) * 0.72 + Math.sin(x * 0.09) * 8;
      const col = x % 84 < 42 ? '#c04010' : '#e8a020';
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, fy, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // Lianes tombant du haut
    for (let i = 0; i < 12; i++) {
      const vx   = (i / 12) * W + (i % 2) * 24;
      const vLen = 32 + (i % 3) * 32;
      ctx.strokeStyle = `rgba(22,65,14,${0.45 + (i % 2) * 0.15})`;
      ctx.lineWidth   = 1 + (i % 3 === 0 ? 1 : 0);
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.quadraticCurveTo(vx + 9 * (i % 2 === 0 ? 1 : -1), vLen * 0.5, vx + 6 * ((i % 3) - 1), vLen);
      ctx.stroke();
    }

    // Fougères au sol
    const fernScroll = (scroll * 0.95) % (W + 50);
    for (let x = -fernScroll; x < W + 50; x += 26) {
      const fy = H - 14;
      const fw = 9 + Math.abs(Math.sin(x * 0.13)) * 8;
      ctx.fillStyle = '#0e2210';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, fy);
        ctx.quadraticCurveTo(x + sx * fw, fy - fw * 1.6, x + sx * fw * 0.3, fy - fw * 2.2);
        ctx.quadraticCurveTo(x, fy - fw * 1.4, x, fy);
        ctx.fill();
      }
      // Grande feuille tropicale tous les 2
      if (Math.floor((x + fernScroll) / 26) % 2 === 0) {
        ctx.fillStyle = 'rgba(18,50,14,0.6)';
        ctx.beginPath();
        ctx.moveTo(x, fy);
        ctx.quadraticCurveTo(x + fw * 1.8, fy - fw * 2.8, x + fw * 0.4, fy - fw * 3.5);
        ctx.quadraticCurveTo(x - fw * 0.3, fy - fw * 1.8, x, fy);
        ctx.fill();
      }
    }
  }

  // ---- Extérieur : Désert ----
  function drawExteriorDesert(ctx, distance) {
    const bg = ctx.createLinearGradient(0, VP_Y, 0, H);
    bg.addColorStop(0, '#2a1808'); bg.addColorStop(0.4, '#3c2210'); bg.addColorStop(1, '#4a2c14');
    ctx.fillStyle = bg; ctx.fillRect(0, VP_Y, W, H - VP_Y);

    for (let i = 0; i < 10; i++) {
      const lt = 0.1 + i * 0.09;
      const ly = VP_Y + (H - VP_Y) * lt;
      ctx.strokeStyle = `rgba(200,150,80,${0.04 + lt * 0.05})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    }

    const scroll = distance * 700;
    for (let layer = 0; layer < 3; layer++) {
      const yBase     = VP_Y + (H - VP_Y) * (0.18 + layer * 0.26);
      const layScroll = (scroll * (0.28 + layer * 0.22)) % (W + 220);
      const dr = Math.floor(52 + layer * 24), dg2 = Math.floor(32 + layer * 16), db2 = Math.floor(10 + layer * 7);
      ctx.fillStyle = `rgb(${dr},${dg2},${db2})`;
      ctx.beginPath();
      let first = true;
      for (let x = -layScroll - 10; x < W + layScroll + 220; x += 4) {
        const dy = yBase
          + Math.sin((x + layer * 130) * 0.016) * (14 + layer * 9)
          + Math.sin((x + layer * 75)  * 0.044) * (5  + layer * 3);
        first ? ctx.moveTo(x, dy) : ctx.lineTo(x, dy);
        first = false;
      }
      ctx.lineTo(W + 220, H); ctx.lineTo(-layScroll - 10, H);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = `rgba(${Math.min(255,dr+55)},${Math.min(255,dg2+38)},${Math.min(255,db2+18)},0.38)`;
      ctx.lineWidth   = Math.max(0.8, 1.5 * (0.18 + layer * 0.26));
      ctx.beginPath(); first = true;
      for (let x = -layScroll - 10; x < W + layScroll + 220; x += 4) {
        const dy = yBase
          + Math.sin((x + layer * 130) * 0.016) * (14 + layer * 9)
          + Math.sin((x + layer * 75)  * 0.044) * (5  + layer * 3);
        first ? ctx.moveTo(x, dy) : ctx.lineTo(x, dy);
        first = false;
      }
      ctx.stroke();
    }

    const dustG = ctx.createLinearGradient(0, VP_Y, 0, VP_Y + 38);
    dustG.addColorStop(0, 'rgba(180,100,40,0.22)'); dustG.addColorStop(1, 'rgba(180,100,40,0)');
    ctx.fillStyle = dustG; ctx.fillRect(0, VP_Y, W, 38);
  }

  // ---- Chemin partagé (inchangé dans tous les biomes) ----
  function drawPath(ctx, distance) {
    const pal = TD.activePalette();
    const phT = 8, phB = pathHalfW(1);

    const pg = ctx.createLinearGradient(0, VP_Y, 0, H);
    pg.addColorStop(0, '#7a6535'); pg.addColorStop(0.4, pal.pathStone); pg.addColorStop(1, '#b09050');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    const overlay = pal.pathOverlay;
    ctx.fillStyle = overlay ? overlay[1] : 'rgba(220,185,110,0.10)';
    ctx.beginPath();
    ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X + phT, VP_Y);
    ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.lineTo(VP_X - phB, GROUND_BOTTOM);
    ctx.fill();

    ctx.strokeStyle = pal.pathBorder; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(VP_X - phT, VP_Y); ctx.lineTo(VP_X - phB, GROUND_BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VP_X + phT, VP_Y); ctx.lineTo(VP_X + phB, GROUND_BOTTOM); ctx.stroke();

    ctx.strokeStyle = 'rgba(90,70,30,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([8, 14]);
    for (const l of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(VP_X + l * phT * 0.7, VP_Y); ctx.lineTo(VP_X + l * LANE_W * 1.15, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    const scroll = (distance * 4000) % 1;
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const t = ((i / 12) + scroll / 12) % 1;
      if (t < 0.015) continue;
      const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
      if (y > H) continue;
      const hw    = pathHalfW(t);
      const alpha = 0.28 + t * 0.4;
      ctx.strokeStyle = `rgba(70,50,20,${alpha})`;
      ctx.beginPath(); ctx.moveTo(VP_X - hw, y); ctx.lineTo(VP_X + hw, y); ctx.stroke();
      if (t > 0.1) {
        const isOffset = i % 2 === 0;
        const nextT    = ((i + 1) / 12 + scroll / 12) % 1;
        const nextY    = VP_Y + (GROUND_BOTTOM - VP_Y) * nextT;
        const nextHw   = pathHalfW(nextT);
        ctx.strokeStyle = `rgba(70,50,20,${alpha * 0.65})`;
        for (let v = 1; v <= 2; v++) {
          const ratio = isOffset ? v / 3 + 0.08 : v / 3;
          ctx.beginPath();
          ctx.moveTo(VP_X - hw + hw * 2 * ratio, y);
          ctx.lineTo(VP_X - nextHw + nextHw * 2 * ratio, Math.min(nextY, H));
          ctx.stroke();
        }
      }
    }

    const visIdx = TD.biome.index;
    const mossColors = ['rgba(35,65,18,0.14)', 'rgba(28,72,22,0.20)', 'rgba(90,75,35,0.12)'];
    ctx.fillStyle = mossColors[visIdx] || mossColors[1];
    for (let i = 0; i < 8; i++) {
      const mt = 0.3 + i * 0.09, my = VP_Y + (GROUND_BOTTOM - VP_Y) * mt;
      if (my > H) continue;
      const mhw = pathHalfW(mt), mw = mhw * 0.1 + 4;
      ctx.fillRect(VP_X - mhw * 0.25 + i * 9, my - mw * 0.25, mw, mw * 0.35);
    }

    // Ombrage de dalles + fissures (coéquipier)
    for (let i = 0; i < 12; i++) {
      const t = ((i / 12) + scroll / 12) % 1;
      if (t < 0.02) continue;
      const y = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
      if (y > H) continue;
      const hw = pathHalfW(t);
      ctx.fillStyle = `rgba(0,0,0,${0.03 + t * 0.05})`;
      ctx.fillRect(VP_X - hw, y + 1, hw * 2, Math.max(1, (GROUND_BOTTOM - VP_Y) / 14));
      if (t > 0.12 && i % 3 === 0) {
        const cx2 = VP_X + Math.sin(i * 2.7 + scroll * 9) * hw * 0.35;
        ctx.strokeStyle = `rgba(40,28,12,${0.12 + t * 0.15})`;
        ctx.lineWidth   = Math.max(0.5, t * 0.8);
        ctx.beginPath();
        ctx.moveTo(cx2 - hw * 0.15, y + 2);
        ctx.lineTo(cx2 + hw * 0.12, y + 4 + t * 2);
        ctx.stroke();
      }
    }

    drawPathDecor(ctx);
  }

  function drawPathDecor(ctx) {
    const gameIdx = TD.state ? TD.state.activeBiomeIndex : 0;
    for (const d of TD.pathDecor) {
      if (d.t < 0.08 || d.t > 1.05) continue;
      const ps = TD.laneToScreen(d.lane, d.t);
      const hw = pathHalfW(d.t);
      if (Math.abs(ps.x - VP_X) > hw * 0.92) continue;
      const y = ps.y;
      const s = d.t;

      if (d.kind === 'stone') {
        const sz = (2.5 + s * 7) * (0.6 + (d.seed % 1) * 0.5);
        const cr = Math.floor(130 + s * 35 + (d.seed % 20));
        const cg = Math.floor(105 + s * 28 + (d.seed % 15));
        const cb = Math.floor(52 + s * 14);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.save();
        ctx.translate(ps.x, y - sz * 0.35);
        ctx.rotate((d.seed % 6.28) - 3.14);
        ctx.fillRect(-sz * 0.5, -sz * 0.35, sz, sz * 0.65);
        ctx.restore();
      } else {
        ctx.strokeStyle = `rgba(35,25,10,${0.15 + s * 0.2})`;
        ctx.lineWidth   = Math.max(0.5, 0.9 * s);
        ctx.beginPath();
        ctx.moveTo(ps.x - 4 * s, y);
        ctx.quadraticCurveTo(ps.x + 2 * s, y - 3 * s, ps.x + 5 * s, y + 1);
        ctx.stroke();
      }
    }

    if (gameIdx === 2 && Math.random() < 0.04) {
      const st  = 0.45 + Math.random() * 0.35;
      const sy  = VP_Y + (GROUND_BOTTOM - VP_Y) * st;
      const shw = pathHalfW(st);
      ctx.fillStyle = 'rgba(200,230,255,0.22)';
      ctx.fillRect(VP_X - shw * 0.3, sy, shw * 0.25, 2 * st);
    }
  }

  // ============================================================
  // MURS
  // ============================================================
  TD.drawWalls = function(ctx) {
    const pal   = TD.activePalette();
    const idx   = TD.biome.index;
    const steps = 40;

    for (const side of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i + 1) / steps;
        if (t0 < 0.01) continue;
        const y0 = VP_Y + (GROUND_BOTTOM - VP_Y) * t0;
        const y1 = VP_Y + (GROUND_BOTTOM - VP_Y) * t1;
        if (y0 > H + 5) continue;

        const hw0     = pathHalfW(t0), hw1 = pathHalfW(t1);
        const wallH0  = 6 + 105 * t0,  wallH1 = 6 + 105 * t1;
        const wallW0  = 3 + 20  * t0,  wallW1 = 3 + 20  * t1;
        const x0      = VP_X + side * hw0,  x1 = VP_X + side * hw1;
        const outerX0 = x0 + side * wallW0, outerX1 = x1 + side * wallW1;

        const r  = Math.floor(108 + t0 * 72) + (idx === 2 ? 14 : 0);
        const gv = Math.floor(84  + t0 * 58) + (idx === 1 ? 10 : 0);
        const b  = Math.floor(40  + t0 * 32);
        ctx.fillStyle = `rgb(${r},${gv},${b})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0); ctx.lineTo(x1, y1 - wallH1);
        ctx.lineTo(x1, y1);          ctx.lineTo(x0, y0);
        ctx.fill();

        ctx.fillStyle = `rgb(${Math.floor(38+t0*20)},${Math.floor(28+t0*15)},${Math.floor(12+t0*8)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0);    ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();

        ctx.fillStyle = `rgb(${Math.floor(175+t0*25)},${Math.floor(145+t0*20)},${Math.floor(72+t0*18)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - wallH0);    ctx.lineTo(outerX0, y0 - wallH0);
        ctx.lineTo(outerX1, y1 - wallH1); ctx.lineTo(x1, y1 - wallH1);
        ctx.fill();

        if (t0 > 0.2) {
          ctx.strokeStyle = `rgba(55,40,15,${0.2 + t0 * 0.25})`;
          ctx.lineWidth   = Math.max(0.5, 1.2 * t0);
          const blockH    = Math.max(5, 14 + t0 * 8);
          for (let bh = blockH; bh < wallH0 - 2; bh += blockH) {
            const by = y0 - wallH0 + bh;
            if (by > y0) break;
            ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x1, by); ctx.stroke();
          }
        }

        if (t0 > 0.18) {
          const mossA = idx === 1 ? 0.44 : idx === 2 ? 0.07 : 0.26;
          ctx.fillStyle = pal.wallMoss;
          const sw = Math.abs(x1 - x0);
          ctx.fillRect(x0 + sw * 0.08, y0 - wallH0 * 0.7, sw * 0.28, wallH0 * 0.3);
        }
      }

      for (let i = 8; i < steps; i += 2) {
        const t0 = i / steps;
        if (t0 < 0.22) continue;
        const y0 = VP_Y + (GROUND_BOTTOM - VP_Y) * t0;
        if (y0 > H + 5) continue;
        const hw0    = pathHalfW(t0);
        const wallH0 = 6 + 105 * t0;
        const x0     = VP_X + side * hw0;
        const x1     = VP_X + side * pathHalfW((i + 1) / steps);
        const segW   = Math.abs(x1 - x0);
        const crenH  = Math.max(2, 8 * t0);
        const crenW  = Math.max(2, segW * 0.55);
        const cx2    = side > 0 ? x0 : x1 - crenW;
        ctx.fillStyle = `rgb(${Math.floor(185+t0*15)},${Math.floor(150+t0*12)},${Math.floor(74+t0*10)})`;
        ctx.fillRect(cx2, y0 - wallH0 - crenH, crenW, crenH);
      }

      for (let i = 0; i < 8; i++) {
        const t  = 0.22 + i * 0.1;
        const y  = VP_Y + (GROUND_BOTTOM - VP_Y) * t;
        if (y > H) continue;
        const hw     = pathHalfW(t), wallH = 6 + 105 * t;
        const x      = VP_X + side * hw;
        const drColor = idx === 2 ? `rgba(155,118,48,` : `rgba(38,85,22,`;
        ctx.fillStyle = `${drColor}${0.16 + t * 0.12})`;
        ctx.fillRect(x - (1.5 + 3*t)*0.5, y - wallH*0.5, 1.5 + 3*t, 5 + 12*t);
      }
    }
  };

  // ============================================================
  // ARBRES / DÉCORATIONS
  // ============================================================
  TD.drawTrees = function(ctx) {
    const b   = TD.biome;
    const idx = b.index;

    if (!b.transitioning) {
      if      (idx === 1) drawDecorationsJungle(ctx);
      else if (idx === 2) drawDecorationsDesert(ctx);
      return;
    }

    const p = b.transitionProgress;

    // Fade out du biome actuel
    if (idx === 1) {
      ctx.save(); ctx.globalAlpha = 1 - p * 0.85;
      drawDecorationsJungle(ctx);
      ctx.restore();
    } else if (idx === 2) {
      ctx.save(); ctx.globalAlpha = 1 - p * 0.85;
      drawDecorationsDesert(ctx);
      ctx.restore();
    }

    // Fade in du prochain biome
    if (b.nextIndex === 1 && p > 0.60) {
      ctx.save(); ctx.globalAlpha = (p - 0.60) / 0.40;
      drawDecorationsJungle(ctx);
      ctx.restore();
    }
    if (b.nextIndex === 2 && p > 0.38) {
      ctx.save(); ctx.globalAlpha = (p - 0.38) / 0.62;
      drawDecorationsDesert(ctx);
      ctx.restore();
    }
  };

  function drawDecorationsJungle(ctx) {
    const pal = TD.activePalette();
    for (const tr of TD.trees) {
      if (tr.t < 0.02 || tr.t > 1.05) continue;
      const hw     = pathHalfW(tr.t);
      const y      = VP_Y + (GROUND_BOTTOM - VP_Y) * tr.t;
      if (y > H + 10) continue;
      const x      = VP_X + tr.side * (hw + (tr.xOff + 18) * tr.t);
      const s      = tr.t;
      const trunkH = 62 * s + 20, trunkW = 8 * s + 3;

      // Racines
      if (s > 0.25) {
        ctx.strokeStyle = '#140a03'; ctx.lineWidth = Math.max(1, 2.5 * s);
        for (let r = -1; r <= 1; r++) {
          ctx.beginPath();
          ctx.moveTo(x, y - trunkH * 0.2);
          ctx.quadraticCurveTo(x + r * trunkW * 2.5, y - trunkH * 0.05, x + r * trunkW * 3.5, y);
          ctx.stroke();
        }
      }

      // Tronc
      ctx.fillStyle = pal.treeTrunk;
      ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

      // Feuillage en couches
      const cr = 28 * s + 10;
      for (let layer = 2; layer >= 0; layer--) {
        ctx.fillStyle = pal.treeCanopy[layer];
        const lx = x + (layer % 2 === 0 ? -cr * 0.12 : cr * 0.15);
        const ly = y - trunkH - cr * (0.35 + layer * 0.22);
        ctx.beginPath(); ctx.arc(lx, ly, cr * (1.1 - layer * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#2a6018';
      ctx.beginPath(); ctx.arc(x - cr*0.1, y - trunkH - cr*0.85, cr*0.55, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(x + cr*0.28, y - trunkH - cr*0.28, cr*0.72, 0, Math.PI*2); ctx.fill();

      // 5 lianes
      if (s > 0.22) {
        ctx.strokeStyle = `rgba(28,75,14,${0.40 + s*0.30})`; ctx.lineWidth = 1;
        for (let v = 0; v < 5; v++) {
          const vx   = x + (v - 2) * cr * 0.28;
          const vLen = (10 + v * 7) * s;
          ctx.beginPath();
          ctx.moveTo(vx, y - trunkH + 2);
          ctx.quadraticCurveTo(vx + 6*s*(v%2===0?1:-1), y - trunkH + vLen*0.5, vx - 5*s*(v%3===0?1:-1), y - trunkH + vLen);
          ctx.stroke();
        }
      }

      // Fleurs sur tous les arbres proches
      if (s > 0.45) {
        const flCol = tr.variant === 0 ? '#d44820' : tr.variant === 1 ? '#e8b020' : '#c030a0';
        ctx.fillStyle = flCol;
        ctx.beginPath(); ctx.arc(x + cr*0.42, y - trunkH - cr*0.42, 3.5*s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath(); ctx.arc(x + cr*0.42, y - trunkH - cr*0.42, 1.2*s, 0, Math.PI*2); ctx.fill();
      }

      // Arbuste secondaire à côté de chaque arbre
      if (s > 0.30) {
        const bx  = x + tr.side * (trunkW * 3 + cr * 0.5);
        const bcr = cr * 0.48;
        ctx.fillStyle = '#113008';
        ctx.beginPath(); ctx.arc(bx, y - bcr*0.6, bcr, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a4510';
        ctx.beginPath(); ctx.arc(bx - bcr*0.2, y - bcr, bcr*0.72, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  function drawDecorationsDesert(ctx) {
    const PYRS = [
      { side: -1, tPos: 0.04, scale: 2.2 },
      { side:  1, tPos: 0.06, scale: 1.8 },
      { side: -1, tPos: 0.10, scale: 1.3 },
      { side:  1, tPos: 0.08, scale: 1.0 },
    ];
    for (const pyr of PYRS) {
      const hw  = pathHalfW(pyr.tPos);
      const y   = VP_Y + (GROUND_BOTTOM - VP_Y) * pyr.tPos;
      const s   = pyr.tPos * pyr.scale;
      const bw  = 65 + 130 * s, bh = 50 + 95 * s;
      const px2 = VP_X + pyr.side * (hw + 80 + 50 * pyr.tPos);

      ctx.fillStyle = `rgba(0,0,0,${0.10 + s*0.10})`;
      ctx.beginPath(); ctx.ellipse(px2, y, bw*0.52, bh*0.07, 0, 0, Math.PI*2); ctx.fill();

      const pr = Math.floor(68 + s*48), pgr = Math.floor(42 + s*30), pb3 = Math.floor(14 + s*10);
      ctx.fillStyle = `rgb(${pr},${pgr},${pb3})`;
      ctx.beginPath();
      ctx.moveTo(px2,        y); ctx.lineTo(px2 + bw/2, y); ctx.lineTo(px2, y - bh);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = `rgb(${Math.floor(pr*0.6)},${Math.floor(pgr*0.6)},${Math.floor(pb3*0.6)})`;
      ctx.beginPath();
      ctx.moveTo(px2,        y); ctx.lineTo(px2 - bw/2, y); ctx.lineTo(px2, y - bh);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = 'rgba(220,180,100,0.22)';
      ctx.lineWidth   = Math.max(0.5, 1.5*s);
      ctx.beginPath(); ctx.moveTo(px2, y - bh); ctx.lineTo(px2 + bw/2, y); ctx.stroke();
    }

    for (const tr of TD.trees) {
      if (tr.t < 0.12 || tr.t > 1.0) continue;
      const hw = pathHalfW(tr.t);
      const y  = VP_Y + (GROUND_BOTTOM - VP_Y) * tr.t;
      if (y > H + 10) continue;
      const x  = VP_X + tr.side * (hw + (tr.xOff * 0.5 + 10) * tr.t);
      const s  = tr.t;
      const cr = 7 * s + 4;
      const sr2 = Math.floor(52 + s*22), sg2 = Math.floor(36 + s*14), sb3 = Math.floor(10 + s*8);
      ctx.fillStyle = `rgb(${sr2},${sg2},${sb3})`;
      ctx.beginPath(); ctx.arc(x, y - cr*0.5, cr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.arc(x + cr*0.3, y - cr*0.25, cr*0.7, 0, Math.PI*2); ctx.fill();
    }
  }

  // ============================================================
  // VIGNETTE & POST-PROCESSING
  // ============================================================
  TD.drawVignette = function(ctx) {
    const pal = TD.activePalette();
    const g = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.88);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, pal.vignette);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const leftG = ctx.createLinearGradient(0, 0, W*0.22, 0);
    leftG.addColorStop(0, 'rgba(0,0,0,0.38)'); leftG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftG; ctx.fillRect(0, 0, W*0.22, H);

    const rightG = ctx.createLinearGradient(W, 0, W*0.78, 0);
    rightG.addColorStop(0, 'rgba(0,0,0,0.38)'); rightG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightG; ctx.fillRect(W*0.78, 0, W*0.22, H);

    ctx.fillStyle = pal.tint; ctx.fillRect(0, 0, W, H);

    // Film grain (coéquipier)
    ctx.fillStyle = 'rgba(255,255,255,0.028)';
    for (let i = 0; i < 90; i++) {
      const gx = (i * 97 + (Date.now() >> 4)) % W;
      const gy = (i * 53 + (Date.now() >> 3)) % H;
      ctx.fillRect(gx, gy, 1, 1);
    }
  };

})();
