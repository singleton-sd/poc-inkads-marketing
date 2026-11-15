import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import {
  CONTACT_ROLE_OPTIONS,
  SAFE_COMPANY_MAX,
  SAFE_EMAIL_MAX,
  SAFE_MESSAGE_MAX,
  SAFE_NAME_MAX,
  SAFE_PHONE_MAX,
  contactFormQuerySchema,
  contactFormQuerySerializers,
  contactFormSchema,
  type ContactFormDefaultValues,
  type ContactFormQueryValues,
  type ContactFormValues,
  type ContactRole,
} from "../lib/contact-form-schema";
import {
  buildLeadRequest,
  leadAttemptFingerprint,
  newSubmissionId,
  sourcePageFromLocation,
  submissionIdForAttempt,
  submitLeadRequest,
} from "../lib/lead-intake";
import { useZodFormQuerySync } from "../hooks/useZodFormQuerySync";
import {
  Field,
  FieldError,
  HoneypotField,
  fieldErrorId,
} from "./LeadFormFields";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";

const TEXT_DEBOUNCE_MS = 300;

const CONTACT_FOCUS_ORDER = [
  "name",
  "company",
  "email",
  "phone",
  "role",
  "message",
  "consent",
] as const;

export type ContactFormIslandProps = {
  successTitle?: string;
  successBody?: string;
  submitLabel?: string;
  privacyHref: string;
  waitlistHref: string;
  turnstileSiteKey?: string;
  initialRole?: string;
  initialName?: string;
  initialEmail?: string;
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

export default function ContactFormIsland({
  successTitle = "Message sent.",
  successBody = "Thank you. We will follow up by email if your enquiry needs a response.",
  submitLabel = "Send message",
  privacyHref,
  waitlistHref,
  turnstileSiteKey = "",
  initialRole = "",
  initialName = "",
  initialEmail = "",
}: ContactFormIslandProps) {
  const successRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const submissionIdRef = useRef(newSubmissionId());
  const fingerprintRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState("");
  const [submitState, dispatch] = useReducer(submitReducer, {
    status: "idle",
  });

  const defaultValues = useMemo<ContactFormDefaultValues>(
    () => ({
      name: initialName,
      company: "",
      phone: "",
      email: initialEmail,
      role: (initialRole as ContactRole | "") || "",
      message: "",
      consent: false,
      marketingOptIn: false,
      website: "",
    }),
    [initialRole, initialName, initialEmail],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: defaultValues as ContactFormValues,
    mode: "onSubmit",
  });

  const nameValue = watch("name");
  const emailValue = watch("email");
  const roleValue = watch("role");
  const queryValues = useMemo<ContactFormQueryValues>(
    () => ({
      name: nameValue ?? "",
      email: emailValue ?? "",
      role: (roleValue as ContactRole | "") || "",
    }),
    [nameValue, emailValue, roleValue],
  );

  useZodFormQuerySync({
    schema: contactFormQuerySchema,
    values: queryValues,
    onUrlValues: (next) => {
      setValue("name", next.name, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue("email", next.email, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue("role", next.role as ContactFormValues["role"], {
        shouldDirty: false,
        shouldValidate: false,
      });
    },
    serialize: contactFormQuerySerializers,
    debounceMs: { name: TEXT_DEBOUNCE_MS, email: TEXT_DEBOUNCE_MS },
  });

  const submitted = submitState.status === "success";

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const siteKey = turnstileSiteKey.trim();
  const deliveryConfigured = siteKey.length > 0;
  const configError = !deliveryConfigured
    ? "Contact delivery is not configured. Email hello@inkads.poc.singletonsd.com instead."
    : "";
  const submitError = submitState.status === "error" ? submitState.message : "";
  const formAlert = submitError || configError || turnstileError;

  function onInvalid(formErrors: FieldErrors<ContactFormValues>) {
    for (const name of CONTACT_FOCUS_ORDER) {
      if (formErrors[name]) {
        setFocus(name);
        return;
      }
    }
  }

  async function onValidSubmit(values: ContactFormValues) {
    dispatch({ type: "resetError" });

    if (!deliveryConfigured) {
      dispatch({
        type: "error",
        message:
          "Contact delivery is not configured. Email hello@inkads.poc.singletonsd.com instead.",
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
    const sourcePage = sourcePageFromLocation(
      window.location.pathname,
      import.meta.env.BASE_URL,
    );
    const fingerprint = leadAttemptFingerprint({
      formType: "contact",
      name: values.name,
      email: values.email,
      company: values.company,
      phone: values.phone,
      message: values.message,
      role: values.role,
      consent: true,
      marketingOptIn: values.marketingOptIn,
      website: values.website,
      sourcePage,
    });
    const next = submissionIdForAttempt(
      submissionIdRef.current,
      fingerprintRef.current,
      fingerprint,
    );
    submissionIdRef.current = next.submissionId;
    fingerprintRef.current = fingerprint;

    const payload = buildLeadRequest({
      formType: "contact",
      submissionId: next.submissionId,
      name: values.name,
      email: values.email,
      company: values.company,
      phone: values.phone,
      message: values.message,
      role: values.role,
      consent: true,
      marketingOptIn: values.marketingOptIn,
      turnstileToken,
      website: values.website,
      sourcePage,
    });
    const result = await submitLeadRequest(payload);

    if (result.ok) {
      submissionIdRef.current = newSubmissionId();
      fingerprintRef.current = null;
      dispatch({ type: "success" });
      return;
    }

    turnstileRef.current?.reset();
    dispatch({ type: "error", message: result.message });
  }

  const submitting = submitState.status === "submitting";
  const canSubmit =
    deliveryConfigured && Boolean(turnstileToken) && !submitting;

  return (
    <div className="contact-form-shell" data-contact-form="">
      {!submitted ? (
        <form
          className="contact-form"
          data-contact-form-fields=""
          noValidate
          onSubmit={handleSubmit(onValidSubmit, onInvalid)}
        >
          <div className="contact-form__row">
            <Field id="contact-name" label="Name">
              <input
                className="field-control"
                id="contact-name"
                type="text"
                autoComplete="name"
                maxLength={SAFE_NAME_MAX}
                {...register("name")}
                aria-invalid={errors.name ? "true" : undefined}
                aria-describedby={
                  errors.name ? fieldErrorId("contact-name") : undefined
                }
              />
              <FieldError
                id={fieldErrorId("contact-name")}
                message={errors.name?.message}
              />
            </Field>
            <Field id="contact-company" label="Venue / company">
              <input
                className="field-control"
                id="contact-company"
                type="text"
                autoComplete="organization"
                maxLength={SAFE_COMPANY_MAX}
                {...register("company")}
                aria-invalid={errors.company ? "true" : undefined}
                aria-describedby={
                  errors.company ? fieldErrorId("contact-company") : undefined
                }
              />
              <FieldError
                id={fieldErrorId("contact-company")}
                message={errors.company?.message}
              />
            </Field>
          </div>
          <div className="contact-form__row">
            <Field id="contact-email" label="Email">
              <input
                className="field-control"
                id="contact-email"
                type="email"
                autoComplete="email"
                maxLength={SAFE_EMAIL_MAX}
                {...register("email")}
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={
                  errors.email ? fieldErrorId("contact-email") : undefined
                }
              />
              <FieldError
                id={fieldErrorId("contact-email")}
                message={errors.email?.message}
              />
            </Field>
            <Field id="contact-phone" label="Phone">
              <input
                className="field-control"
                id="contact-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={SAFE_PHONE_MAX}
                {...register("phone")}
                aria-invalid={errors.phone ? "true" : undefined}
                aria-describedby={
                  errors.phone ? fieldErrorId("contact-phone") : undefined
                }
              />
              <FieldError
                id={fieldErrorId("contact-phone")}
                message={errors.phone?.message}
              />
            </Field>
          </div>
          <Field id="contact-role" label="I am a…">
            <select
              className="field-control"
              id="contact-role"
              {...register("role")}
              aria-invalid={errors.role ? "true" : undefined}
              aria-describedby={
                errors.role ? fieldErrorId("contact-role") : undefined
              }
            >
              <option value="" disabled>
                Select an option
              </option>
              {CONTACT_ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError
              id={fieldErrorId("contact-role")}
              message={errors.role?.message}
            />
          </Field>
          <Field
            id="contact-message"
            label="Tell us about your space or campaign"
          >
            <textarea
              className="field-control"
              id="contact-message"
              rows={5}
              maxLength={SAFE_MESSAGE_MAX}
              {...register("message")}
              aria-invalid={errors.message ? "true" : undefined}
              aria-describedby={
                errors.message ? fieldErrorId("contact-message") : undefined
              }
            />
            <FieldError
              id={fieldErrorId("contact-message")}
              message={errors.message?.message}
            />
          </Field>
          <HoneypotField
            id="contact-website"
            register={register("website")}
            error={errors.website?.message}
          />
          <label className="lead-form__check">
            <input
              id="contact-consent"
              type="checkbox"
              {...register("consent")}
              aria-invalid={errors.consent ? "true" : undefined}
              aria-describedby={
                errors.consent ? fieldErrorId("contact-consent") : undefined
              }
            />
            <span>
              I have read the{" "}
              <a className="text-link" href={privacyHref}>
                <span>Privacy Policy</span>
                <span aria-hidden="true">→</span>
              </a>{" "}
              and agree to be contacted about this enquiry.
            </span>
          </label>
          <FieldError
            id={fieldErrorId("contact-consent")}
            message={errors.consent?.message}
          />
          <label className="lead-form__check">
            <input
              id="contact-marketing"
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
            Prefer a shorter signup?{" "}
            <a className="text-link" href={waitlistHref}>
              <span>Join the waitlist</span>
              <span aria-hidden="true">→</span>
            </a>
          </p>
          <p
            className="contact-form__error"
            hidden={!formAlert}
            role="alert"
            data-contact-form-error=""
          >
            {formAlert}
          </p>
          <button
            className="button-link button-link--primary button-link--block"
            type="submit"
            data-contact-form-submit=""
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
        data-contact-form-success=""
      >
        <h2>{successTitle}</h2>
        <p>{successBody}</p>
      </div>
    </div>
  );
}
