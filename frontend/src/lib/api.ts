import type {
  Enrollment,
  Task,
  TaskCreateInput,
  TokenPair,
  UserCreateInput,
  UserProfile,
  UserRole,
  UserUpdateInput,
} from "@/lib/types";

const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "/backend";
const DIRECT_BACKEND_URL =
  process.env.NEXT_PUBLIC_DJANGO_BACKEND_URL || process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

type PaginatedResponse<T> = {
  results: T[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function apiUrl(path: string) {
  if (isAbsoluteUrl(API_PREFIX)) {
    const normalizedBase = API_PREFIX.endsWith("/")
      ? API_PREFIX.slice(0, -1)
      : API_PREFIX;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }
  return `${API_PREFIX}${path}`;
}

function directApiUrl(path: string) {
  const normalizedBase = DIRECT_BACKEND_URL.endsWith("/")
    ? DIRECT_BACKEND_URL.slice(0, -1)
    : DIRECT_BACKEND_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function apiFetch(path: string, init?: RequestInit) {
  try {
    return await fetch(apiUrl(path), init);
  } catch {
    if (!isAbsoluteUrl(API_PREFIX)) {
      try {
        return await fetch(directApiUrl(path), init);
      } catch {
        // Fall through to final connectivity error.
      }
    }

    throw new ApiError(
      `Unable to reach backend API. Tried ${apiUrl(path)}${!isAbsoluteUrl(API_PREFIX) ? ` and ${directApiUrl(path)}` : ""}. Make sure the backend is running, or set NEXT_PUBLIC_API_PREFIX / NEXT_PUBLIC_DJANGO_BACKEND_URL correctly.`,
      0
    );
  }
}

async function parseJson(response: Response) {
  const body = await response.json().catch(async () => {
    const text = await response.text().catch(() => "");
    return { message: text || response.statusText };
  });
  if (!response.ok) {
    const message =
      body?.detail ||
      body?.message ||
      (typeof body === "object" && body !== null
        ? Object.entries(body)
            .map(([field, value]) => {
              if (Array.isArray(value)) {
                return `${field}: ${value.join(", ")}`;
              }
              if (typeof value === "string") {
                return `${field}: ${value}`;
              }
              return null;
            })
            .filter(Boolean)
            .join(" | ")
        : "") ||
      "Request failed";
    throw new ApiError(message, response.status);
  }
  return body;
}

function toList<T>(payload: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.results ?? [];
}

export function toPhotoUrl(path: string | null) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http")) {
    return path;
  }
  return apiUrl(path.startsWith("/") ? path : `/${path}`);
}

export async function login(username: string, password: string): Promise<TokenPair> {
  const response = await apiFetch("/api/auth/login/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  return parseJson(response);
}

export async function getMyProfile(token: string): Promise<UserProfile> {
  const response = await apiFetch("/api/students/me/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson(response);
}

export async function getUsers(token: string): Promise<UserProfile[]> {
  const response = await apiFetch("/api/students/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson(response);
  return toList<UserProfile>(payload);
}

export async function getUsersByRole(token: string, role: UserRole): Promise<UserProfile[]> {
  // Fetch all users and filter by role on the client
  // The /api/students/ endpoint returns all users regardless of role
  const users = await getUsers(token);
  return users.filter((item) => item.role === role);
}

function appendCommonUserFields(formData: FormData, payload: Omit<UserCreateInput, "password">) {
  formData.append("username", payload.username);
  formData.append("email", payload.email);
  formData.append("first_name", payload.first_name);
  formData.append("last_name", payload.last_name);
  formData.append("role", payload.role);
  formData.append("date_of_birth", payload.date_of_birth || "");
  formData.append("gender", payload.gender || "");
  formData.append("current_academic", payload.current_academic || "");
  formData.append("enrolled_status", payload.enrolled_status ? "true" : "false");
  if (payload.profile_photo) {
    formData.append("profile_photo", payload.profile_photo);
  }
}

export async function createUser(token: string, payload: UserCreateInput): Promise<UserProfile> {
  const formData = new FormData();
  appendCommonUserFields(formData, payload);
  formData.append("password", payload.password);

  const response = await apiFetch("/api/students/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseJson(response);
}

export async function updateUser(token: string, payload: UserUpdateInput): Promise<UserProfile> {
  const formData = new FormData();
  appendCommonUserFields(formData, payload);

  const response = await apiFetch(`/api/students/${payload.id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseJson(response);
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const response = await apiFetch(`/api/students/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || "Failed to delete user");
  }
}

export async function getStudentTasks(token: string, studentId: number): Promise<Task[]> {
  const response = await apiFetch(`/api/tasks/?student_id=${studentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson(response);
  return toList<Task>(payload);
}

export async function getMyStudents(token: string): Promise<Enrollment[]> {
  const response = await apiFetch("/api/enrollments/my_students/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson(response);
  return toList<Enrollment>(payload);
}

export async function getTeacherStudents(token: string, teacherId: number): Promise<Enrollment[]> {
  const response = await apiFetch(`/api/enrollments/?teacher_id=${teacherId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJson(response);
  return toList<Enrollment>(payload);
}

export async function createTask(token: string, payload: TaskCreateInput): Promise<Task> {
  const response = await apiFetch("/api/tasks/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson(response);
}
