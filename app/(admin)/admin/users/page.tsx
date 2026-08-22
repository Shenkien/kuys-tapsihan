import Link from "next/link";
import { UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getUsers } from "@/lib/users";
import { serializePrisma } from "@/lib/serialize";
import { UserManager } from "@/components/admin/user-manager";

export default async function AdminUsersPage() {
  const session = await auth();
  const users = await getUsers();
  const currentUserId = session?.user?.id ?? "";

  // Same reasoning as the Purchase Orders page: convert Date fields to
  // plain ISO strings explicitly, matching what actually crosses into the
  // client component rather than relying on serializePrisma's Date-typed
  // output.
  const rows = serializePrisma(users).map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View every account, change roles, deactivate/reactivate access, or reset a forgotten
            password.
          </p>
        </div>
        <Link
          href="/register"
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Create Account
        </Link>
      </div>

      <div className="mt-6">
        <UserManager initialUsers={rows} currentUserId={currentUserId} />
      </div>
    </main>
  );
}
