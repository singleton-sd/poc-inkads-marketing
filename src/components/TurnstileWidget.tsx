import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
} from "react";
import { loadTurnstile } from "../lib/turnstile";

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
};

function TurnstileWidgetInner(
  { siteKey, onToken }: TurnstileWidgetProps,
  ref: ForwardedRef<TurnstileWidgetHandle>,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

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
        widgetIdRef.current = api.render(hostRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current(null);
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
  }, [siteKey]);

  return (
    <div
      className="lead-form__turnstile"
      data-lead-turnstile=""
      ref={hostRef}
    />
  );
}

const TurnstileWidget = forwardRef(TurnstileWidgetInner);
TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
