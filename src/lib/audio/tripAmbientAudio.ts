"use client";

/**
 * Self-contained Web Audio API Ambient Travel Music Engine ($0, zero external MP3/CORS/copyright issues).
 * Generates a warm, calm, lo-fi felt-piano & soft acoustic pad progression (Cmaj9 -> Am9 -> Fmaj9 -> G6)
 * specifically designed to underscore Trip Story Playback on /trip.
 */
export class TripAmbientAudioPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private stepTimer: number | null = null;
  private isPlaying = false;
  private isMuted = false;
  private stepIndex = 0;

  // Peaceful warm travel-vlog chord voicings (Hz): Cmaj9 -> Am9 -> Fmaj9 -> G6
  private static readonly CHORDS: ReadonlyArray<ReadonlyArray<number>> = [
    [130.81, 196.0, 246.94, 293.66, 329.63, 392.0], // Cmaj9
    [110.0, 164.81, 196.0, 246.94, 261.63, 329.63], // Am9
    [87.31, 130.81, 164.81, 196.0, 220.0, 261.63],  // Fmaj9
    [98.0, 146.83, 196.0, 246.94, 293.66, 329.63],  // G6
  ];

  // Delicate arpeggio note-index pattern within each chord (8 eighth-notes per bar)
  private static readonly ARP_PATTERN: ReadonlyArray<number> = [
    0, 2, 3, 4, 5, 4, 3, 2,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx || this.ctx.state === "closed") {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1450;
      lowpass.Q.value = 0.6;

      // Subtle warm stereo-like echo shimmer
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.36;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = "lowpass";
      delayFilter.frequency.value = 950;

      lowpass.connect(master);
      lowpass.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(feedback);
      feedback.connect(delay);
      delayFilter.connect(master);

      master.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = master;
      this.lowpass = lowpass;
      this.delayNode = delay;
      this.delayFeedback = feedback;
    }

    return this.ctx;
  }

  public start(muted = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.isMuted = muted;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(
      Math.max(0.0001, this.masterGain.gain.value),
      now
    );
    this.masterGain.gain.linearRampToValueAtTime(
      this.isMuted ? 0.0001 : 0.22,
      now + 1.1
    );

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.stepIndex = 0;

    // Trigger first chord & gentle arpeggio immediately
    this.triggerStep();
    this.stepTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.triggerStep();
    }, 430);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(
      Math.max(0.0001, this.masterGain.gain.value),
      now
    );
    this.masterGain.gain.linearRampToValueAtTime(
      muted ? 0.0001 : 0.22,
      now + 0.25
    );
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.ctx && this.masterGain && this.ctx.state !== "closed") {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(
        Math.max(0.0001, this.masterGain.gain.value),
        now
      );
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    }
  }

  public dispose(): void {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    this.masterGain = null;
    this.lowpass = null;
    this.delayNode = null;
    this.delayFeedback = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {});
    }
  }

  private triggerStep(): void {
    if (!this.ctx || !this.lowpass || this.ctx.state !== "running") return;

    const barIndex =
      Math.floor(this.stepIndex / TripAmbientAudioPlayer.ARP_PATTERN.length) %
      TripAmbientAudioPlayer.CHORDS.length;
    const beatInBar =
      this.stepIndex % TripAmbientAudioPlayer.ARP_PATTERN.length;
    const chord = TripAmbientAudioPlayer.CHORDS[barIndex];

    // On downbeat of each bar, bloom a soft warm pad triad
    if (beatInBar === 0) {
      this.playPadTone(chord[0], 3.3, 0.16);
      this.playPadTone(chord[1], 3.1, 0.09);
      this.playPadTone(chord[2], 3.0, 0.075);
    }

    // Soft felt-piano / kalimba plucky note
    const noteIdx = TripAmbientAudioPlayer.ARP_PATTERN[beatInBar];
    const freq = chord[noteIdx % chord.length];
    // Octave-up sparkle on select beats for gentle emotional lift
    const liftedFreq = beatInBar === 4 || beatInBar === 7 ? freq * 2 : freq;
    this.playPluckTone(liftedFreq, beatInBar === 0 ? 0.13 : 0.095);

    this.stepIndex += 1;
  }

  private playPadTone(freq: number, durationSec: number, peakGain: number): void {
    if (!this.ctx || !this.lowpass) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.lowpass);

    osc.start(now);
    osc.stop(now + durationSec + 0.06);
  }

  private playPluckTone(freq: number, peakGain: number): void {
    if (!this.ctx || !this.lowpass) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    osc.connect(gain);
    gain.connect(this.lowpass);

    osc.start(now);
    osc.stop(now + 1.42);
  }
}
