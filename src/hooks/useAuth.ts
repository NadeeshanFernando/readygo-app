// src/hooks/useAuth.ts
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isHydrated,
    login,
    register,
    logout
  };
}
