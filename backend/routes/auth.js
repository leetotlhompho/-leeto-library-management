import { Router } from "express";
import crypto from "crypto";
import { query } from "../db.js";

const router = Router();

// Passwords are salted + hashed with scrypt (built into Node, no extra package).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const attempt = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return real.length === attempt.length && crypto.timingSafeEqual(real, attempt);
}

const now = () => new Date().toLocaleString();

// POST /auth/user-login   { name, memberId }
router.post("/user-login", async (req, res, next) => {
  try {
    const { name = "", memberId = "" } = req.body;
    const rows = await query(
      "SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND LOWER(member_id) = LOWER(?)",
      [name.trim(), memberId.trim()]
    );
    if (!rows.length) return res.status(401).json({ message: "Invalid name or Member ID." });
    const u = rows[0];
    res.json({
      message: "Login successful. Redirecting...",
      area: u.role === "librarian" ? "admin" : "user",
      session: { name: u.name, memberId: u.member_id, adminId: u.member_id, email: u.email, role: u.role, loginTime: now() },
    });
  } catch (e) { next(e); }
});

// POST /auth/admin-login   { adminId, password }
router.post("/admin-login", async (req, res, next) => {
  try {
    const { adminId = "", password = "" } = req.body;
    const rows = await query("SELECT * FROM admins WHERE LOWER(admin_id) = LOWER(?)", [adminId.trim()]);
    if (!rows.length || !checkPassword(password, rows[0].password_hash)) {
      return res.status(401).json({ message: "Invalid Admin ID or password." });
    }
    const a = rows[0];
    res.json({
      message: "Login successful. Redirecting...",
      session: { adminId: a.admin_id, name: a.name, email: a.email, role: "admin", loginTime: now() },
    });
  } catch (e) { next(e); }
});

// POST /auth/admin-register   { adminId, name, email, password }
router.post("/admin-register", async (req, res, next) => {
  try {
    const { adminId = "", name = "", email = "", password = "" } = req.body;
    if (adminId.trim().length < 3) return res.status(400).json({ message: "Admin ID must be at least 3 characters." });
    if (name.trim().length < 2) return res.status(400).json({ message: "Please enter a valid name." });
    if (email.trim().length < 3) return res.status(400).json({ message: "Please enter an email or username." });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const dup = await query("SELECT id FROM admins WHERE LOWER(admin_id) = LOWER(?)", [adminId.trim()]);
    if (dup.length) return res.status(409).json({ message: "This Admin ID is already registered." });

    await query(
      "INSERT INTO admins (admin_id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [adminId.trim(), name.trim(), email.trim(), hashPassword(password)]
    );
    res.status(201).json({ message: "Admin registered successfully." });
  } catch (e) { next(e); }
});

export default router;
