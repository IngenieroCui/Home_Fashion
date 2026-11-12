'use client';
import { cloneElement, useId, type ReactElement } from 'react';
type Control = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};
export function FormField({
  label,
  helper,
  error,
  required,
  children
}: {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  children: ReactElement<Control>;
}) {
  const generated = useId();
  const id = children.props.id ?? generated;
  const description =
    [children.props['aria-describedby'], helper ? `${id}-help` : '', error ? `${id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="ui-form-field">
      <label htmlFor={id}>
        {label}
        {required && <span> (obligatorio)</span>}
      </label>
      {cloneElement(children, {
        id,
        required: required ?? children.props.required,
        'aria-describedby': description,
        'aria-invalid': Boolean(error) || undefined
      })}
      {helper && <small id={`${id}-help`}>{helper}</small>}
      {error && (
        <p id={`${id}-error`} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
