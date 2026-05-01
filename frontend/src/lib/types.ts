export type UserRole = "admin" | "teacher" | "student";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  date_of_birth: string | null;
  gender: string;
  current_academic: string;
  enrolled_status: boolean;
  profile_photo: string | null;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface UserMutationInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  date_of_birth: string;
  gender: string;
  current_academic: string;
  enrolled_status: boolean;
  profile_photo?: File | null;
}

export interface UserCreateInput extends UserMutationInput {
  password: string;
}

export interface UserUpdateInput extends UserMutationInput {
  id: number;
}

export interface StudentCreateInput {
  username: string;
  password: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  current_academic?: string;
  enrolled_status?: boolean;
}

export interface StudentUpdateInput {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  current_academic?: string;
  enrolled_status?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  teacher_username: string;
  due_date: string;
  deadline: string;
  is_completed: boolean;
  answer_text: string;
  answer_file: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface TaskCreateInput {
  student_id: number;
  title: string;
  description: string;
  due_date: string;
  deadline?: string;
}

export interface TaskSubmissionInput {
  answer_text: string;
  answer_file?: File | null;
}

export interface Enrollment {
  id: number;
  teacher_username: string;
  student: UserProfile;
  student_username: string;
  enrolled_at: string;
}
