# Job Application Tracker

A full-stack application for tracking job applications, built with React + Vite, Express, and PostgreSQL.

## Features
- Create, view, edit, and delete job applications
- Search by company, role, or location
- Filter by application status
- Dashboard statistics and status breakdown
- Store job URL, location, salary range, applied date, notes, and interview date
- Responsive layout for desktop and mobile
- PostgreSQL persistence

## Requirements
- Node.js 18+
- PostgreSQL 14+
- npm

## 1. Create the database

Open `psql` using your local PostgreSQL user and run:

```sql
CREATE DATABASE job_applications;
```

Then connect to the database and run the schema:

```bash
psql -d job_applications -f backend/schema.sql
```

If your local PostgreSQL setup requires a username, use:
```bash
psql -U YOUR_POSTGRES_USERNAME -d job_applications -f backend/schema.sql
```

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your local PostgreSQL credentials. On the machine used during setup, the PostgreSQL role was `samala`, so `DB_USER=samala` may be correct for that environment. Use the role that exists on your own machine.

Install and start:
```bash
npm install
npm run dev
```

The API runs at `http://localhost:5001`.

Check the API:
- `http://localhost:5001/api/health`
- `http://localhost:5001/api/applications`
- `http://localhost:5001/api/applications/stats`

## 3. Start the frontend

Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## API endpoints
- `GET /api/health`
- `GET /api/applications?search=&status=`
- `GET /api/applications/stats`
- `GET /api/applications/:id`
- `POST /api/applications`
- `PUT /api/applications/:id`
- `DELETE /api/applications/:id`

## Notes
- This starter is intended for local development and portfolio use.
- It does not include user authentication. Do not expose it publicly with real personal data until authentication, authorization, validation, and deployment security are added.
- Never commit your `.env` file or database password.
