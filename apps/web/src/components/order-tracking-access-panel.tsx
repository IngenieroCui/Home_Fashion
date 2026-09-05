'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useCallback, useEffect, useState } from 'react';
import {
  formatTrackingDateTime,
  type CreateOrRotateTrackingResponse,
  type TrackingAccessStatus
} from '@/lib/order-tracking';

type GeneratedLink = { url: string; createdAt?: string; rotatedAt?: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await clientFetch(url, init);
  const body = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'No fue posible completar la operación.';
    throw new Error(message);
  }
  return body as T;
}

function accessLabel(status: TrackingAccessStatus) {
  if (!status.exists) return 'Sin enlace';
  if (!status.active) return 'Revocado';
  if (status.expiresAt && new Date(status.expiresAt).getTime() <= Date.now()) return 'Expirado';
  return 'Vigente';
}

function TrackingLinkResult({ link, onDismiss }: { link: GeneratedLink; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    setCopied(false);
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <section className="tracking-link-result" aria-live="polite">
      <div>
        <h3 className="font-serif text-xl">Enlace recién generado</h3>
        <p>Guárdalo ahora: solo podrá verse completo durante esta sesión.</p>
      </div>
      <input aria-label="Enlace de seguimiento" readOnly value={link.url} />
      <div className="admin-actions">
        <button className="button-link" onClick={() => void copy()} type="button">
          Copiar enlace
        </button>
        <button className="text-link" onClick={onDismiss} type="button">
          Ocultar enlace
        </button>
      </div>
      {copied && (
        <p className="admin-success" role="status">
          Enlace copiado.
        </p>
      )}
      {copyError && (
        <p className="notice" role="status">
          No se pudo copiar automáticamente. Selecciona el enlace para copiarlo manualmente.
        </p>
      )}
    </section>
  );
}

export function OrderTrackingAccessPanel({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<TrackingAccessStatus | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [generated, setGenerated] = useState<GeneratedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRotation, setConfirmRotation] = useState(false);
  const [confirmRevocation, setConfirmRevocation] = useState(false);

  const statusUrl = `/api/admin/orders/${encodeURIComponent(orderId)}/tracking-access`;
  const refresh = useCallback(async () => {
    const value = await request<TrackingAccessStatus>(statusUrl);
    setStatus(value);
    if (value.exists && value.expiresAt) {
      const date = new Date(value.expiresAt);
      if (!Number.isNaN(date.getTime())) {
        const offset = date.getTimezoneOffset() * 60_000;
        setExpiresAt(new Date(date.getTime() - offset).toISOString().slice(0, 16));
      }
    }
  }, [statusUrl]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'No fue posible cargar el seguimiento.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function generate() {
    const localDate = expiresAt ? new Date(expiresAt) : null;
    if (expiresAt && (!localDate || Number.isNaN(localDate.getTime()))) {
      setError('Ingresa una fecha de expiración válida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await request<CreateOrRotateTrackingResponse>(statusUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(localDate ? { expiresAt: localDate.toISOString() } : {})
      });
      setGenerated({
        url: `${window.location.origin}${result.path}`,
        createdAt: result.createdAt,
        rotatedAt: result.rotatedAt
      });
      setConfirmRotation(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible generar el enlace.');
    } finally {
      setSaving(false);
    }
  }

  async function revoke() {
    setSaving(true);
    setError(null);
    try {
      const value = await request<TrackingAccessStatus>(`${statusUrl}/revoke`, { method: 'POST' });
      setStatus(value);
      setGenerated(null);
      setConfirmRevocation(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible revocar el enlace.');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <section className="admin-section">
        <p className="notice">Cargando seguimiento del cliente…</p>
      </section>
    );
  if (!status)
    return (
      <section className="admin-section">
        <p className="form-error" role="alert">
          {error ?? 'No fue posible cargar el seguimiento.'}
        </p>
      </section>
    );
  const exists = status.exists;
  const label = accessLabel(status);
  return (
    <section className="admin-section tracking-access-panel">
      <div className="admin-section-title">
        <div>
          <p className="eyebrow">Acceso privado</p>
          <h2 className="font-serif text-2xl">Seguimiento del cliente</h2>
        </div>
        <span className={`tracking-status tracking-status-${label.toLowerCase()}`}>{label}</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!exists ? (
        <p className="notice">Aún no hay un enlace de seguimiento para este pedido.</p>
      ) : (
        <div className="tracking-status-details">
          <p>
            Identificador del enlace: <strong>{status.tokenPrefix}</strong>…
          </p>
          <p>Creado: {formatTrackingDateTime(status.createdAt)}</p>
          {status.rotatedAt && <p>Última rotación: {formatTrackingDateTime(status.rotatedAt)}</p>}
          {status.revokedAt && <p>Revocado: {formatTrackingDateTime(status.revokedAt)}</p>}
          <p>Expira: {formatTrackingDateTime(status.expiresAt)}</p>
          {!status.active && (
            <p className="notice">
              El cliente ya no puede consultar este enlace. Puedes generar uno nuevo para
              reactivarlo.
            </p>
          )}
        </div>
      )}
      <label className="form-field">
        Expiración opcional
        <input
          onChange={(event) => setExpiresAt(event.target.value)}
          type="datetime-local"
          value={expiresAt}
        />
      </label>
      {generated && <TrackingLinkResult link={generated} onDismiss={() => setGenerated(null)} />}
      {exists && status.active && !confirmRevocation && (
        <button
          className="button-link button-link-secondary"
          disabled={saving}
          onClick={() => setConfirmRevocation(true)}
          type="button"
        >
          Revocar enlace
        </button>
      )}
      {confirmRevocation && (
        <div className="tracking-confirm">
          <p>El cliente dejará de poder consultar este enlace. Esta acción no borra el pedido.</p>
          <div className="admin-actions">
            <button
              className="button-link"
              disabled={saving}
              onClick={() => void revoke()}
              type="button"
            >
              {saving ? 'Revocando…' : 'Confirmar revocación'}
            </button>
            <button
              className="text-link"
              disabled={saving}
              onClick={() => setConfirmRevocation(false)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {!exists ? (
        <button
          className="button-link"
          disabled={saving}
          onClick={() => void generate()}
          type="button"
        >
          {saving ? 'Generando…' : 'Generar enlace de seguimiento'}
        </button>
      ) : (
        !confirmRotation && (
          <button
            className="button-link"
            disabled={saving}
            onClick={() => setConfirmRotation(true)}
            type="button"
          >
            Generar un enlace nuevo
          </button>
        )
      )}
      {confirmRotation && (
        <div className="tracking-confirm">
          <p>
            El enlace anterior dejará de funcionar inmediatamente. El nuevo enlace solo será visible
            una vez.
          </p>
          <div className="admin-actions">
            <button
              className="button-link"
              disabled={saving}
              onClick={() => void generate()}
              type="button"
            >
              {saving ? 'Generando…' : 'Generar enlace nuevo'}
            </button>
            <button
              className="text-link"
              disabled={saving}
              onClick={() => setConfirmRotation(false)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
