import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { isOffUserAgent } from '../../src/offIdentity.ts';

export function instanceConfig(projectRef, siteUrl, offUserAgent) {
  if (typeof offUserAgent !== 'string' || !isOffUserAgent(offUserAgent))
    throw new Error('Expected --off-user-agent "App/1.0 (https://your-public-contact-page)"');
  if (!/^[a-z]{20}$/.test(projectRef ?? ''))
    throw new Error('Expected a 20-letter project reference');
  const site = new URL(siteUrl);
  if (
    site.protocol !== 'https:' ||
    site.port ||
    site.username ||
    site.password ||
    site.search ||
    site.hash ||
    site.pathname !== '/'
  )
    throw new Error('Expected an exact HTTPS frontend origin');
  const origin = site.origin;
  return {
    auth: `project_id = "independent-instance"
[api]
schemas = ["public"]
auto_expose_new_tables = false
[auth]
enable_signup = false
site_url = "${origin}"
additional_redirect_urls = ["${origin}/auth/callback"]
enable_refresh_token_rotation = true
enable_anonymous_sign_ins = false
minimum_password_length = 12
password_requirements = "lower_upper_letters_digits"
[auth.email]
enable_signup = true
enable_confirmations = true
double_confirm_changes = true
secure_password_change = true
`,
    edge: `OFF_ALLOWED_ORIGINS=${origin}\nOFF_USER_AGENT=${offUserAgent}\n`,
    frontend: `VITE_SUPABASE_URL=https://${projectRef}.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE\n`,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      'project-ref': { type: 'string' },
      'site-url': { type: 'string' },
      'off-user-agent': { type: 'string' },
    },
  });
  const config = instanceConfig(
    values['project-ref'],
    values['site-url'],
    values['off-user-agent'],
  );
  mkdirSync('.tmp/instance/supabase', { recursive: true });
  writeFileSync('.tmp/instance/supabase/config.toml', config.auth);
  writeFileSync('.tmp/instance/off.env', config.edge);
  writeFileSync('.tmp/instance/frontend.example', config.frontend);
  console.log(
    'Generated ignored .tmp/instance files. Review before any remote command. Nothing deployed.',
  );
}
