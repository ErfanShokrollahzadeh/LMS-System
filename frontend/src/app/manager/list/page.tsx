import { RoleListPage } from "@/components/role-list-page";

export default function ManagerListPage() {
  return (
    <RoleListPage
      role="admin"
      title="Managers"
      subtitle="Administrative managers mapped from admin role records in database."
    />
  );
}
