import { morseMarks } from '@/field/signoff';
import type { CuePlan } from './cues';

export interface KeyInterval {
  startMs: number;
  durationMs: number;
}

export interface KeySchedule {
  intervals: KeyInterval[];
  durationMs: number;
}

export function keySchedule(text: string, dotMs: number): KeySchedule {
  const intervals = morseMarks(text).map((mark) => ({ startMs: mark.start * dotMs, durationMs: mark.length * dotMs }));
  const durationMs = intervals.reduce((max, interval) => Math.max(max, interval.startMs + interval.durationMs), 0);
  return { intervals, durationMs };
}

export function keyLevel(schedule: KeySchedule, elapsedMs: number, dim: number, restMs: number): number {
  const period = schedule.durationMs + restMs;
  const t = ((elapsedMs % period) + period) % period;
  const keyed = schedule.intervals.some((interval) => t >= interval.startMs && t < interval.startMs + interval.durationMs);
  return keyed ? 1 : dim;
}

export function sidetonePlan(schedule: KeySchedule, frequency = 600): CuePlan {
  return {
    name: 'cq',
    segments: schedule.intervals.map((interval) => ({
      kind: 'tone',
      wave: 'sine',
      frequency,
      startMs: interval.startMs,
      durationMs: interval.durationMs,
      peak: 0.18,
    })),
  };
}
