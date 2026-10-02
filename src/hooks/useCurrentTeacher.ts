import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TeacherProfile {
  id: string;
  school_id: string;
  user_id: string | null;
  teacher_name: string;
  teacher_id_number?: string | null;
  designation?: string | null;
  subject?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  blood_group?: string | null;
  photo?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
  can_add_students?: boolean | null;
  can_edit_students?: boolean | null;
  can_entry_results?: boolean | null;
  can_manage_attendance?: boolean | null;
  can_manage_classes?: boolean | null;
  can_manage_homework?: boolean | null;
  can_manage_payments?: boolean | null;
  can_manage_settings?: boolean | null;
  can_send_notices?: boolean | null;
  can_use_ai_tools?: boolean | null;
  can_view_reports?: boolean | null;
  attendance_scope_students?: boolean | null;
  attendance_scope_teachers?: boolean | null;
  attendance_scope_staff?: boolean | null;
}

export const useCurrentTeacher = () => {
  const { user, schoolId, roles } = useAuth();

  const isTeacher = roles.includes("teacher" as any);

  const query = useQuery({
    queryKey: ["teacher-self", user?.id, user?.email, schoolId],
    queryFn: async (): Promise<TeacherProfile | null> => {
      if (!user?.id) return null;

      // 1. Direct user_id match
      let teacherQuery = supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (schoolId) {
        teacherQuery = teacherQuery.eq("school_id", schoolId);
      }

      const { data: directTeacher } = await teacherQuery.maybeSingle();
      if (directTeacher) return directTeacher as TeacherProfile;

      // 2. Try matching by email
      const userEmail = (user.email || "").toLowerCase().trim();
      const emailPrefix = userEmail.split("@")[0];

      if (userEmail) {
        let matchQuery = supabase
          .from("teachers")
          .select("*")
          .ilike("email", userEmail)
          .eq("is_active", true);

        if (schoolId) {
          matchQuery = matchQuery.eq("school_id", schoolId);
        }

        const { data: matchedByEmail } = await matchQuery.maybeSingle();

        if (matchedByEmail) {
          // Auto link user_id
          await supabase
            .from("teachers")
            .update({ user_id: user.id })
            .eq("id", matchedByEmail.id);

          // Update profiles school_id
          await supabase
            .from("profiles")
            .update({ school_id: matchedByEmail.school_id })
            .eq("user_id", user.id);

          return { ...matchedByEmail, user_id: user.id } as TeacherProfile;
        }
      }

      // 3. Try matching by teacher_id_number or phone
      if (emailPrefix) {
        let idQuery = supabase
          .from("teachers")
          .select("*")
          .or(`teacher_id_number.eq.${emailPrefix},phone.eq.${emailPrefix}`)
          .eq("is_active", true);

        if (schoolId) {
          idQuery = idQuery.eq("school_id", schoolId);
        }

        const { data: matchedById } = await idQuery.maybeSingle();

        if (matchedById) {
          await supabase
            .from("teachers")
            .update({ user_id: user.id })
            .eq("id", matchedById.id);

          return { ...matchedById, user_id: user.id } as TeacherProfile;
        }
      }

      // CRITICAL: NEVER return a fallback random teacher!
      return null;
    },
    enabled: !!user?.id,
  });

  return {
    teacher: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    schoolId: query.data?.school_id || schoolId,
    isLinked: !!query.data,
  };
};
