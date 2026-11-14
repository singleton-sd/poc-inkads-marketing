const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

export type TurnstileApi = {
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window !== "undefined" && window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Turnstile requires a browser."));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-lead-turnstile-script]",
    );
    const onReady = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      reject(new Error("Turnstile failed to load."));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile failed to load.")),
        { once: true },
      );
      if (window.turnstile) onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.dataset.leadTurnstileScript = "";
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Turnstile failed to load.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return scriptPromise;
}
