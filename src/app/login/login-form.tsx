"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signIn, signInAsDemo, type LoginState } from "./actions";

function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className="w-full" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <div className="space-y-5">
      <form action={signInAsDemo}>
        <input type="hidden" name="next" value={next ?? ""} />
        <SubmitButton>
          Explore the demo workspace <ArrowRight />
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> or <Separator className="flex-1" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <SubmitButton variant="outline">Sign in</SubmitButton>
      </form>
    </div>
  );
}
