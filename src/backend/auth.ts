import type { Client } from './client';
import { AUTH_STORAGE_KEY } from './client';
import { authMessage } from './errors';
export class ReserveAuth {
  constructor(readonly client: Client) {}
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authMessage(error));
  }
  async signUp(email: string, password: string, origin: string) {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) throw new Error(authMessage(error));
  }
  async confirm(token: string) {
    const { error } = await this.client.auth.verifyOtp({ token_hash: token, type: 'email' });
    if (error) throw new Error(authMessage(error));
  }
  async resend(email: string, origin: string) {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) throw new Error(authMessage(error));
  }
  async signOut() {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
      // Discard the SDK's in-memory session as well, including during an outage.
      window.location.replace(window.location.pathname);
    }
  }
}
