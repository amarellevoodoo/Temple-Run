// ============================================
// intro.js — 3-second cutscene before gameplay
// ============================================

(function() {
  const { W, H } = TD;

  const INTRO_DURATION = 5000;

  function drawBuilding(ctx, x, y) {
    const B = 2.2;

    // Temple base
    ctx.fillStyle = '#5a6a5a';
    ctx.fillRect(x - 80 * B, y - 140 * B, 160 * B, 140 * B);

    // Doorway
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x - 30 * B, y);
    ctx.lineTo(x - 30 * B, y - 70 * B);
    ctx.arc(x, y - 70 * B, 30 * B, Math.PI, 0);
    ctx.lineTo(x + 30 * B, y);
    ctx.fill();

    // Roof — stepped pyramid
    ctx.fillStyle = '#4a5a3a';
    ctx.beginPath();
    ctx.moveTo(x - 95 * B, y - 140 * B);
    ctx.lineTo(x, y - 190 * B);
    ctx.lineTo(x + 95 * B, y - 140 * B);
    ctx.fill();

    ctx.fillStyle = '#3a4a2a';
    ctx.beginPath();
    ctx.moveTo(x - 60 * B, y - 175 * B);
    ctx.lineTo(x, y - 210 * B);
    ctx.lineTo(x + 60 * B, y - 175 * B);
    ctx.fill();

    // Stone texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 7; row++) {
      const ry = y - 28 * B * row / 1.4 - 14 * B;
      ctx.beginPath(); ctx.moveTo(x - 80 * B, ry); ctx.lineTo(x + 80 * B, ry); ctx.stroke();
    }

    // Moss patches
    ctx.fillStyle = 'rgba(40,90,25,0.35)';
    ctx.beginPath(); ctx.ellipse(x - 50 * B, y - 90 * B, 18 * B, 8 * B, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 40 * B, y - 45 * B, 14 * B, 6 * B, -0.1, 0, Math.PI * 2); ctx.fill();

    // "VOODOO" text above the door
    ctx.save();
    ctx.font = `bold ${28 * B}px 'Cinzel Decorative', serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c8a84e';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText('VOODOO', x, y - 78 * B);
    ctx.restore();

    // Vines hanging from roof
    ctx.strokeStyle = '#2a5a1a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 60 * B, y - 140 * B);
    ctx.quadraticCurveTo(x - 55 * B, y - 110 * B, x - 62 * B, y - 90 * B); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 50 * B, y - 140 * B);
    ctx.quadraticCurveTo(x + 48 * B, y - 115 * B, x + 55 * B, y - 95 * B); ctx.stroke();
  }

  // Side-view runner (the player, running right)
  function drawPlayerSide(ctx, x, y, t) {
    const S = 2.8;
    const legSw = Math.sin(t * 12) * 12 * S;
    const armSw = Math.sin(t * 12 + Math.PI) * 10 * S;
    const bob = Math.abs(Math.sin(t * 12)) * 2;
    const bodyY = y - bob;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 14 * S, 4 * S, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 4 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, bodyY - 12 * S); ctx.lineTo(x + legSw, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyY - 12 * S); ctx.lineTo(x - legSw, y); ctx.stroke();

    // Torso
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x - 7 * S, bodyY - 32 * S, 14 * S, 20 * S);

    // Back arm (swings freely)
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3.5 * S;
    ctx.beginPath(); ctx.moveTo(x - 4 * S, bodyY - 28 * S); ctx.lineTo(x - 4 * S - armSw, bodyY - 14 * S); ctx.stroke();

    // Front arm — holding the folder against chest
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3.5 * S;
    const handX = x + 10 * S, handY = bodyY - 22 * S;
    ctx.beginPath(); ctx.moveTo(x + 4 * S, bodyY - 28 * S); ctx.lineTo(handX, handY); ctx.stroke();

    // Folder
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#d4a843';
    ctx.fillRect(-2 * S, -14 * S, 18 * S, 20 * S);
    ctx.fillStyle = '#c49833';
    ctx.fillRect(-2 * S, -14 * S, 18 * S, 3 * S);
    ctx.font = `bold ${9 * S}px sans-serif`;
    ctx.fillStyle = '#2a1a0a';
    ctx.textAlign = 'center';
    ctx.fillText('BeReal', 7 * S, -3 * S);
    ctx.fillText('Secret Plans', 7 * S, 5 * S);
    ctx.restore();

    // Head
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(x + 2 * S, bodyY - 38 * S, 6 * S, 0, Math.PI * 2); ctx.fill();

    // Hair (short, from behind/side)
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(x + 1 * S, bodyY - 39 * S, 6.5 * S, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();

    ctx.restore();
  }

  // Alex — side-view, chasing (tall, shoulder-length black hair, black clothes, rectangular glasses)
  function drawAlex(ctx, x, y, t) {
    const S = 4.06;
    const legSw = Math.sin(t * 11) * 14 * S;
    const armSw = Math.sin(t * 11 + Math.PI) * 11 * S;
    const bob = Math.abs(Math.sin(t * 11)) * 2;
    const bodyY = y - bob;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Legs — black pants
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 5 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, bodyY - 18 * S); ctx.lineTo(x + legSw, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, bodyY - 18 * S); ctx.lineTo(x - legSw, y); ctx.stroke();

    // Torso — black sweater
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 9 * S, bodyY - 48 * S, 18 * S, 30 * S);

    // Arms — black sweater sleeves
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4.5 * S;
    ctx.beginPath(); ctx.moveTo(x + 6 * S, bodyY - 42 * S); ctx.lineTo(x + 6 * S + armSw, bodyY - 22 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6 * S, bodyY - 42 * S); ctx.lineTo(x - 6 * S - armSw, bodyY - 22 * S); ctx.stroke();

    // Hands
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(x + 6 * S + armSw, bodyY - 22 * S, 3 * S, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 6 * S - armSw, bodyY - 22 * S, 3 * S, 0, Math.PI * 2); ctx.fill();

    // Head
    const headR = 9 * S;
    const headY = bodyY - 55 * S;
    ctx.fillStyle = '#c4956a';
    ctx.beginPath(); ctx.arc(x + 2, headY, headR, 0, Math.PI * 2); ctx.fill();

    // Hair — only on top and flowing down the back (face stays clear)
    ctx.fillStyle = '#0a0a0a';
    // Top of head
    ctx.beginPath(); ctx.arc(x + 1, headY - 1.5 * S, headR * 1.08, Math.PI * 0.85, Math.PI * 1.7); ctx.fill();
    // Back hair flowing down to shoulders
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.75, headY - 3 * S);
    ctx.quadraticCurveTo(x - headR * 1.1, headY + 6 * S, x - headR * 0.95, headY + 18 * S);
    ctx.lineTo(x - headR * 0.5, headY + 20 * S);
    ctx.quadraticCurveTo(x - headR * 0.6, headY + 8 * S, x - headR * 0.45, headY - 1 * S);
    ctx.fill();

    // Rectangular glasses with thick black frame
    ctx.fillStyle = 'rgba(180,210,255,0.35)';
    ctx.fillRect(x + 1, headY - 3.5 * S, 10 * S, 6 * S);
    ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1, headY - 3.5 * S, 10 * S, 6 * S);
    // Bridge
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 1, headY - 0.5 * S); ctx.lineTo(x - 2, headY - 0.5 * S); ctx.stroke();
    // Temple arm of glasses
    ctx.beginPath(); ctx.moveTo(x + 1 + 10 * S, headY - 1 * S); ctx.lineTo(x + 1 + 13 * S, headY - 2 * S); ctx.stroke();

    ctx.restore();
  }

  function drawJungleBg(ctx) {
    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, '#1a3a2a');
    g.addColorStop(1, '#2a5a3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.6);

    // Ground
    const gg = ctx.createLinearGradient(0, H * 0.55, 0, H);
    gg.addColorStop(0, '#3a5a2a');
    gg.addColorStop(1, '#1a3a0a');
    ctx.fillStyle = gg;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Stone path
    ctx.fillStyle = '#5a6a5a';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    ctx.fillStyle = 'rgba(70,90,65,0.4)';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);

    // Background trees
    const treePositions = [60, 180, 350, 520, 650, 750];
    for (const tx of treePositions) {
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(tx - 4, H * 0.3, 8, H * 0.42);
      ctx.fillStyle = '#1a4a15';
      ctx.beginPath(); ctx.arc(tx, H * 0.28, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a5a1a';
      ctx.beginPath(); ctx.arc(tx + 5, H * 0.25, 20, 0, Math.PI * 2); ctx.fill();
    }

    // Fog layer
    const fog = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.65);
    fog.addColorStop(0, 'rgba(60,100,60,0)');
    fog.addColorStop(1, 'rgba(60,100,60,0.2)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, H * 0.45, W, H * 0.2);
  }

  TD.playIntro = function(callback) {
    const canvas = TD.canvas;
    const ctx = canvas.getContext('2d');
    const startTime = Date.now();

    TD.audio.ensureCtx();
    TD.music.start();

    const groundY = H * 0.92;
    const buildingX = 160;

    function frame() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / INTRO_DURATION, 1);
      const t = elapsed / 1000;

      ctx.clearRect(0, 0, W, H);

      drawJungleBg(ctx);
      drawBuilding(ctx, buildingX, groundY + 24);

      // Player runs out of the building and across the screen
      const playerStartX = buildingX;
      const playerEndX = W * 0.65;
      const playerX = playerStartX + (playerEndX - playerStartX) * Math.min(progress * 1.4, 1);

      // Alex starts from inside the building, delayed slightly
      const alexDelay = 0.15;
      const alexProgress = Math.max(0, (progress - alexDelay) / (1 - alexDelay));
      const alexStartX = buildingX - 30;
      const alexEndX = W * 0.42;
      const alexX = alexStartX + (alexEndX - alexStartX) * Math.min(alexProgress * 1.3, 1);

      // Draw Alex behind the player (if visible)
      if (alexProgress > 0) {
        drawAlex(ctx, alexX, groundY, t);
      }

      drawPlayerSide(ctx, playerX, groundY, t);

      // Text — fades in after 0.8s
      const textAlpha = Math.min(1, Math.max(0, (progress - 0.25) * 3));
      if (textAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = textAlpha;

        ctx.font = "bold 28px 'MedievalSharp', cursive";
        ctx.textAlign = 'center';

        // Text shadow
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText('Alex is chasing you ! Run !', W / 2 + 2, H * 0.25 + 2);

        // Main text
        ctx.fillStyle = '#ffd700';
        ctx.fillText('Alex is chasing you ! Run !', W / 2, H * 0.25);

        ctx.restore();
      }

      // Vignette
      const v = ctx.createRadialGradient(W/2, H/2, H * 0.25, W/2, H/2, H * 0.85);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,10,0,0.5)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

      // Fade to black at the end
      if (progress > 0.85) {
        const fadeAlpha = (progress - 0.85) / 0.15;
        ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (elapsed < INTRO_DURATION) {
        requestAnimationFrame(frame);
      } else {
        callback();
      }
    }

    requestAnimationFrame(frame);
  };
})();
