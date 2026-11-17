"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@doctor-tracker-app/ui/components/button";
import { Input } from "@doctor-tracker-app/ui/components/input";
import { Label } from "@doctor-tracker-app/ui/components/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await authClient.signIn.email(values);
    if (error) {
      if (error.status === 429) {
        toast.error("Too many sign-in attempts. Please wait a few seconds and try again.");
      } else {
        toast.error(error.message || "Unable to sign in. Please try again.");
      }
      return;
    }
    toast.success("Signed in");
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <div className="mx-auto mt-16 w-full max-w-md px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Use the credentials your administrator provisioned
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <p className="text-destructive text-sm">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-destructive text-sm">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
