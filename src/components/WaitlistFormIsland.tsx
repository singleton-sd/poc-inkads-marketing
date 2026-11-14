import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  SAFE_COMPANY_MAX,
  SAFE_EMAIL_MAX,
  SAFE_NAME_MAX,
} from "../lib/contact-form-schema";
import {
  buildLeadRequest,
  newSubmissionId,
  sourcePageFromLocation,
  submitLeadRequest,
} from "../lib/lead-intake";
import {
  waitlistFormSchema,
  type WaitlistFormDefaultValues,
  type WaitlistFormValues,
} from "../lib/waitlist-form-schema";
import { Field, FieldError, HoneypotField } from "./LeadFormFields";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";

export type WaitlistFormIslandProps = {
  successTitle?: string;
  successBody?: string;
  submitLabel?: string;
  privacyHref: string;
  contactHref: string;
  turnstileSiteKey?: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

type SubmitAction =
  | { type: "submit" }
  | { type: "success" }
  | { type: "error"; message: string }
  | { type: "resetError" };

function submitReducer(_state: SubmitState, action: SubmitAction): SubmitState {
  switch (action.type) {
    case "submit":
      return { status: "submitting" };
    case "success":
      return { status: "success" };
    case "error":
      return { status: "error", message: action.message };
    case "resetError":
      return { status: "idle" };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export default function WaitlistFormIsland({
  successTitle = "You're on the list.",
  successBody = "Thank you. We will email you if a place opens in the InkAds proof of concept.",
  submitLabel = "Join waitlist",
  privacyHref,
  contactHref,
  turnstileSiteKey = "",
}: WaitlistFormIslandProps) {
  const successRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const submissionIdRef = useRef(newSubmissionId());
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState("");
  const [submitState, dispatch] = useReducer(submitReducer, {
    status: "idle",
  });

  const defaultValues = useMemo<WaitlistFormDefaultValues>(
    () => ({
      name: "",
      email: "",
      company: "",
      consent: false,
      marketingOptIn: false,
      website: "",
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: defaultValues as WaitlistFormValues,
    mode: "onSubmit",
  });

  const submitted = submitState.status === "success";

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const siteKey = turnstileSiteKey.trim();
  const deliveryConfigured = siteKey.length > 0;
  const configError = !deliveryConfigured
    ? "Waitlist signup is not configured. Email hello@inkads.poc.singletonsd.com instead."
    : "";
  const submitError = submitState.status === "error" ? submitState.message : "";
  const formAlert = submitError || configError || turnstileError;

  async function onValidSubmit(values: WaitlistFormValues) {
    dispatch({ type: "resetError" });

    if (!deliveryConfigured) {
      dispatch({
        type: "error",
        message:
          "Waitlist signup is not configured. Email hello@inkads.poc.singletonsd.com instead.",
      });
      return;
    }

    if (!turnstileToken) {
      dispatch({
        type: "error",
        message: "Please complete the verification check.",
      });
      return;
    }

    dispatch({ type: "submit" });
    const payload = buildLeadRequest({
      formType: "waitlist",
      submissionId: submissionIdRef.current,
      name: values.name,
      email: values.email,
      company: values.company,
      consent: true,
      marketingOptIn: values.marketingOptIn,
      turnstileToken,
      website: values.website,
      sourcePage: sourcePageFromLocation(
        window.location.pathname,
        import.meta.env.BASE_URL,
      ),
    });
    const result = await submitLeadRequest(payload);

    if (result.ok) {
      dispatch({ type: "success" });
      return;
    }

    turnstileRef.current?.reset();
    if (result.kind !== "validation") {
      submissionIdRef.current = newSubmissionId();
    }
    dispatch({ type: "error", message: result.message });
  }

  const submitting = submitState.status === "submitting";
  const canSubmit =
    deliveryConfigured && Boolean(turnstileToken) && !submitting;

  return (
    <div className="contact-form-shell" data-waitlist-form="">
      {!submitted ? (
        <form
          className="contact-form"
          data-waitlist-form-fields=""
          noValidate
          onSubmit={handleSubmit(onValidSubmit)}
        >
          <Field id="waitlist-name" label="Name">
            <input
              className="field-control"
              id="waitlist-name"
              type="text"
              autoComplete="name"
              maxLength={SAFE_NAME_MAX}
              aria-invalid={errors.name ? "true" : undefined}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </Field>
          <Field id="waitlist-email" label="Email">
            <input
              className="field-control"
              id="waitlist-email"
              type="email"
              autoComplete="email"
              maxLength={SAFE_EMAIL_MAX}
              aria-invalid={errors.email ? "true" : undefined}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </Field>
          <Field id="waitlist-company" label="Venue / company">
            <input
              className="field-control"
              id="waitlist-company"
              type="text"
              autoComplete="organization"
              maxLength={SAFE_COMPANY_MAX}
              aria-invalid={errors.company ? "true" : undefined}
              {...register("company")}
            />
            <FieldError message={errors.company?.message} />
          </Field>
          <HoneypotField
            id="waitlist-website"
            register={register("website")}
            error={errors.website?.message}
          />
          <label className="lead-form__check">
            <input
              id="waitlist-consent"
              type="checkbox"
              aria-invalid={errors.consent ? "true" : undefined}
              {...register("consent")}
            />
            <span>
              I have read the{" "}
              <a className="text-link" href={privacyHref}>
                <span>Privacy Policy</span>
                <span aria-hidden="true">→</span>
              </a>{" "}
              and agree to join the InkAds waitlist.
            </span>
          </label>
          <FieldError message={errors.consent?.message} />
          <label className="lead-form__check">
            <input
              id="waitlist-marketing"
              type="checkbox"
              {...register("marketingOptIn")}
            />
            <span>
              Optional: send me occasional updates about the InkAds proof of
              concept. Unchecked by default.
            </span>
          </label>
          {deliveryConfigured ? (
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={siteKey}
              onToken={setTurnstileToken}
              onError={setTurnstileError}
            />
          ) : null}
          <p className="contact-form__privacy">
            Need a longer conversation?{" "}
            <a className="text-link" href={contactHref}>
              <span>Request a demo</span>
              <span aria-hidden="true">→</span>
            </a>
          </p>
          <p
            className="contact-form__error"
            hidden={!formAlert}
            role="alert"
            data-waitlist-form-error=""
          >
            {formAlert}
          </p>
          <button
            className="button-link button-link--primary button-link--block"
            type="submit"
            data-waitlist-form-submit=""
            disabled={!canSubmit}
          >
            {submitting ? "Sending…" : submitLabel}
          </button>
        </form>
      ) : null}
      <div
        ref={successRef}
        className="contact-form__success"
        hidden={!submitted}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        data-waitlist-form-success=""
      >
        <h2>{successTitle}</h2>
        <p>{successBody}</p>
      </div>
    </div>
  );
}
