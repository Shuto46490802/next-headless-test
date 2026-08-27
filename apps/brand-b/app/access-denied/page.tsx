import Link from "next/link";
import { EmptyState, Button } from "@repo/ui";
import { brand } from "../../lib/brand";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isWrongBrand = reason === "wrong_brand";

  const description = isWrongBrand
    ? `This Shopify account is already registered with a different store and can't be used on ${brand.name}. If you meant to use a different account, you can sign out below and try again.`
    : "We couldn't complete sign in. Please try again.";

  return (
    <section className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <EmptyState
        title="Access denied"
        description={description}
        action={
          <div className="flex flex-col items-center gap-3">
            <Link href="/">
              <Button variant="secondary">Back to homepage</Button>
            </Link>
            {isWrongBrand ? (
              <form action="/api/auth/logout-pending" method="POST">
                <button type="submit" className="text-sm text-neutral-500 underline">
                  Not you? Sign out and try a different account
                </button>
              </form>
            ) : null}
          </div>
        }
      />
    </section>
  );
}
