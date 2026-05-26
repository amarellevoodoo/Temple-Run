// ============================================
// music.js — MP3 background music loop
// ============================================

(function() {
  let audio = null;
  let playing = false;

  function createAudio() {
    if (audio) return;
    audio = new Audio('assets/Main Theme.mp3');
    audio.loop = true;
    audio.volume = 0.5;
  }

  TD.music = {
    start: function() {
      if (playing) return;
      if (TD.audio.muted) return;
      createAudio();
      audio.currentTime = 0;
      audio.play().catch(() => {});
      playing = true;
    },

    stop: function() {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      playing = false;
    },

    setMuted: function(muted) {
      if (!audio) return;
      audio.muted = muted;
    },

    isPlaying: function() {
      return playing;
    }
  };
})();
