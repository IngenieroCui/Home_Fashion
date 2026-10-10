import Link from 'next/link';
import type { ComponentProps, ButtonHTMLAttributes } from 'react';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const styles = (variant: ButtonVariant) =>
  `button-link ui-button ui-button-${variant}${variant === 'secondary' ? ' button-link-secondary' : ''}`;
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles(variant)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={`${styles(variant)} ${className}`} />;
}
