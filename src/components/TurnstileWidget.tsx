import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import { loadTurnstile } from "../lib/turnstile";

export const TURNSTILE_LOAD_ERROR =
  "Verification failed to load. Check your connection and try again, or email hello@inkads.poc.singletonsd.com.";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
};

function TurnstileWidgetInner(
  { siteKey, onToken, onError }: TurnstileWidgetProps,
  ref: ForwardedRef<TurnstileWidgetHandle>,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const [retryNonce, setRetryNonce] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    reset() {
      const api = window.turnstile;
      const widgetId = widgetIdRef.current;
      if (!api || !widgetId) return;
      api.reset(widgetId);
      onTokenRef.current(null);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !siteKey) return undefined;

    void loadTurnstile()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        try {
          widgetIdRef.current = api.render(hostRef.current, {
            sitekey: siteKey,
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          });
          onErrorRef.current?.("");
        } catch {
          onTokenRef.current(null);
          setLoadFailed(true);
          onErrorRef.current?.(TURNSTILE_LOAD_ERROR);
        }
      })
      .catch(() => {
        if (cancelled) return;
        onTokenRef.current(null);
        setLoadFailed(true);
        onErrorRef.current?.(TURNSTILE_LOAD_ERROR);
      });

    return () => {
      cancelled = true;
      const api = window.turnstile;
      const widgetId = widgetIdRef.current;
      if (api && widgetId) {
        api.remove(widgetId);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, retryNonce]);

  return (
    <div className="lead-form__turnstile" data-lead-turnstile="">
      <div ref={hostRef} />
      {loadFailed ? (
        <button
          className="text-link"
          type="button"
          data-lead-turnstile-retry=""
          onClick={() => {
            setLoadFailed(false);
            onErrorRef.current?.("");
            setRetryNonce((value) => value + 1);
          }}
        >
          <span>Retry verification</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : null}
    </div>
  );
}

const TurnstileWidget = forwardRef(TurnstileWidgetInner);
TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
