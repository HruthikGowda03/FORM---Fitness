/* ==========================================================================
   Water sound
   ---------------------------------------------------------------------------
   The bubble is synthesised, so there is no audio file to assert against — but
   the synth is still code that can be wrong, and a Web Audio call with a bad
   parameter throws at runtime in the browser, long after `tsc` has passed.

   These tests stub the AudioContext and check the graph is built correctly:
   nodes created, envelopes scheduled forward in time, frequencies positive
   (an exponential ramp to 0 or a negative value throws), and nothing played
   when the preference is off.
   ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* -------------------------------------------------------------------------- */

class FakeParam {
  value: number
  calls: { method: string; args: unknown[] }[] = []

  constructor(value: number) {
    this.value = value
  }

  setValueAtTime(v: number, t: number) {
    this.calls.push({ method: 'setValueAtTime', args: [v, t] })
    this.value = v
    return this
  }

  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push({ method: 'exponentialRampToValueAtTime', args: [v, t] })
    this.value = v
    return this
  }

  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push({ method: 'linearRampToValueAtTime', args: [v, t] })
    this.value = v
    return this
  }
}

class FakeNode {
  connections: unknown[] = []
  connect(to: unknown) {
    this.connections.push(to)
    return to
  }
  disconnect() {
    this.connections = []
  }
}

class FakeOscillator extends FakeNode {
  frequency = new FakeParam(440)
  type = 'sine'
  started: [number, number] | null = null
  stopped: [number, number] | null = null
  start(t = 0) {
    this.started = [t, this.frequency.value]
  }
  stop(t = 0) {
    this.stopped = [t, this.frequency.value]
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1)
}

class FakeFilter extends FakeNode {
  frequency = new FakeParam(1000)
  Q = new FakeParam(1)
  type = 'lowpass'
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  currentTime = 10
  state: AudioContextState = 'running'
  destination = new FakeNode()
  created: { oscillators: FakeOscillator[]; gains: FakeGain[]; filters: FakeFilter[] } = {
    oscillators: [],
    gains: [],
    filters: [],
  }

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createGain() {
    const n = new FakeGain()
    this.created.gains.push(n)
    return n
  }

  createOscillator() {
    const n = new FakeOscillator()
    this.created.oscillators.push(n)
    return n
  }

  createBiquadFilter() {
    const n = new FakeFilter()
    this.created.filters.push(n)
    return n
  }

  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
}

/* -------------------------------------------------------------------------- */

beforeEach(() => {
  FakeAudioContext.instances = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  // jsdom reports 'visible' by default; make the guard deterministic.
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  // The module caches its context, so each test needs a fresh module instance.
  vi.resetModules()
})

async function loadSound() {
  return import('@/lib/sound')
}

const last = () => {
  const ctx = FakeAudioContext.instances.at(-1)
  if (!ctx) throw new Error('no AudioContext was created')
  return ctx
}

describe('water sound', () => {
  it('builds an oscillator, a filter and two gain stages per bubble', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound()

    const ctx = last()
    expect(ctx.created.oscillators).toHaveLength(1)
    expect(ctx.created.filters).toHaveLength(1)
    // The voice gain plus the one master gain created when the graph is built.
    expect(ctx.created.gains).toHaveLength(2)

    const [osc] = ctx.created.oscillators
    const [filter] = ctx.created.filters
    expect(osc.type).toBe('sine')
    expect(filter.type).toBe('bandpass')
    // osc → filter → gain → master, so three connect calls per voice.
    expect(osc.connections).toHaveLength(1)
    expect(osc.connections[0]).toBe(filter)
  })

  it('schedules the pitch sweep and envelope forward in time', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound()

    const ctx = last()
    const [osc] = ctx.created.oscillators
    // The master gain is created when the graph is built, so the per-voice gain
    // is the last one — index 0 is the master, whose envelope is never touched.
    const voiceGain = ctx.created.gains.at(-1)!

    const setAt = osc.frequency.calls[0]
    const rampTo = osc.frequency.calls[1]
    const startFreq = setAt.args[0] as number
    const startTime = setAt.args[1] as number
    const endFreq = rampTo.args[0] as number
    const endTime = rampTo.args[1] as number

    expect(setAt.method).toBe('setValueAtTime')
    expect(rampTo.method).toBe('exponentialRampToValueAtTime')
    // An exponential ramp must end after it starts, or the ramp is invalid.
    expect(endTime).toBeGreaterThan(startTime)
    // …and must end above the start, or `exponentialRampToValueAtTime` throws
    // on a non-positive target. This is the one that bites in production.
    expect(endFreq).toBeGreaterThan(0)
    expect(startFreq).toBeGreaterThan(0)

    const attack = voiceGain.gain.calls[0]
    const release = voiceGain.gain.calls[1]
    expect(attack.args[0] as number).toBeGreaterThan(0)
    expect(release.args[0] as number).toBeGreaterThan(0)
    expect(release.args[1] as number).toBeGreaterThan(attack.args[1] as number)
  })

  it('starts and stops each voice', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound()

    const [osc] = last().created.oscillators
    expect(osc.started).not.toBeNull()
    expect(osc.stopped).not.toBeNull()
    // A voice that never stops leaks a node for the life of the page.
    expect(osc.stopped![0]).toBeGreaterThan(osc.started![0])
  })

  it('plays one bubble per glass, staggered', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound({ glasses: 3 })

    const ctx = last()
    expect(ctx.created.oscillators).toHaveLength(3)

    // Staggered, not simultaneous, so it reads as three drops in a row.
    const starts = ctx.created.oscillators.map((o) => o.started![0])
    expect(new Set(starts).size).toBe(3)
    const sorted = [...starts].sort((a, b) => a - b)
    expect(sorted[1]).toBeGreaterThan(sorted[0])
    expect(sorted[2]).toBeGreaterThan(sorted[1])
  })

  it('varies pitch between bubbles so repeats do not sound mechanical', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound({ glasses: 4 })

    const starts = last().created.oscillators.map((o) => o.frequency.calls[0].args[0] as number)
    expect(new Set(starts).size).toBeGreaterThan(1)
  })

  it('caps simultaneous voices so a large amount is not a machine gun', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound({ glasses: 40 })
    expect(last().created.oscillators.length).toBeLessThanOrEqual(4)
  })

  it('plays nothing when sound is disabled', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound({ glasses: 2, enabled: false })
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('plays nothing for a zero or negative amount', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound({ glasses: 0 })
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('plays nothing for a partial glass', async () => {
    const { playWaterSound } = await loadSound()
    // A half glass is not a whole drop, and rounding it up to one was a bug.
    playWaterSound({ glasses: 0.4 })
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('stays silent in a hidden tab', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const { playWaterSound } = await loadSound()
    playWaterSound()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('reuses one context across calls', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound()
    playWaterSound()
    playWaterSound()
    // Three taps must not open three audio contexts — that exhausts the
    // browser's per-page limit and hard-fails on some mobile browsers.
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(last().created.oscillators).toHaveLength(3)
  })

  it('resumes a context suspended by the autoplay policy', async () => {
    const { playWaterSound } = await loadSound()
    playWaterSound()
    last().state = 'suspended'
    playWaterSound()
    expect(last().state).toBe('running')
  })

  it('reports support', async () => {
    const { isSoundSupported } = await loadSound()
    expect(isSoundSupported()).toBe(true)
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    expect(isSoundSupported()).toBe(false)
  })

  it('does not throw when the browser has no Web Audio at all', async () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    const { playWaterSound } = await loadSound()
    expect(() => playWaterSound()).not.toThrow()
  })
})
