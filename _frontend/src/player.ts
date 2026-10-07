/*!
 * SiteEnhance · music card (Howler edition)
 *
 * Playlist is fetched from the Audius API; each track's /stream endpoint
 * 302-redirects to the audio CDN. Howler runs in html5 mode so the redirect
 * is followed natively.
 */
import { Enhance, asElement } from './core';
import { createCard } from './card';
import type { CardApi, MusicModule, PlayerOrder, Track } from './types';

const CONFIG = Enhance.CONFIG.player;
const storage = Enhance.storage;
const Toast = Enhance.Toast;
const bus = Enhance.bus;
const clamp = Enhance.clamp;

/* ------------------------------------------------------------- Keys / tunables */

const KEYS = {
  volume: 'site-enhance:player:volume',
  muted: 'site-enhance:player:muted',
  order: 'site-enhance:player:order',
  visible: 'site-enhance:player:visible',
  index: 'site-enhance:player:index',
  position: 'site-enhance:player:position',
  seek: 'site-enhance:player:seek',
  tracks: 'site-enhance:player:tracks'
};

const PLAYLIST_TIMEOUT = 8000;
const RETRY_DELAY = 3000;
const MAX_FAILURES = 3;
const FAILURE_GRACE = 2000;
const SEEK_SAVE_INTERVAL = 4000;
const POSITION_INTERVAL = 5000;
const CACHE_TTL = 86400000;

const DEFAULT_TITLE = '背景音乐';
const API_BASE = 'https://api.audius.co/v1';
/* Audius rejects unidentified callers. */
const APP_NAME = 'exyone-blog';

const AUDIO_FORMATS = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'webm'];

function apiUrl(path: string): string {
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  return API_BASE + path + sep + 'app_name=' + encodeURIComponent(APP_NAME);
}

function notify(level: 'success' | 'warn' | 'error', message: string): void {
  Toast[level](message);
}

/* ------------------------------------------- Unsupported engines (UA-based) */

/* Playback only works on Chromium; Gecko/WebKit fail at the media output /
 * ORB layer. Feature detection cannot capture this, so sniff the UA and
 * warn on every open attempt instead of pretending the player works. */
function isUnsupportedEngine(): boolean {
  const ua = window.navigator.userAgent || '';
  if (/firefox/i.test(ua)) return true;
  /* Every Chromium UA also claims "Safari"; exclude it explicitly. */
  return /safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua);
}

/* Tied to a user action (opening the card), so show immediately and let
 * the standard toast lifetime dismiss it. Not persisted: a fresh attempt
 * should always get feedback. */
function showUnsupportedNotice(): void {
  Toast.warn('Firefox / Safari 听不了背景音乐～ 换 Chrome 试试吧。', 6000);
}

/* Play modes */
const ORDERS: PlayerOrder[] = ['list', 'random', 'single', 'circulation'];
const ORDER_LABEL: Record<PlayerOrder, string> = {
  list: '顺序播放', random: '随机播放',
  single: '单曲循环', circulation: '列表循环'
};
const ORDER_ICON: Record<PlayerOrder, string> = {
  list: 'fa-list-ul', random: 'fa-random',
  single: 'fa-repeat', circulation: 'fa-sync'
};

/* Audius track shape: only the fields this module reads. */
interface AudiusTrack {
  id?: string;
  title?: string;
  is_streamable?: boolean;
  album_name?: string;
  artwork?: Record<string, string>;
  user?: { name?: string; handle?: string };
}

/* Marks "no tracks" as non-retryable: a second call would return the same. */
function emptyError(message: string): Error {
  const error = new Error(message) as Error & { empty?: boolean };
  error.empty = true;
  return error;
}

function isEmptyError(error: unknown): boolean {
  return !!error && (error as { empty?: boolean }).empty === true;
}

const Music: MusicModule | null = (function (): MusicModule | null {
  if (CONFIG.enabled === false) return null;

  const card = Enhance.$('#player-card');
  if (!card) return null;
  /* Aliased so the nested functions below keep a non-nullable reference. */
  const cardEl = card;

  const titleEl = Enhance.$('#vplayer-title');
  const hintEl = Enhance.$('#vplayer-hint');
  const progressEl = Enhance.$('#vplayer-progress');
  const progressTrack = cardEl.querySelector<HTMLElement>('.player-progress');

  const control = {
    prev: cardEl.querySelector<HTMLButtonElement>('[data-pctl="prev"]'),
    toggle: cardEl.querySelector<HTMLButtonElement>('[data-pctl="toggle"]'),
    next: cardEl.querySelector<HTMLButtonElement>('[data-pctl="next"]'),
    order: cardEl.querySelector<HTMLButtonElement>('[data-pctl="order"]'),
    mute: cardEl.querySelector<HTMLButtonElement>('[data-pctl="mute"]')
  };
  const volumeEl = cardEl.querySelector<HTMLInputElement>('[data-pctl="volume"]');

  /* ------------------------------------------------------------- State */

  const savedVolume = parseFloat(storage.get(KEYS.volume, ''));
  const fallbackVolume = typeof CONFIG.volume === 'number' ? CONFIG.volume : 0.7;
  let savedOrder = String(storage.get(KEYS.order, CONFIG.order || 'random')) as PlayerOrder;
  if (!ORDERS.includes(savedOrder)) savedOrder = 'random';

  const state = {
    initialized: false,
    loading: null as Promise<boolean | null> | null,
    sound: null as HowlerSound | null,
    playlist: [] as Track[],
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

  /* Assigned further down, once the card markup has been wired up. */
  let toolCard: CardApi | null = null;

  /* ---------------------------------------------------------------- UI */

  function setHint(text: string): void {
    if (hintEl && hintEl.textContent !== text) hintEl.textContent = text;
  }

  function setTitle(track: Track | null): void {
    if (!titleEl) return;
    let text = DEFAULT_TITLE;
    if (track && track.name) {
      text = DEFAULT_TITLE + ' · ' + track.name + ' - ' + (track.artist || '未知歌手');
    }
    if (titleEl.textContent !== text) titleEl.textContent = text;
    titleEl.setAttribute('title', text);
  }

  function setControlsEnabled(enabled: boolean): void {
    (Object.keys(control) as Array<keyof typeof control>).forEach(function (key) {
      const button = control[key];
      if (button) button.disabled = !enabled;
    });
    if (volumeEl) volumeEl.disabled = !enabled;
  }

  function syncControlLabels(): void {
    const playing = isPlaying();
    if (control.toggle) {
      control.toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
      control.toggle.setAttribute('title', playing ? '暂停' : '播放');
      control.toggle.setAttribute('aria-pressed', String(playing));
      const icon = control.toggle.querySelector('i');
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

  function syncOrderUI(): void {
    if (!control.order) return;
    const label = ORDER_LABEL[state.order] || '播放模式';
    control.order.setAttribute('data-order', state.order);
    control.order.setAttribute('aria-label', label);
    control.order.setAttribute('title', label);
    const icon = control.order.querySelector('i');
    if (icon) icon.className = 'fas fa-' + (ORDER_ICON[state.order] || 'fa-random');
  }

  function syncVolumeUI(): void {
    const muted = state.muted || state.volume === 0;
    if (volumeEl) {
      const value = state.muted ? 0 : state.volume;
      if (parseFloat(volumeEl.value) !== value) volumeEl.value = String(value);
      volumeEl.setAttribute('aria-label', '音量');
      volumeEl.setAttribute('aria-valuetext', Math.round(value * 100) + '%');
    }
    if (control.mute) {
      control.mute.setAttribute('aria-label', muted ? '取消静音' : '静音');
      control.mute.setAttribute('title', muted ? '取消静音' : '静音');
      control.mute.setAttribute('aria-pressed', String(muted));
      const icon = control.mute.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-volume-' +
          (muted ? 'mute' : (state.volume < 0.5 ? 'down' : 'up'));
      }
    }
  }

  /* ------------------------------------------------------------- Timing */

  function getDuration(): number {
    const sound = state.sound;
    if (!sound) return 0;
    const duration = sound.duration();
    return duration && isFinite(duration) && duration > 0 ? duration : 0;
  }

  function getTime(): number {
    const sound = state.sound;
    if (!sound) return 0;
    const time = sound.seek();
    return typeof time === 'number' && isFinite(time) && time > 0 ? time : 0;
  }

  function updateProgress(): void {
    if (!progressEl || state.scrubbing) return;
    const duration = getDuration();
    if (!duration) return;
    const ratio = clamp(getTime() / duration, 0, 1);
    progressEl.style.width = (ratio * 100).toFixed(2) + '%';
    if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  }

  function startProgressLoop(): void {
    if (state.progressRaf) return;
    if (typeof window.requestAnimationFrame !== 'function') {
      updateProgress();
      return;
    }
    const tick = function (): void {
      updateProgress();
      saveSeek(false);
      pushPosition(false);
      state.progressRaf = window.requestAnimationFrame(tick);
    };
    state.progressRaf = window.requestAnimationFrame(tick);
  }

  function stopProgressLoop(): void {
    if (state.progressRaf && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(state.progressRaf);
    }
    state.progressRaf = 0;
  }

  function saveSeek(force: boolean): void {
    if (!state.sound) return;
    const now = Date.now();
    if (!force && now - state.lastSeekSave < SEEK_SAVE_INTERVAL) return;
    state.lastSeekSave = now;
    const time = getTime();
    if (!isFinite(time) || time < 0) return;
    storage.set(KEYS.seek, state.currentIndex + ':' + (Math.round(time * 10) / 10));
  }

  function readSeek(index: number): number {
    const parts = String(storage.get(KEYS.seek, '')).split(':');
    if (parts.length !== 2 || parseInt(parts[0], 10) !== index) return 0;
    const time = parseFloat(parts[1]);
    return isFinite(time) && time > 0 ? time : 0;
  }

  /* ----------------------------------------------------- Playlist cache */

  function savePlaylistCache(tracks: Track[]): void {
    try {
      storage.set(KEYS.tracks, JSON.stringify({ t: Date.now(), tracks: tracks }));
    } catch (error) { /* quota exceeded */ }
  }

  function readPlaylistCache(): Track[] | null {
    try {
      const raw = storage.get(KEYS.tracks, '');
      if (!raw) return null;
      const data = JSON.parse(raw) as { t?: number; tracks?: unknown };
      if (!data || Date.now() - Number(data.t || 0) > CACHE_TTL) return null;
      if (!Array.isArray(data.tracks) || !data.tracks.length) return null;
      const tracks = mapTracks(data.tracks as AudiusTrack[]);
      return tracks.length ? tracks : null;
    } catch (error) {
      return null;
    }
  }

  function clearPlaylistCache(): void {
    storage.set(KEYS.tracks, '');
  }

  /* --------------------------------------------------------- Data layer */

  function streamUrl(trackId: string): string {
    return apiUrl('/tracks/' + encodeURIComponent(trackId) + '/stream');
  }

  function extractArtwork(track: AudiusTrack): string {
    const art = track && track.artwork;
    if (!art) return '';
    return art['480x480'] || art['150x150'] || art['1000x1000'] || '';
  }

  function extractArtist(track: AudiusTrack): string {
    const user = track && track.user;
    return (user && (user.name || user.handle)) || '未知歌手';
  }

  function mapTracks(items: AudiusTrack[]): Track[] {
    let skipped = 0;
    const tracks: Track[] = [];
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

  function fetchPlaylist(): Promise<Track[]> {
    const playlistId = CONFIG.audius && CONFIG.audius.playlistId;
    if (!playlistId) throw emptyError('missing playlistId');

    return Enhance.requestJSON(
      apiUrl('/playlists/' + encodeURIComponent(playlistId) + '/tracks'),
      { timeout: PLAYLIST_TIMEOUT }
    ).then(function (payload) {
      const items = (payload as { data?: unknown } | null)?.data;
      if (!Array.isArray(items)) throw new Error('unexpected playlist payload');
      const tracks = mapTracks(items as AudiusTrack[]);
      if (!tracks.length) throw emptyError('no playable track');
      return tracks;
    });
  }

  /* One retry absorbs transient network hiccups; empty results are not
   * retryable because they won't change on the next call. */
  function fetchPlaylistWithRetry(): Promise<Track[]> {
    return fetchPlaylist().catch(function (error) {
      if (isEmptyError(error)) return Promise.reject(error);
      return new Promise<Track[]>(function (resolve, reject) {
        window.setTimeout(function () {
          fetchPlaylist().then(resolve, reject);
        }, RETRY_DELAY);
      });
    });
  }

  /* ------------------------------------------------------------- Engine */

  function loadEngine(): Promise<void> {
    if (typeof window.Howl === 'function') return Promise.resolve();
    return Enhance.loadScript(Enhance.toArray(CONFIG.cdn && CONFIG.cdn.js).filter(Boolean), {
      isReady: function () { return typeof window.Howl === 'function'; }
    }).then(function () { /* engine ready */ });
  }

  function stopSound(): void {
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
  function formatFromUrl(url: string): string[] {
    const match = String(url || '').split('?')[0].match(/\.(\w{2,5})$/);
    const ext = match ? match[1].toLowerCase() : '';
    return AUDIO_FORMATS.indexOf(ext) >= 0 ? [ext] : ['mp3'];
  }

  function createSound(track: Track): HowlerSound {
    const Ctor = window.Howl as HowlerCtor;
    return new Ctor({
      src: [track.url],
      format: formatFromUrl(track.url),
      html5: true,
      volume: clamp(state.volume, 0, 1),
      mute: !!state.muted
    });
  }

  function currentTrack(): Track | null {
    return state.playlist[state.currentIndex] || null;
  }

  function isPlaying(): boolean {
    return !!(state.sound && state.sound.playing());
  }

  function pickNext(): number {
    const len = state.playlist.length;
    if (len <= 1) return 0;
    if (state.order === 'random') {
      if (len === 2) return 1 - state.currentIndex;
      let n: number;
      do { n = Math.floor(Math.random() * len); } while (n === state.currentIndex);
      return n;
    }
    return (state.currentIndex + 1) % len;
  }

  function pickPrev(): number {
    const len = state.playlist.length;
    if (len <= 1) return 0;
    if (state.order === 'random') {
      if (len === 2) return 1 - state.currentIndex;
      let n: number;
      do { n = Math.floor(Math.random() * len); } while (n === state.currentIndex);
      return n;
    }
    return (state.currentIndex - 1 + len) % len;
  }

  function playTrack(index: number, autoplay: boolean): void {
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
    const track = state.playlist[index];
    storage.set(KEYS.seek, '');

    setHint('加载中…');
    cardEl.classList.add('is-buffering');

    const sound = createSound(track);
    state.sound = sound;
    bindSound(sound);
    if (autoplay) {
      try { sound.play(); } catch (error) { /* autoplay rejected */ }
    }
  }

  function bindSound(sound: HowlerSound): void {
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

    const node = sound._sounds && sound._sounds[0] && sound._sounds[0]._node;
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

  function restoreSeek(sound: HowlerSound): void {
    const time = readSeek(state.currentIndex);
    if (!time) return;
    const duration = sound.duration();
    if (duration && time > duration - 5) return;
    try { sound.seek(time); } catch (error) { /* not seekable yet */ }
  }

  function handleTrackEnd(): void {
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

  function handlePlaybackError(): void {
    clearTimeout(state.successTimer);
    state.successTimer = 0;
    state.failed = true;
    state.failCount++;
    cardEl.classList.remove('is-buffering', 'is-playing');
    stopProgressLoop();

    const canAdvance = state.playlist.length > 1;
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

  function destroyEngine(): void {
    state.scrubbing = false;
    if (progressTrack) progressTrack.classList.remove('is-scrubbing');
    stopSound();
    state.playlist = [];
    state.initialized = false;
    cardEl.classList.remove('is-playing', 'is-buffering');
  }

  /* --------------------------------------------------------- Media Session */

  function updateMediaSession(): void {
    if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
    const track = currentTrack() || ({} as Partial<Track>);
    const artwork: MediaImage[] = [];
    if (track.cover) {
      const ext = ((track.cover.split('?')[0].match(/\.(\w+)$/) || [])[1] || 'jpeg').toLowerCase();
      artwork.push({
        src: track.cover,
        sizes: 'any',
        type: 'image/' + (ext === 'jpg' ? 'jpeg' : ext)
      });
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

  function setPlaybackState(value: 'playing' | 'paused'): void {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = value; } catch (error) { /* ignored */ }
  }

  function pushPosition(force: boolean): void {
    if (!('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;
    const now = Date.now();
    if (!force && now - state.lastPositionPush < POSITION_INTERVAL) return;
    state.lastPositionPush = now;
    if (!state.sound) return;
    const duration = getDuration();
    if (!duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: state.sound.rate() || 1,
        position: clamp(getTime(), 0, duration)
      });
    } catch (error) { /* ignored */ }
  }

  function bindMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('seekto', function (details) {
        if (!state.sound) return;
        const time = Number(details && details.seekTime);
        if (!isFinite(time)) return;
        const duration = getDuration();
        const target = duration ? clamp(time, 0, duration) : time;
        try { state.sound.seek(target); } catch (error) { /* ignored */ }
        updateProgress();
        pushPosition(true);
      });
      try {
        navigator.mediaSession.setActionHandler('seekbackward', function (details) {
          if (!state.sound) return;
          const step = (details && details.seekOffset) || 10;
          const target = clamp(getTime() - step, 0, getDuration() || Infinity);
          try { state.sound.seek(target); } catch (error) { /* ignored */ }
          updateProgress();
          pushPosition(true);
        });
        navigator.mediaSession.setActionHandler('seekforward', function (details) {
          if (!state.sound) return;
          const step = (details && details.seekOffset) || 10;
          const target = clamp(getTime() + step, 0, getDuration() || Infinity);
          try { state.sound.seek(target); } catch (error) { /* ignored */ }
          updateProgress();
          pushPosition(true);
        });
      } catch (error) { /* handler unsupported */ }
    } catch (error) { /* handler unsupported */ }
  }

  /* ------------------------------------------------------------- Lifecycle */

  function ensure(): Promise<boolean | null> {
    if (state.initialized) return Promise.resolve(true);
    if (state.loading) return state.loading;

    setHint('正在加载…');
    setControlsEnabled(false);

    const job: Promise<boolean | null> = loadEngine()
      .then(function () {
        const cached = readPlaylistCache();
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
        } else if (isEmptyError(error)) {
          notify('warn', '没有可播放的歌曲');
          setHint('没有可播放的歌曲，点击重试');
        } else {
          notify('error', '播放列表加载失败');
          setHint('播放列表加载失败，点击重试');
        }
        return null;
      });

    state.loading = job;
    return job;
  }

  function reload(): Promise<boolean | null> {
    if (state.loading) return state.loading;
    destroyEngine();
    state.failCount = 0;
    state.failed = false;
    storage.set(KEYS.seek, '');
    clearPlaylistCache();
    return ensure();
  }

  function show(): void {
    /* Block at the point of use: no card, no Howler, no Audius request. */
    if (isUnsupportedEngine()) {
      showUnsupportedNotice();
      return;
    }
    state.visible = true;
    cardEl.setAttribute('aria-hidden', 'false');
    if (toolCard && typeof toolCard.open === 'function') toolCard.open();
    ensure();
  }

  function hide(): void {
    if (toolCard && typeof toolCard.close === 'function') toolCard.close();
  }

  function toggle(): void {
    if (state.visible) hide();
    else show();
  }

  function bindVisibility(): void {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) saveSeek(true);
      else updateProgress();
    });
    window.addEventListener('pagehide', function () { saveSeek(true); });
  }

  function init(): void {
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

  function play(): void {
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

  function pause(): void {
    if (state.sound && state.sound.playing()) {
      try { state.sound.pause(); } catch (error) { /* ignored */ }
    }
  }

  function playpause(): void {
    if (!state.initialized) {
      if (!state.visible) show();
      ensure().then(function (ok) { if (ok) play(); });
      return;
    }
    if (isPlaying()) pause();
    else play();
  }

  function next(): void {
    if (!state.initialized) {
      ensure().then(function (ok) { if (ok) next(); });
      return;
    }
    state.failed = false;
    playTrack(pickNext(), true);
  }

  function prev(): void {
    if (!state.initialized) {
      ensure().then(function (ok) { if (ok) prev(); });
      return;
    }
    state.failed = false;
    playTrack(pickPrev(), true);
  }

  function setVolume(value: number, options?: { silent?: boolean }): void {
    const level = clamp(parseFloat(String(value)), 0, 1);
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

  function toggleMute(): void {
    state.muted = !state.muted;
    if (state.sound) {
      try { state.sound.mute(state.muted); } catch (error) { /* ignored */ }
    }
    storage.set(KEYS.muted, state.muted ? 'on' : 'off');
    syncVolumeUI();
    bus.emit('music:volume', { volume: state.volume, muted: state.muted });
  }

  function setOrder(order: PlayerOrder): void {
    if (!ORDERS.includes(order) || order === state.order) return;
    state.order = order;
    storage.set(KEYS.order, order);
    syncOrderUI();
    bus.emit('music:order', { order: order });
  }

  function cycleOrder(): void {
    const index = ORDERS.indexOf(state.order);
    setOrder(ORDERS[(index + 1) % ORDERS.length]);
  }

  /* ------------------------------------------------------------- Binding */

  cardEl.addEventListener('click', function (event: MouseEvent) {
    const target = asElement(event.target);
    if (!target) return;
    if (target.closest('[data-close], [data-drag-handle]')) return;

    const button = target.closest<HTMLElement>('[data-pctl]');
    if (button) {
      const action = button.getAttribute('data-pctl');
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
    volumeEl.addEventListener('click', function (event: MouseEvent) { event.stopPropagation(); });
    volumeEl.addEventListener('pointerdown', function (event: PointerEvent) { event.stopPropagation(); });
  }

  if (control.mute) {
    control.mute.addEventListener('click', function (event: MouseEvent) {
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

    const ratioFrom = function (event: MouseEvent): number {
      const rect = progressTrack.getBoundingClientRect();
      if (!rect.width) return 0;
      return clamp((event.clientX - rect.left) / rect.width, 0, 1);
    };
    const paintRatio = function (ratio: number): void {
      if (progressEl) progressEl.style.width = (ratio * 100).toFixed(2) + '%';
      progressTrack.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    };
    const commitRatio = function (ratio: number): void {
      if (!state.sound) return;
      const duration = getDuration();
      if (!duration) return;
      try { state.sound.seek(ratio * duration); } catch (error) { /* not seekable */ }
      updateProgress();
    };

    if (window.PointerEvent) {
      let scrubRatio = 0;
      progressTrack.addEventListener('pointerdown', function (event: PointerEvent) {
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
      progressTrack.addEventListener('pointermove', function (event: PointerEvent) {
        if (!state.scrubbing) return;
        scrubRatio = ratioFrom(event);
        paintRatio(scrubRatio);
      });
      const endScrub = function (): void {
        if (!state.scrubbing) return;
        state.scrubbing = false;
        progressTrack.classList.remove('is-scrubbing');
        commitRatio(scrubRatio);
      };
      progressTrack.addEventListener('pointerup', endScrub);
      progressTrack.addEventListener('pointercancel', endScrub);
    } else {
      progressTrack.addEventListener('click', function (event: MouseEvent) {
        if (!state.sound || !getDuration()) return;
        commitRatio(ratioFrom(event));
      });
    }

    progressTrack.addEventListener('keydown', function (event: KeyboardEvent) {
      const duration = getDuration();
      if (!duration || !state.sound) return;
      const step = event.shiftKey ? 30 : 5;
      const current = getTime();
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

  toolCard = createCard({
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
    seek: function (time: number) {
      if (!state.sound) return;
      try { state.sound.seek(time); } catch (error) { /* ignored */ }
      updateProgress();
    },
    tracks: function () { return state.playlist.slice(); },
    currentTrack: currentTrack
  };
})();

Enhance.register('Music', Music);
