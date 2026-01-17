import { useCallback, useRef } from "react";
import { useGameSoundSettings } from "./useGameSoundSettings";

// Web Audio API-based sound effects for games
export const useGameSounds = () => {
  const { isMuted } = useGameSoundSettings();
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn("Audio playback failed:", error);
    }
  }, [getAudioContext, isMuted]);

  // Card flip sound - quick "whoosh" effect
  const playFlip = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (error) {
      console.warn("Audio playback failed:", error);
    }
  }, [getAudioContext, isMuted]);

  // Match found sound - cheerful ascending notes
  const playMatch = useCallback(() => {
    if (isMuted) return;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, "sine", 0.25), i * 80);
    });
  }, [playTone, isMuted]);

  // No match sound - descending tone
  const playNoMatch = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
      oscillator.type = "triangle";

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (error) {
      console.warn("Audio playback failed:", error);
    }
  }, [getAudioContext, isMuted]);

  // Win sound - triumphant fanfare
  const playWin = useCallback(() => {
    if (isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4, "sine", 0.3), i * 150);
    });
  }, [playTone, isMuted]);

  // Lose sound - descending notes
  const playLose = useCallback(() => {
    if (isMuted) return;
    const notes = [392, 349.23, 311.13, 293.66]; // G4, F4, Eb4, D4
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, "triangle", 0.2), i * 150);
    });
  }, [playTone, isMuted]);

  // Draw sound - neutral tone
  const playDraw = useCallback(() => {
    if (isMuted) return;
    const notes = [440, 440, 523.25]; // A4, A4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, "sine", 0.2), i * 200);
    });
  }, [playTone, isMuted]);

  // Game start sound
  const playGameStart = useCallback(() => {
    if (isMuted) return;
    const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, "sine", 0.2), i * 100);
    });
  }, [playTone, isMuted]);

  return {
    playFlip,
    playMatch,
    playNoMatch,
    playWin,
    playLose,
    playDraw,
    playGameStart,
  };
};
