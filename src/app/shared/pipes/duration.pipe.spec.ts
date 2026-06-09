import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  let pipe: DurationPipe;

  beforeEach(() => {
    pipe = new DurationPipe();
  });

  it('formats whole minutes and seconds as m:ss', () => {
    expect(pipe.transform(65)).toBe('1:05');
    expect(pipe.transform(5)).toBe('0:05');
    expect(pipe.transform(0)).toBe('0:00');
  });

  it('formats durations >= 1 hour as h:mm:ss', () => {
    expect(pipe.transform(3661)).toBe('1:01:01');
  });

  it('floors fractional seconds', () => {
    expect(pipe.transform(90.9)).toBe('1:30');
  });

  it('returns empty string for null/undefined/invalid input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(-5)).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
  });
});
