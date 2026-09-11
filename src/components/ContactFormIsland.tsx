import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  parseEmailFromQuery,
  parseNameFromQuery,
  resolveRoleOption,
  serializeEmailQuery,
  serializeNameQuery,
  serializeRoleQuery,
} from "../lib/form-query-sync";
import { useFormQuerySync } from "../hooks/useFormQuerySync";

const ROLE_OPTIONS = [
  "Venue owner / operator",
  "Advertiser / brand",
  "Other",
] as const;

const ROLE_TO_SUBJECT: Record<string, string> = {
  "Venue owner / operator": "partnership",
  "Advertiser / brand": "sales",
  Other: "general",
};

const FETCH_TIMEOUT_MS = 15_000;
const TEXT_DEBOUNCE_MS = 300;

export type ContactFormIslandProps = {
  successTitle?: string;
  successBody?: string;
  submitLabel?: string;
  privacyHref: string;
  postkitApiBaseUrl?: string;
  initialRole?: string;
  initialName?: string;
  initialEmail?: string;
};

type ContactQueryFields = {
  role: string;
  name: string;
  email: string;
};

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ContactFormIsland({
  successTitle = "Message sent.",
  successBody = "Thank you. We will follow up by email if your enquiry needs a response.",
  submitLabel = "Send message",
  privacyHref,
  postkitApiBaseUrl,
  initialRole = "",
  initialName = "",
  initialEmail = "",
}: ContactFormIslandProps) {
  const fieldConfigs = useMemo(
    () => ({
      role: {
        param: "role",
        parse: (raw: string | null) => resolveRoleOption(raw) ?? "",
        serialize: serializeRoleQuery,
      },
      name: {
        param: "name",
        parse: parseNameFromQuery,
        serialize: serializeNameQuery,
        debounceMs: TEXT_DEBOUNCE_MS,
      },
      email: {
        param: "email",
        parse: parseEmailFromQuery,
        serialize: serializeEmailQuery,
        debounceMs: TEXT_DEBOUNCE_MS,
      },
    }),
    [],
  );

  const initialValues = useMemo(
    () => ({
      role: initialRole,
      name: initialName,
      email: initialEmail,
    }),
    [initialRole, initialName, initialEmail],
  );

  const { values, setField } = useFormQuerySync<ContactQueryFields>(
    fieldConfigs,
    initialValues,
  );

  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus after React commits the success panel (post-await microtasks can race paint).
  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const apiBase = (postkitApiBaseUrl ?? "").replace(/\/$/, "");
  const deliveryConfigured =
    apiBase.length > 0 && apiBase.startsWith("https://");

  async function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setErrorText("");

    const form = formRef.current;
    if (!form) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const name = values.name.trim();
    const companyValue = company.trim();
    const email = values.email.trim();
    const role = values.role.trim();
    const messageBody = message.trim();

    const trimmedRequired: Array<{
      el: HTMLInputElement | HTMLTextAreaElement | null;
      value: string;
      label: string;
    }> = [
      { el: nameRef.current, value: name, label: "Name" },
      { el: companyRef.current, value: companyValue, label: "Venue / company" },
      { el: messageRef.current, value: messageBody, label: "Message" },
    ];
    for (const field of trimmedRequired) {
      if (!field.el) continue;
      if (field.value.length === 0) {
        field.el.setCustomValidity(`${field.label} is required.`);
        field.el.reportValidity();
        field.el.setCustomValidity("");
        return;
      }
      field.el.setCustomValidity("");
    }

    if (!deliveryConfigured) {
      setErrorText(
        "Contact delivery is not configured. Email hello@inkads.poc.singletonsd.com instead.",
      );
      return;
    }

    const subject = ROLE_TO_SUBJECT[role] ?? "general";
    const messagePayload = `Venue / company: ${companyValue}\n\n${messageBody}`;
    const isPreview = location.pathname.includes("/pr-preview/");

    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${apiBase}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(isPreview ? { "X-PostKit-Contact-Preview": "true" } : {}),
        },
        credentials: "omit",
        signal: controller.signal,
        body: JSON.stringify({
          name,
          email,
          subject,
          message: messagePayload,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          setErrorText("Please check the highlighted fields and try again.");
        } else if (response.status === 429) {
          setErrorText(
            "Too many messages were sent. Please wait a minute and try again.",
          );
        } else if (response.status >= 500) {
          setErrorText(
            "Delivery is temporarily unavailable. Please try again later.",
          );
        } else {
          setErrorText(
            "We could not send your message. Please try again shortly.",
          );
        }
        return;
      }

      setSubmitted(true);
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      setErrorText(
        timedOut
          ? "Delivery is temporarily unavailable. Please try again later."
          : "We could not reach the server. Check your connection and try again.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  const configError = !deliveryConfigured
    ? "Contact delivery is not configured. Email hello@inkads.poc.singletonsd.com instead."
    : "";

  return (
    <div className="contact-form-shell" data-contact-form="">
      {!submitted ? (
        <form
          ref={formRef}
          className="contact-form"
          data-contact-form-fields=""
          noValidate
          onSubmit={onSubmit}
        >
          <div className="contact-form__row">
            <Field id="contact-name" label="Name">
              <input
                ref={nameRef}
                className="field-control"
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </Field>
            <Field id="contact-company" label="Venue / company">
              <input
                ref={companyRef}
                className="field-control"
                id="contact-company"
                name="company"
                type="text"
                required
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </Field>
          </div>
          <Field id="contact-email" label="Email">
            <input
              className="field-control"
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Field>
          <Field id="contact-role" label="I am a…">
            <select
              className="field-control"
              id="contact-role"
              name="role"
              required
              value={values.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              <option value="" disabled>
                Select an option
              </option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="contact-message"
            label="Tell us about your space or campaign"
          >
            <textarea
              ref={messageRef}
              className="field-control"
              id="contact-message"
              name="message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <p className="contact-form__privacy">
            See our{" "}
            <a className="text-link" href={privacyHref}>
              <span>Privacy Policy</span>
              <span aria-hidden="true">→</span>
            </a>{" "}
            for how we handle contact submissions.
          </p>
          <p
            className="contact-form__error"
            hidden={!(errorText || configError)}
            role="alert"
            data-contact-form-error=""
          >
            {errorText || configError}
          </p>
          <button
            className="button-link button-link--primary button-link--block"
            type="submit"
            data-contact-form-submit=""
            disabled={submitting || !deliveryConfigured}
          >
            {submitLabel}
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
