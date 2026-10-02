import { useAuth } from "@/contexts/AuthContext";

/** Who can manage the Payment & Accounts module (write). */
export const useCanManageAccounts = () => {
  const { roles } = useAuth();
  return roles.some((r) =>
    ["school_admin", "sub_admin", "accounts"].includes(r as string)
  );
};

/** Who can view the Payment & Accounts module. */
export const useCanViewAccounts = () => {
  const { roles } = useAuth();
  return roles.some((r) =>
    ["school_admin", "sub_admin", "accounts", "teacher"].includes(r as string)
  );
};
