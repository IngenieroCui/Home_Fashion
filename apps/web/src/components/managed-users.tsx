'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import { usePageData } from '@/lib/use-page-data';
import { AdminRecordCard } from './admin-record-card';
import { ListError, PageState } from './page-state';
import { Dialog } from './ui/dialog';
import { FormField } from './ui/form-field';
import { LoadingState } from './ui/loading-state';
import { PageHeader } from './ui/page-header';
import { StatusBadge } from './ui/status-badge';
import { useActionFeedback } from './ui/action-feedback';

const roles = ['ADMIN', 'EMPLOYEE', 'WORKSHOP'] as const;
type Role = (typeof roles)[number];
const roleLabels: Record<Role, string> = {
  ADMIN: 'Administración',
  EMPLOYEE: 'Equipo interno',
  WORKSHOP: 'Taller'
};
type Account = { id: string; fullName: string; email: string; role: Role; active: boolean };
type UsersPage = {
  data: Account[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
type Editor = { mode: 'create' } | { mode: 'edit' | 'password'; account: Account } | null;

const roleLabel = (role: string) => roleLabels[role as Role] ?? role;

async function save(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const response = await clientFetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message;
    throw new Error(
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? 'Revisa los datos de la cuenta.'
          : 'No se pudo guardar la cuenta.'
    );
  }
  return payload as Account;
}

export function ManagedUsers({ actorId }: { actorId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const notify = useActionFeedback();
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const query = new URLSearchParams(search.toString());
  if (!query.has('limit')) query.set('limit', '25');
  const { page, error, retry } = usePageData<UsersPage>(`/api/admin/users?${query}`);
  const isSelf = (account: Account) => String(account.id) === String(actorId);
  const filtered = ['q', 'role', 'active'].some((key) => search.get(key));

  function navigate(params: URLSearchParams) {
    router.push(`/panel/usuarios${params.size ? `?${params}` : ''}`);
  }
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'role', 'active']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    navigate(params);
  }
  function changePage(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    navigate(params);
  }
  async function toggleActive(account: Account) {
    const activating = !account.active;
    if (
      !(await confirmAction(
        activating
          ? `¿Activar la cuenta de ${account.fullName}? Podrá iniciar sesión de nuevo.`
          : `¿Desactivar la cuenta de ${account.fullName}? Se cerrarán sus sesiones y no podrá ingresar.`,
        activating ? 'Activar cuenta' : 'Desactivar cuenta'
      ))
    )
      return;
    setBusy(account.id);
    try {
      await save(`/api/admin/users/${encodeURIComponent(account.id)}`, 'PATCH', {
        active: activating
      });
      notify(
        activating ? 'Cuenta activada.' : 'Cuenta desactivada y sesiones cerradas.',
        'success'
      );
      retry();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : 'No se pudo actualizar la cuenta.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  }

  const actions = (account: Account) =>
    isSelf(account) ? (
      <span className="managed-users-self-note">Gestiona tu cuenta con otro administrador</span>
    ) : (
      <div className="managed-users-actions">
        <button
          className="button-link button-link-secondary"
          onClick={() => setEditor({ mode: 'edit', account })}
          type="button"
        >
          Editar<span className="sr-only"> {account.fullName}</span>
        </button>
        <button
          className="button-link button-link-secondary"
          onClick={() => setEditor({ mode: 'password', account })}
          type="button"
        >
          Contraseña<span className="sr-only"> de {account.fullName}</span>
        </button>
        <button
          className={`button-link ${account.active ? 'ui-button-danger-outline' : 'button-link-secondary'}`}
          disabled={busy === account.id}
          onClick={() => toggleActive(account)}
          type="button"
        >
          {busy === account.id ? 'Guardando…' : account.active ? 'Desactivar' : 'Activar'}
          <span className="sr-only"> {account.fullName}</span>
        </button>
      </div>
    );
  const status = (account: Account) => (
    <StatusBadge tone={account.active ? 'success' : 'neutral'}>
      {account.active ? 'Activa' : 'Inactiva'}
    </StatusBadge>
  );
  const name = (account: Account) => (
    <span className="managed-users-name">
      <strong>{account.fullName}</strong>
      {isSelf(account) && <span className="tag">Tu cuenta</span>}
    </span>
  );

  return (
    <div className="admin-stack managed-users">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description={
          <p className="admin-heading-description">
            Crea cuentas para el equipo, ajusta su rol y controla el acceso. Los cambios de rol,
            estado o contraseña cierran las sesiones abiertas de la cuenta.
          </p>
        }
        action={
          <button
            className="button-link"
            onClick={() => setEditor({ mode: 'create' })}
            type="button"
          >
            Crear cuenta
          </button>
        }
      />
      <form
        key={search.toString()}
        className="admin-filters managed-users-filters"
        onSubmit={filter}
      >
        <label className="managed-users-search">
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Nombre o correo"
            type="search"
            maxLength={254}
          />
        </label>
        <label>
          Rol
          <select defaultValue={search.get('role') ?? ''} name="role">
            <option value="">Todos</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select defaultValue={search.get('active') ?? ''} name="active">
            <option value="">Todos</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </label>
        <div className="managed-users-filter-actions">
          <button className="button-link" type="submit">
            Filtrar
          </button>
          {filtered && (
            <button
              className="text-link"
              onClick={() => navigate(new URLSearchParams())}
              type="button"
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {error && <ListError message={error} retry={retry} />}
      {!error && !page && <LoadingState label="Cargando usuarios" />}
      {page && (
        <p className="admin-result-count" aria-live="polite">
          {page.pagination.total === 1 ? '1 cuenta' : `${page.pagination.total} cuentas`}
          {page.pagination.totalPages > 1 &&
            ` · página ${page.pagination.page} de ${page.pagination.totalPages}`}
        </p>
      )}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop managed-users-table">
              <table className="admin-table">
                <caption className="sr-only">Cuentas de usuario</caption>
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((account) => (
                    <tr key={account.id}>
                      <td>{name(account)}</td>
                      <td className="managed-users-email">{account.email}</td>
                      <td>{roleLabel(account.role)}</td>
                      <td>{status(account)}</td>
                      <td>{actions(account)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((account) => (
                <AdminRecordCard
                  key={account.id}
                  title={name(account)}
                  subtitle={<span className="managed-users-email">{account.email}</span>}
                  badge={status(account)}
                  actions={actions(account)}
                >
                  <p>Rol: {roleLabel(account.role)}</p>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title={filtered ? 'Ninguna cuenta coincide con los filtros' : 'Aún no hay cuentas'}
            action={
              filtered ? (
                <button
                  className="button-link button-link-secondary"
                  onClick={() => navigate(new URLSearchParams())}
                  type="button"
                >
                  Ver todas
                </button>
              ) : (
                <button
                  className="button-link"
                  onClick={() => setEditor({ mode: 'create' })}
                  type="button"
                >
                  Crear cuenta
                </button>
              )
            }
          >
            <p>
              {filtered
                ? 'Prueba con otro nombre, correo, rol o estado.'
                : 'Crea la primera cuenta del equipo.'}
            </p>
          </PageState>
        ))}
      {page && page.pagination.totalPages > 1 && (
        <nav aria-label="Paginación de usuarios" className="admin-pagination">
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page <= 1}
            onClick={() => changePage(page.pagination.page - 1)}
            type="button"
          >
            Anterior
          </button>
          <span>
            Página {page.pagination.page} de {page.pagination.totalPages}
          </span>
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page >= page.pagination.totalPages}
            onClick={() => changePage(page.pagination.page + 1)}
            type="button"
          >
            Siguiente
          </button>
        </nav>
      )}

      {/* Always mounted (like the other panel dialogs); only its content depends on the editor. */}
      <Dialog
        aria-labelledby="managed-user-dialog-title"
        className="managed-users-dialog"
        onDismiss={() => setEditor(null)}
        open={editor !== null}
      >
        {editor && (
          <AccountForm
            key={editor.mode === 'create' ? 'create' : `${editor.mode}-${editor.account.id}`}
            editor={editor}
            onClose={() => setEditor(null)}
            onSaved={(message) => {
              setEditor(null);
              notify(message, 'success');
              retry();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function AccountForm({
  editor,
  onClose,
  onSaved
}: {
  editor: Exclude<Editor, null>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const account = editor.mode === 'create' ? null : editor.account;
  const title =
    editor.mode === 'create'
      ? 'Crear cuenta'
      : editor.mode === 'edit'
        ? 'Editar cuenta'
        : 'Cambiar contraseña';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem('');
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    if (editor.mode !== 'edit' && password !== String(data.get('passwordConfirm') ?? '')) {
      setProblem('Las contraseñas no coinciden.');
      return;
    }
    const role = String(data.get('role') ?? '');
    let body: Record<string, unknown>;
    let confirmMessage: string | null = null;
    if (editor.mode === 'create') {
      body = { fullName: data.get('fullName'), email: data.get('email'), role, password };
      if (role === 'ADMIN') confirmMessage = '¿Crear una cuenta con acceso de administrador?';
    } else if (editor.mode === 'edit') {
      body = {
        role,
        active: data.get('active') === 'on',
        revokeSessions: data.get('revoke') === 'on'
      };
      confirmMessage = `¿Guardar los cambios de ${editor.account.fullName}? Si cambian el rol o el estado se cerrarán sus sesiones.`;
    } else {
      body = { password };
      confirmMessage = `¿Reemplazar la contraseña de ${editor.account.fullName}? Se cerrarán todas sus sesiones.`;
    }
    if (confirmMessage && !(await confirmAction(confirmMessage, 'Confirmar'))) return;
    setSaving(true);
    try {
      await save(
        account ? `/api/admin/users/${encodeURIComponent(account.id)}` : '/api/admin/users',
        account ? 'PATCH' : 'POST',
        body
      );
      onSaved(
        editor.mode === 'create'
          ? 'Cuenta creada.'
          : editor.mode === 'edit'
            ? 'Cambios guardados.'
            : 'Contraseña actualizada y sesiones cerradas.'
      );
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : 'No se pudo guardar la cuenta.');
      setSaving(false);
    }
  }

  const passwordFields: ReactNode = (
    <>
      <FormField
        label={editor.mode === 'create' ? 'Contraseña inicial' : 'Contraseña nueva'}
        helper="Entre 14 y 72 caracteres. Compártela por un canal seguro."
        required
      >
        <input
          autoComplete="new-password"
          maxLength={72}
          minLength={14}
          name="password"
          type="password"
        />
      </FormField>
      <FormField label="Confirmar contraseña" required>
        <input
          autoComplete="new-password"
          maxLength={72}
          minLength={14}
          name="passwordConfirm"
          type="password"
        />
      </FormField>
    </>
  );

  return (
    <form className="managed-users-form" onSubmit={submit}>
      <div className="managed-users-dialog-head">
        <div>
          <h2 id="managed-user-dialog-title">{title}</h2>
          {account && (
            <p className="managed-users-dialog-subtitle">
              {account.fullName} · <span className="managed-users-email">{account.email}</span>
            </p>
          )}
        </div>
        <button aria-label="Cerrar" className="dialog-close" onClick={onClose} type="button">
          ×
        </button>
      </div>
      {editor.mode === 'create' && (
        <>
          <FormField label="Nombre completo" required>
            <input autoComplete="off" maxLength={160} name="fullName" />
          </FormField>
          <FormField label="Correo" required>
            <input autoComplete="off" maxLength={254} name="email" type="email" />
          </FormField>
        </>
      )}
      {editor.mode !== 'password' && (
        <FormField label="Rol" required>
          <select defaultValue={account?.role ?? 'EMPLOYEE'} name="role">
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </FormField>
      )}
      {editor.mode === 'edit' && (
        <fieldset className="managed-users-checks">
          <legend>Acceso</legend>
          <label className="check-label">
            <input defaultChecked={editor.account.active} name="active" type="checkbox" /> Cuenta
            activa
          </label>
          <label className="check-label">
            <input name="revoke" type="checkbox" /> Cerrar sesiones activas aunque no haya otros
            cambios
          </label>
        </fieldset>
      )}
      {editor.mode !== 'edit' && passwordFields}
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <div className="confirmation-actions">
        <button className="button-link button-link-secondary" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="button-link" disabled={saving} type="submit">
          {saving
            ? 'Guardando…'
            : editor.mode === 'create'
              ? 'Crear cuenta'
              : editor.mode === 'edit'
                ? 'Guardar cambios'
                : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  );
}
