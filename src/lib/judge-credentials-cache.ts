/**
 * Session-scoped cache for freshly-created judge token credentials.
 *
 * After CRIT-2: backend no longer returns rawToken/rawPin on list/status endpoints
 * (plaintext-alongside-hash credential leak). Raw values come back ONLY in
 * JudgeTokenCreatedResponse at the moment of creation.
 *
 * UX: organizer creates judge tokens → admin captures QR/PIN immediately to print
 * or share. Until they navigate away, this in-memory cache lets the UI re-render
 * QR codes and PINs from the create-response. After page reload or session end:
 *   - cache cleared
 *   - admin must REVOKE + RE-ISSUE the token (no recovery path is intentional)
 *
 * Storage: plain in-memory module map. Intentionally NOT localStorage — the whole
 * point of this fix is "raw plaintext credentials don't survive a session", and
 * localStorage would partially defeat that.
 */

interface JudgeCredentials {
  rawToken: string;
  rawPin: string;
}

const cache = new Map<string, JudgeCredentials>();

export const judgeCredentialsCache = {
  /** Store raw token + PIN for a judge token id (called immediately after createJudgeToken). */
  set(tokenId: string, creds: JudgeCredentials): void {
    cache.set(tokenId, creds);
  },

  /** Returns null if the credentials weren't captured this session. */
  get(tokenId: string): JudgeCredentials | null {
    return cache.get(tokenId) ?? null;
  },

  /** Drop credentials for a token (e.g. on revoke). */
  delete(tokenId: string): void {
    cache.delete(tokenId);
  },

  clear(): void {
    cache.clear();
  },
};
