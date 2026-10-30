import { t, message, label } from './i18n';
import { LanguageSettings } from './LanguageSettings';

import type { useThemePreference } from './theme';
import { THEMES } from './theme';
export type ThemeController = ReturnType<typeof useThemePreference>;
export function AppearanceSettings({ theme }: { theme: ThemeController }) {
  return (
    <>
      <LanguageSettings />
      <fieldset className="theme-settings">
        <legend>{t('Apparence')}</legend>
        <div className="theme-options">
          {THEMES.map(([value, themeLabel]) => (
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
                {label(themeLabel)}
              </span>
            </label>
          ))}
        </div>
        {theme.error && (
          <p role="alert" className="form-error">
            {message(theme.error)}
          </p>
        )}
      </fieldset>
    </>
  );
}
