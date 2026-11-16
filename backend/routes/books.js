import { Router } from "express";
import { pool, query } from "../db.js";

const router = Router();

const mapBook = (r) => ({ id: r.id, title: r.title, author: r.author, genre: r.genre, isbn: r.isbn, quantity: r.quantity });

function validate(b) {
  const text = (v) => typeof v === "string" && v.trim().length > 0;
  if (!text(b.title) || !text(b.author) || !text(b.genre) || !text(b.isbn)) return "Title, author, genre and ISBN are required.";
  if (!/^[0-9Xx-]{10,17}$/.test(b.isbn.trim())) return "Enter a valid ISBN (10-13 digits, hyphens allowed).";
  const q = Number(b.quantity);
  if (!Number.isInteger(q) || q < 0) return "Quantity must be a whole number, 0 or more.";
  return null;
}

// GET /books
router.get("/", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM books ORDER BY title");
    res.json(rows.map(mapBook));
  } catch (e) { next(e); }
});

// GET /books/:id
router.get("/:id", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Book not found." });
    res.json(mapBook(rows[0]));
  } catch (e) { next(e); }
});

// POST /books
router.post("/", async (req, res, next) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ message: problem });
    const { title, author, genre, isbn, quantity } = req.body;

    const dup = await query("SELECT id FROM books WHERE isbn = ?", [isbn.trim()]);
    if (dup.length) return res.status(409).json({ message: "A book with this ISBN already exists." });

    const result = await query(
      "INSERT INTO books (title, author, genre, isbn, quantity) VALUES (?, ?, ?, ?, ?)",
      [title.trim(), author.trim(), genre.trim(), isbn.trim(), Number(quantity)]
    );
    const rows = await query("SELECT * FROM books WHERE id = ?", [result.insertId]);
    res.status(201).json({ message: "Book added successfully.", book: mapBook(rows[0]) });
  } catch (e) { next(e); }
});

// PUT /books/:id   (also logs an "Update" row in the transactions table)
router.put("/:id", async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });
  const { title, author, genre, isbn, quantity } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query("SELECT id FROM books WHERE id = ? FOR UPDATE", [req.params.id]);
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Book not found." });
    }

    const [dup] = await conn.query("SELECT id FROM books WHERE isbn = ? AND id <> ?", [isbn.trim(), req.params.id]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ message: "A book with this ISBN already exists." });
    }

    await conn.query(
      "UPDATE books SET title=?, author=?, genre=?, isbn=?, quantity=? WHERE id=?",
      [title.trim(), author.trim(), genre.trim(), isbn.trim(), Number(quantity), req.params.id]
    );
    // quantity = the stock level after the update
    await conn.query(
      "INSERT INTO transactions (book_id, book_title, type, quantity, member_id) VALUES (?, ?, 'Update', ?, 'Admin')",
      [req.params.id, title.trim(), Number(quantity)]
    );
    await conn.commit();

    const [rows] = await conn.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    res.json({ message: "Book updated successfully.", book: mapBook(rows[0]) });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// DELETE /books/:id  (transaction history is kept; its book_id becomes NULL)
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await query("DELETE FROM books WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Book not found." });
    res.json({ message: "Book deleted successfully." });
  } catch (e) { next(e); }
});

export default router;
