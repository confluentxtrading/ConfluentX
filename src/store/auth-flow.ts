import { create } from "zustand";

/**
 * Transient (memory-only) state for the multi-step login flow.
 * Holds credentials between the /login and /two-factor pages so the user
 * doesn't retype them. Never persisted.
 */
interface AuthFlowState {
  email: string;
  password: string;
  setCredentials: (email: string, password: string) => void;
  clear: () => void;
}

export const useAuthFlow = create<AuthFlowState>((set) => ({
  email: "",
  password: "",
  setCredentials: (email, password) => set({ email, password }),
  clear: () => set({ email: "", password: "" }),
}));
