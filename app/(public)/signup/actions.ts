"use server";
export type SignupState = { error: string } | null;

export async function signup(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const referenceCode = formData.get("referenceCode")?.toString().trim() ?? "";

  if (!email || !password || !referenceCode) {
    return { error: "All fields are required." };
  }

  //
  console.log("email", email);
  console.log("password", password);
  console.log("referenceCode", referenceCode);  

  return null;
}
