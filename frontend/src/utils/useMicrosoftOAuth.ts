import { useEffect, useRef, useCallback } from 'react';
import {
  PublicClientApplication,
  type Configuration,
  type PopupRequest,
  InteractionRequiredAuthError,
  BrowserAuthError,
} from '@azure/msal-browser';

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';

// Module-level singleton — MSAL must not be re-initialised on every render
let msalInstance: PublicClientApplication | null = null;
let msalInitPromise: Promise<void> | null = null;

function getMsalInstance(): { instance: PublicClientApplication; initPromise: Promise<void> } {
  if (!msalInstance) {
    const config: Configuration = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin, // must match Azure SPA redirect URI
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    };
    msalInstance = new PublicClientApplication(config);
    msalInitPromise = msalInstance.initialize();
  }
  return { instance: msalInstance, initPromise: msalInitPromise! };
}

/**
 * Initialises MSAL and returns a `triggerMicrosoftLogin` function that opens
 * the Microsoft sign-in popup.  The hook calls `onIdToken` with the raw ID
 * token JWT so the backend can verify it server-side.
 */
export function useMicrosoftOAuth(
  onIdToken: (idToken: string) => void,
  onError: (msg: string) => void,
) {
  const readyRef = useRef(false);

  useEffect(() => {
    if (!MICROSOFT_CLIENT_ID) return;
    const { initPromise } = getMsalInstance();
    initPromise.then(() => {
      readyRef.current = true;
    }).catch((e) => {
      console.error('[MSAL] Init failed:', e);
    });
  }, []);

  const triggerMicrosoftLogin = useCallback(async () => {
    if (!MICROSOFT_CLIENT_ID) {
      onError('Microsoft login is not configured.');
      return;
    }

    const { instance, initPromise } = getMsalInstance();

    try {
      await initPromise; // ensure initialised before calling popup

      const request: PopupRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
      };

      const result = await instance.loginPopup(request);

      if (!result.idToken) {
        onError('Microsoft sign-in failed: no ID token received.');
        return;
      }

      onIdToken(result.idToken);
    } catch (error: any) {
      // User closed the popup — silent
      if (
        error instanceof BrowserAuthError &&
        (error.errorCode === 'user_cancelled' ||
          error.errorCode === 'interaction_in_progress' ||
          error.message?.includes('user_cancelled'))
      ) {
        return;
      }
      if (error instanceof InteractionRequiredAuthError) {
        onError('Microsoft requires additional interaction. Please try again.');
        return;
      }
      console.error('[MSAL] Login error:', error);
      onError(`Microsoft sign-in failed: ${error.message || 'unknown error'}`);
    }
  }, [onIdToken, onError]);

  return {
    triggerMicrosoftLogin,
    microsoftConfigured: Boolean(MICROSOFT_CLIENT_ID),
  };
}
