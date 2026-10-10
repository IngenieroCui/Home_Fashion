'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { IconButton } from './icon-button';
type Tone = 'success' | 'error' | 'info';
type Notice = { id: number; message: string; tone: Tone };
type Notify = (message: string, tone?: Tone) => void;
const Feedback = createContext<Notify | null>(null);
function Toast({ notice, dismiss }: { notice: Notice; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(notice.id), notice.tone === 'error' ? 10000 : 6000);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);
  return (
    <div className={`ui-toast ui-toast-${notice.tone}`}>
      <span>{notice.message}</span>
      <IconButton label="Cerrar aviso" variant="ghost" onClick={() => dismiss(notice.id)}>
        ×
      </IconButton>
    </div>
  );
}
export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const notify = useCallback<Notify>(
    (message, tone = 'success') =>
      setNotices((current) => [
        ...current.slice(-3),
        { id: Date.now() + Math.random(), message, tone }
      ]),
    []
  );
  const dismiss = useCallback(
    (id: number) => setNotices((current) => current.filter((notice) => notice.id !== id)),
    []
  );
  return (
    <Feedback.Provider value={notify}>
      {children}
      <div className="ui-toasts" aria-live="polite" aria-atomic="false" aria-relevant="additions">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} dismiss={dismiss} />
        ))}
      </div>
    </Feedback.Provider>
  );
}
export function useActionFeedback() {
  const notify = useContext(Feedback);
  if (!notify) throw new Error('ActionFeedbackProvider is required');
  return notify;
}
