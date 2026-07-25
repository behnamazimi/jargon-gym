import Link from "next/link";

async function login(formData: FormData) {
  "use server";
  console.log({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <form
        action={login}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>

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
            autoComplete="current-password"
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Log in
        </button>

        <p className="text-center text-sm text-neutral-600">
          Need an account?{" "}
          <Link href="/signup" className="underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
