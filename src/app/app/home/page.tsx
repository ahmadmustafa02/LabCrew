import { StudentHomeView } from "@/components/portal/student-home-view";
import { RoleGate } from "@/components/app/role-gate";

export default function StudentHomePage() {
  return (
    <RoleGate allow="student">
      <StudentHomeView />
    </RoleGate>
  );
}
