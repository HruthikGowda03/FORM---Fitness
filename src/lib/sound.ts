/* ==========================================================================
   FORM — sound
   ---------------------------------------------------------------------------
   Synthesised, not sampled.

   There are no audio files in this project on purpose. A short water "plop"
   is three oscillator envelopes; shipping it as an MP3 or WAV would add a
   binary asset, a licensing question and a request that can 404 on a flaky
   connection, in exchange for something the Web Audio API can produce in a
   few lines and tune forever.

   The bubble is a sine whose pitch climbs roughly an octave in 70ms, run
   through a band-pass filter and cut off sharply. That pitch-then-cut shape is
   what reads as a bubble rather than a beep: a real bubble's cavity closes and
   the resonance stops abruptly.

   Browsers refuse to start audio before a user gesture, so the context is
   created lazily on the first call. Every call site is a click, so by the time
   this runs the policy is satisfied.
   ========================================================================== */

type AudioContextCtor = new () => AudioContext

let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Lazily builds the graph. Returns null when the browser has no Web Audio. */
function graph(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null

  if (!ctx) {
    ctx = new Ctor()
    master = ctx.createGain()
    // Headroom, not a volume control. Kept low enough that layering several
    // bubbles never clips.
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }

  // Autoplay policy can leave the context suspended even after a gesture.
  if (ctx.state === 'suspended') void ctx.resume()

  return ctx && master ? { ac: ctx, out: master } : null
}

/** One bubble. `detune` varies the pitch so repeats never sound mechanical. */
function bubble(ac: AudioContext, out: GainNode, at: number, detune: number): void {
  const osc = ac.createOscillator()
  const tone = ac.createGain()
  const cavity = ac.createBiquadFilter()

  // A band-pass around the mid of the sweep is what gives it the wet, liquid
  // quality. A plain sine sounds like a test tone; this sounds like water.
  cavity.type = 'bandpass'
  cavity.frequency.value = 1100
  cavity.Q.value = 0.9

  osc.type = 'sine'
  const start = 250 * detune
  osc.frequency.setValueAtTime(start, at)
  osc.frequency.exponentialRampToValueAtTime(start * 3.4, at + 0.07)

  // Fast attack, hard release. The release is the bubble.
  tone.gain.setValueAtTime(0.0001, at)
  tone.gain.exponentialRampToValueAtTime(0.3, at + 0.006)
  tone.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)

  osc.connect(cavity)
  cavity.connect(tone)
  tone.connect(out)
  osc.start(at)
  osc.stop(at + 0.18)
}

/** Stagger between simultaneous bubbles, in seconds. */
const STAGGER = 0.085
/** Above this, extra bubbles are dropped rather than turned into a machine gun. */
const MAX_VOICES = 4

/**
 * Plays one bubble per 250 ml glass logged.
 *
 * `enabled` is passed in rather than read from a store so this module stays a
 * pure side-effect helper with no dependency on app state, and so the
 * preference is checked in one obvious place by the caller.
 */
export function playWaterSound(options: { glasses?: number; enabled?: boolean } = {}): void {
  const { glasses = 1, enabled = true } = options
  if (!enabled || typeof document === 'undefined') return
  // `document.visibilityState` is a cheap guard against a stray call in a
  // background tab, where nobody can hear it anyway.
  if (document.visibilityState === 'hidden') return

  // A fractional glass (or no change at all) must be silent. Flooring here to a
  // minimum of one voice meant a 0 ml edit still bubbled.
  const voices = Math.min(MAX_VOICES, Math.floor(glasses))
  if (voices < 1) return

  const g = graph()
  if (!g) return

  const now = g.ac.currentTime
  for (let i = 0; i < voices; i += 1) {
    // ±7% so two consecutive taps are audibly different but still the same
    // sound. Not random per call: that would make it unpredictable to tune.
    const detune = 1 + (((i * 37) % 11) - 5) / 70
    bubble(g.ac, g.out, now + i * STAGGER, detune)
  }
}

/** Whether sound can play at all. Used to hide the setting when it cannot. */
export function isSoundSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
  )
}
