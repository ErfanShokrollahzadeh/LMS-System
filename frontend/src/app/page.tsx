"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { getSavedRole } from "@/lib/session";
import type { UserRole } from "@/lib/types";

export default function Home() {
  const [role] = useState<UserRole | null>(() => {
    const saved = getSavedRole();
    if (saved === "admin" || saved === "teacher" || saved === "student") {
      return saved;
    }
    return null;
  });

  const showTeacher = role !== "student";
  const showManager = role !== "teacher" && role !== "student";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10">
      <section className="panel-shell grid w-full gap-8 bg-white/85 p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
        <div className="reveal space-y-6">
          <p className="inline-flex rounded-full border border-(--line) bg-(--brand-soft) px-4 py-1 text-sm font-semibold text-(--brand-strong)">
            AIMS College Control Panel
          </p>
          <h1 className="max-w-xl text-4xl leading-tight font-bold md:text-5xl">
            Smart academic operations for students, teachers, and managers.
          </h1>
          <p className="max-w-xl text-base text-(--text-soft) md:text-lg">
            Connect directly to your LMS database through secure JWT APIs and manage the full roster with a clean, modern dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
            >
              Open Control Panel
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl border border-(--line) bg-(--surface) px-5 py-3 font-semibold text-foreground transition hover:bg-(--surface-muted)"
            >
              My Profile
            </Link>
          </div>
        </div>
        <div className="reveal rounded-3xl border border-(--line) bg-linear-to-br from-(--surface) via-[#f8fbf9] to-(--brand-soft) p-6 [animation-delay:120ms]">
          <h2 className="mb-4 text-xl font-semibold">Fast Navigation</h2>
          <div className="space-y-3">
            <Link href="/student/list" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
              <GraduationCap size={20} className="text-(--brand)" />
              <span className="font-medium">Student List</span>
            </Link>
            {showTeacher && (
              <Link href="/teacher/list" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <Building2 size={20} className="text-(--accent)" />
                <span className="font-medium">Teacher List</span>
              </Link>
            )}
            {showManager && (
              <Link href="/manager/list" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <ShieldCheck size={20} className="text-(--brand-strong)" />
                <span className="font-medium">Manager List</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
