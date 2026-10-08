import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";
import { PageCenter } from "@/components/page-container";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <PageCenter>
      <ForgotPasswordForm />
    </PageCenter>
  );
}
