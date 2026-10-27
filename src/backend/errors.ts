export class BackendError extends Error {
  constructor(
    message: string,
    readonly kind: 'rejected' | 'uncertain' | 'unavailable' = 'rejected',
    readonly code?: string,
  ) {
    super(message);
  }
}
export function backendError(error: unknown, uncertain = false): BackendError {
  if (error instanceof BackendError) return error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    '42501': 'Vous n’avez pas accès à cette action.',
    '22023': 'Vérifiez les champs saisis. La demande a été refusée.',
    '23514': 'Quantité ou capacité de la réserve dépassée.',
    '23505': 'Ce code-barres est déjà utilisé dans votre réserve.',
    P0001: 'Invitation invalide, expirée, déjà utilisée ou destinée à une autre adresse email.',
    P0002: 'Cet élément n’existe plus. Actualisez la réserve.',
    '40001': 'La réserve a changé. Ce scan ne peut plus être ajusté ou annulé ; scannez à nouveau.',
  };
  if (messages[code]) return new BackendError(messages[code], 'rejected', code);
  if (code && /^\d{5}$/.test(code))
    return new BackendError('La demande a été refusée par le serveur.', 'rejected', code);
  return new BackendError(
    uncertain
      ? 'Réponse interrompue. Reprenez la demande pour vérifier son résultat sans la doubler.'
      : 'Serveur inaccessible. Vérifiez la connexion puis réessayez.',
    uncertain ? 'uncertain' : 'unavailable',
    code,
  );
}
export function authMessage(error: { code?: string } | null): string {
  if (!error) return '';
  const messages: Record<string, string> = {
    invalid_credentials: 'Email ou mot de passe incorrect.',
    email_not_confirmed: 'Confirmez votre adresse depuis l’email reçu avant de vous connecter.',
    user_already_exists: 'Ce compte existe déjà. Connectez-vous.',
    weak_password: 'Utilisez au moins 12 caractères, avec majuscule, minuscule et chiffre.',
    over_email_send_rate_limit: 'Trop d’emails demandés. Patientez avant de réessayer.',
    otp_expired:
      'Le lien de confirmation est expiré ou déjà utilisé. Essayez de vous connecter ou demandez un nouvel email.',
  };
  return (
    messages[error.code ?? ''] ??
    'Connexion impossible. Vérifiez les champs et la disponibilité du serveur.'
  );
}
