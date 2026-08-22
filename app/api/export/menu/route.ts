import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getMenuItems } from "@/lib/menu";
import { toCsv, csvResponseHeaders } from "@/lib/export";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const items = await getMenuItems();

  const csv = toCsv(
    items.map((i) => ({
      name: i.name,
      category: i.category?.name ?? "",
      price: Number(i.price).toFixed(2),
      isAvailable: i.isAvailable ? "Yes" : "No",
      isBestSeller: i.isBestSeller ? "Yes" : "No",
    })),
    [
      { key: "name", header: "Item" },
      { key: "category", header: "Category" },
      { key: "price", header: "Price" },
      { key: "isAvailable", header: "Available" },
      { key: "isBestSeller", header: "Best Seller" },
    ]
  );

  return new NextResponse(csv, { headers: csvResponseHeaders("menu-export.csv") });
}
