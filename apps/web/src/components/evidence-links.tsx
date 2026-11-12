'use client';
import { Dialog } from './ui/dialog';
import { useRef, useState } from 'react';
import { cloudinaryImageUrl } from '@/lib/cloudinary';

function safeUrl(url: string) {
  try {
    return ['https:', 'http:', 'blob:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
function isImage(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'blob:' ||
      /\.(jpe?g|png|webp|gif|avif)$/i.test(parsed.pathname) ||
      parsed.pathname.includes('/image/upload/')
    );
  } catch {
    return false;
  }
}
function EvidenceThumbnail({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span>Ver imagen {index + 1}</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`Evidencia ${index + 1}`}
      loading="lazy"
      onError={() => setFailed(true)}
      src={cloudinaryImageUrl(url, { width: 200 })}
    />
  );
}
export function EvidenceLinks({
  urls,
  title = 'Evidencias'
}: {
  urls: string[] | null | undefined;
  title?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);
  const safe = [...new Set(urls ?? [])].filter(safeUrl);
  const images = safe.filter(isImage);
  const move = (direction: number) => {
    setFailed(false);
    setSelected((index) => (index + direction + images.length) % images.length);
  };
  if (!safe.length) return null;
  return (
    <section className="evidence-section">
      <h3 className="font-serif text-xl">{title}</h3>
      <div className="evidence-thumbnails">
        {safe.map((url, index) =>
          isImage(url) ? (
            <button
              type="button"
              aria-label={`Ampliar evidencia ${index + 1}`}
              key={url}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(images.indexOf(url));
                setFailed(false);
                dialog.current?.showModal();
              }}
            >
              <EvidenceThumbnail url={url} index={index} />
            </button>
          ) : (
            <a className="text-link" href={url} rel="noopener noreferrer" target="_blank" key={url}>
              Abrir evidencia {index + 1}
            </a>
          )
        )}
      </div>
      <Dialog
        ref={dialog}
        className="evidence-dialog"
        aria-label="Visor de evidencias"
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <button
          autoFocus
          className="dialog-close"
          type="button"
          aria-label="Cerrar visor"
          onClick={() => dialog.current?.close()}
        >
          ✕
        </button>
        {images[selected] &&
          (failed ? (
            <p role="status">
              No pudimos cargar la imagen.{' '}
              <a href={images[selected]} target="_blank" rel="noopener noreferrer">
                Abrir archivo
              </a>
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Evidencia ${selected + 1}`}
              src={cloudinaryImageUrl(images[selected], { width: 1500 })}
              onError={() => setFailed(true)}
            />
          ))}
        <div className="evidence-controls">
          <button
            type="button"
            aria-label="Evidencia anterior"
            disabled={images.length < 2}
            onClick={() => move(-1)}
          >
            ←
          </button>
          <span aria-live="polite">
            {selected + 1} / {images.length}
          </span>
          <button
            type="button"
            aria-label="Evidencia siguiente"
            disabled={images.length < 2}
            onClick={() => move(1)}
          >
            →
          </button>
        </div>
      </Dialog>
    </section>
  );
}
