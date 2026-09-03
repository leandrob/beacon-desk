# Beacon Desk

A support ticketing console for small teams. It covers the day-to-day of a
helpdesk — a triaged ticket queue, SLA targets per priority, threaded
conversations with private notes, canned replies, a customer directory and a
knowledge base — in a fast, dark, single-page app that updates live across
every agent's screen.

Built to be simple and readable: React + Tailwind + shadcn/ui on the front end,
Node + Express + SQLite on the back end, and native WebSockets for real-time
updates. Runs with a single Docker command.

---

## Quick start

One command — that's it:

```bash
cd app
docker compose up
```

Then open **http://localhost:5174**.

Log in with a seeded agent account:

| Email             | Password   | Role  |
| ----------------- | ---------- | ----- |
| `admin@desk.test` | `admin123` | admin |
| `agent@desk.test` | `agent123` | agent |

Three more agents (`priya@`, `tomasz@`, `hannah@desk.test`, password
`agent123`) exist so the team-load and assignment views have data.

> Tip: log in as two agents in two browser windows. Reply on a ticket in one
> and watch the conversation, the queue and the dashboard update in the other.
> The "Simulate customer reply" link in the composer lets you play the customer.

This default stack runs in **development mode with live reload** — your source
is mounted into the containers, so:

- editing **any frontend file** hot-reloads the browser instantly (Vite HMR);
- editing **any backend file** restarts the API automatically (nodemon).

The database is seeded automatically on first run with ~45 tickets spread over
the last month, so the dashboard, SLA states and charts look alive. Timestamps
are relative to the moment the seed runs. To start over with a fresh database:

```bash
docker compose down -v   # removes volumes, re-seeds on next start
```

### Seed profiles

Two independent demo datasets ship with the app, selected with the
`SEED_PROFILE` environment variable (read once, when the database is empty):

| Profile     | Scenario                                                               |
| ----------- | ---------------------------------------------------------------------- |
| `analytics` | *(default)* Beacon as a BI / dashboards product; SaaS teams as customers |
| `commerce`  | Beacon as an e-commerce platform; online shops as customers            |

Each profile has its own agents (same login emails), customers, tickets,
tags, macros and knowledge base, so two deployments of the same build can show
completely different data:

```bash
SEED_PROFILE=commerce docker compose up
```

Profiles live in `backend/src/db/seed-data/`; add a file there and list it in
`PROFILES` in `seed.js` to create another one.

Ports **5174** (frontend) and **4100** (backend) are intentionally different
from Nimbus CRM, so both demos can run side by side.

---

## Production build (single container)

To run the optimized production build — frontend compiled to static files and
served by the backend from a single container on port **4100**:

```bash
cd app
docker compose -f docker-compose.prod.yml up --build
```

Then open **http://localhost:4100**.

> Both stacks use backend port 4100, so run one at a time (`docker compose down`
> before switching).

### Configuration

Environment variables for the dev stack live in **`app/.env`** (auto-loaded by
Docker Compose):

| Variable      | Default               | Description                                                  |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `BACKEND_URL` | `http://backend:4100` | Backend the frontend dev server proxies `/api` and `/ws` to. |

---

## Running locally without Docker

You need Node.js 18+ installed. Run the backend and frontend in two terminals.

**Terminal 1 — backend (API + WebSocket on :4100):**

```bash
cd app/backend
npm install
npm start
```

**Terminal 2 — frontend (Vite dev server on :5174):**

```bash
cd app/frontend
npm install
npm run dev
```

Open **http://localhost:5174**. The Vite dev server proxies `/api` and `/ws`
to the backend. The SQLite database and seed data are created automatically
the first time the backend starts. To re-seed from scratch:

```bash
cd app/backend
node src/db/seed.js --force                      # analytics profile
node src/db/seed.js --force --profile commerce   # commerce profile
```

---

## Features

- **Authentication** — token-based (JWT) login for agents, with admin/agent
  roles (admins manage SLA policies and the team).
- **Overview dashboard** — open / unassigned / SLA-breached / awaiting-reply
  counts, resolved today, average first-response and resolution time, SLA
  attainment, 14-day created-vs-resolved chart, open tickets by priority,
  status and category, per-agent workload, a "needs attention" list and a live
  activity feed.
- **Ticket queue** — saved views (All open, My queue, Unassigned, Breaching
  SLA, Pending, Resolved, Everything), free-text search (subject, customer, or
  `BD-1042`), filters by priority, status, assignee and tag, five sort orders,
  and **bulk actions** (assign, set status, set priority) on selected rows.
- **Ticket detail** — threaded conversation with customer messages, agent
  replies and **internal notes** (private, amber-highlighted); a composer with
  **macros** (canned responses with `{{customer}}` / `{{agent}}`
  placeholders), "send & set status" shortcuts and ⌘↵ to send; a sidebar to
  change status, priority, assignee, category and tags; **SLA panel** showing
  first-response and resolution targets as live countdowns; a full **history**
  of every field change; and a link to the customer.
- **SLA engine** — targets per priority (configurable in Settings). First
  agent reply stops the response clock; resolving stops the resolution clock;
  the resolution clock pauses while a ticket is *pending* on the customer; a
  customer reply on a pending ticket reopens it automatically. Each ticket
  reports `ok / due soon / breached / met / paused` for both targets.
- **Customers** — searchable directory with plan (Free / Pro / Enterprise),
  open and total ticket counts, and a detail page with open tickets, history,
  and internal notes for agents.
- **Knowledge base** — categorized help articles with a lightweight
  formatting syntax (headings, lists, bold, code, quotes), draft/published
  state, view counts, search, and full CRUD.
- **Settings** — SLA policies, macros, tags (with colors and usage counts),
  and team management (invite agents, roles, avatar colors).
- **Real-time** — every create / update / reply is broadcast over WebSockets:
  queues, ticket threads, the dashboard and settings stay in sync across all
  connected agents. New tickets pop up as a toast with an "Open" action.
- **Polished UX** — dark "operations console" theme with an amber signal
  color, top navigation, priority stripes on rows, monospace ticket refs,
  empty states, loading states, confirmation dialogs and toasts.

---

## Architecture

```
app/
├── backend/                  Node + Express + SQLite + WebSocket
│   └── src/
│       ├── db/               schema.sql, connection, migrate (SLA defaults), seed + seed-data/ profiles
│       ├── routes/           one file per resource (REST endpoints)
│       ├── services/         ticket helpers (SLA math, decorate, events) + activity log
│       ├── websocket/        WebSocket hub + broadcast helper
│       ├── middleware/       JWT auth (+ requireAdmin)
│       └── index.js          server entry (also serves the built frontend)
├── frontend/                 React SPA (Vite)
│   └── src/
│       ├── components/        UI primitives (shadcn/ui) + shared components + form dialogs
│       ├── pages/             one file per screen
│       ├── hooks/             auth + WebSocket React contexts
│       └── lib/               api client, formatters, constants, tiny article renderer
├── Dockerfile                multi-stage: build frontend → run backend
├── docker-compose.yml        dev stack (two services, live reload)
└── docker-compose.prod.yml   single container + persistent volume
```

**Backend.** A small Express app. Each resource (`tickets`, `customers`,
`agents`, `tags`, `macros`, `sla`, `articles`, `activities`, `dashboard`) has
its own route file with plain SQL via
[`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (synchronous,
no ORM). `services/tickets.js` centralizes the ticket logic: sequential
numbering (`BD-1001`…), SLA due-date computation from the policy table, the
`decorate()` helper that adds `ref`, parsed `tags` and the computed `sla`
state to every row, and the audit-event writer. Auth is stateless JWT —
`requireAuth` protects every `/api` route except login; `requireAdmin` gates
SLA and team management. Whenever data changes, the route records an activity
(where relevant) and calls `broadcast()` to push a `{ type, payload }` message
to all WebSocket clients.

**Frontend.** A React SPA built with Vite. State is intentionally simple —
React `useState`/`useEffect`, two small contexts (`useAuth`, `useWebSocket`),
and `fetch` calls through a tiny `api` wrapper. No Redux/React Query. The
`useRealtime(types, handler)` hook lets any page subscribe to WebSocket
events; pages re-fetch when a relevant event arrives. The ticket queue keeps
its filters in the URL (`/tickets?view=open&assignee=me`) so views are
linkable from the dashboard.

**Database.** SQLite with a straightforward schema: `users` (agents),
`customers`, `tickets`, `ticket_messages`, `ticket_events`, `tags`,
`ticket_tags`, `macros`, `articles`, `sla_policies`, `activities`. The schema
lives in `backend/src/db/schema.sql` and is applied on startup;
`migrate.js` makes sure default SLA policies exist. Seed data is inserted on
first run only.

---

## API overview

All endpoints are under `/api`. Every route except `/api/auth/login` requires an
`Authorization: Bearer <token>` header.

| Method | Path                            | Description                                                |
| ------ | ------------------------------- | ---------------------------------------------------------- |
| POST   | `/auth/login`                   | Log in, returns `{ token, user }`                          |
| GET    | `/auth/me`                      | Current user                                               |
| GET    | `/dashboard`                    | Aggregate stats, charts, team load, attention list         |
| GET    | `/activities`                   | Recent activity feed (`?limit=`)                           |
| GET    | `/tickets`                      | List — `view`, `status`, `priority`, `assignee` (`me` / `unassigned` / id), `tag`, `search`, `customer_id`, `sort` |
| POST   | `/tickets`                      | Create (with opening customer message, optional tags)      |
| GET    | `/tickets/:id`                  | Detail with `messages`, `events`, `tags`, `sla`            |
| PUT    | `/tickets/:id`                  | Update subject/status/priority/assignee/category/tag_ids   |
| POST   | `/tickets/bulk`                 | Apply status/priority/assignee to many `ids`               |
| DELETE | `/tickets/:id`                  | Delete                                                     |
| POST   | `/tickets/:id/messages`         | Reply (`is_internal`, `next_status`, `as_customer` demo)   |
| DELETE | `/tickets/:id/messages/:mid`    | Delete an internal note                                    |
| GET/POST | `/customers`                  | List (`search`, `plan`) / create                           |
| GET/PUT/DELETE | `/customers/:id`        | Detail (+tickets) / update / delete                        |
| GET/POST | `/agents`                     | List (with workload) / invite (admin)                      |
| PUT/DELETE | `/agents/:id`               | Update / remove (admin)                                    |
| GET/POST | `/tags`, PUT/DELETE `/tags/:id` | Tag CRUD                                                 |
| GET/POST | `/macros`, PUT/DELETE `/macros/:id` | Canned response CRUD                                 |
| GET/PUT | `/sla`                         | SLA policies / replace all (admin)                         |
| GET/POST | `/articles`                   | List (`search`, `category`, `published`) / create          |
| GET/PUT/DELETE | `/articles/:id`         | Detail (counts a view) / update / delete                   |

WebSocket: connect to `/ws`. Messages are JSON `{ type, payload }`, e.g.
`ticket.created`, `ticket.updated`, `message.created`, `activity.created`,
`sla.updated`.

---

## Known limitations & future improvements

This is a focused prototype, kept deliberately simple. Things a production
version would add:

- **No customer-facing portal or email ingestion.** Tickets are created by
  agents (or the seed). A real helpdesk would accept email/webform/chat and
  send outbound notifications.
- **WebSocket auth & scoping.** The socket is open to any client on the host
  and broadcasts globally.
- **Business-hours SLAs.** SLA targets are wall-clock hours; there is no
  calendar or holiday awareness.
- **No pagination.** Lists return all rows — fine for a demo dataset.
- **Minimal validation.** Required fields and enums are checked; richer schema
  validation and rate limiting are TODO.
- **No automated tests.** Endpoints were verified manually.
- **Token storage.** The JWT is kept in `localStorage`; an httpOnly cookie
  flow would be more secure.

---

## Tech stack

**Frontend:** React 18, Vite, React Router, Tailwind CSS, shadcn/ui (Radix
primitives), lucide-react, Recharts, sonner, date-fns.

**Backend:** Node.js, Express, better-sqlite3, ws (WebSockets), jsonwebtoken,
bcryptjs.

**Infra:** Docker, docker-compose, SQLite.
