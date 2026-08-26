import Link from "next/link";
import { EmptyState, Button } from "@repo/ui";
import { brand } from "../../lib/brand";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const description =
    reason === "wrong_brand"
      ? `This Shopify account is already registered with a different store and can't be used on ${brand.name}. Sign in with a different account, or create a new one here.`
      : "We couldn't complete sign in. Please try again.";

  return (
    <section className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <EmptyState
        title="Access denied"
        description={description}
        action={
          <Link href="/">
            <Button variant="secondary">Back to homepage</Button>
          </Link>
        }
      />
    </section>
  );
}
