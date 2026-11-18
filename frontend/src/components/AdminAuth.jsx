import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useForm from "../hooks/useForm";
import useRedirectAfter from "../hooks/useRedirectAfter";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "../styles/admin-auth.css";

/* ---------- small icons (inline SVG, no extra packages) ---------- */
const paths = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 7.2L5 7.5V9l7 4.7L19 9V7.5l-7 4.7Z",
  lock: "M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z",
  id: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm-4.5 9h9v-.5c0-1.7-2.7-2.5-4.5-2.5s-4.5.8-4.5 2.5V17Zm10-7v1.5H20V10h-5.5Zm0 3v1.5H20V13h-5.5Z",
};

function Icon({ name }) {
  return (
    <svg className="auth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="currentColor" />
    </svg>
  );
}

/** Underlined input with a floating label and an icon on the right. */
function AuthField({ label, icon, error, id, ...inputProps }) {
  return (
    <div className={`auth-field ${error ? "has-error" : ""}`}>
      <input id={id} placeholder=" " {...inputProps} />
      <label htmlFor={id}>{label}</label>
      <Icon name={icon} />
      {error && <small className="auth-error">{error}</small>}
    </div>
  );
}

/* ---------- validation ---------- */
const LOGIN_EMPTY = { adminId: "", password: "" };
const REGISTER_EMPTY = { adminId: "", name: "", email: "", password: "", confirmPassword: "" };

const validateLogin = (v) => {
  const errors = {};
  if (!v.adminId.trim()) errors.adminId = "Please enter your Admin ID.";
  if (!v.password) errors.password = "Please enter your password.";
  return errors;
};

const validateRegister = (v) => {
  const errors = {};
  if (v.adminId.trim().length < 3) errors.adminId = "At least 3 characters.";
  if (v.name.trim().length < 2) errors.name = "Please enter a valid name.";
  if (v.email.trim().length < 3) errors.email = "Enter an email or username.";
  if (v.password.length < 6) errors.password = "At least 6 characters.";
  if (v.confirmPassword !== v.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
};

/**
 * Animated admin Login / Register card.
 * Clicking the link at the bottom of either form slides the orange panel
 * across and swaps the forms. `initialMode` is "login" or "register".
 */
export default function AdminAuth({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const isRegister = mode === "register";
  useDocumentTitle(isRegister ? "Admin Registration" : "Admin Login");

  const { loginAdmin, registerAdmin } = useAuth();
  const redirect = useRedirectAfter(700);

  const [loginMessage, setLoginMessage] = useState(null);
  const [registerMessage, setRegisterMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const login = useForm(LOGIN_EMPTY, validateLogin);
  const register = useForm(REGISTER_EMPTY, validateRegister);

  const submitLogin = login.handleSubmit(async (values) => {
    setBusy(true);
    const result = await loginAdmin(values.adminId.trim(), values.password);
    setBusy(false);
    setLoginMessage({ text: result.message, type: result.ok ? "success" : "error" });
    if (result.ok) redirect("/admin-dashboard");
  });

  const submitRegister = register.handleSubmit(async (values) => {
    setBusy(true);
    const result = await registerAdmin({
      adminId: values.adminId.trim(),
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    });
    setBusy(false);
    setRegisterMessage({ text: result.message, type: result.ok ? "success" : "error" });
    if (result.ok) {
      // Prefill the Admin ID on the login side, then slide back to Login.
      const newId = values.adminId.trim();
      register.reset(REGISTER_EMPTY);
      login.reset({ adminId: newId, password: "" });
      setLoginMessage({ text: "Account created. Please log in.", type: "success" });
      setTimeout(() => { setMode("login"); setRegisterMessage(null); }, 900);
    }
  });

  function switchTo(next) {
    setMode(next);
    setLoginMessage((m) => (m?.type === "success" ? m : null));
    setRegisterMessage(null);
  }

  return (
    <div className="page-admin-auth">
      <div className={`auth-box ${isRegister ? "is-register" : "is-login"}`}>
        {/* animated orange diagonal panel */}
        <div className="auth-shape" aria-hidden="true" />

        {/* ---------- LOGIN ---------- */}
        <div className="auth-form-side auth-login-side" aria-hidden={isRegister}>
          <h1>Login</h1>
          <form onSubmit={submitLogin} noValidate>
            <AuthField id="loginAdminId" label="Admin ID" icon="user" type="text" autoComplete="username"
              error={login.errors.adminId} {...login.bind("adminId")} />
            <AuthField id="loginPassword" label="Password" icon="lock" type="password" autoComplete="current-password"
              error={login.errors.password} {...login.bind("password")} />

            <p className={`auth-message ${loginMessage ? loginMessage.type : ""}`} role="status">{loginMessage?.text}</p>
            <button type="submit" className="auth-button" disabled={busy}>{busy && !isRegister ? "Please wait..." : "Login"}</button>
          </form>
          <p className="auth-switch">
            Don&apos;t have an account?
            <button type="button" onClick={() => switchTo("register")}>Sign Up</button>
          </p>
          <Link className="auth-home" to="/">← Home</Link>
        </div>

        <div className="auth-info auth-login-info" aria-hidden={isRegister}>
          <h1>ADMIN LOGIN</h1>
        </div>

        {/* ---------- REGISTER ---------- */}
        <div className="auth-form-side auth-register-side" aria-hidden={!isRegister}>
          <h1>Register</h1>
          <form onSubmit={submitRegister} noValidate>
            <AuthField id="regAdminId" label="Admin ID" icon="id" type="text" autoComplete="username"
              error={register.errors.adminId} {...register.bind("adminId")} />
            <AuthField id="regName" label="Name" icon="user" type="text" autoComplete="name"
              error={register.errors.name} {...register.bind("name")} />
            <AuthField id="regEmail" label="Email / Username" icon="mail" type="text" autoComplete="email"
              error={register.errors.email} {...register.bind("email")} />
            <AuthField id="regPassword" label="Password" icon="lock" type="password" autoComplete="new-password"
              error={register.errors.password} {...register.bind("password")} />
            <AuthField id="regConfirm" label="Confirm Password" icon="lock" type="password" autoComplete="new-password"
              error={register.errors.confirmPassword} {...register.bind("confirmPassword")} />

            <p className={`auth-message ${registerMessage ? registerMessage.type : ""}`} role="status">{registerMessage?.text}</p>
            <button type="submit" className="auth-button" disabled={busy}>{busy && isRegister ? "Please wait..." : "Register"}</button>
          </form>
          <p className="auth-switch">
            Already have an account?
            <button type="button" onClick={() => switchTo("login")}>Sign In</button>
          </p>
        </div>

        <div className="auth-info auth-register-info" aria-hidden={!isRegister}>
          <h1>ADMIN REGISTER</h1>
        </div>
      </div>
    </div>
  );
}
