import { useEffect, useRef, useCallback } from 'react';

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup' | 'redirect';
            callback: (response: { code: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Initialises the Google OAuth2 code-client (popup flow) and returns
 * a stable `triggerGoogleLogin()` function.
 *
 * @param onCode  Called with the auth-code when Google resolves the popup.
 * @param onError Called with an error message when the popup fails/is cancelled.
 */
export function useGoogleOAuth(
  onCode: (code: string) => void,
  onError: (msg: string) => void,
) {
  const clientRef = useRef<{ requestCode: () => void } | null>(null);

  const init = useCallback(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;

    clientRef.current = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response) => {
        // `error` is a non-empty string like "access_denied" when it fails
        if (response.error && response.error !== '') {
          if (response.error === 'access_denied' || response.error === 'immediate_failed') {
            // User closed the popup — silent, no toast
            return;
          }
          onError(`Google sign-in failed: ${response.error}`);
          return;
        }
        if (!response.code) {
          onError('Google sign-in failed: no auth code received.');
          return;
        }
        onCode(response.code);
      },
    });
  }, [onCode, onError]);

  useEffect(() => {
    if (window.google) {
      init();
    } else {
      const id = setInterval(() => {
        if (window.google) {
          init();
          clearInterval(id);
        }
      }, 150);
      return () => clearInterval(id);
    }
  }, [init]);

  const triggerGoogleLogin = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.requestCode();
    } else {
      onError('Google sign-in is still loading — please try again in a moment.');
    }
  }, [onError]);

  return { triggerGoogleLogin, googleConfigured: Boolean(GOOGLE_CLIENT_ID) };
}
