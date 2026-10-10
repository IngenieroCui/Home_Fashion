import type { ComponentProps } from 'react';
import { Button } from './button';
export function IconButton({
  label,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'aria-label'> & { label: string }) {
  return (
    <Button
      {...props}
      aria-label={label}
      title={label}
      className={`ui-icon-button ${props.className ?? ''}`}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  );
}
