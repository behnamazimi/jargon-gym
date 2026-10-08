import type { Metadata } from "next";
import LoginForm from "./login-form";
import { PageCenter } from "@/components/page-container";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <PageCenter>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageCenter>
  );
}
