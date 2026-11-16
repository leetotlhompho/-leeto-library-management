CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

CREATE TABLE IF NOT EXISTS books (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  author     VARCHAR(255) NOT NULL,
  genre      VARCHAR(100) NOT NULL,
  isbn       VARCHAR(20)  NOT NULL UNIQUE,
  quantity   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_books_quantity CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  member_id  VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(150) NOT NULL UNIQUE,
  role       ENUM('user','librarian') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  admin_id      VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Borrowing history + stock movements. book_title is copied so history
-- survives if a book is deleted (book_id becomes NULL).
CREATE TABLE IF NOT EXISTS transactions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  book_id    INT NULL,
  book_title VARCHAR(255) NOT NULL,
  type       ENUM('Add Stock','Deduct Stock','Borrow','Return','Update') NOT NULL,
  quantity   INT NOT NULL,
  member_id  VARCHAR(50) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_txn_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- Upgrade for databases created before the 'Update' type existed (safe to run every time).
ALTER TABLE transactions
  MODIFY type ENUM('Add Stock','Deduct Stock','Borrow','Return','Update') NOT NULL;
