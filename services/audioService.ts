
export class AudioService {
  private static context: AudioContext | null = null;

  private static getContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.context;
  }

  /**
   * Tactical scan sound: A short, filtered pulse that mimics a radar sweep.
   */
  static playScan() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Success sound: A bright, harmonic two-tone sequence that feels rewarding.
   */
  static playSuccess() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const playPulse = (freq: number, startTime: number, duration: number, volume: number = 0.05) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // C6 to G6 chordal sequence
    playPulse(1046.50, now, 0.4, 0.03); 
    playPulse(1567.98, now + 0.08, 0.5, 0.04);
  }

  /**
   * Error sound: A low-frequency double pulse for failed actions.
   */
  static playError() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const playTone = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + 0.01);
      gain.gain.linearRampToValueAtTime(0, time + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.1);
    };

    playTone(now);
    playTone(now + 0.15);
  }
}
