import { redirect } from "next/navigation";

import SignInForm from "@/components/sign-in-form";
import { getSessionServer } from "@/lib/session";

export const metadata = { title: "Sign in — Doctor Tracker" };

export default async function LoginPage() {
  // Already signed in? Straight to the portal.
  const session = await getSessionServer();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid flex-1 place-items-center">
      <SignInForm />
    </main>
  );
}
