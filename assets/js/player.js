/*!
 * SiteEnhance · music card (Howler edition)
 *
 * Playlist is fetched from the Audius API; each track's /stream endpoint
 * 302-redirects to the audio CDN. Howler runs in html5 mode so the redirect
 * is followed natively.
 */
(function (window, document) {
  'use strict';

  var Enhance = window.Enhance;
  if (!Enhance) return;

  var CONFIG = (Enhance.CONFIG && Enhance.CONFIG.player) || {};
  var storage = Enhance.storage;
  var Toast = Enhance.Toast;
  var bus = Enhance.bus;
  var clamp = Enhance.clamp || function (value, min, max) {
    return value < min ? min : (value > max ? max : value);
  };

  /* ------------------------------------------------------------- Keys / tunables */

  var KEYS = {
    volume:   'site-enhance:player:volume',
    muted:    'site-enhance:player:muted',
    order:    'site-enhance:player:order',
    visible:  'site-enhance:player:visible',
    index:    'site-enhance:player:index',
    position: 'site-enhance:player:position',
    seek:     'site-enhance:player:seek',
    tracks:   'site-enhance:player:tracks'
  };

  var PLAYLIST_TIMEOUT   = 8000;
  var RETRY_DELAY        = 3000;
  var MAX_FAILURES       = 3;
  var FAILURE_GRACE      = 2000;
  var SEEK_SAVE_INTERVAL = 4000;
  var POSITION_INTERVAL  = 5000;
  var CACHE_TTL          = 86400000;

  var DEFAULT_TITLE = '背景音乐';
  var API_BASE      = 'https://api.audius.co/v1';
  /* Audius rejects unidentified callers. */
  var APP_NAME      = 'exyone-blog';

  function apiUrl(path) {
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return API_BASE + path + sep + 'app_name=' + encodeURIComponent(APP_NAME);
  }

  function toArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  function notify(level, message) {
    if (Toast && typeof Toast[level] === 'function') Toast[level](message);
  }

  /* ------------------------------------------- Unsupported engines (UA-based) */

  /* Playback only works on Chromium; Gecko/WebKit fail at the media output /
   * ORB layer. Feature detection cannot capture this, so sniff the UA and
   * warn on every open attempt instead of pretending the player works. */
  function isUnsupportedEngine() {
    var ua = window.navigator.userAgent || '';
    if (/firefox/i.test(ua)) return true;
    /* Every Chromium UA also claims "Safari"; exclude it explicitly. */
    return /safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua);
  }

  /* Tied to a user action (opening the card), so show immediately and let
   * the standard toast lifetime dismiss it. Not persisted: a fresh attempt
   * should always get feedback. */
  function showUnsupportedNotice() {
    if (Toast) Toast.warn('Firefox / Safari 听不了背景音乐～ 换 Chrome 试试吧。', 6000);
  }

  /* Play modes */
  var ORDERS = ['list', 'random', 'single', 'circulation'];
  var ORDER_LABEL = {
    list: '顺序播放', random: '随机播放',
    single: '单曲循环', circulation: '列表循环'
  };
  var ORDER_ICON = {
    list: 'fa-list-ul', random: 'fa-random',
    single: 'fa-repeat', circulation: 'fa-sync'
  };

  var Music = (function () {
    if (CONFIG.enabled === false) return null;

    var cardEl = Enhance.$('#player-card');
    if (!cardEl) return null;

    var titleEl       = Enhance.$('#vplayer-title');
    var hintEl        = Enhance.$('#vplayer-hint');
    var progressEl    = Enhance.$('#vplayer-progress');
    var progressTrack = cardEl.querySelector('.player-progress');

    var control = {
      prev:   cardEl.querySelector('[data-pctl="prev"]'),
      toggle: cardEl.querySelector('[data-pctl="toggle"]'),
      next:   cardEl.querySelector('[data-pctl="next"]'),
      order:  cardEl.querySelector('[data-pctl="order"]'),
      mute:   cardEl.querySelector('[data-pctl="mute"]')
    };
    var volumeEl = cardEl.querySelector('[data-pctl="volume"]');

    /* ------------------------------------------------------------- State */

    var savedVolume = parseFloat(storage.get(KEYS.volume, ''));
    var fallbackVolume = typeof CONFIG.volume === 'number' ? CONFIG.volume : 0.7;
    var savedOrder = String(storage.get(KEYS.order, CONFIG.order || 'random'));
    if (ORDERS.indexOf(savedOrder) < 0) savedOrder = 'random';

    var state = {
      initialized: false,
      loading: null,
      sound: null,
      playlist: [],
      currentIndex: 0,
      visible: false,
      volume: isNaN(savedVolume) ? fallbackVolume : savedVolume,
      muted: storage.get(KEYS.muted, 'off') === 'on',
      order: savedOrder,
      failCount: 0,
      failed: false,
      scrubbing: false,
      successTimer: 0,
      progressRaf: 0,
      lastSeekSave: 0,
      lastPositionPush: 0
    };
    state.volume = clamp(state.volume, 0, 1);
    state.currentIndex = Math.max(0, parseInt(storage.get(KEYS.index, '0'), 10) || 0);

    /* ---------------------------------------------------------------- UI */

    function setHint(text) {
      if (hintEl && hintEl.textContent !== text) hintEl.textContent = text;
    }

    function setTitle(track) {
      if (!titleEl) return;
      var text = DEFAULT_TITLE;
      if (track && track.name) {
        text = DEFAULT_TITLE + ' · ' + track.name + ' - ' + (track.artist || '未知歌手');
      }
      if (titleEl.textContent !== text) titleEl.textContent = text;
      titleEl.setAttribute('title', text);
    }

    function setControlsEnabled(enabled) {
      Object.keys(control).forEach(function (key) {
        if (control[key]) control[key].disabled = !enabled;
      });
      if (volumeEl) volumeEl.disabled = !enabled;
    }

    function syncControlLabels() {
      var playing = isPlaying();
      if (control.toggle) {
        control.toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
        control.toggle.setAttribute('title', playing ? '暂停' : '播放');
        control.toggle.setAttribute('aria-pressed', String(playing));
        var icon = control.toggle.querySelector('i');
        if (icon) icon.className = 'fas fa-' + (playing ? 'pause' : 'play');
      }
      if (control.prev) {
        control.prev.setAttribute('aria-label', '上一首');
        control.prev.setAttribute('title', '上一首');
      }
      if (control.next) {
        control.next.setAttribute('aria-label', '下一首');
        control.next.setAttribute('title', '下一首');
      }
      syncOrderUI();
      syncVolumeUI();
    }

    function syncOrderUI() {
      if (!control.order) return;
      var label = ORDER_LABEL[state.order] || '播放模式';
      control.order.setAttribute('data-order', state.order);
      control.order.setAttribute('aria-label', label);
      control.order.setAttribute('title', label);
      var icon = control.order.querySelector('i');
      if (icon) icon.className = 'fas fa-' + (ORDER_ICON[state.order] || 'fa-random');
    }

    function syncVolumeUI() {
      var muted = state.muted || state.volume === 0;
      if (volumeEl) {
        var value = state.muted ? 0 : state.volume;
        if (parseFloat(volumeEl.value) !== value) volumeEl.value = String(value);
        volumeEl.setAttribute('aria-label', '音量');
        volumeEl.setAttribute('aria-valuetext', Math.round(value * 100) + '%');
      }
      if (control.mute) {
        control.mute.setAttribute('aria-label', muted ? '取消静音' : '静音');
        control.mute.setAttribute('title', muted ? '取消静音' : '静音');
        control.mute.setAttribute('aria-pressed', String(muted));
        var icon = control.mute.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-volume-' +
            (muted ? 'mute' : (state.volume < 0.5 ? 'down' : 'up'));
        }
      }
    }

    /* ------------------------------------------------------------- Timing */

    function getDuration() {
      var s = state.sound;
      if (!s) return 0;
      var d = s.duration();
      return d && isFinite(d) && d > 0 ? d : 0;
    }

    function getTime() {
      var s = state.sound;
      if (!s) return 0;
      var t = s.seek();
      return typeof t === 'number' && isFinite(t) && t > 0 ? t : 0;
    }

    function updateProgress() {
      if (!progressEl || state.scrubbing) return;
      var duration = getDuration();
      if (!duration) return;
      var ratio = clamp(getTime() / duration, 0, 1);
      progressEl.style.width = (ratio * 100).toFixed(2) + '%';
      if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }

    function startProgressLoop() {
      if (state.progressRaf) return;
      if (typeof window.requestAnimationFrame !== 'function') {
        updateProgress();
        return;
      }
      var tick = function () {
        updateProgress();
        saveSeek(false);
        pushPosition(false);
        state.progressRaf = window.requestAnimationFrame(tick);
      };
      state.progressRaf = window.requestAnimationFrame(tick);
    }

    function stopProgressLoop() {
      if (state.progressRaf && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(state.progressRaf);
      }
      state.progressRaf = 0;
    }

    function saveSeek(force) {
      if (!state.sound) return;
      var now = Date.now();
      if (!force && now - state.lastSeekSave < SEEK_SAVE_INTERVAL) return;
      state.lastSeekSave = now;
      var time = getTime();
      if (!isFinite(time) || time < 0) return;
      storage.set(KEYS.seek, state.currentIndex + ':' + (Math.round(time * 10) / 10));
    }

    function readSeek(index) {
      var parts = String(storage.get(KEYS.seek, '')).split(':');
      if (parts.length !== 2 || parseInt(parts[0], 10) !== index) return 0;
      var time = parseFloat(parts[1]);
      return isFinite(time) && time > 0 ? time : 0;
    }

    /* ----------------------------------------------------- Playlist cache */

    function savePlaylistCache(tracks) {
      try {
        storage.set(KEYS.tracks, JSON.stringify({ t: Date.now(), tracks: tracks }));
      } catch (error) { /* quota exceeded */ }
    }

    function readPlaylistCache() {
      try {
        var raw = storage.get(KEYS.tracks, '');
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || Date.now() - data.t > CACHE_TTL) return null;
        if (!Array.isArray(data.tracks) || !data.tracks.length) return null;
        var tracks = mapTracks(data.tracks);
        return tracks.length ? tracks : null;
      } catch (error) {
        return null;
      }
    }

    function clearPlaylistCache() {
      storage.set(KEYS.tracks, '');
    }

    /* --------------------------------------------------------- Data layer */

    function streamUrl(trackId) {
      return apiUrl('/tracks/' + encodeURIComponent(trackId) + '/stream');
    }

    function extractArtwork(track) {
      var art = track && track.artwork;
      if (!art) return '';
      return art['480x480'] || art['150x150'] || art['1000x1000'] || '';
    }

    function extractArtist(track) {
      var user = track && track.user;
      return (user && (user.name || user.handle)) || '未知歌手';
    }

    function mapTracks(items) {
      var skipped = 0;
      var tracks = [];
      items.forEach(function (item) {
        if (!item || !item.id) { skipped++; return; }
        /* A non-streamable track's /stream is a guaranteed 404. */
        if (item.is_streamable === false) { skipped++; return; }
        tracks.push({
          name: item.title || '未知曲目',
          artist: extractArtist(item),
          url: streamUrl(item.id),
          cover: extractArtwork(item),
          album: item.album_name || ''
        });
      });
      if (skipped) notify('warn', '已跳过 ' + skipped + ' 首无效曲目');
      return tracks;
    }

    function fetchPlaylist() {
      var playlistId = CONFIG.audius && CONFIG.audius.playlistId;
      if (!playlistId) {
        var noId = new Error('missing playlistId');
        noId.empty = true;
        throw noId;
      }

      return Enhance.requestJSON(
        apiUrl('/playlists/' + encodeURIComponent(playlistId) + '/tracks'),
        { timeout: PLAYLIST_TIMEOUT }
      ).then(function (payload) {
        var items = payload && payload.data;
        if (!Array.isArray(items)) throw new Error('unexpected playlist payload');
        var tracks = mapTracks(items);
        if (!tracks.length) {
          var empty = new Error('no playable track');
          empty.empty = true;
          throw empty;
        }
        return tracks;
      });
    }

    /* One retry absorbs transient network hiccups; empty results are not
     * retryable because they won't change on the next call. */
    function fetchPlaylistWithRetry() {
      return fetchPlaylist().catch(function (error) {
        if (error && error.empty) throw error;
        return new Promise(function (resolve, reject) {
          window.setTimeout(function () {
            fetchPlaylist().then(resolve, reject);
          }, RETRY_DELAY);
        });
      });
    }

    /* ------------------------------------------------------------- Engine */

    function loadEngine() {
      if (typeof window.Howl === 'function') return Promise.resolve();
      return Enhance.loadScript(
        toArray(CONFIG.cdn && CONFIG.cdn.js).filter(Boolean),
        { isReady: function () { return typeof window.Howl === 'function'; } }
      );
    }

    function stopSound() {
      stopProgressLoop();
      clearTimeout(state.successTimer);
      state.successTimer = 0;
      if (state.sound) {
        try { state.sound.unload(); } catch (error) { /* already gone */ }
        state.sound = null;
      }
    }

    /* The stream URL has no file extension; Howler would otherwise guess.
     * Audius serves MP3, so that is the safe fallback. */
    function formatFromUrl(url) {
      var match = String(url || '').split('?')[0].match(/\.(\w{2,5})$/);
      var ext = match ? match[1].toLowerCase() : '';
      return ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'webm'].indexOf(ext) >= 0
        ? [ext]
        : ['mp3'];
    }

    function currentTrack() {
      return state.playlist[state.currentIndex] || null;
    }

    function isPlaying() {
      return !!(state.sound && state.sound.playing());
    }

    function pickNext() {
      var len = state.playlist.length;
      if (len <= 1) return 0;
      if (state.order === 'random') {
        if (len === 2) return 1 - state.currentIndex;
        var n;
        do { n = Math.floor(Math.random() * len); } while (n === state.currentIndex);
        return n;
      }
      return (state.currentIndex + 1) % len;
    }

    function pickPrev() {
      var len = state.playlist.length;
      if (len <= 1) return 0;
      if (state.order === 'random') {
        if (len === 2) return 1 - state.currentIndex;
        var n;
        do { n = Math.floor(Math.random() * len); } while (n === state.currentIndex);
        return n;
      }
      return (state.currentIndex - 1 + len) % len;
    }

    function playTrack(index, autoplay) {
      if (!state.playlist.length) return;
      index = clamp(index, 0, state.playlist.length - 1);
      if (index !== state.currentIndex) {
        state.currentIndex = index;
        storage.set(KEYS.index, String(index));
      }
      setTitle(currentTrack());
      updateMediaSession();
      syncControlLabels();

      stopSound();
      var track = state.playlist[index];
      storage.set(KEYS.seek, '');

      setHint('加载中…');
      cardEl.classList.add('is-buffering');

      var sound = new Howl({
        src: [track.url],
        format: formatFromUrl(track.url),
        html5: true,
        volume: clamp(state.volume, 0, 1),
        mute: !!state.muted
      });
      state.sound = sound;
      bindSound(sound);
      if (autoplay) {
        try { sound.play(); } catch (error) { /* autoplay rejected */ }
      }
    }

    function bindSound(sound) {
      sound.on('play', function () {
        state.failed = false;
        cardEl.classList.add('is-playing');
        cardEl.classList.remove('is-buffering');
        setHint('播放中');
        syncControlLabels();
        setPlaybackState('playing');
        pushPosition(true);
        startProgressLoop();
        clearTimeout(state.successTimer);
        state.successTimer = window.setTimeout(function () {
          state.failCount = 0;
        }, FAILURE_GRACE);
        bus.emit('music:play', { index: state.currentIndex });
      });

      sound.on('pause', function () {
        cardEl.classList.remove('is-playing', 'is-buffering');
        stopProgressLoop();
        if (!state.failed) setHint('已暂停');
        syncControlLabels();
        setPlaybackState('paused');
        pushPosition(true);
        saveSeek(true);
        bus.emit('music:pause', { index: state.currentIndex });
      });

      sound.on('end', handleTrackEnd);

      sound.on('load', function () {
        cardEl.classList.remove('is-buffering');
        restoreSeek(sound);
        updateProgress();
        pushPosition(true);
      });

      sound.on('loaderror', handlePlaybackError);
      sound.on('playerror', handlePlaybackError);

      var node = sound._sounds && sound._sounds[0] && sound._sounds[0]._node;
      if (node) {
        node.addEventListener('waiting', function () {
          if (isPlaying()) {
            cardEl.classList.add('is-buffering');
            setHint('缓冲中…');
          }
        });
        node.addEventListener('playing', function () {
          cardEl.classList.remove('is-buffering');
          setHint('播放中');
        });
      }
    }

    function restoreSeek(sound) {
      var time = readSeek(state.currentIndex);
      if (!time) return;
      var duration = sound.duration();
      if (duration && time > duration - 5) return;
      try { sound.seek(time); } catch (error) { /* not seekable yet */ }
    }

    function handleTrackEnd() {
      cardEl.classList.remove('is-playing', 'is-buffering');
      stopProgressLoop();
      setHint('播放结束');
      syncControlLabels();
      setPlaybackState('paused');
      storage.set(KEYS.seek, '');

      if (state.order === 'single') {
        playTrack(state.currentIndex, true);
      } else if (state.order === 'random' || state.order === 'circulation') {
        playTrack(pickNext(), true);
      } else if (state.currentIndex < state.playlist.length - 1) {
        playTrack(state.currentIndex + 1, true);
      }
    }

    function handlePlaybackError() {
      clearTimeout(state.successTimer);
      state.successTimer = 0;
      state.failed = true;
      state.failCount++;
      cardEl.classList.remove('is-buffering', 'is-playing');
      stopProgressLoop();

      var canAdvance = state.playlist.length > 1;
      if (!canAdvance || state.failCount >= MAX_FAILURES) {
        state.failCount = 0;
        stopSound();
        setHint('播放失败，点击重试');
        setPlaybackState('paused');
        syncControlLabels();
        notify('error', '连续播放失败，请检查网络');
        bus.emit('music:error', { fatal: true });
        return;
      }

      setHint('当前曲目无法播放，正在跳过…');
      notify('warn', '当前曲目无法播放，已跳过');
      bus.emit('music:error', { fatal: false, index: state.currentIndex });
      playTrack(pickNext(), true);
    }

    function destroyEngine() {
      state.scrubbing = false;
      if (progressTrack) progressTrack.classList.remove('is-scrubbing');
      stopSound();
      state.playlist = [];
      state.initialized = false;
      cardEl.classList.remove('is-playing', 'is-buffering');
    }

    /* --------------------------------------------------------- Media Session */

    function updateMediaSession() {
      if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
      var track = currentTrack() || {};
      var artwork = [];
      if (track.cover) {
        var ext = ((track.cover.split('?')[0].match(/\.(\w+)$/) || [])[1] || 'jpeg').toLowerCase();
        if (ext === 'jpg') ext = 'jpeg';
        artwork.push({ src: track.cover, sizes: 'any', type: 'image/' + ext });
      }
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.name || DEFAULT_TITLE,
          artist: track.artist || '',
          album: track.album || '',
          artwork: artwork
        });
      } catch (error) { /* metadata unsupported */ }
    }

    function setPlaybackState(value) {
      if (!('mediaSession' in navigator)) return;
      try { navigator.mediaSession.playbackState = value; } catch (error) { /* ignored */ }
    }

    function pushPosition(force) {
      if (!('mediaSession' in navigator)) return;
      if (typeof navigator.mediaSession.setPositionState !== 'function') return;
      var now = Date.now();
      if (!force && now - state.lastPositionPush < POSITION_INTERVAL) return;
      state.lastPositionPush = now;
      if (!state.sound) return;
      var duration = getDuration();
      if (!duration) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: state.sound.rate() || 1,
          position: clamp(getTime(), 0, duration)
        });
      } catch (error) { /* ignored */ }
    }

    function bindMediaSession() {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('previoustrack', prev);
        navigator.mediaSession.setActionHandler('nexttrack', next);
        navigator.mediaSession.setActionHandler('seekto', function (details) {
          if (!state.sound) return;
          var time = Number(details && details.seekTime);
          if (!isFinite(time)) return;
          var duration = getDuration();
          if (duration) time = clamp(time, 0, duration);
          try { state.sound.seek(time); } catch (error) { /* ignored */ }
          updateProgress();
          pushPosition(true);
        });
        try {
          navigator.mediaSession.setActionHandler('seekbackward', function (details) {
            if (!state.sound) return;
            var step = (details && details.seekOffset) || 10;
            var target = clamp(getTime() - step, 0, getDuration() || Infinity);
            try { state.sound.seek(target); } catch (error) { /* ignored */ }
            updateProgress();
            pushPosition(true);
          });
          navigator.mediaSession.setActionHandler('seekforward', function (details) {
            if (!state.sound) return;
            var step = (details && details.seekOffset) || 10;
            var target = clamp(getTime() + step, 0, getDuration() || Infinity);
            try { state.sound.seek(target); } catch (error) { /* ignored */ }
            updateProgress();
            pushPosition(true);
          });
        } catch (error) { /* handler unsupported */ }
      } catch (error) { /* handler unsupported */ }
    }

    /* ------------------------------------------------------------- Lifecycle */

    function ensure() {
      if (state.initialized) return Promise.resolve(true);
      if (state.loading) return state.loading;

      setHint('正在加载…');
      setControlsEnabled(false);

      state.loading = loadEngine()
        .then(function () {
          var cached = readPlaylistCache();
          if (cached) {
            /* Refresh in the background; stale cache stays usable on failure. */
            fetchPlaylistWithRetry()
              .then(savePlaylistCache)
              .catch(function () { /* keep stale cache */ });
            return cached;
          }
          return fetchPlaylistWithRetry();
        })
        .then(function (tracks) {
          state.playlist = tracks;
          state.initialized = true;
          state.loading = null;
          setControlsEnabled(true);
          setTitle(currentTrack());
          updateMediaSession();
          setHint('已暂停');
          bus.emit('music:ready', { tracks: tracks.length });
          return true;
        })
        .catch(function (error) {
          state.loading = null;
          console.warn('[site-enhance] music unavailable:', error);
          setControlsEnabled(false);
          if (typeof window.Howl !== 'function') {
            notify('error', '播放器加载失败');
            setHint('播放器加载失败，点击重试');
          } else if (error && error.empty) {
            notify('warn', '没有可播放的歌曲');
            setHint('没有可播放的歌曲，点击重试');
          } else {
            notify('error', '播放列表加载失败');
            setHint('播放列表加载失败，点击重试');
          }
          return null;
        });

      return state.loading;
    }

    function reload() {
      if (state.loading) return state.loading;
      destroyEngine();
      state.failCount = 0;
      state.failed = false;
      storage.set(KEYS.seek, '');
      clearPlaylistCache();
      return ensure();
    }

    function show() {
      /* Block at the point of use: no card, no Howler, no Audius request. */
      if (isUnsupportedEngine()) {
        showUnsupportedNotice();
        return;
      }
      state.visible = true;
      cardEl.setAttribute('aria-hidden', 'false');
      if (card && typeof card.open === 'function') card.open();
      ensure();
    }

    function hide() {
      if (card && typeof card.close === 'function') card.close();
    }

    function toggle() {
      if (state.visible) hide();
      else show();
    }

    function bindVisibility() {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) saveSeek(true);
        else updateProgress();
      });
      window.addEventListener('pagehide', function () { saveSeek(true); });
    }

    function init() {
      setControlsEnabled(false);
      setHint('点击播放');
      if (hintEl) hintEl.setAttribute('aria-live', 'polite');

      storage.set(KEYS.order, state.order);
      storage.set(KEYS.volume, String(state.volume));
      storage.set(KEYS.muted, state.muted ? 'on' : 'off');

      syncOrderUI();
      syncVolumeUI();
      bindMediaSession();
      bindVisibility();

      if (storage.get(KEYS.visible, 'off') === 'on') show();
    }

    /* ------------------------------------------------------------- Controls */

    function play() {
      if (!state.initialized) {
        ensure().then(function (ok) { if (ok) play(); });
        return;
      }
      state.failed = false;
      state.failCount = 0;
      if (!state.sound) { playTrack(state.currentIndex, true); return; }
      if (!state.sound.playing()) {
        try { state.sound.play(); } catch (error) { /* autoplay rejected */ }
      }
    }

    function pause() {
      if (state.sound && state.sound.playing()) {
        try { state.sound.pause(); } catch (error) { /* ignored */ }
      }
    }

    function playpause() {
      if (!state.initialized) {
        if (!state.visible) show();
        ensure().then(function (ok) { if (ok) play(); });
        return;
      }
      if (isPlaying()) pause();
      else play();
    }

    function next() {
      if (!state.initialized) {
        ensure().then(function (ok) { if (ok) next(); });
        return;
      }
      state.failed = false;
      playTrack(pickNext(), true);
    }

    function prev() {
      if (!state.initialized) {
        ensure().then(function (ok) { if (ok) prev(); });
        return;
      }
      state.failed = false;
      playTrack(pickPrev(), true);
    }

    function setVolume(value, options) {
      var level = clamp(parseFloat(value), 0, 1);
      if (isNaN(level)) return;
      state.volume = level;
      if (level > 0 && state.muted) state.muted = false;
      if (state.sound) {
        try {
          state.sound.volume(level);
          state.sound.mute(state.muted);
        } catch (error) { /* ignored */ }
      }
      storage.set(KEYS.volume, String(level));
      storage.set(KEYS.muted, state.muted ? 'on' : 'off');
      syncVolumeUI();
      if (!options || !options.silent) {
        bus.emit('music:volume', { volume: level, muted: state.muted });
      }
    }

    function toggleMute() {
      state.muted = !state.muted;
      if (state.sound) {
        try { state.sound.mute(state.muted); } catch (error) { /* ignored */ }
      }
      storage.set(KEYS.muted, state.muted ? 'on' : 'off');
      syncVolumeUI();
      bus.emit('music:volume', { volume: state.volume, muted: state.muted });
    }

    function setOrder(order) {
      if (ORDERS.indexOf(order) < 0 || order === state.order) return;
      state.order = order;
      storage.set(KEYS.order, order);
      syncOrderUI();
      bus.emit('music:order', { order: order });
    }

    function cycleOrder() {
      var index = ORDERS.indexOf(state.order);
      setOrder(ORDERS[(index + 1) % ORDERS.length]);
    }

    /* ------------------------------------------------------------- Binding */

    cardEl.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (target.closest('[data-close], [data-drag-handle]')) return;

      var button = target.closest('[data-pctl]');
      if (button) {
        var action = button.getAttribute('data-pctl');
        if (action === 'toggle' || action === 'next' ||
            action === 'prev' || action === 'order') {
          event.stopPropagation();
          if (action === 'toggle') playpause();
          else if (action === 'next') next();
          else if (action === 'prev') prev();
          else cycleOrder();
        }
        return;
      }

      if (hintEl && (target === hintEl || hintEl.contains(target)) &&
          !state.playlist.length && !state.loading) {
        event.stopPropagation();
        reload();
      }
    });

    if (volumeEl) {
      if (!volumeEl.getAttribute('min')) volumeEl.setAttribute('min', '0');
      if (!volumeEl.getAttribute('max')) volumeEl.setAttribute('max', '1');
      if (!volumeEl.getAttribute('step')) volumeEl.setAttribute('step', '0.01');
      volumeEl.addEventListener('input', function () {
        setVolume(parseFloat(volumeEl.value));
      });
      volumeEl.addEventListener('click', function (event) { event.stopPropagation(); });
      volumeEl.addEventListener('pointerdown', function (event) { event.stopPropagation(); });
    }

    if (control.mute) {
      control.mute.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleMute();
      });
    }

    /* Progress scrubbing */

    if (progressTrack) {
      progressTrack.setAttribute('role', 'slider');
      progressTrack.setAttribute('tabindex', '0');
      progressTrack.setAttribute('aria-label', '播放进度');
      progressTrack.setAttribute('aria-valuemin', '0');
      progressTrack.setAttribute('aria-valuemax', '100');
      progressTrack.setAttribute('aria-valuenow', '0');

      var ratioFrom = function (event) {
        var rect = progressTrack.getBoundingClientRect();
        if (!rect.width) return 0;
        return clamp((event.clientX - rect.left) / rect.width, 0, 1);
      };
      var paintRatio = function (ratio) {
        if (progressEl) progressEl.style.width = (ratio * 100).toFixed(2) + '%';
        progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      };
      var commitRatio = function (ratio) {
        if (!state.sound) return;
        var duration = getDuration();
        if (!duration) return;
        try { state.sound.seek(ratio * duration); } catch (error) { /* not seekable */ }
        updateProgress();
      };

      if (window.PointerEvent) {
        var scrubRatio = 0;
        progressTrack.addEventListener('pointerdown', function (event) {
          if (!state.sound || !getDuration()) return;
          state.scrubbing = true;
          scrubRatio = ratioFrom(event);
          progressTrack.classList.add('is-scrubbing');
          if (progressTrack.setPointerCapture) {
            try { progressTrack.setPointerCapture(event.pointerId); }
            catch (error) { /* ignored */ }
          }
          paintRatio(scrubRatio);
          event.preventDefault();
        });
        progressTrack.addEventListener('pointermove', function (event) {
          if (!state.scrubbing) return;
          scrubRatio = ratioFrom(event);
          paintRatio(scrubRatio);
        });
        var endScrub = function () {
          if (!state.scrubbing) return;
          state.scrubbing = false;
          progressTrack.classList.remove('is-scrubbing');
          commitRatio(scrubRatio);
        };
        progressTrack.addEventListener('pointerup', endScrub);
        progressTrack.addEventListener('pointercancel', endScrub);
      } else {
        progressTrack.addEventListener('click', function (event) {
          if (!state.sound || !getDuration()) return;
          commitRatio(ratioFrom(event));
        });
      }

      progressTrack.addEventListener('keydown', function (event) {
        var duration = getDuration();
        if (!duration || !state.sound) return;
        var step = event.shiftKey ? 30 : 5;
        var current = getTime();
        if (event.key === 'ArrowRight' || event.key === 'Right') {
          event.preventDefault();
          try { state.sound.seek(clamp(current + step, 0, duration)); } catch (error) { /* ignored */ }
          updateProgress();
        } else if (event.key === 'ArrowLeft' || event.key === 'Left') {
          event.preventDefault();
          try { state.sound.seek(clamp(current - step, 0, duration)); } catch (error) { /* ignored */ }
          updateProgress();
        } else if (event.key === 'Home') {
          event.preventDefault();
          try { state.sound.seek(0); } catch (error) { /* ignored */ }
          updateProgress();
        } else if (event.key === 'End') {
          event.preventDefault();
          try { state.sound.seek(Math.max(0, duration - 1)); } catch (error) { /* ignored */ }
          updateProgress();
        }
      });
    }

    /* Card lifecycle */

    var card = Enhance.createCard({
      el: cardEl,
      key: KEYS.position,
      visibilityKey: KEYS.visible,
      onClose: function () {
        state.visible = false;
        cardEl.setAttribute('aria-hidden', 'true');
        saveSeek(true);
        if (isPlaying()) pause();
      }
    });

    return {
      init: init,
      ensure: ensure,
      reload: reload,
      show: show,
      hide: hide,
      toggle: toggle,
      isVisible: function () { return state.visible; },
      isReady: function () { return state.initialized; },
      isPlaying: isPlaying,
      play: play,
      pause: pause,
      playpause: playpause,
      next: next,
      prev: prev,
      setVolume: setVolume,
      getVolume: function () { return state.volume; },
      toggleMute: toggleMute,
      setOrder: setOrder,
      cycleOrder: cycleOrder,
      getOrder: function () { return state.order; },
      seek: function (time) {
        if (!state.sound) return;
        try { state.sound.seek(time); } catch (error) { /* ignored */ }
        updateProgress();
      },
      tracks: function () { return state.playlist.slice(); },
      currentTrack: currentTrack
    };
  })();

  Enhance.register('Music', Music);
})(window, document);
