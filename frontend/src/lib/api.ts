import type {
  TokenPair,
  UserCreateInput,
  UserProfile,
  UserRole,
  UserUpdateInput,
} from "@/lib/types";

const API_PREFIX = "/backend";

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

async function parseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.detail || body?.message || "Request failed";
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
  if (path.startsWith("/")) {
    return `${API_PREFIX}${path}`;
  }
  return `${API_PREFIX}/${path}`;
}

export async function login(username: string, password: string): Promise<TokenPair> {
  const response = await fetch(`${API_PREFIX}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  return parseJson(response);
}

export async function getMyProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_PREFIX}/api/students/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson(response);
}

export async function getUsers(token: string): Promise<UserProfile[]> {
  const response = await fetch(`${API_PREFIX}/api/students/`, {
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

  const response = await fetch(`${API_PREFIX}/api/students/`, {
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

  const response = await fetch(`${API_PREFIX}/api/students/${payload.id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseJson(response);
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_PREFIX}/api/students/${id}/`, {
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
