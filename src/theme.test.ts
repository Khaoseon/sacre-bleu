import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  applyTheme,
  readThemePreference,
  migrateTheme,
  saveThemePreference,
  THEME_KEY,
  THEMES,
} from './theme';
let values: Map<string, string>;
let root: { dataset: Record<string, string>; style: Record<string, string> };
let systemDark = false;
let meta: ReturnType<typeof vi.fn>;
beforeEach(() => {
  values = new Map();
  root = { dataset: {}, style: {} };
  systemDark = false;
  meta = vi.fn();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  vi.stubGlobal('matchMedia', () => ({ matches: systemDark }));
  vi.stubGlobal('document', {
    documentElement: root,
    querySelector: () => ({ setAttribute: meta }),
  });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#102c35' }));
});
afterEach(() => vi.unstubAllGlobals());
const bootstrap = readFileSync('public/theme-init.js', 'utf8');
const cases = [
  ['light', false, 'light'],
  ['light', true, 'light'],
  ['maison', true, 'maison'],
  ['maison-night', false, 'maison-night'],
  ['dark', false, 'maison-night'],
  ['retro-petrol', false, 'maison-night'],
  ['auto', true, 'maison-night'],
  ['auto', false, 'light'],
  ['slate', true, 'light'],
  ['retro-cream', true, 'light'],
  [null, true, 'light'],
  ['invalid', true, 'light'],
] as const;
describe('Explicit appearances and pre-paint migration', () => {
  it('offers exactly three appearances', () => {
    expect(THEMES.map(([id]) => id)).toEqual(['light', 'maison', 'maison-night']);
  });
  it.each(cases)(
    'migrates %s (system dark %s) to %s before React and on read',
    (saved, dark, expected) => {
      systemDark = dark;
      if (saved) values.set(THEME_KEY, saved);
      expect(migrateTheme(saved, dark)).toBe(expected);
      expect(readThemePreference()).toBe(expected);
      expect(values.get(THEME_KEY)).toBe(expected);
      const earlyRoot = { dataset: {}, style: {} };
      let stored = saved as string | null;
      runInNewContext(bootstrap, {
        localStorage: {
          getItem: () => stored,
          setItem: (key: string, v: string) => {
            expect(key).toBe(THEME_KEY);
            stored = v;
          },
        },
        matchMedia: () => ({ matches: dark }),
        document: { documentElement: earlyRoot },
      });
      expect(earlyRoot.dataset).toEqual({ theme: expected });
      expect(earlyRoot.style).toEqual({
        colorScheme: expected === 'maison-night' ? 'dark' : 'light',
      });
      expect(stored).toBe(expected);
    },
  );
  it.each(THEMES)('persists %s with native controls and browser chrome', (theme) => {
    saveThemePreference(theme);
    expect(readThemePreference()).toBe(theme);
    expect(root.dataset.theme).toBe(theme);
    expect(root.style.colorScheme).toBe(theme === 'maison-night' ? 'dark' : 'light');
    expect(meta).toHaveBeenLastCalledWith('content', '#102c35');
  });
  it('resolves Automatic once even after OS change and reload', () => {
    values.set(THEME_KEY, 'auto');
    systemDark = true;
    expect(readThemePreference()).toBe('maison-night');
    systemDark = false;
    expect(readThemePreference()).toBe('maison-night');
  });
  it('survives blocked reads/writes with the pre-paint choice and never claims a saved selection', () => {
    root.dataset.theme = 'maison-night';
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('blocked');
      },
    });
    expect(readThemePreference()).toBe('maison-night');
    applyTheme('light');
    expect(() => saveThemePreference('maison')).toThrow();
    expect(root.dataset.theme).toBe('light');
    const earlyRoot = { dataset: {}, style: {} };
    expect(() =>
      runInNewContext(bootstrap, {
        localStorage: {
          getItem: () => {
            throw Error('blocked');
          },
        },
        matchMedia: () => ({ matches: true }),
        document: { documentElement: earlyRoot },
      }),
    ).not.toThrow();
    expect(earlyRoot.dataset).toEqual({ theme: 'light' });
  });
  it('retains pre-paint Automatic resolution when only persistence is denied', () => {
    root.dataset.theme = 'maison-night';
    vi.stubGlobal('localStorage', {
      getItem: () => 'auto',
      setItem: () => {
        throw Error('blocked');
      },
    });
    systemDark = false;
    expect(readThemePreference()).toBe('maison-night');
  });
  it('does not change stock, language or pending intentions', () => {
    values.set('app-reserve.local.v1', '{"revision":7}');
    values.set('app-reserve.language.v1', 'en');
    saveThemePreference('maison');
    expect(values.get('app-reserve.local.v1')).toBe('{"revision":7}');
    expect(values.get('app-reserve.language.v1')).toBe('en');
    expect(values.size).toBe(3);
  });
});

describe('Contrastes des palettes', () => {
  const css = readFileSync('src/theme.css', 'utf8');
  const blocks = [...css.matchAll(/\{([^}]+)\}/g)].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/--([\w-]+):\s*(#[a-f\d]{6,8})/gi)].map((value) => [
        value[1],
        value[2],
      ]),
    ),
  );
  function luminance(hex: string) {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  function contrast(a: string, b: string) {
    const [min, max] = [luminance(a), luminance(b)].sort((a, b) => a - b);
    return (max + 0.05) / (min + 0.05);
  }
  const foundations = readFileSync('src/ui/foundations.css', 'utf8');
  const semanticBlocks = [...foundations.matchAll(/\{([^}]+)\}/g)].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/--sb-color-([\w-]+):\s*(#[a-f\d]{6}|var\(--[\w-]+\))/gi)].map(
        (value) => [value[1], value[2]],
      ),
    ),
  );
  blocks.forEach((block, index) => {
    const legacy = { ...blocks[0], ...block };
    it(`semantic foundation palette ${index}: readable text, controls and focus`, () => {
      const roles = semanticBlocks[0];
      const color = (role: string) => {
        const value = roles[role];
        return value.startsWith('var(') ? legacy[value.slice(6, -1)] : value;
      };
      for (const [fg, bg] of [
        ['text', 'surface'],
        ['text', 'canvas'],
        ['muted', 'inset'],
        ['muted', 'surface'],
        ['on-brand', 'brand'],
        ['warning', 'surface'],
        ['warning', 'warning-surface'],
        ['success', 'success-surface'],
        ['danger', 'danger-surface'],
        ['disabled', 'disabled-surface'],
      ]) {
        expect(contrast(color(fg), color(bg)), `${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const role of ['control-border', 'focus']) {
        expect(contrast(color(role), color('surface')), role).toBeGreaterThanOrEqual(3);
      }
    });
  });
  blocks.forEach((block, index) => {
    const palette = { ...blocks[0], ...block };
    it(`${THEMES[index][1]} : textes et statuts à au moins 4,5:1`, () => {
      for (const [foreground, background] of [
        ['text', 'paper'],
        ['text', 'canvas'],
        ['muted', 'paper'],
        ['muted', 'sidebar'],
        ['muted', 'surface-soft'],
        ['muted', 'accent-soft'],
        ['disabled-text', 'disabled-surface'],
        ['disabled-text', 'paper'],
        ['accent-text', 'selected-surface'],
        ['on-primary', 'green'],
        ['on-destructive', 'danger'],
        ['on-destructive', 'destructive-fill'],
        ['toast-ink', 'toast-surface'],
        ['toast-ink', 'error-toast'],
        ['muted', 'completed-surface'],
        ['danger-text', 'danger-surface'],
        ['warning-text', 'paper'],
      ])
        expect(
          contrast(palette[foreground], palette[background]),
          `${foreground} / ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
    });
    it(`${THEMES[index][1]} : bordures interactives et focus à au moins 3:1`, () => {
      expect(contrast(palette['control-border'], palette.paper)).toBeGreaterThanOrEqual(3);
      expect(contrast(palette.focus, palette.paper)).toBeGreaterThanOrEqual(3);
    });
  });
});
