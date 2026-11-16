import { Router } from "express";
import { pool, query } from "../db.js";

const router = Router();

const TYPES = ["Add Stock", "Deduct Stock", "Borrow", "Return"];

const mapTxn = (r) => ({
  id: r.id,
  bookId: r.book_id,
  book: r.book_title,
  type: r.type,
  quantity: r.quantity,
  date: new Date(r.created_at).toLocaleString(),
  memberId: r.member_id,
});

// GET /transactions   (oldest first; the React table shows newest first)
router.get("/", async (req, res, next) => {
  try {
    const rows = await query("SELECT * FROM transactions ORDER BY created_at, id");
    res.json(rows.map(mapTxn));
  } catch (e) { next(e); }
});

/**
 * POST /transactions   { bookId, type, quantity, memberId? }
 * Changes stock and records the transaction in ONE database transaction,
 * so the two can never get out of sync. The row is locked (FOR UPDATE)
 * so two people can't borrow the last copy at the same time.
 */
router.post("/", async (req, res, next) => {
  const { bookId, type } = req.body;
  const quantity = Number(req.body.quantity);
  const memberId = (req.body.memberId || "Admin").toString().trim();

  if (!TYPES.includes(type)) return res.status(400).json({ message: "Invalid transaction type." });
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Please enter a valid whole-number quantity." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [books] = await conn.query("SELECT * FROM books WHERE id = ? FOR UPDATE", [bookId]);
    if (!books.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Book not found." });
    }
    const book = books[0];

    const adds = type === "Add Stock" || type === "Return";
    if (!adds && quantity > book.quantity) {
      await conn.rollback();
      const msg = type === "Borrow"
        ? "This book is out of stock."
        : `Cannot deduct ${quantity} copies. Only ${book.quantity} available.`;
      return res.status(400).json({ message: msg });
    }

    if (type === "Borrow") {
      const [mem] = await conn.query("SELECT id FROM users WHERE member_id = ?", [memberId]);
      if (!mem.length) {
        await conn.rollback();
        return res.status(400).json({ message: "Your account does not have a valid Member ID." });
      }
    }

    const newQty = adds ? book.quantity + quantity : book.quantity - quantity;
    await conn.query("UPDATE books SET quantity = ? WHERE id = ?", [newQty, book.id]);
    const [result] = await conn.query(
      "INSERT INTO transactions (book_id, book_title, type, quantity, member_id) VALUES (?, ?, ?, ?, ?)",
      [book.id, book.title, type, quantity, memberId]
    );
    await conn.commit();

    const messages = {
      "Add Stock": `${quantity} copy/copies added successfully.`,
      "Deduct Stock": `${quantity} copy/copies deducted successfully.`,
      Borrow: "Book borrowed successfully.",
      Return: "Book returned successfully.",
    };
    const [rows] = await conn.query("SELECT * FROM transactions WHERE id = ?", [result.insertId]);
    res.status(201).json({ message: messages[type], transaction: mapTxn(rows[0]), quantity: newQty });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// DELETE /transactions   (clears the history log; stock levels are not changed)
router.delete("/", async (req, res, next) => {
  try {
    await query("DELETE FROM transactions");
    res.json({ message: "Transaction history cleared." });
  } catch (e) { next(e); }
});

export default router;
