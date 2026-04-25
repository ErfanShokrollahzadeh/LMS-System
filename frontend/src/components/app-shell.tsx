"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound, GraduationCap, LogOut, Shield, UsersRound } from "lucide-react";
import { canAccessSection } from "@/lib/access";
import { clearSession } from "@/lib/session";
import type { UserRole } from "@/lib/types";

const navItems = [
  { href: "/student/list", label: "Students", icon: GraduationCap },
  { href: "/teacher/list", label: "Teachers", icon: UsersRound },
  { href: "/manager/list", label: "Managers", icon: Shield },
  { href: "/profile", label: "My Profile", icon: CircleUserRound },
];

interface AppShellProps {
  title: string;
  subtitle: string;
  currentRole?: UserRole | null;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, currentRole, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = () => {
    clearSession();
    router.push("/login");
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!currentRole) {
      return true;
    }
    if (item.href.startsWith("/manager")) {
      return canAccessSection(currentRole, "admin");
    }
    if (item.href.startsWith("/teacher")) {
      return canAccessSection(currentRole, "teacher");
    }
    if (item.href.startsWith("/student")) {
      return canAccessSection(currentRole, "student");
    }
    return true;
  });

  return (
    <div className="panel-shell grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-(--line) bg-(--surface-muted) p-5 lg:border-b-0 lg:border-r">
        <div className="mb-8">
          <p className="text-xs tracking-[0.18em] text-(--text-soft) uppercase">AIMS LMS</p>
          <h1 className="mt-2 text-2xl font-bold">Control Panel</h1>
        </div>
        <nav className="space-y-2">
          {filteredNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  active
                    ? "bg-(--brand) text-white"
                    : "text-foreground hover:bg-white"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onLogout}
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-(--line) bg-white px-4 py-2.5 text-sm font-semibold text-(--danger) transition hover:bg-red-50"
        >
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <section className="p-6 md:p-8">
        <header className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-2 text-(--text-soft)">{subtitle}</p>
        </header>
        {children}
      </section>
    </div>
  );
}
