export const OPENROUTER_AUTH_URL = 'https://openrouter.ai/auth';
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export async function exchangeCodeForKey(code: string, codeVerifier: string) {
  const response = await fetch(`${OPENROUTER_API_URL}/auth/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange code for key');
  }

  return response.json();
}

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_API_URL}/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const { data } = await response.json();
  return data;
}
