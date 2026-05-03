"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Mail, UserCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ApiError, getMyProfile, getStudentTasks, submitTaskAnswer, toPhotoUrl } from "@/lib/api";
import { clearSession, getAccessToken, saveRole } from "@/lib/session";
import type { Task, TaskSubmissionInput, UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");
  const [answerFormByTask, setAnswerFormByTask] = useState<Record<number, TaskSubmissionInput>>({});
  const [answerBusyByTask, setAnswerBusyByTask] = useState<Record<number, boolean>>({});

  const formatDate = (value: string | null) => {
    if (!value) {
      return "-";
    }
    return new Date(value).toLocaleDateString();
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    getMyProfile(token)
      .then((result) => {
        setProfile(result);
        saveRole(result.role);
      })
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.push("/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!profile || profile.role !== "student") {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setTasksLoading(true);
    setTasksError("");

    getStudentTasks(token, profile.id)
      .then((result) => {
        const sortedTasks = [...result].sort((a, b) => {
          const left = new Date(a.deadline || a.due_date).getTime();
          const right = new Date(b.deadline || b.due_date).getTime();
          return left - right;
        });
        setTasks(sortedTasks);
        setAnswerFormByTask((prev) => {
          const next = { ...prev };
          sortedTasks.forEach((task) => {
            if (!next[task.id]) {
              next[task.id] = { answer_text: "", answer_file: null };
            }
          });
          return next;
        });
      })
      .catch((err: Error) => {
        setTasksError(err.message || "Failed to load tasks");
      })
      .finally(() => setTasksLoading(false));
  }, [profile, router]);

  const onSubmitAnswer = async (event: React.FormEvent<HTMLFormElement>, taskId: number) => {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = answerFormByTask[taskId];
    if (!payload?.answer_text && !payload?.answer_file) {
      setTasksError("Add a text answer or attach a file before submitting.");
      return;
    }

    setAnswerBusyByTask((prev) => ({ ...prev, [taskId]: true }));
    setTasksError("");

    try {
      await submitTaskAnswer(token, taskId, payload);
      setAnswerFormByTask((prev) => ({
        ...prev,
        [taskId]: { answer_text: "", answer_file: null },
      }));
      const updated = await getStudentTasks(token, profile?.id || 0);
      setTasks(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit answer";
      setTasksError(message);
    } finally {
      setAnswerBusyByTask((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  return (
    <AppShell
      title="My Profile"
      subtitle="Your account details loaded from Django database through API."
      currentRole={profile?.role}
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${profile.enrolled_status
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

      {!loading && profile?.role === "student" && (
        <section className="card reveal mt-6 p-6 md:p-8">
          <h3 className="text-2xl font-bold">My Tasks</h3>
          <p className="mt-1 text-sm text-(--text-soft)">Submit your answers with text or a file.</p>

          {tasksLoading && <div className="mt-4 text-sm text-(--text-soft)">Loading tasks...</div>}
          {!tasksLoading && tasksError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-(--danger)">
              {tasksError}
            </div>
          )}
          {!tasksLoading && !tasksError && tasks.length === 0 && (
            <div className="mt-4 text-sm text-(--text-soft)">No tasks assigned yet.</div>
          )}

          {!tasksLoading && !tasksError && tasks.length > 0 && (
            <div className="mt-4 space-y-3">
              {tasks.map((task) => {
                const answerForm = answerFormByTask[task.id] || { answer_text: "", answer_file: null };
                return (
                  <div key={task.id} className="rounded-xl border border-(--line) bg-(--surface) p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-(--text-soft)">{task.description}</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                      >
                        {task.is_completed ? "Done" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-(--text-soft) sm:grid-cols-2">
                      <p>Teacher: {task.teacher_username || "-"}</p>
                      <p>Due: {formatDate(task.due_date)}</p>
                      <p>Deadline: {formatDate(task.deadline || task.due_date)}</p>
                      <p>Assigned: {formatDate(task.created_at)}</p>
                      <p>Submitted: {formatDate(task.submitted_at)}</p>
                      <p>Status: {task.is_completed ? "Completed" : "Pending"}</p>
                    </div>

                    {!task.is_completed ? (
                      <form onSubmit={(event) => onSubmitAnswer(event, task.id)} className="mt-3 space-y-2">
                        <label className="text-xs font-semibold text-(--text-soft)">
                          Your answer (optional)
                          <textarea
                            value={answerForm.answer_text}
                            onChange={(event) =>
                              setAnswerFormByTask((prev) => ({
                                ...prev,
                                [task.id]: { ...answerForm, answer_text: event.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                            rows={2}
                          />
                        </label>
                        <label className="text-xs font-semibold text-(--text-soft)">
                          Upload file
                          <input
                            type="file"
                            onChange={(event) =>
                              setAnswerFormByTask((prev) => ({
                                ...prev,
                                [task.id]: { ...answerForm, answer_file: event.target.files?.[0] || null },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={answerBusyByTask[task.id]}
                          className="btn-primary w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                          {answerBusyByTask[task.id] ? "Submitting..." : "Submit Answer"}
                        </button>
                      </form>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-emerald-700">Answer submitted.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
