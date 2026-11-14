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

function scriptSelector(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>(
    "script[data-lead-turnstile-script]",
  );
}

export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window !== "undefined" && window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      scriptPromise = null;
      reject(new Error("Turnstile requires a browser."));
      return;
    }

    scriptSelector()?.remove();

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.dataset.leadTurnstileScript = "";

    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      script.remove();
      scriptPromise = null;
      reject(new Error("Turnstile failed to load."));
    };

    script.addEventListener(
      "load",
      () => {
        if (window.turnstile) {
          settled = true;
          resolve(window.turnstile);
          return;
        }
        fail();
      },
      { once: true },
    );
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}
