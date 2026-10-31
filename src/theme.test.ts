import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_KEY,
  watchSystemTheme,
  THEMES,
} from './theme';

let values: Map<string, string>;
let systemDark: boolean;
let root: { dataset: Record<string, string>; style: Record<string, string> };
let meta: ReturnType<typeof vi.fn>;
let listeners: Set<() => void>;
beforeEach(() => {
  values = new Map();
  systemDark = false;
  listeners = new Set();
  root = { dataset: {}, style: {} };
  meta = vi.fn();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal('matchMedia', () => ({
    matches: systemDark,
    addEventListener: (_: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
  }));
  vi.stubGlobal('document', {
    documentElement: root,
    querySelector: () => ({ setAttribute: meta }),
  });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: () => (root.dataset.theme === 'dark' ? '#141715' : '#f8f9f6'),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Préférence visuelle', () => {
  it.each(THEMES)('mémorise et restaure %s avec le bon mode des contrôles natifs', (theme) => {
    saveThemePreference(theme);
    expect(readThemePreference()).toBe(theme);
    expect(root.dataset.theme).toBe(theme === 'auto' ? 'light' : theme);
    expect(root.style.colorScheme).toBe(
      theme === 'dark' || theme === 'retro-petrol' ? 'dark' : 'light',
    );
  });
  it('suit le système uniquement en mode Automatique', () => {
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('relit la préférence manuelle et ignore une sauvegarde invalide', () => {
    expect(readThemePreference()).toBe('auto');
    for (const theme of ['light', 'dark'] as const) {
      values.set(THEME_KEY, theme);
      expect(readThemePreference()).toBe(theme);
    }
    values.set(THEME_KEY, 'invalid');
    expect(readThemePreference()).toBe('auto');
  });
  it('mémorise et applique immédiatement le thème, y compris aux contrôles natifs', () => {
    saveThemePreference('dark');
    expect(values.get(THEME_KEY)).toBe('dark');
    expect(readThemePreference()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(meta).toHaveBeenLastCalledWith('content', '#141715');
    saveThemePreference('light');
    expect(root.dataset.theme).toBe('light');
  });
  it('réagit aux changements système en automatique et libère son écouteur', () => {
    applyTheme('auto');
    const stop = watchSystemTheme('auto', () => applyTheme('auto'));
    systemDark = true;
    listeners.forEach((fn) => fn());
    expect(root.dataset.theme).toBe('dark');
    stop();
    systemDark = false;
    listeners.forEach((fn) => fn());
    expect(root.dataset.theme).toBe('dark');
    expect(listeners.size).toBe(0);
  });
  it('ne remplace pas un choix manuel lors d’un changement système', () => {
    applyTheme('light');
    const update = vi.fn();
    const stop = watchSystemTheme('light', update);
    systemDark = true;
    listeners.forEach((fn) => fn());
    expect(update).not.toHaveBeenCalled();
    expect(root.dataset.theme).toBe('light');
    stop();
  });
  it('un stockage bloqué laisse Automatique disponible et ne produit pas de fausse sauvegarde', () => {
    applyTheme('light');
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readThemePreference()).toBe('auto');
    expect(() => saveThemePreference('dark')).toThrow();
    expect(root.dataset.theme).toBe('light');
  });
  it('ne modifie pas la sauvegarde du stock ni sa révision', () => {
    values.set('app-reserve.local.v1', '{"revision":7}');
    saveThemePreference('dark');
    expect(values.get('app-reserve.local.v1')).toBe('{"revision":7}');
  });
});

describe('Initialisation avant le premier rendu', () => {
  const bootstrap = readFileSync('public/theme-init.js', 'utf8');
  it.each(THEMES)('restaure aussi %s avant React', (theme) => {
    const earlyRoot = { dataset: {}, style: {} };
    runInNewContext(bootstrap, {
      localStorage: { getItem: () => theme },
      matchMedia: () => ({ matches: false }),
      document: { documentElement: earlyRoot },
    });
    expect(earlyRoot.dataset).toEqual({ theme: theme === 'auto' ? 'light' : theme });
    expect(earlyRoot.style).toEqual({
      colorScheme: theme === 'dark' || theme === 'retro-petrol' ? 'dark' : 'light',
    });
  });
  for (const [stored, system, expected] of [
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    ['auto', true, 'dark'],
    [null, false, 'light'],
    ['invalid', true, 'dark'],
  ] as const) {
    it(`applique ${expected} dès le chargement (${stored}, système sombre : ${system})`, () => {
      const earlyRoot = { dataset: {}, style: {} };
      runInNewContext(bootstrap, {
        localStorage: {
          getItem: (key: string) => {
            expect(key).toBe(THEME_KEY);
            return stored;
          },
        },
        matchMedia: () => ({ matches: system }),
        document: { documentElement: earlyRoot },
      });
      expect(earlyRoot.dataset).toEqual({ theme: expected });
      expect(earlyRoot.style).toEqual({ colorScheme: expected });
    });
  }
  it('suit le système même si le stockage est inaccessible avant React', () => {
    const earlyRoot = { dataset: {}, style: {} };
    runInNewContext(bootstrap, {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      matchMedia: () => ({ matches: true }),
      document: { documentElement: earlyRoot },
    });
    expect(earlyRoot.dataset).toEqual({ theme: 'dark' });
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
    it(`${index === 0 ? 'Clair' : 'Sombre'} : textes et statuts à au moins 4,5:1`, () => {
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
    it(`${index === 0 ? 'Clair' : 'Sombre'} : bordures interactives et focus à au moins 3:1`, () => {
      expect(contrast(palette['control-border'], palette.paper)).toBeGreaterThanOrEqual(3);
      expect(contrast(palette.focus, palette.paper)).toBeGreaterThanOrEqual(3);
    });
  });
});
