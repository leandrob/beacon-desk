# Beacon Desk

A support ticketing console — a live ticket queue with SLA timers, threaded
conversations with internal notes, canned responses, a customer directory,
and a knowledge base — built with React, Express, SQLite, and WebSockets, all
runnable with a single Docker command.

The full project lives in [`app/`](./app). To get started, one command:

```bash
cd app
docker compose up
# open http://localhost:5174  (login: admin@desk.test / admin123)
```

This runs in development mode with live reload. For the production build, see
[`app/README.md`](./app/README.md).

See [`app/README.md`](./app/README.md) for full setup instructions,
architecture notes, the API reference, and known limitations.
