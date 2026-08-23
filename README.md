# FlowDesk

A production-minded team workflow and project management platform for the full-stack capstone.

## Stack

React + Vite + TypeScript • Express + TypeScript • Prisma + SQLite • JWT • Zod • Vitest • Supertest • React Testing Library

## Features

- JWT authentication and protected routes
- RBAC: ADMIN, MANAGER, MEMBER
- Dashboard analytics
- Full CRUD for related projects and tasks
- Search and filtering
- Client/server validation
- Responsive dark UI
- Loading, error and empty states
- Seeded demo data
- Frontend + backend tests

## Demo

Email: `demo@flowdesk.local`  
Password: `Demo123!`

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Web: http://localhost:5173  
API: http://localhost:4000

## Architecture

```text
React SPA → Express REST API → Prisma → SQLite
                 │
          JWT + Zod + RBAC
```

The API owns authentication, authorization, validation and business rules. Projects own tasks through `Task.projectId`; users may be assigned to tasks.

## Case study

FlowDesk addresses fragmented team planning by putting projects, tasks, ownership and progress in one lightweight workspace. TypeScript provides end-to-end safety; Express keeps API boundaries explicit; Prisma provides relational persistence with minimal setup; Zod keeps validation consistent at the application boundary.

A key design decision is server-side authorization: the browser never gets to decide whether a mutation is allowed. Every protected mutation verifies the JWT and checks the user's role.

## Scripts

`npm run dev` • `npm run build` • `npm test` • `npm run db:generate` • `npm run db:push` • `npm run db:seed`
