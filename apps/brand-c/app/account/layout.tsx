import type { ReactNode } from "react";
import { AccountNav } from "@repo/ui";
import { requireSession } from "../../lib/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[200px_1fr]">
      <AccountNav />
      <div>{children}</div>
    </section>
  );
}
