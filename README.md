# CivilCaseOS

India-focused Civil Litigation Practice Management + Case Intelligence app built with Next.js App Router, Prisma, PostgreSQL, NextAuth credentials auth, Tailwind, Framer Motion, and Recharts.

## Features
- Auth + RBAC with credentials and bcrypt hashing.
- App shell with sidebar, top bar, command palette, dark/light theme toggle with DB persistence.
- Dashboard KPI cards, at-risk panel, upcoming deadlines.
- Clients/Matters pages and Matter detail with health score + timeline.
- Intake brief builder with AI abstraction and fallback.
- Templates + DOCX export endpoint.
- Court Status Sync with manual/CSV + pluggable stub connector.
- Upload storage abstraction with local provider.
- Zod validation on API inputs.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure env:
   ```bash
   cp .env.example .env
   ```
3. Run migrations and generate client:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Seed demo data:
   ```bash
   npm run prisma:seed
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

Demo login: `admin@civilcaseos.in` / `Password@123`

## Notes
- AI output includes disclaimer: "AI output is a drafting aid. Review and verify before use."
- Court sync connector is intentionally a stub and does not scrape eCourts.
