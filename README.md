# LawHub

LawHub is a role-based legal services platform built with Next.js. It supports workflows for clients, lawyers, enterprises, NGOs, students, and administrators in one unified product.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- NextAuth
- React Query

## Features

- Multi-role dashboards (admin, client, lawyer, enterprise, NGO, student)
- Briefs, bids, cases, payments, and profile flows
- Internship and network modules
- AI-assisted capabilities via provider integrations
- Notification and review systems

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`.

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run database migrations:

```bash
npm run prisma:migrate
```

5. Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - start production server
- `npm run lint` - run linting
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run Prisma migrations
- `npm run prisma:seed` - seed database

## Project Structure

- `src/app` - routes and layouts
- `src/components` - UI and feature components
- `src/lib` - shared libraries and integrations
- `src/hooks` - custom React hooks
- `src/store` - global state
- `prisma` - database schema and seed setup
