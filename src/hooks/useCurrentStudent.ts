import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudentProfile {
  id: string;
  school_id: string;
  user_id: string | null;
  student_id: string;
  student_name: string;
  roll: number | string | null;
  class_id: string | null;
  section_id: string | null;
  guardian_name?: string | null;
  phone?: string | null;
  address?: string | null;
  blood_group?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  religion?: string | null;
  photo?: string | null;
  optional_subject?: string | null;
  group_subjects?: any;
  is_active?: boolean | null;
  classes?: {
    id?: string;
    class_name: string;
    shift?: string | null;
    version?: string | null;
    academic_year?: number | null;
  } | null;
  sections?: {
    id?: string;
    section_name: string;
  } | null;
}

export const useCurrentStudent = () => {
  const { user, schoolId, roles } = useAuth();

  const isStudent = roles.includes("student" as any);

  const query = useQuery({
    queryKey: ["student-self", user?.id, user?.email, schoolId],
    queryFn: async (): Promise<StudentProfile | null> => {
      if (!user?.id) return null;

      // 1. Direct user_id match (Primary secure link)
      let studentQuery = supabase
        .from("students")
        .select("*, classes(id, class_name, shift, version, academic_year), sections(id, section_name)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (schoolId) {
        studentQuery = studentQuery.eq("school_id", schoolId);
      }

      const { data: directStudent } = await studentQuery.maybeSingle();
      if (directStudent) return directStudent as unknown as StudentProfile;

      // 2. Try matching by student_id or email
      const userEmail = (user.email || "").toLowerCase().trim();
      const emailPrefix = userEmail.split("@")[0];

      if (emailPrefix) {
        let matchQuery = supabase
          .from("students")
          .select("*, classes(id, class_name, shift, version, academic_year), sections(id, section_name)")
          .or(`student_id.eq.${emailPrefix},student_id.eq.${userEmail},phone.eq.${emailPrefix}`)
          .eq("is_active", true);

        if (schoolId) {
          matchQuery = matchQuery.eq("school_id", schoolId);
        }

        const { data: matchedStudent } = await matchQuery.maybeSingle();

        if (matchedStudent) {
          // Auto-link user_id
          await supabase
            .from("students")
            .update({ user_id: user.id })
            .eq("id", matchedStudent.id);

          // Update profiles school_id
          await supabase
            .from("profiles")
            .update({ school_id: matchedStudent.school_id })
            .eq("user_id", user.id);

          return { ...matchedStudent, user_id: user.id } as unknown as StudentProfile;
        }
      }

      // 3. Try matching by phone
      if (user.phone) {
        let phoneQuery = supabase
          .from("students")
          .select("*, classes(id, class_name, shift, version, academic_year), sections(id, section_name)")
          .eq("phone", user.phone)
          .eq("is_active", true);

        if (schoolId) {
          phoneQuery = phoneQuery.eq("school_id", schoolId);
        }

        const { data: phoneStudent } = await phoneQuery.maybeSingle();
        if (phoneStudent) {
          await supabase
            .from("students")
            .update({ user_id: user.id })
            .eq("id", phoneStudent.id);

          return { ...phoneStudent, user_id: user.id } as unknown as StudentProfile;
        }
      }

      // CRITICAL: NEVER return a fallback random student to prevent data leakage!
      return null;
    },
    enabled: !!user?.id,
  });

  return {
    student: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    schoolId: query.data?.school_id || schoolId,
    isLinked: !!query.data,
  };
};
