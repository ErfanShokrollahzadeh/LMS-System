"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { canAccessSection } from "@/lib/access";
import { ApiError, createTask, createUser, deleteUser, getMyProfile, getStudentTasks, getTeacherStudents, getUsersByRole, submitTaskAnswer, toPhotoUrl, updateUser } from "@/lib/api";
import { clearSession, getAccessToken, saveRole } from "@/lib/session";
import type { Enrollment, Task, TaskCreateInput, TaskSubmissionInput, UserCreateInput, UserProfile, UserRole } from "@/lib/types";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewerRole, setViewerRole] = useState<UserRole | null>(null);
  const [viewerProfile, setViewerProfile] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});
  const [expandedTeachers, setExpandedTeachers] = useState<Record<number, boolean>>({});
  const [tasksByStudent, setTasksByStudent] = useState<Record<number, Task[]>>({});
  const [tasksLoading, setTasksLoading] = useState<Record<number, boolean>>({});
  const [tasksError, setTasksError] = useState<Record<number, string>>({});
  const [answerFormByTask, setAnswerFormByTask] = useState<Record<number, TaskSubmissionInput>>({});
  const [answerBusyByTask, setAnswerBusyByTask] = useState<Record<number, boolean>>({});
  const [teacherStudents, setTeacherStudents] = useState<Record<number, Enrollment[]>>({});
  const [teacherStudentsLoading, setTeacherStudentsLoading] = useState<Record<number, boolean>>({});
  const [teacherStudentsError, setTeacherStudentsError] = useState<Record<number, string>>({});
  const [taskFormByStudent, setTaskFormByStudent] = useState<Record<number, TaskCreateInput>>({});
  const [taskBusyByStudent, setTaskBusyByStudent] = useState<Record<number, boolean>>({});
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
  const canViewHomework = role === "student" && (viewerRole === "admin" || viewerRole === "teacher" || viewerRole === "student");
  const canAssignTasks = role === "teacher" && viewerRole === "teacher";
  const canSubmitAnswers = role === "student" && viewerRole === "student";

  const initTaskForm = useCallback((studentId: number) => {
    setTaskFormByStudent((prev) => ({
      ...prev,
      [studentId]: prev[studentId] || {
        student_id: studentId,
        title: "",
        description: "",
        due_date: "",
        deadline: "",
      },
    }));
  }, []);

  const initAnswerForm = useCallback((taskId: number) => {
    setAnswerFormByTask((prev) => ({
      ...prev,
      [taskId]: prev[taskId] || {
        answer_text: "",
        answer_file: null,
      },
    }));
  }, []);

  const formatDate = (value: string) => {
    if (!value) {
      return "-";
    }
    return new Date(value).toLocaleDateString();
  };

  const loadStudentTasks = useCallback(async (studentId: number, force = false) => {
    if (!force && (tasksByStudent[studentId] || tasksLoading[studentId])) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setTasksLoading((prev) => ({ ...prev, [studentId]: true }));
    setTasksError((prev) => ({ ...prev, [studentId]: "" }));

    try {
      const tasks = await getStudentTasks(token, studentId);
      const sortedTasks = [...tasks].sort((a, b) => {
        const left = new Date(a.deadline || a.due_date).getTime();
        const right = new Date(b.deadline || b.due_date).getTime();
        return left - right;
      });
      setTasksByStudent((prev) => ({ ...prev, [studentId]: sortedTasks }));
      sortedTasks.forEach((task) => initAnswerForm(task.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      setTasksError((prev) => ({ ...prev, [studentId]: message }));
    } finally {
      setTasksLoading((prev) => ({ ...prev, [studentId]: false }));
    }
  }, [initAnswerForm, router, tasksByStudent, tasksLoading]);

  const toggleStudentTasks = useCallback((studentId: number) => {
    setExpandedStudents((prev) => {
      const nextState = !prev[studentId];
      if (nextState) {
        loadStudentTasks(studentId);
      }
      return { ...prev, [studentId]: nextState };
    });
  }, [loadStudentTasks]);

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
    setSuccessMessage("");
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
    setSuccessMessage("");
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
      setViewerProfile(profile);
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

  useEffect(() => {
    if (viewerRole !== "student" || !viewerProfile || users.length === 0) {
      return;
    }

    const studentId = viewerProfile.id;
    setExpandedStudents((prev) => {
      if (prev[studentId]) {
        return prev;
      }
      return { ...prev, [studentId]: true };
    });
    loadStudentTasks(studentId);
  }, [loadStudentTasks, users, viewerProfile, viewerRole]);

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
    setSuccessMessage("");

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
      setSuccessMessage(isEditing ? `${roleName} updated and saved to database.` : `${roleName} created and saved to database.`);
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
    setSuccessMessage("");
    try {
      await deleteUser(token, id);
      setUsers((prev) => prev.filter((item) => item.id !== id));
      setSuccessMessage(`${roleName} deleted from database.`);
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

  const onCreateTask = async (event: FormEvent<HTMLFormElement>, studentId: number) => {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = taskFormByStudent[studentId];
    if (!payload?.title || !payload?.due_date) {
      setError("Title and due date are required.");
      return;
    }

    setTaskBusyByStudent((prev) => ({ ...prev, [studentId]: true }));
    setError("");
    setSuccessMessage("");

    try {
      await createTask(token, {
        ...payload,
        deadline: payload.deadline || payload.due_date,
      });
      setSuccessMessage("Task created and assigned.");
      setTaskFormByStudent((prev) => ({
        ...prev,
        [studentId]: {
          student_id: studentId,
          title: "",
          description: "",
          due_date: "",
          deadline: "",
        },
      }));
      await loadStudentTasks(studentId, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setTaskBusyByStudent((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const onSubmitAnswer = async (event: FormEvent<HTMLFormElement>, taskId: number, studentId: number) => {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = answerFormByTask[taskId];
    if (!payload?.answer_text && !payload?.answer_file) {
      setError("Add a text answer or attach a file before submitting.");
      return;
    }

    setAnswerBusyByTask((prev) => ({ ...prev, [taskId]: true }));
    setError("");
    setSuccessMessage("");

    try {
      await submitTaskAnswer(token, taskId, payload);
      setSuccessMessage("Answer submitted successfully.");
      setAnswerFormByTask((prev) => ({
        ...prev,
        [taskId]: {
          answer_text: "",
          answer_file: null,
        },
      }));
      await loadStudentTasks(studentId, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit answer";
      setError(message);
    } finally {
      setAnswerBusyByTask((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const loadTeacherStudents = useCallback(async (teacherId: number, force = false) => {
    if (!force && (teacherStudents[teacherId] || teacherStudentsLoading[teacherId])) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setTeacherStudentsLoading((prev) => ({ ...prev, [teacherId]: true }));
    setTeacherStudentsError((prev) => ({ ...prev, [teacherId]: "" }));

    try {
      const enrollments = await getTeacherStudents(token, teacherId);
      setTeacherStudents((prev) => ({ ...prev, [teacherId]: enrollments }));
      enrollments.forEach((enrollment) => initTaskForm(enrollment.student.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load students";
      setTeacherStudentsError((prev) => ({ ...prev, [teacherId]: message }));
    } finally {
      setTeacherStudentsLoading((prev) => ({ ...prev, [teacherId]: false }));
    }
  }, [initTaskForm, router, teacherStudents, teacherStudentsLoading]);

  const toggleTeacherStudents = useCallback((teacherId: number) => {
    setExpandedTeachers((prev) => {
      const nextState = !prev[teacherId];
      if (nextState) {
        loadTeacherStudents(teacherId);
      }
      return { ...prev, [teacherId]: nextState };
    });
  }, [loadTeacherStudents]);

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

      {!loading && successMessage && (
        <div className="card mb-4 border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{successMessage}</div>
      )}


      {loading && <div className="card p-6 text-(--text-soft)">Loading data...</div>}
      {!loading && error && (
        <div className="card border-red-200 bg-red-50 p-6 text-(--danger)">{error}</div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="card p-6 text-(--text-soft)">No records found.</div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className={`grid gap-4 ${role === "student" ? "md:grid-cols-2 xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {users.map((user, idx) => {
            const photo = toPhotoUrl(user.profile_photo);
            const fullName = `${user.first_name} ${user.last_name}`.trim();
            const isOwnTeacherCard = viewerProfile?.id === user.id;
            const canAssignForTeacher = canAssignTasks && isOwnTeacherCard;
            const canViewHomeworkForUser = canViewHomework && (viewerRole !== "student" || viewerProfile?.id === user.id);
            return (
              <article
                key={user.id}
                className={`card reveal space-y-4 p-5 ${role === "teacher" ? "md:col-span-2 xl:col-span-3" : ""}`}
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
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.enrolled_status
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {user.enrolled_status ? "Enrolled" : "Not Enrolled"}
                    </dd>
                  </div>
                </dl>

                {role === "teacher" && (
                  <div className="rounded-lg border border-(--line) bg-(--surface-muted) p-3">
                    <button
                      type="button"
                      onClick={() => toggleTeacherStudents(user.id)}
                      className="flex w-full items-center justify-between text-sm font-semibold"
                    >
                      Students
                      {expandedTeachers[user.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedTeachers[user.id] && (
                      <div className="mt-3 space-y-3">
                        {teacherStudentsLoading[user.id] && (
                          <div className="text-sm text-(--text-soft)">Loading students...</div>
                        )}
                        {!teacherStudentsLoading[user.id] && teacherStudentsError[user.id] && (
                          <div className="text-sm text-(--danger)">{teacherStudentsError[user.id]}</div>
                        )}
                        {!teacherStudentsLoading[user.id] && !teacherStudentsError[user.id] && (
                          <div className="space-y-2">
                            {(teacherStudents[user.id] || []).length === 0 && (
                              <div className="text-sm text-(--text-soft)">No students enrolled yet.</div>
                            )}
                            {(teacherStudents[user.id] || []).map((enrollment) => {
                              const student = enrollment.student;
                              const form = taskFormByStudent[student.id] || {
                                student_id: student.id,
                                title: "",
                                description: "",
                                due_date: "",
                                deadline: "",
                              };
                              return (
                                <div key={enrollment.id} className="rounded-md border border-(--line) bg-white px-3 py-2">
                                  <div className="mb-2">
                                    <p className="text-sm font-semibold">{student.first_name} {student.last_name}</p>
                                    <p className="text-xs text-(--text-soft)">@{student.username}</p>
                                  </div>

                                  {canAssignForTeacher ? (
                                    <form onSubmit={(event) => onCreateTask(event, student.id)} className="space-y-2">
                                      <label className="text-xs font-semibold text-(--text-soft)">
                                        Task title
                                        <input
                                          value={form.title}
                                          onChange={(event) =>
                                            setTaskFormByStudent((prev) => ({
                                              ...prev,
                                              [student.id]: { ...form, title: event.target.value },
                                            }))
                                          }
                                          className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                                          required
                                        />
                                      </label>
                                      <label className="text-xs font-semibold text-(--text-soft)">
                                        Description
                                        <textarea
                                          value={form.description}
                                          onChange={(event) =>
                                            setTaskFormByStudent((prev) => ({
                                              ...prev,
                                              [student.id]: { ...form, description: event.target.value },
                                            }))
                                          }
                                          className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                                          rows={2}
                                        />
                                      </label>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <label className="text-xs font-semibold text-(--text-soft)">
                                          Due date
                                          <input
                                            type="datetime-local"
                                            value={form.due_date}
                                            onChange={(event) =>
                                              setTaskFormByStudent((prev) => ({
                                                ...prev,
                                                [student.id]: { ...form, due_date: event.target.value },
                                              }))
                                            }
                                            className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                                            required
                                          />
                                        </label>
                                        <label className="text-xs font-semibold text-(--text-soft)">
                                          Deadline
                                          <input
                                            type="datetime-local"
                                            value={form.deadline || ""}
                                            onChange={(event) =>
                                              setTaskFormByStudent((prev) => ({
                                                ...prev,
                                                [student.id]: { ...form, deadline: event.target.value },
                                              }))
                                            }
                                            className="mt-1 w-full rounded-lg border border-(--line) bg-white px-3 py-2 text-sm"
                                          />
                                        </label>
                                      </div>
                                      <button
                                        type="submit"
                                        disabled={taskBusyByStudent[student.id]}
                                        className="btn-primary w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                                      >
                                        {taskBusyByStudent[student.id] ? "Assigning..." : "Assign Task"}
                                      </button>
                                    </form>
                                  ) : (
                                    <p className="text-xs text-(--text-soft)">Tasks can be assigned only by the selected teacher.</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {canViewHomeworkForUser && (
                  <div className="rounded-lg border border-(--line) bg-(--surface-muted) p-3">
                    <button
                      type="button"
                      onClick={() => toggleStudentTasks(user.id)}
                      className="flex w-full items-center justify-between text-sm font-semibold"
                    >
                      Homework
                      {expandedStudents[user.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedStudents[user.id] && (
                      <div className="mt-3 space-y-2">
                        {tasksLoading[user.id] && (
                          <div className="text-sm text-(--text-soft)">Loading tasks...</div>
                        )}
                        {!tasksLoading[user.id] && tasksError[user.id] && (
                          <div className="text-sm text-(--danger)">{tasksError[user.id]}</div>
                        )}
                        {!tasksLoading[user.id] && !tasksError[user.id] && (
                          <div className="space-y-2">
                            {(tasksByStudent[user.id] || []).length === 0 && (
                              <div className="text-sm text-(--text-soft)">No homework assigned yet.</div>
                            )}
                            {(tasksByStudent[user.id] || []).map((task) => {
                              const answerForm = answerFormByTask[task.id] || { answer_text: "", answer_file: null };
                              const fileUrl = task.answer_file ? toPhotoUrl(task.answer_file) : null;
                              return (
                                <div key={task.id} className="rounded-md border border-(--line) bg-white px-3 py-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold">{task.title}</p>
                                      {task.description && (
                                        <p className="text-xs text-(--text-soft)">{task.description}</p>
                                      )}
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.is_completed
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
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
                                    <p>Submitted: {task.submitted_at ? formatDate(task.submitted_at) : "-"}</p>
                                    <p>Status: {task.is_completed ? "Completed" : "Pending"}</p>
                                  </div>
                                  {task.answer_text && (
                                    <p className="mt-2 text-xs text-(--text-soft)">Your answer: {task.answer_text}</p>
                                  )}
                                  {fileUrl && (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 inline-flex text-xs font-semibold text-(--brand-strong)"
                                    >
                                      View uploaded file
                                    </a>
                                  )}
                                  {canSubmitAnswers && viewerProfile?.id === user.id && (
                                    <form
                                      onSubmit={(event) => onSubmitAnswer(event, task.id, user.id)}
                                      className="mt-3 space-y-2"
                                    >
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
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {canMutate && (
                    <>
                      {role === "student" ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-(--line) bg-(--surface) px-3 py-1.5 text-sm font-medium transition hover:bg-(--surface-muted)"
                        >
                          <Pencil size={14} /> Update Info
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-(--line) bg-(--surface) px-3 py-1.5 text-sm font-medium transition hover:bg-(--surface-muted)"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      )}
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

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-(--danger)">
                {error}
              </div>
            )}

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
