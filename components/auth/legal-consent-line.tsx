import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LegalConsentLine({
  action,
  className,
}: {
  action: "signing up" | "continuing";
  className?: string;
}) {
  return (
    <p className={cn("m-0 text-xs text-base-content/70", className)}>
      By {action} you agree to the{" "}
      <Link href={TERMS_PATH} className="underline underline-offset-2">
        Terms
      </Link>{" "}
      and{" "}
      <Link href={PRIVACY_PATH} className="underline underline-offset-2">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
