import { FeedbackView } from "@/components/admin/feedback-view";

export default function AdminFeedbackPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Customer Feedback</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Star ratings and comments customers leave after their order is completed.
      </p>

      <div className="mt-6">
        <FeedbackView />
      </div>
    </main>
  );
}
