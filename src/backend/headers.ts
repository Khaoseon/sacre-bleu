import { backendEnvironmentError } from './config.ts';

/** Only the validated instance origin is permitted, never a fallback backend. */
export function instanceHeaders(
  template: string,
  mode: string,
  env: Record<string, string | undefined>,
): string {
  const error = backendEnvironmentError(mode, env);
  if (error) throw new Error(error);
  if (template.split('__SUPABASE_ORIGIN__').length !== 2)
    throw new Error('Invalid headers template');
  return template.replace(
    '__SUPABASE_ORIGIN__',
    env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).origin : '',
  );
}
