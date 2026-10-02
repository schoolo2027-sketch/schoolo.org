import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the class IDs and section IDs assigned to the current teacher.
 * For non-teacher roles, returns null (meaning "no restriction").
 */
export const useTeacherAssignedClasses = () => {
  const { user, roles, schoolId } = useAuth();
  const isTeacher = roles.includes("teacher" as any);
  const isAdmin = roles.some(r => ["master_admin", "school_admin", "sub_admin"].includes(r));

  const { data: assignments = [] } = useQuery({
    queryKey: ["teacher-assignments", user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) return [];

      let teacherId: string | null = null;
      let effectiveSchoolId = schoolId;

      // 1. Check by user_id
      let teacherQuery = supabase
        .from("teachers")
        .select("id, school_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (effectiveSchoolId) {
        teacherQuery = teacherQuery.eq("school_id", effectiveSchoolId);
      }

      const { data: teacher } = await teacherQuery.maybeSingle();

      if (teacher) {
        teacherId = teacher.id;
        effectiveSchoolId = teacher.school_id || effectiveSchoolId;
      } else if (user.email) {
        const { data: teacherByEmail } = await supabase
          .from("teachers")
          .select("id, school_id")
          .ilike("email", user.email)
          .eq("is_active", true)
          .maybeSingle();

        if (teacherByEmail) {
          teacherId = teacherByEmail.id;
          effectiveSchoolId = teacherByEmail.school_id || effectiveSchoolId;
          await supabase.from("teachers").update({ user_id: user.id }).eq("id", teacherByEmail.id);
        }
      }

      if (!teacherId || !effectiveSchoolId) return [];

      const { data } = await supabase
        .from("teacher_assignments")
        .select("class_id, section_id")
        .eq("teacher_id", teacherId)
        .eq("school_id", effectiveSchoolId);
      return data || [];
    },
    enabled: isTeacher && !!user?.id,
  });

  // If admin, no restriction
  if (isAdmin || !isTeacher) {
    return { assignedClassIds: null, assignedSectionIds: null, isRestricted: false };
  }

  // If teacher has no specific class assignments, they have general teacher role (no restrictions)
  if (assignments.length === 0) {
    return { assignedClassIds: null, assignedSectionIds: null, isRestricted: false };
  }

  // If any assignment has null class_id, it means "All" classes → no restriction
  const hasAllAccess = assignments.some(a => a.class_id === null);
  if (hasAllAccess) {
    return { assignedClassIds: null, assignedSectionIds: null, isRestricted: false };
  }

  const assignedClassIds = [...new Set(assignments.map(a => a.class_id).filter(Boolean))] as string[];
  const assignedSectionIds = [...new Set(assignments.map(a => a.section_id).filter(Boolean))] as string[];

  return {
    assignedClassIds: assignedClassIds.length > 0 ? assignedClassIds : [],
    assignedSectionIds: assignedSectionIds.length > 0 ? assignedSectionIds : [],
    isRestricted: true,
  };
};
