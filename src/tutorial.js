// ============================================
// tutorial.js — On-screen control hints for new players
// ============================================
//
// Anchored to the bottom-right corner (well outside the runway), a small
// arrow-key pad stays visible for the first ~10 seconds of every fresh run.
// The pad's job is to teach the three core controls by highlighting the
// exact key the player should press, exactly when they should press it:
//
//   1. "lanes"  — left & right arrows glow; player learns to switch lanes.
//   2. "watch"  — nothing glows; we're scanning for the next obstacle.
//   3. "jump"   — up arrow glows the instant a hole/root enters the
//                 reaction zone; stays lit until the player jumps or the
//                 obstacle has passed.
//   4. "slide"  — down arrow glows the instant a tunnel enters the
//                 reaction zone; stays lit until the player slides or the
//                 tunnel has passed.
//   5. ends     — fades out after TUTORIAL_FRAMES, on game-over, or when
//                 explicitly stopped.
//
// Frames are used (rather than wall-clock time) so pausing the game also
// pauses the tutorial countdown.

(function() {
  // ~60 fps target — these constants give "≈ seconds" in plain terms.
  const TUTORIAL_FRAMES   = 600;   // ~10 seconds total
  const LANE_HINT_FRAMES  = 180;   // ~3 seconds for the initial lane hint
  const ACTION_COOLDOWN   = 30;    // brief pause after a successful jump/slide

  // When to light the action key: we use FRAMES-TO-PLAYER instead of a fixed
  // depth. A fixed depth fires way too early at low speeds — e.g. an obstacle
  // at t=0.20 is 192 frames (~3 s) away when speed=0.0025, so pressing jump
  // the moment the highlight appears would land the player ~140 frames before
  // the obstacle arrived. Using a frames-based threshold keeps the timing
  // correct at every speed: the highlight always appears ~0.5 s of game-time
  // before the obstacle reaches the player.
  const REACTION_FRAMES = 30;
  // We allow the highlight to *stay* lit for an extra few frames past the
  // initial trigger so a slightly slow player still has time to react.
  const RELEVANT_FRAMES = REACTION_FRAMES + 8;

  // DOM refs — looked up lazily once the document is ready.
  let $hud, $text, $keys;

  // Internal state
  let active = false;
  let framesLeft = 0;
  let stage = 'idle';   // 'lanes' | 'watch' | 'jump' | 'slide' | 'done'
  let laneFramesLeft = 0;
  let cooldown = 0;
  let initialLane = 0;

  function ensureRefs() {
    if ($hud) return;
    $hud  = document.getElementById('tutorialHud');
    $text = document.getElementById('tutorialText');
    $keys = $hud ? $hud.querySelectorAll('.tut-key') : [];
  }

  function showCard() {
    ensureRefs();
    if (!$hud) return;
    $hud.classList.remove('hidden');
    $hud.classList.add('show');
  }

  function hideCard() {
    ensureRefs();
    if (!$hud) return;
    $hud.classList.remove('show');
    $hud.classList.add('hidden');
    if ($keys) $keys.forEach(k => k.classList.remove('active'));
  }

  // Set the card label and which arrow key(s) should glow right now.
  //   activeKeys: array of data-key values, e.g. ['left','right'] or ['up'].
  function setStage(title, activeKeys) {
    ensureRefs();
    if (!$hud) return;
    if ($text) $text.textContent = title;
    $keys.forEach(k => {
      if (activeKeys && activeKeys.indexOf(k.dataset.key) >= 0) {
        k.classList.add('active');
      } else {
        k.classList.remove('active');
      }
    });
  }

  TD.tutorialStart = function() {
    ensureRefs();
    active = true;
    framesLeft = TUTORIAL_FRAMES;
    laneFramesLeft = LANE_HINT_FRAMES;
    cooldown = 0;
    stage = 'lanes';
    initialLane = TD.player ? TD.player.targetLane : 0;

    showCard();
    setStage('Switch Lanes', ['left', 'right']);
  };

  TD.tutorialEnd = function() {
    active = false;
    stage = 'done';
    hideCard();
  };

  TD.tutorialUpdate = function() {
    if (!active) return;

    framesLeft--;
    if (framesLeft <= 0) {
      TD.tutorialEnd();
      return;
    }
    if (cooldown > 0) cooldown--;

    const p = TD.player;

    if (stage === 'lanes') {
      laneFramesLeft--;
      const moved = p && p.targetLane !== initialLane;
      if (moved || laneFramesLeft <= 0) {
        stage = 'watch';
        setStage('Get Ready...', []);
      }
      return;
    }

    if (stage === 'watch') {
      if (cooldown > 0) return;
      // Find the closest unhit obstacle that's within the reaction window —
      // i.e. it will reach the player in <= REACTION_FRAMES frames.
      const obs = pickReactionObstacle(REACTION_FRAMES);
      if (!obs) return;
      if (obs.type === 'tunnel') {
        stage = 'slide';
        setStage('SLIDE!', ['down']);
      } else {
        stage = 'jump';
        setStage('JUMP!', ['up']);
      }
      return;
    }

    if (stage === 'jump') {
      const jumped = p && p.jumping;
      // Keep the highlight lit while any ground obstacle is still in range.
      // Once the obstacle has gone past the player (or been smashed by an
      // invincibility power-up), drop the highlight and re-arm the watcher.
      const stillThreat = anyObstacleStillRelevant('ground', RELEVANT_FRAMES);
      if (jumped || !stillThreat) {
        stage = 'watch';
        setStage(jumped ? 'Nice!' : 'Get Ready...', []);
        cooldown = ACTION_COOLDOWN;
      }
      return;
    }

    if (stage === 'slide') {
      const slid = p && p.sliding;
      const stillThreat = anyObstacleStillRelevant('tunnel', RELEVANT_FRAMES);
      if (slid || !stillThreat) {
        stage = 'watch';
        setStage(slid ? 'Nice!' : 'Get Ready...', []);
        cooldown = ACTION_COOLDOWN;
      }
      return;
    }
  };

  // ---- helpers ----

  // Use the current game speed, falling back to BASE_SPEED before a run starts.
  function currentSpeed() {
    if (TD.state && TD.state.speed > 0) return TD.state.speed;
    return TD.BASE_SPEED || 0.0025;
  }

  // Returns the closest unhit obstacle whose frames-to-player is in
  // (0, maxFrames]. Used to decide *when* to light the action key.
  function pickReactionObstacle(maxFrames) {
    if (!TD.obstacles) return null;
    const speed = currentSpeed();
    const playerT = TD.PLAYER_T;
    let best = null;
    let bestFrames = Infinity;
    for (const o of TD.obstacles) {
      if (o.hit || o.smashed) continue;
      if (o.t >= playerT) continue; // already past us
      const framesToPlayer = (playerT - o.t) / speed;
      if (framesToPlayer > 0 && framesToPlayer <= maxFrames && framesToPlayer < bestFrames) {
        best = o;
        bestFrames = framesToPlayer;
      }
    }
    return best;
  }

  // True while some non-passed obstacle of the requested kind is still in
  // the reaction range (with a small grace window so late presses still
  // benefit from the highlight).
  //   kind: 'ground' (hole + root) | 'tunnel'
  function anyObstacleStillRelevant(kind, maxFrames) {
    if (!TD.obstacles) return false;
    const speed = currentSpeed();
    const playerT = TD.PLAYER_T;
    for (const o of TD.obstacles) {
      if (o.hit || o.smashed) continue;
      if (kind === 'ground' && o.type === 'tunnel') continue;
      if (kind === 'tunnel' && o.type !== 'tunnel') continue;
      // Allow a small buffer past the player so the highlight doesn't blink
      // off the instant the obstacle crosses 0.68.
      if (o.t >= playerT + 0.04) continue;
      const framesToPlayer = (playerT - o.t) / speed;
      if (framesToPlayer <= maxFrames) return true;
    }
    return false;
  }
})();
