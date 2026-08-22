import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getInventoryValuation } from "@/lib/inventory";
import { toCsv, csvResponseHeaders } from "@/lib/export";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { items } = await getInventoryValuation();

  const csv = toCsv(
    items.map((i) => ({
      name: i.name,
      category: i.category,
      unit: i.unit,
      quantityOnHand: i.quantityOnHand,
      unitCost: i.unitCost !== null ? i.unitCost.toFixed(2) : "",
      value: i.value.toFixed(2),
    })),
    [
      { key: "name", header: "Item" },
      { key: "category", header: "Category" },
      { key: "unit", header: "Unit" },
      { key: "quantityOnHand", header: "Quantity On Hand" },
      { key: "unitCost", header: "Unit Cost" },
      { key: "value", header: "Total Value" },
    ]
  );

  return new NextResponse(csv, { headers: csvResponseHeaders("inventory-export.csv") });
}
