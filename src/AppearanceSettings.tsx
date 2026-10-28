import type { useThemePreference } from './theme';
import { THEMES } from './theme';
export type ThemeController = ReturnType<typeof useThemePreference>;
export function AppearanceSettings({ theme }: { theme: ThemeController }) {
  return (
    <fieldset className="theme-settings">
      <legend>Apparence</legend>
      <div className="theme-options">
        {THEMES.map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme.preference === value}
              onChange={() => theme.chooseTheme(value)}
            />
            <span>
              <i className={`theme-swatch swatch-${value}`} aria-hidden="true" />
              {label}
            </span>
          </label>
        ))}
      </div>
      {theme.error && (
        <p role="alert" className="form-error">
          {theme.error}
        </p>
      )}
    </fieldset>
  );
}
