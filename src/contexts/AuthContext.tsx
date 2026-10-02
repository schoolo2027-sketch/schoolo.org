import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "master_admin" | "school_admin" | "sub_admin" | "teacher" | "student";

export interface TeacherPermissions {
  can_add_students: boolean;
  can_edit_students: boolean;
  can_entry_results: boolean;
  can_manage_attendance: boolean;
  can_manage_classes: boolean;
  can_manage_homework: boolean;
  can_manage_payments: boolean;
  can_manage_settings: boolean;
  can_send_notices: boolean;
  can_use_ai_tools: boolean;
  can_view_reports: boolean;
}

const defaultPermissions: TeacherPermissions = {
  can_add_students: false,
  can_edit_students: false,
  can_entry_results: false,
  can_manage_attendance: false,
  can_manage_classes: false,
  can_manage_homework: false,
  can_manage_payments: false,
  can_manage_settings: false,
  can_send_notices: false,
  can_use_ai_tools: false,
  can_view_reports: false,
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isLoading: boolean;
  roles: AppRole[];
  schoolId: string | null;
  profile: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
    preferred_language?: string;
  } | null;
  teacherPermissions: TeacherPermissions;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isReady: false,
  isLoading: true,
  roles: [],
  schoolId: null,
  profile: null,
  teacherPermissions: defaultPermissions,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [teacherPermissions, setTeacherPermissions] = useState<TeacherPermissions>(defaultPermissions);

  const fetchUserData = async (userId: string) => {
    try {
      let resolvedSchoolId: string | null = null;

      // 1. Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url, preferred_language, school_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name ?? undefined,
          email: profileData.email ?? undefined,
          avatar_url: profileData.avatar_url ?? undefined,
          preferred_language: profileData.preferred_language ?? undefined,
        });
        if (profileData.school_id) {
          resolvedSchoolId = profileData.school_id;
        }
      }

      // 2. Fetch roles and any associated school_id from user_roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", userId);

      const fetchedRoles = rolesData?.map((r) => r.role as AppRole) || [];
      const roleSchoolId = rolesData?.find((r) => r.school_id)?.school_id;
      if (!resolvedSchoolId && roleSchoolId) {
        resolvedSchoolId = roleSchoolId;
      }

      // 3. User email / auth details
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = (authData.user?.email || profileData?.email || "").toLowerCase().trim();
      const emailPrefix = userEmail.split("@")[0];

      // 4. Resolve Teacher Record
      let teacherData: any = null;
      const { data: directTeacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (directTeacher) {
        teacherData = directTeacher;
      } else if (userEmail) {
        const { data: emailTeacher } = await supabase
          .from("teachers")
          .select("*")
          .ilike("email", userEmail)
          .eq("is_active", true)
          .maybeSingle();

        if (emailTeacher) {
          teacherData = emailTeacher;
          await supabase.from("teachers").update({ user_id: userId }).eq("id", emailTeacher.id);
        } else if (emailPrefix) {
          const { data: prefixTeacher } = await supabase
            .from("teachers")
            .select("*")
            .or(`teacher_id_number.eq.${emailPrefix},phone.eq.${emailPrefix}`)
            .eq("is_active", true)
            .maybeSingle();

          if (prefixTeacher) {
            teacherData = prefixTeacher;
            await supabase.from("teachers").update({ user_id: userId }).eq("id", prefixTeacher.id);
          }
        }
      }

      if (teacherData) {
        if (!fetchedRoles.includes("teacher")) {
          fetchedRoles.push("teacher");
        }
        if (!resolvedSchoolId && teacherData.school_id) {
          resolvedSchoolId = teacherData.school_id;
        }

        setTeacherPermissions({
          can_add_students: teacherData.can_add_students ?? false,
          can_edit_students: teacherData.can_edit_students ?? false,
          can_entry_results: teacherData.can_entry_results ?? true,
          can_manage_attendance: teacherData.can_manage_attendance ?? true,
          can_manage_classes: teacherData.can_manage_classes ?? false,
          can_manage_homework: teacherData.can_manage_homework ?? true,
          can_manage_payments: teacherData.can_manage_payments ?? false,
          can_manage_settings: teacherData.can_manage_settings ?? false,
          can_send_notices: teacherData.can_send_notices ?? true,
          can_use_ai_tools: teacherData.can_use_ai_tools ?? true,
          can_view_reports: teacherData.can_view_reports ?? true,
        });
      } else {
        setTeacherPermissions(defaultPermissions);
      }

      // 5. Resolve Student Record
      let studentData: any = null;
      const { data: directStudent } = await supabase
        .from("students")
        .select("id, school_id, user_id, student_id, student_name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (directStudent) {
        studentData = directStudent;
      } else if (emailPrefix) {
        const { data: matchStudent } = await supabase
          .from("students")
          .select("id, school_id, user_id, student_id, student_name")
          .or(`student_id.eq.${emailPrefix},student_id.eq.${userEmail},phone.eq.${emailPrefix}`)
          .eq("is_active", true)
          .maybeSingle();

        if (matchStudent) {
          studentData = matchStudent;
          await supabase.from("students").update({ user_id: userId }).eq("id", matchStudent.id);
        }
      }

      if (studentData) {
        if (!fetchedRoles.includes("student")) {
          fetchedRoles.push("student");
        }
        if (!resolvedSchoolId && studentData.school_id) {
          resolvedSchoolId = studentData.school_id;
        }
      }

      // Sync school_id back to profile if needed
      if (resolvedSchoolId && profileData && profileData.school_id !== resolvedSchoolId) {
        await supabase.from("profiles").update({ school_id: resolvedSchoolId }).eq("user_id", userId);
      }

      // 6. Security validation: Ensure deleted/inactive users cannot maintain an active session
      const isMasterAdmin = fetchedRoles.includes("master_admin");
      if (!isMasterAdmin) {
        // If they have student role but no active student record is linked yet:
        // Do not force sign-out; allow them to stay authenticated so they can link their profile in the student portal
        if (fetchedRoles.includes("student") && !studentData) {
          console.info("Unlinked student session active; ready for profile linking.");
        }

        // If they have teacher role but no active teacher record exists:
        if (fetchedRoles.includes("teacher") && !teacherData && !fetchedRoles.includes("school_admin")) {
          console.warn("Deleted teacher detected in session, signing out.");
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setRoles([]);
          setSchoolId(null);
          setProfile(null);
          return;
        }

        // If they have no valid roles and neither student nor teacher:
        if (fetchedRoles.length === 0 && !studentData && !teacherData) {
          console.warn("Deleted or unassigned user detected in session, signing out.");
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setRoles([]);
          setSchoolId(null);
          setProfile(null);
          return;
        }

        // If their school is deleted or inactive:
        if (resolvedSchoolId) {
          const { data: schoolCheck } = await supabase
            .from("schools")
            .select("is_active, deleted_at")
            .eq("id", resolvedSchoolId)
            .maybeSingle();

          if (!schoolCheck || schoolCheck.deleted_at || !schoolCheck.is_active) {
            console.warn("Inactive or deleted school detected in session, signing out.");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setRoles([]);
            setSchoolId(null);
            setProfile(null);
            return;
          }
        }
      }

      setSchoolId(resolvedSchoolId);
      setRoles(fetchedRoles);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    let initialLoad = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (!initialLoad) {
            // For subsequent auth changes (not initial load), show loading while fetching
            setIsLoading(true);
            setTimeout(() => {
              fetchUserData(session.user.id).finally(() => {
                setIsLoading(false);
              });
            }, 0);
          }
        } else {
          setRoles([]);
          setSchoolId(null);
          setProfile(null);
          setTeacherPermissions(defaultPermissions);
          if (!initialLoad) {
            setIsLoading(false);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          initialLoad = false;
          setIsReady(true);
          setIsLoading(false);
        });
      } else {
        initialLoad = false;
        setIsReady(true);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out supabase error", e);
    }
    setUser(null);
    setSession(null);
    setRoles([]);
    setSchoolId(null);
    setProfile(null);
    setTeacherPermissions(defaultPermissions);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isReady, isLoading, roles, schoolId, profile, teacherPermissions, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
