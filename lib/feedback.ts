import prisma from "@/lib/prisma";

export class FeedbackError extends Error {}

export interface SubmitFeedbackInput {
  orderId: string;
  rating: number;
  comment?: string;
}

/** Only lets a customer leave feedback once their order is actually
 * COMPLETED, and only once per order — the unique constraint on
 * Feedback.orderId backs this up at the DB level too. */
export async function submitFeedback(input: SubmitFeedbackInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (!order) throw new FeedbackError("Order not found.");
  if (order.status !== "COMPLETED") {
    throw new FeedbackError("Feedback can only be left once an order is completed.");
  }

  const existing = await prisma.feedback.findUnique({ where: { orderId: input.orderId } });
  if (existing) throw new FeedbackError("Feedback was already submitted for this order.");

  return prisma.feedback.create({
    data: {
      orderId: input.orderId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    },
  });
}

export function getFeedbackForOrder(orderId: string) {
  return prisma.feedback.findUnique({ where: { orderId } });
}

export interface FeedbackFilters {
  page?: number;
  pageSize?: number;
}

export async function getFeedbackList(filters: FeedbackFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

  const [entries, total, aggregate] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { orderNumber: true, channel: true } } },
    }),
    prisma.feedback.count(),
    prisma.feedback.aggregate({ _avg: { rating: true } }),
  ]);

  const distribution = await prisma.feedback.groupBy({
    by: ["rating"],
    _count: true,
  });

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    distribution: [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: distribution.find((d) => d.rating === star)?._count ?? 0,
    })),
  };
}
