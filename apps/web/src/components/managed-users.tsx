'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import { LoadingState } from './ui/loading-state';

const roles = ['EMPLOYEE', 'WORKSHOP', 'ADMIN'] as const;
type Account = { id: string; fullName: string; email: string; role: typeof roles[number]; active: boolean };

export function ManagedUsers({ actorId }: { actorId: string }) {
  const [users, setUsers] = useState<Account[] | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const load = useCallback(async () => {
    try {
      const response = await clientFetch('/api/admin/users');
      if (!response.ok) throw new Error();
      const { data } = await response.json();
      setUsers(data);
    } catch { setFeedback({ text: 'No fue posible cargar los usuarios.', error: true }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const role = data.get('role');
    const password = data.get('password');
    if ((editing || role === 'ADMIN') && !(await confirmAction(
      editing ? '¿Guardar estos cambios y cerrar las sesiones de la cuenta?' : '¿Crear una cuenta con acceso de administrador?',
      'Confirmar'
    ))) return;
    setSaving(true);
    setFeedback(undefined);
    try {
      const response = await clientFetch(editing ? '/api/admin/users/' + encodeURIComponent(editing.id) : '/api/admin/users', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editing ? {
          role, active: data.get('active') === 'on', revokeSessions: data.get('revoke') === 'on',
          ...(password ? { password } : {})
        } : { role, password, fullName: data.get('fullName'), email: data.get('email') })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Revisa los datos de la cuenta.');
      form.reset();
      setEditing(null);
      setFeedback({ text: 'Cuenta guardada.', error: false });
      await load();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'No se pudo guardar.', error: true });
    } finally { setSaving(false); }
  }

  return <div className="admin-stack">
    <h1 className="font-serif text-4xl">Usuarios</h1>
    {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {!users && (feedback?.error ? <button className="button-link" onClick={load}>Reintentar</button> : <LoadingState label="Cargando usuarios" />)}
    {users && <ul>{users.map(user => <li key={user.id}>
      {user.fullName} · {user.email} · {user.role} · {user.active ? 'Activa' : 'Inactiva'}{' '}
      {String(user.id) !== String(actorId) && <button type="button" className="text-link" onClick={() => setEditing(user)}>Editar</button>}
    </li>)}</ul>}
    <form className="admin-form" key={editing?.id ?? 'new'} onSubmit={submit}>
      <h2>{editing ? 'Editar ' + editing.fullName : 'Nueva cuenta'}</h2>
      {!editing && <><label>Nombre<input name="fullName" required maxLength={160} /></label>
        <label>Correo<input type="email" name="email" required maxLength={254} /></label></>}
      <label>Rol<select name="role" defaultValue={editing?.role ?? 'EMPLOYEE'}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
      <label>{editing ? 'Contraseña nueva (opcional)' : 'Contraseña inicial'}
        <input type="password" autoComplete="new-password" name="password" required={!editing} minLength={14} maxLength={72} />
      </label>
      {editing && <><label><input type="checkbox" name="active" defaultChecked={editing.active} /> Cuenta activa</label>
        <label><input type="checkbox" name="revoke" /> Cerrar sesiones activas</label></>}
      <button className="button-link" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cuenta'}</button>
      {editing && <button className="text-link" type="button" onClick={() => setEditing(null)}>Volver al alta</button>}
    </form>
  </div>;
}
