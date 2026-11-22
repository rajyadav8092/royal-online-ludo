class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private vibrationEnabled = true;
  private sfxVolume = 0.75;
  private musicVolume = 0.35;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private masterMusicGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public configure(opts: {
    sfxEnabled?: boolean;
    musicEnabled?: boolean;
    vibrationEnabled?: boolean;
    sfxVolume?: number;
    musicVolume?: number;
  }) {
    if (opts.sfxEnabled !== undefined) this.sfxEnabled = opts.sfxEnabled;
    if (opts.vibrationEnabled !== undefined) this.vibrationEnabled = opts.vibrationEnabled;
    if (opts.sfxVolume !== undefined) this.sfxVolume = Math.max(0, Math.min(1, opts.sfxVolume));
    if (opts.musicVolume !== undefined) {
      this.musicVolume = Math.max(0, Math.min(1, opts.musicVolume));
      if (this.masterMusicGain && this.ctx) {
        this.masterMusicGain.gain.setTargetAtTime(this.musicVolume * 0.28, this.ctx.currentTime, 0.08);
      }
    }
    if (opts.musicEnabled !== undefined) {
      this.musicEnabled = opts.musicEnabled;
      if (this.musicEnabled) {
        this.startMusicLoop();
      } else {
        this.stopMusicLoop();
      }
    }
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.045);

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playEmojiPop() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);
    gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Distinct tactile vibration sound + mobile haptic pulse when clicking a token (goti)
  public playTokenVibrate() {
    if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([32, 18, 24]);
      } catch {
        // Ignore if unsupported
      }
    }
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Low resonant tactile buzz modulated at ~38Hz
    const carrier = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(118, now);
    carrier.frequency.exponentialRampToValueAtTime(76, now + 0.14);

    // Low-pass filter to make it feel like physical tabletop vibration rather than harsh buzz
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(38, now);
    lfoGain.gain.setValueAtTime(0.14 * this.sfxVolume, now);

    mainGain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    lfo.connect(lfoGain);
    lfoGain.connect(mainGain.gain);
    carrier.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + 0.16);
    lfo.stop(now + 0.16);

    // Crisp ceramic tap transient
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(520, now);
    tap.frequency.exponentialRampToValueAtTime(180, now + 0.04);
    tapGain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    tap.connect(tapGain);
    tapGain.connect(ctx.destination);
    tap.start(now);
    tap.stop(now + 0.05);
  }

  public playDiceRoll() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const rattleOffsets = [0, 0.07, 0.14, 0.22, 0.31, 0.41];
    rattleOffsets.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 240 + (idx % 3) * 75 + Math.random() * 40;
      osc.frequency.setValueAtTime(baseFreq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(110, now + offset + 0.035);

      gain.gain.setValueAtTime(0.14 * this.sfxVolume, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.045);
    });
  }

  public playDiceLand(value: number) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    if (value === 6) {
      // Bright lucky 6 sparkle
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const chime = ctx.createOscillator();
        const cg = ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(freq, now + 0.05 + i * 0.055);
        cg.gain.setValueAtTime(0.14 * this.sfxVolume, now + 0.05 + i * 0.055);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.055);
        chime.connect(cg);
        cg.connect(ctx.destination);
        chime.start(now + 0.05 + i * 0.055);
        chime.stop(now + 0.27 + i * 0.055);
      });
    }
  }

  public playStep(stepIndex = 0) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = 340 + Math.min(stepIndex, 6) * 42;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.62, now + 0.06);

    gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playCapture() {
    if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([50, 30, 70]);
      } catch {
        // Ignore
      }
    }
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.28);

    gain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playSafeTile() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24 + idx * 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + 0.26 + idx * 0.06);
    });
  }

  public playHomeGoal() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32 + i * 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + 0.35 + i * 0.07);
    });
  }

  public playVictory() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.11, 0.22, 0.35, 0.5, 0.64];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + times[i];
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  private startMusicLoop() {
    if (this.musicTimer !== null || !this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.masterMusicGain) {
      this.masterMusicGain = ctx.createGain();
      this.masterMusicGain.gain.setValueAtTime(this.musicVolume * 0.28, ctx.currentTime);
      this.masterMusicGain.connect(ctx.destination);
    }

    // Warm pentatonic marimba/pad progression (C major / A minor)
    const melodyNotes = [
      261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66,
      220.0, 261.63, 329.63, 440.0, 392.0, 329.63, 293.66, 261.63,
    ];
    const bassNotes = [130.81, 130.81, 174.61, 196.0, 110.0, 110.0, 146.83, 196.0];

    const stepTick = () => {
      if (!this.musicEnabled || !this.ctx || !this.masterMusicGain) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const melFreq = melodyNotes[this.musicStep % melodyNotes.length];

      const melOsc = this.ctx.createOscillator();
      const melGain = this.ctx.createGain();
      melOsc.type = 'sine';
      melOsc.frequency.setValueAtTime(melFreq, now);
      melGain.gain.setValueAtTime(0.001, now);
      melGain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      melOsc.connect(melGain);
      melGain.connect(this.masterMusicGain);
      melOsc.start(now);
      melOsc.stop(now + 0.5);

      if (this.musicStep % 2 === 0) {
        const bassFreq = bassNotes[Math.floor(this.musicStep / 2) % bassNotes.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.14, now + 0.08);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterMusicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.96);
      }

      this.musicStep += 1;
    };

    this.musicTimer = window.setInterval(stepTick, 520);
  }

  public stopMusicLoop() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
