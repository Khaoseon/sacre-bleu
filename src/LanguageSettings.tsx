import { t, useLanguage } from './i18n';
export function LanguageSettings() {
  const { language, chooseLanguage, storageError } = useLanguage();
  return (
    <fieldset className="theme-settings language-settings">
      <legend>{t('Langue')}</legend>
      <select
        aria-label={t('Langue')}
        value={language}
        onChange={(event) => chooseLanguage(event.target.value === 'en' ? 'en' : 'fr')}
      >
        <option value="fr" lang="fr">
          Français
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
      {storageError && (
        <p role="alert" className="form-error">
          {t('Impossible de mémoriser la langue. Elle reste active pour cette session.')}
        </p>
      )}
    </fieldset>
  );
}
