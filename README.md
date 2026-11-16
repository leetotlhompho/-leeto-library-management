# Community Library Management System

React frontend + Express backend + MySQL database.

```
library-management/
  frontend/   React (Vite) app      -> http://localhost:5173
  backend/    Express REST API      -> http://localhost:5000
```

Requires Node 18+ and a running MySQL server.

## 1. Backend (terminal 1)

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env 
npm run init-db           # creates library_db and its tables
npm start                 # API on http://localhost:5000
```

## 2. Frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # open http://localhost:5173
```

## First use

The database starts empty. Open **Admin Login -> Register Admin**, create an admin, log in, then add books and users.
Members log in on **User Login** with their name + Member ID.

## REST API

| Method | Route | Purpose |
| --- | --- | --- |
| GET / POST | `/books` | list / add a book |
| GET / PUT / DELETE | `/books/:id` | read / update / delete a book |
| GET / POST | `/users` | list / add a user |
| PUT / DELETE | `/users/:id` | update / delete a user |
| GET / DELETE | `/transactions` | history log / clear it |
| POST | `/transactions` | `{ bookId, type, quantity, memberId }`, type = `Add Stock`, `Deduct Stock`, `Borrow`, `Return` (updates stock and logs it in one DB transaction) |
| POST | `/auth/user-login`, `/auth/admin-login`, `/auth/admin-register` | login / register |

## Database tables (`backend/schema.sql`)

`books`, `users`, `admins`, `transactions` (history is kept even if a book is deleted).

## Where things are

| Requirement | Location |
| --- | --- |
| Book CRUD | `frontend/src/pages/ManageBooks.jsx`, `backend/routes/books.js` |
| Add / deduct stock, history | `frontend/src/pages/Transactions.jsx`, `backend/routes/transactions.js` |
| Users + login | `ManageUsers.jsx`, `UserLogin.jsx`, `backend/routes/users.js`, `auth.js` |
| Dashboard, low stock (< 2) | `frontend/src/pages/AdminDashboard.jsx`, `utils/stock.js` |
| Fetch API | `frontend/src/utils/api.js` |
| Middleware (`express.json`, `cors`) | `backend/index.js` |

## Troubleshooting

- **"Cannot reach the server"**: the backend isn't running, or `VITE_API_URL` in `frontend/.env` doesn't match its port.
- **CORS error**: `CLIENT_ORIGIN` in `backend/.env` must equal the URL Vite prints (default `http://localhost:5173`).
- **MySQL access denied**: fix `DB_USER` / `DB_PASSWORD` in `backend/.env`.
