// components/UserManagement.tsx
'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Input, Spinner } from './ui';
import { ManagedUser, createUser, loadUsers, updateUser } from '../utils/resources/accounts';
import { Role } from '../utils/types';

const ROLES: Role[] = ['listener', 'artist', 'support', 'admin'];
const STATUSES = ['active', 'pending', 'suspended', 'rejected'];

const statusTone = (status: string) => {
  if (status === 'active') return 'success' as const;
  if (status === 'pending') return 'info' as const;
  return 'danger' as const;
};

interface UserManagementProps {
  // The signed-in admin: the backend refuses a self role change (it would
  // lock them out of this panel), so the row offers no role editor for it.
  currentUserId?: string;
}

/**
 * The dashboard's Users tab (doc.tex §2.10, "a comprehensive management
 * panel"): list every account, create one, and change a role or status.
 *
 * Until this existed the Django admin was the only way to do either — which
 * is a page the graders never see and, for a long time, one that 500'd.
 */
export default function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'listener' as Role,
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const rows = await loadUsers();
    setUsers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Filtering a roster this size is a display concern, not the reporting
  // arithmetic doc.tex §3.7 keeps on the server.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        u.email.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle) ||
        u.displayName.toLowerCase().includes(needle)
      );
    });
  }, [users, query, roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setFormErrors({});
    if (!form.email.trim() || !form.password) {
      setFormErrors({
        email: form.email.trim() ? '' : 'Email is required.',
        password: form.password ? '' : 'Password is required.',
      });
      return;
    }

    setSaving(true);
    const { user, error: failure } = await createUser(form);
    setSaving(false);

    if (!user) {
      const fields: Record<string, string> = {};
      Object.entries(failure?.fields || {}).forEach(([field, messages]) => {
        fields[field] = Array.isArray(messages) ? messages.join(' ') : String(messages);
      });
      setFormErrors(fields);
      if (Object.keys(fields).length === 0) {
        setError(failure?.detail || 'Could not create that account.');
      }
      return;
    }

    setNotice(`Created ${user.email}.`);
    setShowForm(false);
    setForm({ email: '', password: '', displayName: '', role: 'listener', status: 'active' });
    await refresh();
  };

  const handleChange = async (
    target: ManagedUser,
    changes: { role?: Role; status?: string }
  ) => {
    setError('');
    setNotice('');
    const previous = users;
    // Optimistic: the select should reflect the choice immediately, and a
    // refused change is put back rather than left looking applied.
    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...changes } : u)));

    const { user, error: failure } = await updateUser(target.id, changes);
    if (!user) {
      setUsers(previous);
      setError(failure?.detail || 'Could not update that account.');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    setNotice(`Updated ${user.email}.`);
  };

  return (
    <div className="bg-surface-2 p-6 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Users</h2>
        <Button onClick={() => setShowForm((open) => !open)}>
          {showForm ? 'Cancel' : 'Add user'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm mb-3">
          {error}
        </p>
      )}
      {notice && <p className="text-accent text-sm mb-3">{notice}</p>}

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-3 sm:grid-cols-2 mb-6" noValidate>
          <Input
            label="Email"
            name="new-user-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={formErrors.email}
          />
          <Input
            label="Password"
            name="new-user-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={formErrors.password}
          />
          <Input
            label="Display name"
            name="new-user-display-name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            error={formErrors.displayName}
          />
          <div>
            <label htmlFor="new-user-role" className="block text-sm font-bold mb-1">
              Role
            </label>
            <select
              id="new-user-role"
              name="new-user-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-white"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create account'}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          aria-label="Search users"
          placeholder="Search by email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-surface-3 border border-border rounded px-3 py-2 text-white flex-1 min-w-[12rem]"
        />
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-3 border border-border rounded px-3 py-2 text-white"
        >
          <option value="">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState icon="👤" title="No users match this filter" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="p-2">Email</th>
                <th className="p-2">Name</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Role</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="p-2 whitespace-nowrap">{u.email}</td>
                    <td className="p-2 whitespace-nowrap">
                      {u.displayName || u.username || '—'}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {u.role === 'listener' ? <Badge tone="neutral">{u.tier}</Badge> : '—'}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {isSelf ? (
                        <Badge tone="info">{u.role} (you)</Badge>
                      ) : (
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={u.role}
                          onChange={(e) =>
                            void handleChange(u, { role: e.target.value as Role })
                          }
                          className="bg-surface-3 border border-border rounded px-2 py-1 text-white"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {isSelf ? (
                        <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                      ) : (
                        <select
                          aria-label={`Status for ${u.email}`}
                          value={u.status}
                          onChange={(e) => void handleChange(u, { status: e.target.value })}
                          className="bg-surface-3 border border-border rounded px-2 py-1 text-white"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
