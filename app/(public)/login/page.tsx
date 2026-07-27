import LoginForm from "./login-form";
import { PageCenter } from "@/components/page-container";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <PageCenter>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageCenter>
  );
}
