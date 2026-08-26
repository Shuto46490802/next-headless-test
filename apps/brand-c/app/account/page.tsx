import { revalidatePath } from "next/cache";
import { FormField, FieldGroup, Button } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../lib/session";
import { customerAccount } from "../../lib/shopify";

export default async function AccountPage() {
  const session = await requireSession();
  const accessToken = await getValidAccessToken(session);
  const profile = await customerAccount.getProfile(accessToken);

  async function updateProfile(formData: FormData) {
    "use server";
    const session = await requireSession();
    const accessToken = await getValidAccessToken(session);
    await customerAccount.updateProfile(accessToken, {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
    });
    revalidatePath("/account");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Profile</h1>
        <p className="text-sm text-neutral-500">{profile.emailAddress?.emailAddress}</p>
      </div>
      <form action={updateProfile} className="flex max-w-md flex-col gap-4">
        <FieldGroup>
          <FormField name="firstName" label="First name" defaultValue={profile.firstName ?? ""} />
          <FormField name="lastName" label="Last name" defaultValue={profile.lastName ?? ""} />
        </FieldGroup>
        <Button type="submit" className="self-start">
          Save changes
        </Button>
      </form>
    </div>
  );
}
