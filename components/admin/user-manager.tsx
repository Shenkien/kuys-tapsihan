"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, KeyRound, Power, ShieldCheck, User as UserIcon, Copy, Check } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  lastLoginAt: string | null;
}

export function UserManager({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => setError("Could not refresh users."));
  }

  async function handleToggleActive(user: UserRow) {
    setBusyId(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not update user.");
      return;
    }
    refresh();
  }

  async function handleToggleRole(user: UserRow) {
    const nextRole = user.role === "ADMIN" ? "STAFF" : "ADMIN";
    if (!confirm(`Change ${user.name}'s role to ${nextRole}?`)) return;
    setBusyId(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not update user.");
      return;
    }
    refresh();
  }

  async function handleResetPassword(user: UserRow) {
    if (!confirm(`Reset ${user.name}'s password? A new temporary password will be generated.`)) return;
    setBusyId(user.id);
    const res = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Could not reset password.");
      return;
    }
    setTempPassword({ name: user.name, password: data.tempPassword });
    setCopied(false);
  }

  return (
    <div>
      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {user.name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={busyId === user.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                        title="Reset password"
                      >
                        {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleRole(user)}
                        disabled={isSelf || busyId === user.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        title={isSelf ? "Can't change your own role" : "Toggle Admin/Staff role"}
                      >
                        {user.role === "ADMIN" ? <UserIcon className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={isSelf || busyId === user.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        title={isSelf ? "Can't deactivate your own account" : user.isActive ? "Deactivate" : "Reactivate"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTempPassword(null)}>
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-semibold">Temporary password for {tempPassword.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hand this to them directly — there's no email service connected yet, so it isn't sent
              automatically. They should change it after logging in.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2">
              <code className="flex-1 font-mono text-sm">{tempPassword.password}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword.password);
                  setCopied(true);
                }}
                className="rounded-md p-1.5 hover:bg-background"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
