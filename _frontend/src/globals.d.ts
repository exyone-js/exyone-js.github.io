/*!
 * Ambient declarations for the pieces the DOM lib cannot describe:
 *   - libraries injected at runtime from a CDN (Howler, OpenCC)
 *   - vendor prefixed fullscreen APIs
 *
 * These are declarations only; they emit nothing.
 */

/* ------------------------------------------------------------------ Howler -- */

interface HowlerSound {
  play(): void;
  pause(): void;
  playing(): boolean;
  duration(): number;
  seek(): number;
  seek(time: number): HowlerSound;
  volume(): number;
  volume(level: number): HowlerSound;
  mute(): boolean;
  mute(muted: boolean): HowlerSound;
  rate(): number;
  unload(): void;
  on(event: string, handler: (...args: never[]) => void): HowlerSound;
  /* Howler internals: the single html5 <audio> node behind the instance. */
  _sounds?: Array<{ _node?: HTMLAudioElement | null }>;
}

interface HowlerOptions {
  src: string[];
  format?: string[];
  html5?: boolean;
  volume?: number;
  mute?: boolean;
}

type HowlerCtor = new (options: HowlerOptions) => HowlerSound;

/* ------------------------------------------------------------------ OpenCC -- */

interface OpenCCGlobal {
  Converter(options: { from: string; to: string }): (text: string) => string;
}

/* Both are absent from `window` until their CDN file lands, hence optional. */
declare var Howl: HowlerCtor | undefined;
declare var OpenCC: OpenCCGlobal | undefined;

interface Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}
