import { createContext, useContext, useMemo, useCallback } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { api } from "../utils/api";

const AuthContext = createContext(null);

/**
 * Credentials are checked by the Express API (/auth/...).
 * Only the "who is logged in" session is kept in Local Storage so a page
 * refresh does not log you out.
 */
export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useLocalStorage("loggedInUser", null);
  const [loggedInAdmin, setLoggedInAdmin] = useLocalStorage("loggedInAdmin", null);

  /** Member login: name + Member ID. Librarians are sent to the admin area. */
  const loginUser = useCallback(async (name, memberId) => {
    const res = await api("/auth/user-login", { method: "POST", body: { name, memberId } });
    if (!res.ok) return res;

    if (res.area === "admin") {
      setLoggedInAdmin({ ...res.session, role: "librarian" });
      return { ok: true, message: res.message, role: "admin" };
    }
    setLoggedInUser({ ...res.session, role: "user" });
    return { ok: true, message: res.message, role: "user" };
  }, [setLoggedInUser, setLoggedInAdmin]);

  const loginAdmin = useCallback(async (adminId, password) => {
    const res = await api("/auth/admin-login", { method: "POST", body: { adminId, password } });
    if (res.ok) setLoggedInAdmin(res.session);
    return res;
  }, [setLoggedInAdmin]);

  const registerAdmin = useCallback((data) => api("/auth/admin-register", { method: "POST", body: data }), []);

  const logoutUser = useCallback(() => setLoggedInUser(null), [setLoggedInUser]);
  const logoutAdmin = useCallback(() => setLoggedInAdmin(null), [setLoggedInAdmin]);

  const value = useMemo(
    () => ({ loggedInUser, loggedInAdmin, loginUser, loginAdmin, registerAdmin, logoutUser, logoutAdmin }),
    [loggedInUser, loggedInAdmin, loginUser, loginAdmin, registerAdmin, logoutUser, logoutAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
