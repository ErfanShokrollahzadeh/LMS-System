"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import { getMyProfile, login } from "@/lib/api";
import { saveRole, saveSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tokens = await login(username, password);
      saveSession(tokens);
      const profile = await getMyProfile(tokens.access);
      saveRole(profile.role);
      if (profile.role === "student") {
        router.push("/student/list");
      } else if (profile.role === "teacher") {
        router.push("/teacher/list");
      } else {
        router.push("/manager/list");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-5">
      <section className="panel-shell w-full bg-white/90 p-8 md:p-10">
        <p className="text-sm font-semibold text-(--brand)">AIMS LMS</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in to control panel</h1>
        <p className="mt-2 text-sm text-(--text-soft)">
          Use your backend account credentials. Your role determines your dashboard list.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 inline-flex items-center gap-2 text-sm font-medium">
              <UserRound size={16} /> Username
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-(--line) bg-white px-4 py-2.5 outline-none ring-(--brand) transition focus:ring-2"
              placeholder="teacher_one"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 inline-flex items-center gap-2 text-sm font-medium">
              <KeyRound size={16} /> Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-(--line) bg-white px-4 py-2.5 outline-none ring-(--brand) transition focus:ring-2"
              placeholder="********"
              required
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-(--danger)">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-xl px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
