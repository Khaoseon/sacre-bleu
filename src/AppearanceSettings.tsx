import type { useThemePreference } from './theme';
export type ThemeController = ReturnType<typeof useThemePreference>;
export function AppearanceSettings({ theme }: { theme: ThemeController }) {
  return (
    <fieldset className="theme-settings">
      <legend>Apparence</legend>
      <div className="theme-options">
        {(
          [
            ['auto', 'Automatique'],
            ['light', 'Clair'],
            ['dark', 'Sombre'],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme.preference === value}
              onChange={() => theme.chooseTheme(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <small>Automatique suit le thème de votre appareil.</small>
      {theme.error && (
        <p role="alert" className="form-error">
          {theme.error}
        </p>
      )}
    </fieldset>
  );
}
