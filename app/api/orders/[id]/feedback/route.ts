import { NextRequest, NextResponse } from "next/server";
import { submitFeedback, getFeedbackForOrder, FeedbackError } from "@/lib/feedback";
import { submitFeedbackSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Public by design — same trust model as the tracking page itself (see
// app/track/[id]/page.tsx): the order id is an unguessable cuid, and
// submitFeedback() itself enforces "only once, only after COMPLETED".
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feedback = await getFeedbackForOrder(id);
  return NextResponse.json({ feedback });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const { ok, retryAfterMs } = rateLimit(`feedback:${ip}`, 10, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 60_000)} minute(s).` },
      { status: 429 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = submitFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback." }, { status: 400 });
  }

  try {
    const feedback = await submitFeedback({ orderId: id, ...parsed.data });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (err) {
    if (err instanceof FeedbackError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not submit feedback." }, { status: 500 });
  }
}
