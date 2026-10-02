"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { dismissPromoAction } from "@/app/(private)/actions";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";

type PromoBannerProps = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export function PromoBanner({ id, title, body, href, cta }: PromoBannerProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || pathname === href) return null;

  function dismiss() {
    setDismissed(true);
    void dismissPromoAction(id);
  }

  return (
    <Alert variant="info" className="shrink-0" onDismiss={dismiss}>
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{body}</AlertDescription>
        <AlertAction>
          <LinkButton href={href} size="sm" variant="outline">
            {cta}
          </LinkButton>
        </AlertAction>
      </AlertContent>
    </Alert>
  );
}
