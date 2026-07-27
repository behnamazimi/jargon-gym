import { signInWithGoogle } from "@/lib/auth/oauth-actions";
import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  next?: string;
  referenceCode?: string;
  label?: string;
};

export function GoogleSignInButton({
  next = "/complete-signup",
  referenceCode,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  return (
    <form action={signInWithGoogle} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {referenceCode !== undefined ? (
        <input type="hidden" name="ref" value={referenceCode} />
      ) : null}
      <Button type="submit" variant="default" className="w-full">
        {label}
      </Button>
    </form>
  );
}
