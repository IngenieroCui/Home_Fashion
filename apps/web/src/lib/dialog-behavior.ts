/** Shared native-dialog behavior also used by imperative confirmations. */
export function installDialogBehavior(dialog: HTMLDialogElement) {
  let previous: HTMLElement | null =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let modalOpen = dialog.open;
  const observer = new MutationObserver(() => {
    if (
      dialog.open &&
      !modalOpen &&
      document.activeElement instanceof HTMLElement &&
      !dialog.contains(document.activeElement)
    )
      previous = document.activeElement;
    modalOpen = dialog.open;
  });
  observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  const restore = () => {
    if (previous?.isConnected) previous.focus();
  };
  const backdrop = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
    }
  };
  // Capture focus before showModal moves it inside the dialog.
  const remember = (event: FocusEvent) => {
    if (!dialog.open && event.target instanceof HTMLElement) previous = event.target;
  };
  document.addEventListener('focusin', remember);
  dialog.addEventListener('close', restore);
  dialog.addEventListener('click', backdrop);
  return () => {
    observer.disconnect();
    document.removeEventListener('focusin', remember);
    dialog.removeEventListener('close', restore);
    dialog.removeEventListener('click', backdrop);
    restore();
  };
}
