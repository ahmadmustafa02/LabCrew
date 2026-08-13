# Data layer

## Approach

- **Prisma 7** with the PostgreSQL driver adapter (`@prisma/adapter-pg` + `pg`)
- Connection URL lives in `prisma.config.ts` / `DATABASE_URL` (not in `schema.prisma`)
- App access goes through `src/lib/db.ts` (singleton + adapter pool)

## Local setup

1. Start Docker Desktop
2. `docker compose up -d`
3. `npm run db:generate`
4. `npm run db:push` (or `npm run db:migrate` once we add named migrations)
5. `npm run db:seed`

## Seed story

Northwater Lab · Summer Research Cohort ’26 · 12 students · 1 active milestone.  
First three students are intentional exceptions for Mission Control demos.
