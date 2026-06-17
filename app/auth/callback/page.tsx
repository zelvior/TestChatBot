'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForKey } from '@/lib/openrouter';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const codeVerifier = localStorage.getItem('code_verifier');

    if (!code || !codeVerifier) {
      setError('Missing authorization code or verifier');
      return;
    }

    exchangeCodeForKey(code, codeVerifier)
      .then((data) => {
        localStorage.setItem('openrouter_api_key', data.key);
        localStorage.removeItem('code_verifier');
          // Navigate to root relative to current path to support sub-path deployments
          window.location.href = window.location.pathname.replace(/\/auth\/callback\/$/, '/');
      })
      .catch((err) => {
        console.error('OAuth error:', err);
        setError(err.message || 'Authentication failed');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.href = window.location.pathname.replace(/\/auth\/callback\/$/, '/')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <h1 className="text-xl font-medium">Completing login...</h1>
      <p className="text-gray-500 mt-2">You will be redirected shortly.</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <h1 className="text-xl font-medium">Loading...</h1>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
