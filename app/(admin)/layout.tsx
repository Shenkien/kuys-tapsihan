import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
