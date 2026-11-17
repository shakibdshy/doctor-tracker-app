import { HeartPulseIcon, ShieldCheckIcon, StethoscopeIcon } from "lucide-react";
import { redirect } from "next/navigation";

import SignInForm from "@/components/sign-in-form";
import { getSessionServer } from "@/lib/session";

export const metadata = { title: "Sign in — Doctor Tracker" };

const HIGHLIGHTS = [
  { icon: StethoscopeIcon, text: "A searchable roster of every doctor" },
  { icon: HeartPulseIcon, text: "Patient intake, tracked day by day" },
  { icon: ShieldCheckIcon, text: "Role-based access for your team" },
];

export default async function LoginPage() {
  // Already signed in? Straight to the portal.
  const session = await getSessionServer();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section
        aria-hidden
        className="grain bg-sidebar text-sidebar-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14"
      >
        <div className="flex items-center gap-3">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-10 items-center justify-center rounded-lg">
            <StethoscopeIcon className="size-5" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight font-semibold tracking-tight">
              Doctor Tracker
            </p>
            <p className="text-sidebar-foreground/55 text-[10px] font-semibold tracking-[0.14em] uppercase">
              Admin portal
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-4xl leading-[1.12] font-semibold tracking-tight text-balance xl:text-[2.75rem]">
            Every doctor, every patient,{" "}
            <em className="text-sidebar-primary italic">one clear record.</em>
          </h2>
          <p className="text-sidebar-foreground/70 mt-5 text-[15px]/relaxed">
            The internal workspace for keeping your practice organized —
            rosters, intake, and team access in a single calm view.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="bg-sidebar-primary/15 text-sidebar-primary flex size-7 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sidebar-foreground/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <svg
            viewBox="0 0 400 40"
            className="text-sidebar-primary/45 mb-4 h-8 w-full"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 20 H90 L104 20 L112 6 L122 34 L130 14 L136 20 H210 L222 20 L230 10 L240 30 L248 20 H400"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sidebar-foreground/50 text-xs">
            Internal admin portal · Authorized staff only
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
              <StethoscopeIcon aria-hidden className="size-4.5" />
            </span>
            <div>
              <p className="font-display text-lg leading-tight font-semibold tracking-tight">
                Doctor Tracker
              </p>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                Admin portal
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Sign in
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-2 text-sm/relaxed">
            Use the credentials your administrator provisioned.
          </p>

          <div className="mt-8">
            <SignInForm />
          </div>

          <p className="text-muted-foreground mt-8 border-t border-border/70 pt-5 text-xs/relaxed">
            Accounts are created by an administrator. If you need access,
            contact your portal owner.
          </p>
        </div>
      </section>
    </main>
  );
}