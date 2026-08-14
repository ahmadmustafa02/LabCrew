"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ROLE_STORAGE_KEY,
  STUDENT_MEMBER_STORAGE_KEY,
  type SessionRole,
} from "@/lib/assignment-types";

type StudentOption = { memberId: string; name: string; email: string };

type SessionState = {
  role: SessionRole;
  studentMemberId: string | null;
  studentName: string | null;
  students: StudentOption[];
  programName: string | null;
  ready: boolean;
  setRole: (role: SessionRole) => void;
  setStudentMemberId: (id: string) => void;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<SessionRole>("director");
  const [studentMemberId, setStudentIdState] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [programName, setProgramName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch("/api/demo/members", { signal: controller.signal });
      const data = await res.json();
      if (!data.ok) return;
      setProgramName(data.program.name);
      setStudents(data.students);
      const storedStudent = window.localStorage.getItem(STUDENT_MEMBER_STORAGE_KEY);
      const valid =
        data.students.find((s: StudentOption) => s.memberId === storedStudent) ??
        data.students[0];
      if (valid) {
        setStudentIdState(valid.memberId);
        window.localStorage.setItem(STUDENT_MEMBER_STORAGE_KEY, valid.memberId);
      }
    } catch {
      // offline / unseeded / slow DB — still unlock UI
    } finally {
      window.clearTimeout(timer);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (storedRole === "student" || storedRole === "director") {
      setRoleState(storedRole);
    }
    void refresh();
  }, [refresh]);

  const setRole = useCallback((next: SessionRole) => {
    setRoleState(next);
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
  }, []);

  const setStudentMemberId = useCallback((id: string) => {
    setStudentIdState(id);
    window.localStorage.setItem(STUDENT_MEMBER_STORAGE_KEY, id);
  }, []);

  const studentName = useMemo(
    () => students.find((s) => s.memberId === studentMemberId)?.name ?? null,
    [students, studentMemberId],
  );

  const value = useMemo(
    () => ({
      role,
      studentMemberId,
      studentName,
      students,
      programName,
      ready,
      setRole,
      setStudentMemberId,
      refresh,
    }),
    [
      role,
      studentMemberId,
      studentName,
      students,
      programName,
      ready,
      setRole,
      setStudentMemberId,
      refresh,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
