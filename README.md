# NEXUS

Starter repository structure for the NEXUS student platform project.

## Repository layout

- `frontend/` — client application.
- `backend/` — server application and Prisma database resources.
- `docs/` — requirements, architecture, database, and API documentation.
- `infrastructure/` — Docker and deployment resources.
- `tests/` — integration and end-to-end tests.

## Local database

1. Copy `.env.example` to `.env` and update the values if needed.
2. Start PostgreSQL with `docker compose up -d db`.
3. Configure the backend to use the `DATABASE_URL` in `.env`.

The frontend and backend frameworks, dependencies, and run commands have not been
selected yet.
