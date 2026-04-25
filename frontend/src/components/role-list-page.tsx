"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { canAccessSection } from "@/lib/access";
import { ApiError, createUser, deleteUser, getMyProfile, getUsersByRole, toPhotoUrl, updateUser } from "@/lib/api";
import { clearSession, getAccessToken, saveRole } from "@/lib/session";
import type { UserCreateInput, UserProfile, UserRole } from "@/lib/types";

interface RoleListPageProps {
  role: UserRole;
  title: string;
  subtitle: string;
}

export function RoleListPage({ role, title, subtitle }: RoleListPageProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewerRole, setViewerRole] = useState<UserRole | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formState, setFormState] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    current_academic: "",
    enrolled_status: true,
  });

  const isEditing = editingId !== null;

  const roleName = useMemo(() => {
    if (role === "admin") {
      return "manager";
    }
    return role;
  }, [role]);

  const section = useMemo(() => {
    if (role === "admin") {
      return "admin" as const;
    }
    return role;
  }, [role]);

  const canMutate = viewerRole === "admin";

  const openCreateModal = () => {
    setEditingId(null);
    setPhotoFile(null);
    setFormState({
      username: "",
      password: "",
      email: "",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "",
      current_academic: "",
      enrolled_status: true,
    });
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingId(user.id);
    setPhotoFile(null);
    setFormState({
      username: user.username,
      password: "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      date_of_birth: user.date_of_birth || "",
      gender: user.gender || "",
      current_academic: user.current_academic || "",
      enrolled_status: user.enrolled_status,
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (busy) {
      return;
    }
    setIsModalOpen(false);
  };

  const loadUsers = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const profile = await getMyProfile(token);
      setViewerRole(profile.role);
      saveRole(profile.role);

      if (!canAccessSection(profile.role, section)) {
        clearSession();
        router.replace("/login");
        setLoading(false);
        return;
      }

      const result = await getUsersByRole(token, role);
      setUsers(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push("/login");
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [role, router, section]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (!canMutate) {
      setError("Only managers can create or edit users.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (isEditing && editingId !== null) {
        await updateUser(token, {
          id: editingId,
          role,
          username: formState.username,
          email: formState.email,
          first_name: formState.first_name,
          last_name: formState.last_name,
          date_of_birth: formState.date_of_birth,
          gender: formState.gender,
          current_academic: formState.current_academic,
          enrolled_status: formState.enrolled_status,
          profile_photo: photoFile,
        });
      } else {
        const payload: UserCreateInput = {
          role,
          username: formState.username,
          password: formState.password,
          email: formState.email,
          first_name: formState.first_name,
          last_name: formState.last_name,
          date_of_birth: formState.date_of_birth,
          gender: formState.gender,
          current_academic: formState.current_academic,
          enrolled_status: formState.enrolled_status,
          profile_photo: photoFile,
        };
        await createUser(token, payload);
      }

      setIsModalOpen(false);
      setLoading(true);
      await loadUsers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push("/login");
        return;
      }

      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (!canMutate) {
      setError("Only managers can delete users.");
      return;
    }
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await deleteUser(token, id);
      setUsers((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push("/login");
        return;
      }

      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={title} subtitle={subtitle} currentRole={viewerRole}>
      {canMutate && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            <Plus size={16} />
            Create {roleName}
          </button>
        </div>
      )}

      {loading && <div className="card p-6 text-(--text-soft)">Loading data...</div>}
      {!loading && error && (
        <div className="card border-red-200 bg-red-50 p-6 text-(--danger)">{error}</div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="card p-6 text-(--text-soft)">No records found.</div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user, idx) => {
            const photo = toPhotoUrl(user.profile_photo);
            const fullName = `${user.first_name} ${user.last_name}`.trim();
            return (
              <article
                key={user.id}
                className="card reveal space-y-4 p-5"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="flex items-center gap-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={user.username}
                      className="h-12 w-12 rounded-xl border border-(--line) object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--brand-soft) font-bold text-(--brand-strong)">
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{fullName || user.username}</h3>
                    <p className="text-sm text-(--text-soft)">@{user.username}</p>
                  </div>
                </div>

                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-(--text-soft)">Email</dt>
                    <dd className="truncate font-medium">{user.email || "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-(--text-soft)">Gender</dt>
                    <dd className="font-medium">{user.gender || "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-(--text-soft)">Academic</dt>
                    <dd className="font-medium">{user.current_academic || "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-(--text-soft)">Status</dt>
                    <dd
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.enrolled_status
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.enrolled_status ? "Enrolled" : "Not Enrolled"}
                    </dd>
                  </div>
                </dl>

                <div className="flex gap-2 pt-1">
                  {canMutate && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-(--line) bg-(--surface) px-3 py-1.5 text-sm font-medium transition hover:bg-(--surface-muted)"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(user.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card w-full max-w-2xl p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{isEditing ? `Edit ${roleName}` : `Create ${roleName}`}</h3>
                <p className="text-sm text-(--text-soft)">All values are saved directly into the LMS database.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-md p-1 text-(--text-soft) hover:bg-(--surface-muted)">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Username
                <input
                  required
                  value={formState.username}
                  onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              {!isEditing && (
                <label className="text-sm font-medium">
                  Password
                  <input
                    required
                    type="password"
                    value={formState.password}
                    onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                  />
                </label>
              )}

              <label className="text-sm font-medium">
                Email
                <input
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                First Name
                <input
                  value={formState.first_name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, first_name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Last Name
                <input
                  value={formState.last_name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, last_name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Birth Date
                <input
                  type="date"
                  value={formState.date_of_birth}
                  onChange={(event) => setFormState((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Gender
                <select
                  value={formState.gender}
                  onChange={(event) => setFormState((prev) => ({ ...prev, gender: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Current Academic
                <input
                  value={formState.current_academic}
                  onChange={(event) => setFormState((prev) => ({ ...prev, current_academic: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Profile Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2"
                />
              </label>

              <label className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={formState.enrolled_status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, enrolled_status: event.target.checked }))
                  }
                />
                Enrolled Status
              </label>

              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-(--line) px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? "Saving..." : isEditing ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
