"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Mail, UserCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getMyProfile, toPhotoUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    getMyProfile(token)
      .then((result) => setProfile(result))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell
      title="My Profile"
      subtitle="Your account details loaded from Django database through API."
    >
      {loading && <div className="card p-6 text-(--text-soft)">Loading profile...</div>}
      {!loading && error && (
        <div className="card border-red-200 bg-red-50 p-6 text-(--danger)">{error}</div>
      )}
      {!loading && profile && (
        <article className="card reveal overflow-hidden p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="rounded-2xl bg-(--surface-muted) p-5">
              {toPhotoUrl(profile.profile_photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toPhotoUrl(profile.profile_photo) || ""}
                  alt={profile.username}
                  className="h-40 w-full rounded-xl border border-(--line) object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-xl bg-(--brand-soft) text-6xl font-bold text-(--brand-strong)">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}

              <p className="mt-4 text-xs tracking-[0.16em] text-(--text-soft) uppercase">Role</p>
              <p className="text-xl font-semibold capitalize">{profile.role}</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold">
                {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username}
              </h3>
              <p className="mt-1 text-(--text-soft)">@{profile.username}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-(--line) bg-(--surface) p-4">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs text-(--text-soft) uppercase">
                    <Mail size={14} /> Email
                  </p>
                  <p className="font-medium">{profile.email || "-"}</p>
                </div>

                <div className="rounded-xl border border-(--line) bg-(--surface) p-4">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs text-(--text-soft) uppercase">
                    <UserCircle2 size={14} /> Gender
                  </p>
                  <p className="font-medium capitalize">{profile.gender || "-"}</p>
                </div>

                <div className="rounded-xl border border-(--line) bg-(--surface) p-4">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs text-(--text-soft) uppercase">
                    <CalendarDays size={14} /> Birth Date
                  </p>
                  <p className="font-medium">{profile.date_of_birth || "-"}</p>
                </div>

                <div className="rounded-xl border border-(--line) bg-(--surface) p-4">
                  <p className="mb-1 text-xs text-(--text-soft) uppercase">Current Academic</p>
                  <p className="font-medium">{profile.current_academic || "-"}</p>
                </div>
              </div>

              <div className="mt-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    profile.enrolled_status
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {profile.enrolled_status ? "Enrolled" : "Not Enrolled"}
                </span>
              </div>
            </div>
          </div>
        </article>
      )}
    </AppShell>
  );
}
