"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState = { error: string } | null;

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const referenceCode = formData.get("referenceCode")?.toString().trim().toUpperCase() ?? "";

  if (!email || !password || !referenceCode) {
    return { error: "All fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data: codeValid, error: codeError } = await supabase.rpc("is_referral_code_valid", {
    p_code: referenceCode,
  });

  if (codeError) {
    return { error: codeError.message };
  }

  if (!codeValid) {
    return { error: "Invalid or already used reference code." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        referral_code: referenceCode,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("referral")) {
      return { error: "Invalid or already used reference code." };
    }
    return { error: error.message };
  }

  redirect("/jargon");
}
