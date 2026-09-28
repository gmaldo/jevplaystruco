// Web Audio API procedural sound effects for JevTruco
// Zero external assets required, fully offline and latency-free

class SoundController {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Crisp card snap / flick sound
  playCard() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio playback suppressed or unpermitted
    }
  }

  // Card shuffle / deal sound
  playDeal() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = now + i * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450 - i * 40, time);
        osc.frequency.exponentialRampToValueAtTime(150, time + 0.05);

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.06);
      }
    } catch {}
  }

  // Truco / Envido call sound (resonant chime fallback)
  playCanto() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  // Vocal cantos playback (TRUCO, RETRUCO, VALE CUATRO, ENVIDO, REAL ENVIDO, FALTA ENVIDO, QUIERO, NO QUIERO)
  playCantoVoice(
    canto:
      | 'truco'
      | 'retruco'
      | 'vale_cuatro'
      | 'envido'
      | 'real_envido'
      | 'falta_envido'
      | 'quiero'
      | 'no_quiero'
  ) {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      const src = `/sounds/cantos/${canto}.wav`;
      const audio = new Audio(src);
      audio.volume = 0.95;
      audio.play().catch(() => {
        // Fallback to chime if browser suppresses autoplay or audio element
        this.playCanto();
      });
    } catch {
      this.playCanto();
    }
  }

  playTruco() {
    this.playCantoVoice('truco');
  }

  playRetruco() {
    this.playCantoVoice('retruco');
  }

  playValeCuatro() {
    this.playCantoVoice('vale_cuatro');
  }

  playEnvido() {
    this.playCantoVoice('envido');
  }

  playRealEnvido() {
    this.playCantoVoice('real_envido');
  }

  playFaltaEnvido() {
    this.playCantoVoice('falta_envido');
  }

  playQuiero() {
    this.playCantoVoice('quiero');
  }

  playNoQuiero() {
    this.playCantoVoice('no_quiero');
  }

  // Trick / Hand win celebration fanfare
  playWin() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch {}
  }

  // Hand / Match loss sound
  playLose() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 392, 349.23]; // A4, G4, F4
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.23);
      });
    } catch {}
  }
}

export const sounds = new SoundController();
