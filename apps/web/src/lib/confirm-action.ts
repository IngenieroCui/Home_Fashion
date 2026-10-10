'use client';
import { installDialogBehavior } from './dialog-behavior';

/** Native dialog keeps focus inside the confirmation and restores it on close. */
export function confirmAction(message: string, action = 'Confirmar'): Promise<boolean> {
  return new Promise((resolve) => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog ui-dialog';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    const title = document.createElement('h2');
    title.id = 'confirmation-title';
    title.textContent = 'Confirma esta acción';
    const description = document.createElement('p');
    description.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'confirmation-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button-link button-link-secondary';
    cancel.textContent = 'Cancelar';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'button-link';
    accept.textContent = action;
    actions.append(cancel, accept);
    dialog.append(title, description, actions);
    document.body.append(dialog);
    let accepted = false;
    cancel.addEventListener('click', () => dialog.close());
    accept.addEventListener('click', () => {
      accepted = true;
      dialog.close();
    });
    const cleanup = installDialogBehavior(dialog);
    dialog.addEventListener(
      'close',
      () => {
        cleanup();
        dialog.remove();
        previousFocus?.focus();
        resolve(accepted);
      },
      { once: true }
    );
    dialog.showModal();
    cancel.focus();
  });
}
