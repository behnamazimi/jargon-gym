import type { Metadata } from "next";
import ResetPasswordForm from "./reset-password-form";
import { PageCenter } from "@/components/page-container";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <PageCenter>
      <ResetPasswordForm />
    </PageCenter>
  );
}
