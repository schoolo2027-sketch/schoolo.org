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
  masterSelectedSchoolId: string | null;
  setMasterSelectedSchoolId: (id: string | null) => void;
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
  masterSelectedSchoolId: null,
  setMasterSelectedSchoolId: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rawSchoolId, setRawSchoolId] = useState<string | null>(null);
  const [masterSelectedSchoolId, setMasterSelectedSchoolIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("master_selected_school_id") || null;
    } catch {
      return null;
    }
  });
  const [firstSchoolId, setFirstSchoolId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [teacherPermissions, setTeacherPermissions] = useState<TeacherPermissions>(defaultPermissions);

  const setMasterSelectedSchoolId = (id: string | null) => {
    setMasterSelectedSchoolIdState(id);
    try {
      if (id) {
        localStorage.setItem("master_selected_school_id", id);
      } else {
        localStorage.removeItem("master_selected_school_id");
      }
    } catch {
      // ignore localStorage error
    }
  };

  const isMasterAdmin = roles.includes("master_admin");
  const effectiveSchoolId = isMasterAdmin
    ? (masterSelectedSchoolId || firstSchoolId || null)
    : rawSchoolId;

  const fetchUserData = async (userId: string, currentUserEmail?: string | null) => {
    let resolvedSchoolId: string | null = null;
    let fetchedRoles: AppRole[] = [];

    // 1. Fetch profile safely
    try {
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
    } catch (err) {
      console.warn("Could not fetch profile:", err);
    }

    // 2. Fetch roles safely
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", userId);

      fetchedRoles = (rolesData?.map((r) => r.role as AppRole) || []).filter(Boolean);
      const roleSchoolId = rolesData?.find((r) => r.school_id)?.school_id;
      if (!resolvedSchoolId && roleSchoolId) {
        resolvedSchoolId = roleSchoolId;
      }
    } catch (err) {
      console.warn("Could not fetch user_roles:", err);
    }

    // Immediately save roles and schoolId found so far
    if (resolvedSchoolId) setRawSchoolId(resolvedSchoolId);
    if (fetchedRoles.length > 0) setRoles(fetchedRoles);

    // If master_admin, fetch schools to auto-select one if needed
    if (fetchedRoles.includes("master_admin")) {
      try {
        const { data: schoolsList } = await supabase
          .from("schools")
          .select("id")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (schoolsList && schoolsList.length > 0) {
          setFirstSchoolId(schoolsList[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch schools for master_admin:", err);
      }
    }

    const userEmail = (currentUserEmail || profile?.email || "").toLowerCase().trim();
    const emailPrefix = userEmail ? userEmail.split("@")[0] : "";

    // 3. Resolve Teacher Record safely
    let teacherData: any = null;
    try {
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
          supabase.from("teachers").update({ user_id: userId }).eq("id", emailTeacher.id).then();
        } else if (emailPrefix) {
          const { data: prefixTeacher } = await supabase
            .from("teachers")
            .select("*")
            .or(`teacher_id_number.eq.${emailPrefix},phone.eq.${emailPrefix}`)
            .eq("is_active", true)
            .maybeSingle();

          if (prefixTeacher) {
            teacherData = prefixTeacher;
            supabase.from("teachers").update({ user_id: userId }).eq("id", prefixTeacher.id).then();
          }
        }
      }
    } catch (err) {
      console.warn("Could not resolve teacher:", err);
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

    // 4. Resolve Student Record safely
    let studentData: any = null;
    try {
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
          supabase.from("students").update({ user_id: userId }).eq("id", matchStudent.id).then();
        }
      }
    } catch (err) {
      console.warn("Could not resolve student:", err);
    }

    if (studentData) {
      if (!fetchedRoles.includes("student")) {
        fetchedRoles.push("student");
      }
      if (!resolvedSchoolId && studentData.school_id) {
        resolvedSchoolId = studentData.school_id;
      }
    }

    // 5. Verification: Check deleted / inactive schools safely
    if (resolvedSchoolId && !fetchedRoles.includes("master_admin")) {
      try {
        const { data: schoolCheck } = await supabase
          .from("schools")
          .select("is_active, deleted_at")
          .eq("id", resolvedSchoolId)
          .maybeSingle();

        // ONLY sign out if school record was actually returned AND is confirmed inactive or deleted
        if (schoolCheck && (schoolCheck.deleted_at || schoolCheck.is_active === false)) {
          console.warn("Inactive or deleted school detected in session, signing out.");
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setRoles([]);
          setRawSchoolId(null);
          setProfile(null);
          return;
        }
      } catch (err) {
        console.warn("School check error (likely RLS), skipped safely:", err);
      }
    }

    setRawSchoolId(resolvedSchoolId);
    setRoles(fetchedRoles);
  };

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    // Safety timeout: ensure loading finishes within 4.5 seconds maximum
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsReady(true);
        setIsLoading(false);
      }
    }, 4500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // If this is a background token refresh or update, DO NOT trigger full-page loader
          const isBackgroundEvent = event === "TOKEN_REFRESHED" || event === "USER_UPDATED";
          if (!isBackgroundEvent && !initialLoadDone) {
            setIsLoading(true);
          }

          fetchUserData(session.user.id, session.user.email).finally(() => {
            if (mounted) {
              initialLoadDone = true;
              setIsReady(true);
              setIsLoading(false);
            }
          });
        } else {
          setRoles([]);
          setRawSchoolId(null);
          setProfile(null);
          setTeacherPermissions(defaultPermissions);
          if (mounted) {
            initialLoadDone = true;
            setIsReady(true);
            setIsLoading(false);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id, session.user.email).finally(() => {
          if (mounted) {
            initialLoadDone = true;
            clearTimeout(safetyTimer);
            setIsReady(true);
            setIsLoading(false);
          }
        });
      } else {
        if (mounted) {
          initialLoadDone = true;
          clearTimeout(safetyTimer);
          setIsReady(true);
          setIsLoading(false);
        }
      }
    }).catch(() => {
      if (mounted) {
        setIsReady(true);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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
    setRawSchoolId(null);
    setProfile(null);
    setTeacherPermissions(defaultPermissions);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isReady,
        isLoading,
        roles,
        schoolId: effectiveSchoolId,
        profile,
        teacherPermissions,
        signOut,
        masterSelectedSchoolId,
        setMasterSelectedSchoolId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
