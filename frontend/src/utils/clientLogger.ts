let originalError: typeof console.error;
let originalWarn: typeof console.warn;
let isLogging = false;

interface QueuedLog {
  level: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

export function initClientLogger() {
  if (typeof window === 'undefined') return;
  if ((window as any).__trader_logger_initialized__) return;
  (window as any).__trader_logger_initialized__ = true;

  originalError = console.error;
  originalWarn = console.warn;

  // Intercept console.error
  console.error = (...args: any[]) => {
    // Always call original error first so it shows up in local developer console
    if (originalError) {
      originalError.apply(console, args);
    }

    if (isLogging) return;
    
    try {
      const message = args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      const errorArg = args.find(arg => arg instanceof Error);
      const stack = errorArg ? errorArg.stack : new Error().stack;

      queueLog('error', message, stack);
    } catch (e) {
      // Safe fallback
    }
  };

  // Intercept console.warn
  console.warn = (...args: any[]) => {
    if (originalWarn) {
      originalWarn.apply(console, args);
    }

    if (isLogging) return;

    try {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      queueLog('warn', message);
    } catch (e) {
      // Safe fallback
    }
  };

  // Intercept uncaught exceptions
  window.addEventListener('error', (event) => {
    if (isLogging) return;
    const message = event.message || 'Uncaught Exception';
    const stack = event.error ? event.error.stack : undefined;
    queueLog('error', message, stack);
  });

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isLogging) return;
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;
    queueLog('error', `Unhandled Rejection: ${message}`, stack);
  });

  // Start periodic sync (every 5 seconds)
  setInterval(() => {
    syncLogs();
  }, 5000);

  // Run initial sync in case there were logs saved from a previous session (e.g. just redirected)
  setTimeout(() => {
    syncLogs();
  }, 1000);
}

function queueLog(level: string, message: string, stack?: string) {
  // Avoid logging our own requests or responses to prevent recursive loops
  if (message.includes('/api/client-logs') || message.includes('client-logs/admin')) {
    return;
  }

  // Don't queue 401 auth errors — expected when session expires or user is not logged in.
  // These are not application bugs and would otherwise flood the log queue.
  if (
    message.includes('status 401') ||
    message.includes('status code 401') ||
    message.includes('Session expired') ||
    message.includes('Unauthorized') ||
    (message.includes('/auth/me') && level === 'error')
  ) {
    return;
  }
  try {
    const newLog: QueuedLog = {
      level,
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    const existingJson = localStorage.getItem('trader_client_logs');
    const logs: QueuedLog[] = existingJson ? JSON.parse(existingJson) : [];
    logs.push(newLog);

    // Limit to latest 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    localStorage.setItem('trader_client_logs', JSON.stringify(logs));

    // Trigger immediate sync for errors
    if (level === 'error') {
      syncLogs();
    }
  } catch (err) {
    if (originalError) {
      originalError('Failed to queue log', err);
    }
  }
}

export async function syncLogs() {
  if (isLogging) return;

  let logs: QueuedLog[] = [];
  try {
    const existingJson = localStorage.getItem('trader_client_logs');
    if (!existingJson) return;
    logs = JSON.parse(existingJson);
  } catch (e) {
    return;
  }

  if (logs.length === 0) return;

  isLogging = true;
  
  const token = localStorage.getItem('trader_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const remainingLogs = [...logs];
  
  try {
    while (remainingLogs.length > 0) {
      const logToSend = remainingLogs[0];
      const res = await fetch('/api/client-logs', {
        method: 'POST',
        headers,
        body: JSON.stringify(logToSend),
      });

      if (res.ok) {
        remainingLogs.shift();
      } else {
        break; // Stop and retry later
      }
    }
  } catch (err) {
    // Network or server error
  } finally {
    try {
      if (remainingLogs.length === 0) {
        localStorage.removeItem('trader_client_logs');
      } else {
        localStorage.setItem('trader_client_logs', JSON.stringify(remainingLogs));
      }
    } catch (e) {
      // Safe fallback
    }
    isLogging = false;
  }
}
