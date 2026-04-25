import type { UserRole } from "@/lib/types";

export type AppSection = "student" | "teacher" | "admin";

export function canAccessSection(viewerRole: UserRole, section: AppSection) {
  if (viewerRole === "admin") {
    return true;
  }

  if (viewerRole === "teacher") {
    return section === "student" || section === "teacher";
  }

  return section === "student";
}

export function defaultRouteForRole(viewerRole: UserRole) {
  if (viewerRole === "student") {
    return "/student/list";
  }
  if (viewerRole === "teacher") {
    return "/teacher/list";
  }
  return "/manager/list";
}
