'use client';
import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  type DialogHTMLAttributes
} from 'react';
import { installDialogBehavior } from '@/lib/dialog-behavior';
type Props = DialogHTMLAttributes<HTMLDialogElement> & {
  open?: boolean;
  onDismiss?: () => void;
} & (
    | { 'aria-label': string; 'aria-labelledby'?: string }
    | { 'aria-labelledby': string; 'aria-label'?: string }
  );
export const Dialog = forwardRef<HTMLDialogElement, Props>(function Dialog(
  { open, onDismiss, children, className = '', ...props },
  forwardedRef
) {
  const ref = useRef<HTMLDialogElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current!, []);
  useEffect(() => (ref.current ? installDialogBehavior(ref.current) : undefined), []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || open === undefined) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      className={`ui-dialog ${className}`}
      onClose={(event) => {
        props.onClose?.(event);
        onDismiss?.();
      }}
    >
      {children}
    </dialog>
  );
});
