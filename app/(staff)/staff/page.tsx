import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { KitchenQueue } from "@/components/staff/kitchen-queue";

export default async function StaffDashboardPage() {
  const session = await auth();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            KUY&apos;S Tapsihan
          </p>
          <h1 className="mt-1 text-2xl font-bold">Kitchen Order Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session.user.name}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
            Sign out
          </button>
        </form>
      </div>

      <KitchenQueue />
    </main>
  );
}
