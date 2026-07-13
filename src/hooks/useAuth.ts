// src/hooks/useAuth.ts
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const ensureLocalUser = useAuthStore((s) => s.ensureLocalUser);
  const updateName = useAuthStore((s) => s.updateName);

  return {
    currentUser,
    isHydrated,
    ensureLocalUser,
    updateName
  };
}
