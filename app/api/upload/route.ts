import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Menu item photo uploads. Requires Vercel Blob storage to be enabled on the
// project (Vercel dashboard -> Storage -> Blob) so BLOB_READ_WRITE_TOKEN is
// set — the app's own filesystem is read-only/ephemeral at runtime on
// Vercel, so files can't just be written into /public.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage isn't configured yet. Enable Vercel Blob storage for this project and redeploy.",
      },
      { status: 503 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WEBP, or GIF images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 4MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "jpg";
  const filename = `menu-items/${crypto.randomUUID()}.${extension}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
