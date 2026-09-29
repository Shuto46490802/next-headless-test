import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  (await draftMode()).disable();
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";
  redirect(returnTo.startsWith("/") ? returnTo : "/");
}
