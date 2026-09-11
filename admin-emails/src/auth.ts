/** cms-oauth-kit handshake (same contract Decap uses). */

export const OAUTH_AUTH_URL = "https://auth.singletonsd.com/auth";
export const GITHUB_REPO = "singleton-sd/poc-inkads-marketing";
export const GITHUB_OWNER = "singleton-sd";
export const GITHUB_REPO_NAME = "poc-inkads-marketing";
export const GITHUB_BASE_BRANCH = "main";
export const TEMPLATES_ROOT = "content/email-templates";

const TOKEN_STORAGE_KEY = "inkads-email-admin-github-token";

export function readStoredToken(): string | null {
  try {
    const value = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Open cms-oauth-kit popup and resolve with the editor's GitHub access token.
 * Protocol: popup posts `authorizing:github`; opener replies; popup posts
 * `authorization:github:success:{"token":"...","provider":"github"}`.
 */
export function loginWithGithub(): Promise<string> {
  return new Promise((resolve, reject) => {
    const opened = window.open(
      OAUTH_AUTH_URL,
      "inkads-cms-oauth",
      "width=600,height=700",
    );
    if (!opened) {
      reject(new Error("Popup blocked. Allow popups for GitHub login."));
      return;
    }
    const popup: Window = opened;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Login timed out. Try again."));
    }, 120_000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent) {
      if (typeof event.data !== "string") return;

      if (event.data === "authorizing:github") {
        // Handshake: confirm our origin so the callback may post the token.
        (event.source as Window | null)?.postMessage(event.data, event.origin);
        return;
      }

      const match = /^authorization:github:(success|error):(.*)$/s.exec(
        event.data,
      );
      if (!match) return;

      cleanup();
      try {
        popup.close();
      } catch {
        // ignore
      }

      const status = match[1];
      const payloadRaw = match[2] ?? "";
      try {
        const payload = JSON.parse(payloadRaw) as {
          token?: string;
          error?: string;
        };
        if (
          status === "success" &&
          typeof payload.token === "string" &&
          payload.token
        ) {
          storeToken(payload.token);
          resolve(payload.token);
          return;
        }
        reject(new Error(payload.error || "GitHub login failed."));
      } catch {
        reject(new Error("GitHub login returned an invalid response."));
      }
    }

    window.addEventListener("message", onMessage);
  });
}
