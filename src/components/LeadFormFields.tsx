import type { ReactNode } from "react";

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

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="contact-form__error" role="alert">
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
  return (
    <div className="lead-form__honeypot" aria-hidden="true">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register}
      />
      <FieldError message={error} />
    </div>
  );
}
