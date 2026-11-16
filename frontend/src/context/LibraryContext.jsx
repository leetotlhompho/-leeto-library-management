import { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import { api } from "../utils/api";

const LibraryContext = createContext(null);

/**
 * Books, users and transactions now live in MySQL behind the Express API.
 * React keeps a copy in state; every action calls the API with fetch(),
 * then refreshes the copy so the screen always matches the database.
 * All actions are async and resolve to { ok, message }.
 */
export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBooks = useCallback(async () => {
    const res = await api("/books");
    if (res.ok) setBooks(res.data ?? []);
    return res;
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await api("/users");
    if (res.ok) setUsers(res.data ?? []);
    return res;
  }, []);

  const loadTransactions = useCallback(async () => {
    const res = await api("/transactions");
    if (res.ok) setTransactions(res.data ?? []);
    return res;
  }, []);

  const refresh = useCallback(async () => {
    const results = await Promise.all([loadBooks(), loadUsers(), loadTransactions()]);
    const failed = results.find((r) => !r.ok);
    setError(failed ? failed.message : null);
    setLoading(false);
  }, [loadBooks, loadUsers, loadTransactions]);

  // Load everything once when the app starts.
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ---------------- BOOKS ---------------- */

  const addBook = useCallback(async (data) => {
    const res = await api("/books", { method: "POST", body: data });
    if (res.ok) await loadBooks();
    return res;
  }, [loadBooks]);

  const updateBook = useCallback(async (id, data) => {
    const res = await api(`/books/${id}`, { method: "PUT", body: data });
    if (res.ok) await Promise.all([loadBooks(), loadTransactions()]);
    return res;
  }, [loadBooks, loadTransactions]);

  const deleteBook = useCallback(async (id) => {
    const res = await api(`/books/${id}`, { method: "DELETE" });
    if (res.ok) await Promise.all([loadBooks(), loadTransactions()]);
    return res;
  }, [loadBooks, loadTransactions]);

  /* ---------------- STOCK / BORROWING (all go through POST /transactions) ---------------- */

  const record = useCallback(async (bookId, type, quantity, memberId) => {
    const res = await api("/transactions", { method: "POST", body: { bookId, type, quantity, memberId } });
    if (res.ok) await Promise.all([loadBooks(), loadTransactions()]);
    return res;
  }, [loadBooks, loadTransactions]);

  const addStock = useCallback((bookId, qty) => record(bookId, "Add Stock", qty, "Admin"), [record]);
  const deductStock = useCallback((bookId, qty) => record(bookId, "Deduct Stock", qty, "Admin"), [record]);
  const borrowBook = useCallback((bookId, memberId) => record(bookId, "Borrow", 1, memberId), [record]);
  const returnBook = useCallback((item, memberId) => {
    const book = books.find((b) => (item.bookId ? b.id === item.bookId : b.title === item.title));
    if (!book) return Promise.resolve({ ok: false, message: "Book could not be found." });
    return record(book.id, "Return", 1, memberId);
  }, [books, record]);

  const clearTransactions = useCallback(async () => {
    const res = await api("/transactions", { method: "DELETE" });
    if (res.ok) await loadTransactions();
    return res;
  }, [loadTransactions]);

  /* ---------------- USERS ---------------- */

  const addUser = useCallback(async (data) => {
    const res = await api("/users", { method: "POST", body: data });
    if (res.ok) await loadUsers();
    return res;
  }, [loadUsers]);

  const updateUser = useCallback(async (id, data) => {
    const res = await api(`/users/${id}`, { method: "PUT", body: data });
    if (res.ok) await loadUsers();
    return res;
  }, [loadUsers]);

  const deleteUser = useCallback(async (id) => {
    const res = await api(`/users/${id}`, { method: "DELETE" });
    if (res.ok) await loadUsers();
    return res;
  }, [loadUsers]);

  const value = useMemo(
    () => ({
      books, users, transactions, loading, error, refresh,
      addBook, updateBook, deleteBook,
      addStock, deductStock, clearTransactions,
      borrowBook, returnBook,
      addUser, updateUser, deleteUser,
    }),
    [books, users, transactions, loading, error, refresh, addBook, updateBook, deleteBook, addStock,
     deductStock, clearTransactions, borrowBook, returnBook, addUser, updateUser, deleteUser]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return context;
}
