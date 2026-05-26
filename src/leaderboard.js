// ============================================
// leaderboard.js — Global leaderboard via Dreamlo
// ============================================
//
// Setup (one-time):
//   1. Visit https://www.dreamlo.com/ and enter your email.
//   2. Copy your "Private Key" into DREAMLO.PRIVATE_KEY below.
//   3. Copy your "Public Code" into DREAMLO.PUBLIC_CODE below.
//   4. Reload the page. That's it.
//
// Without these keys the game still runs perfectly; the leaderboard panel
// just shows a friendly "not configured" message and submits are skipped.

(function() {
  const DREAMLO = {
    PRIVATE_KEY: 'PUT_YOUR_PRIVATE_KEY_HERE',
    PUBLIC_CODE: 'PUT_YOUR_PUBLIC_CODE_HERE',
  };

  const NAME_KEY = 'td_name';
  const NAME_MAX = 12;
  const DEFAULT_NAME = 'RUNNER';

  function isConfigured() {
    return DREAMLO.PRIVATE_KEY && !DREAMLO.PRIVATE_KEY.startsWith('PUT_YOUR_')
        && DREAMLO.PUBLIC_CODE && !DREAMLO.PUBLIC_CODE.startsWith('PUT_YOUR_');
  }

  function sanitizeName(raw) {
    if (!raw) return DEFAULT_NAME;
    // Dreamlo URL path is slash-delimited; strip slashes and trim length.
    const cleaned = String(raw).replace(/[\\/|\s]+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, NAME_MAX);
    return cleaned || DEFAULT_NAME;
  }

  function getPlayerName() {
    let stored = localStorage.getItem(NAME_KEY);
    if (stored) return stored;
    const entered = (typeof window !== 'undefined' && window.prompt)
      ? window.prompt('Enter a name for the leaderboard (max ' + NAME_MAX + ' chars):', DEFAULT_NAME)
      : DEFAULT_NAME;
    const name = sanitizeName(entered);
    localStorage.setItem(NAME_KEY, name);
    return name;
  }

  function setPlayerName(name) {
    const clean = sanitizeName(name);
    localStorage.setItem(NAME_KEY, clean);
    return clean;
  }

  async function submit(name, score) {
    if (!isConfigured()) return null;
    const safeName = sanitizeName(name);
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    const url = 'https://www.dreamlo.com/lb/' + encodeURIComponent(DREAMLO.PRIVATE_KEY)
              + '/add-pipe/' + encodeURIComponent(safeName) + '/' + safeScore;
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  }

  // Returns an array of { name, score, rank } sorted by score desc.
  async function fetchTop(n) {
    if (!isConfigured()) return null;
    const limit = Math.max(1, Math.min(100, n || 10));
    const url = 'https://www.dreamlo.com/lb/' + encodeURIComponent(DREAMLO.PUBLIC_CODE)
              + '/json/' + limit;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Leaderboard fetch failed: ' + res.status);
    const data = await res.json();
    // Dreamlo shape: { dreamlo: { leaderboard: { entry: [...] | {...} | undefined } } }
    const lb = data && data.dreamlo && data.dreamlo.leaderboard;
    if (!lb || !lb.entry) return [];
    const entries = Array.isArray(lb.entry) ? lb.entry : [lb.entry];
    return entries.map((e, i) => ({
      name: e.name || 'unknown',
      score: parseInt(e.score, 10) || 0,
      rank: i + 1,
    }));
  }

  TD.leaderboard = {
    isConfigured,
    submit,
    fetchTop,
    getPlayerName,
    setPlayerName,
  };
})();
