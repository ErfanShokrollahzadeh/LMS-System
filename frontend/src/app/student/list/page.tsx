import { RoleListPage } from "@/components/role-list-page";

export default function StudentListPage() {
  return (
    <RoleListPage
      role="student"
      title="Students"
      subtitle="All students from LMS database, synced through Django REST API."
    />
  );
}
