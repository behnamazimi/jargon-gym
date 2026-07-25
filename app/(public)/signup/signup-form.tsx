"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "./actions";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Password
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Reference code
        <input
          type="text"
          name="referenceCode"
          required
          autoComplete="off"
          className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-2">
          Log in
        </Link>
      </p>
    </form>
  );
}
