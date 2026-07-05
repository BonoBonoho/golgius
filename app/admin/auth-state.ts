export interface AuthState {
  error: string;
  notice: string;
}

export const authInitial: AuthState = { error: "", notice: "" };
