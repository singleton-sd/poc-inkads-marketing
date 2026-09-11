import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CONTACT_ROLE_OPTIONS,
  contactFormQuerySchema,
  contactFormQuerySerializers,
  contactFormSchema,
  subjectFromRole,
  type ContactFormDefaultValues,
  type ContactFormQueryValues,
  type ContactFormValues,
  type ContactRole,
} from "../lib/contact-form-schema";
import { useZodFormQuerySync } from "../hooks/useZodFormQuerySync";

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
    default:
      return { status: "idle" };
  }
}

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="contact-form__error" role="alert">
      {message}
    </p>
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
  const successRef = useRef<HTMLDivElement>(null);
  const [submitState, dispatch] = useReducer(submitReducer, {
    status: "idle",
  });

  const defaultValues = useMemo<ContactFormDefaultValues>(
    () => ({
      name: initialName,
      company: "",
      email: initialEmail,
      role: (initialRole as ContactRole | "") || "",
      message: "",
    }),
    [initialRole, initialName, initialEmail],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const apiBase = (postkitApiBaseUrl ?? "").replace(/\/$/, "");
  const deliveryConfigured =
    apiBase.length > 0 && apiBase.startsWith("https://");

  const configError = !deliveryConfigured
    ? "Contact delivery is not configured. Email hello@inkads.poc.singletonsd.com instead."
    : "";

  const submitError = submitState.status === "error" ? submitState.message : "";

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

    const subject = subjectFromRole(values.role);
    const messagePayload = `Venue / company: ${values.company}\n\n${values.message}`;
    const isPreview = location.pathname.includes("/pr-preview/");

    dispatch({ type: "submit" });
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
          name: values.name,
          email: values.email,
          subject,
          message: messagePayload,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          dispatch({
            type: "error",
            message: "Please check the highlighted fields and try again.",
          });
        } else if (response.status === 429) {
          dispatch({
            type: "error",
            message:
              "Too many messages were sent. Please wait a minute and try again.",
          });
        } else if (response.status >= 500) {
          dispatch({
            type: "error",
            message:
              "Delivery is temporarily unavailable. Please try again later.",
          });
        } else {
          dispatch({
            type: "error",
            message:
              "We could not send your message. Please try again shortly.",
          });
        }
        return;
      }

      dispatch({ type: "success" });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      dispatch({
        type: "error",
        message: timedOut
          ? "Delivery is temporarily unavailable. Please try again later."
          : "We could not reach the server. Check your connection and try again.",
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  const submitting = submitState.status === "submitting";

  return (
    <div className="contact-form-shell" data-contact-form="">
      {!submitted ? (
        <form
          className="contact-form"
          data-contact-form-fields=""
          noValidate
          onSubmit={handleSubmit(onValidSubmit)}
        >
          <div className="contact-form__row">
            <Field id="contact-name" label="Name">
              <input
                className="field-control"
                id="contact-name"
                type="text"
                autoComplete="name"
                aria-invalid={errors.name ? "true" : undefined}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </Field>
            <Field id="contact-company" label="Venue / company">
              <input
                className="field-control"
                id="contact-company"
                type="text"
                autoComplete="organization"
                aria-invalid={errors.company ? "true" : undefined}
                {...register("company")}
              />
              <FieldError message={errors.company?.message} />
            </Field>
          </div>
          <Field id="contact-email" label="Email">
            <input
              className="field-control"
              id="contact-email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? "true" : undefined}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </Field>
          <Field id="contact-role" label="I am a…">
            <select
              className="field-control"
              id="contact-role"
              aria-invalid={errors.role ? "true" : undefined}
              {...register("role")}
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
            <FieldError message={errors.role?.message} />
          </Field>
          <Field
            id="contact-message"
            label="Tell us about your space or campaign"
          >
            <textarea
              className="field-control"
              id="contact-message"
              rows={5}
              aria-invalid={errors.message ? "true" : undefined}
              {...register("message")}
            />
            <FieldError message={errors.message?.message} />
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
            hidden={!(submitError || configError)}
            role="alert"
            data-contact-form-error=""
          >
            {submitError || configError}
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
