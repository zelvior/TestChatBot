import * as crypto from 'crypto';

export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function generateCodeChallenge(codeVerifier: string) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}
