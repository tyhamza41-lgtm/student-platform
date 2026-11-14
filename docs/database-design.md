# Database design

## Database

PostgreSQL is configured as the initial database provider through Prisma.

## Schema

Define domain entities, fields, relations, indexes, and constraints in
`backend/prisma/schema.prisma` as product requirements are finalized.

## Migrations and seed data

Store generated Prisma migrations in `backend/prisma/migrations/`. Add
project-specific development seed data in `backend/prisma/seed.js`.
