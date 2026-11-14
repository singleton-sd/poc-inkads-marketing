import type { ReactNode } from "react";

export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

export function Field({
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

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="contact-form__error" role="alert">
      {message}
    </p>
  );
}

export function HoneypotField({
  id,
  register,
  error,
}: {
  id: string;
  register: object;
  error?: string;
}) {
  const errorId = fieldErrorId(id);
  return (
    <div className="lead-form__honeypot" aria-hidden="true">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
