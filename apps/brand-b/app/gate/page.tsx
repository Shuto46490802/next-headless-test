import { redirect } from "next/navigation";
import { Button } from "@repo/ui";
import { brand } from "../../lib/brand";
import { getSession } from "../../lib/session";
import { safeReturnTo } from "../../lib/safe-return-to";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeReturnTo(rawReturnTo, "/");

  // If a session already exists (e.g. the customer hit back after logging in), just
  // forward them on instead of showing the gate again.
  const session = await getSession();
  if (session) redirect(returnTo);

  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold text-neutral-900">{brand.name}</h1>
      <p className="text-neutral-600">
        This store is available to registered customers only. Sign in to continue.
      </p>
      <a href={loginHref}>
        <Button>Sign in</Button>
      </a>
    </section>
  );
}
