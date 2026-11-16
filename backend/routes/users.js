import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const mapUser = (r) => ({ id: r.id, name: r.name, memberId: r.member_id, email: r.email, role: r.role });

function validate(u) {
  if (typeof u.name !== "string" || u.name.trim().length < 2) return "Name must be at least 2 characters.";
  if (typeof u.memberId !== "string" || !u.memberId.trim()) return "Please enter the Member ID.";
  if (typeof u.email !== "string" || !u.email.trim()) return "Please enter the email or username.";
  if (!["user", "librarian"].includes(u.role)) return "Choose a valid role.";
  return null;
}

async function duplicate(u, ignoreId = 0) {
  const byMember = await query("SELECT id FROM users WHERE member_id = ? AND id <> ?", [u.memberId.trim(), ignoreId]);
  if (byMember.length) return "This Member ID already exists.";
  const byEmail = await query("SELECT id FROM users WHERE email = ? AND id <> ?", [u.email.trim(), ignoreId]);
  if (byEmail.length) return "This email or username already exists.";
  return null;
}

// GET /users
router.get("/", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM users ORDER BY name");
    res.json(rows.map(mapUser));
  } catch (e) { next(e); }
});

// POST /users
router.post("/", async (req, res, next) => {
  try {
    const problem = validate(req.body) || (await duplicate(req.body));
    if (problem) return res.status(problem.startsWith("This") ? 409 : 400).json({ message: problem });
    const { name, memberId, email, role } = req.body;
    const result = await query(
      "INSERT INTO users (name, member_id, email, role) VALUES (?, ?, ?, ?)",
      [name.trim(), memberId.trim(), email.trim(), role]
    );
    const rows = await query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    res.status(201).json({ message: "User added successfully.", user: mapUser(rows[0]) });
  } catch (e) { next(e); }
});

// PUT /users/:id
router.put("/:id", async (req, res, next) => {
  try {
    const problem = validate(req.body) || (await duplicate(req.body, Number(req.params.id)));
    if (problem) return res.status(problem.startsWith("This") ? 409 : 400).json({ message: problem });
    const { name, memberId, email, role } = req.body;
    const result = await query(
      "UPDATE users SET name=?, member_id=?, email=?, role=? WHERE id=?",
      [name.trim(), memberId.trim(), email.trim(), role, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "User not found." });
    const rows = await query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User updated successfully.", user: mapUser(rows[0]) });
  } catch (e) { next(e); }
});

// DELETE /users/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await query("DELETE FROM users WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "User not found." });
    res.json({ message: "User deleted successfully." });
  } catch (e) { next(e); }
});

export default router;
