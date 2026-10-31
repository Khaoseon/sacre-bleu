import { describe, expect, it } from 'vitest';
import { swipeDestination } from './swipe';

describe('Production content swipe intentions', () => {
  it.each([320, 375, 430])('accepts a deliberate content swipe at %i px', (width) => {
    expect(swipeDestination(0, -width * 0.3, 8, width, 600)).toBe(1);
    expect(swipeDestination(1, width * 0.3, 8, width, 600)).toBe(0);
  });
  it('accepts a short intentional flick but rejects a slow adjustment', () => {
    expect(swipeDestination(0, -45, 3, 375, 60)).toBe(1);
    expect(swipeDestination(0, -45, 3, 375, 600)).toBeNull();
    expect(swipeDestination(0, -30, 1, 375, 20)).toBeNull();
  });
  it('rejects diagonal and vertical scrolling', () => {
    expect(swipeDestination(0, -100, 100, 375, 100)).toBeNull();
    expect(swipeDestination(0, -20, 150, 375, 100)).toBeNull();
  });
  it('never wraps destinations', () => {
    expect(swipeDestination(0, 200, 0, 375, 200)).toBeNull();
    expect(swipeDestination(2, -200, 0, 375, 200)).toBeNull();
  });
});
