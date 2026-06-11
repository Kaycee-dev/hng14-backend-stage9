# Dilamme Job Orchestrator

Dilamme is a background job-orchestration platform. Jobs are created through
the UI or API, queued in PostgreSQL, processed by independent workers, and
tracked live in the browser.

The platform supports scheduled and recurring jobs, automatic retries and a
dead-letter queue, dependency-based DAG workflows, atomic duplicate
protection, and aging-based starvation prevention. Its default scheduler uses
a binary min-heap, with a benchmarked timing-wheel implementation available as
an alternative.

## Live Demo

https://hng14-stage9-vm.duckdns.org/

## Run Locally

The zero-setup development mode uses the in-process PGlite fallback and runs
the API, UI, and worker in a single process.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Run With Docker

The Docker stack uses PostgreSQL and runs the backend plus two independent
workers with a shared data volume.

```bash
docker compose up --build
```

Open http://localhost:3000.

## Tests

```bash
npm test
```

Pure tests always run. Database-backed tests require `TEST_DATABASE_URL` or
`DATABASE_URL` to point to a real PostgreSQL database.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md) for the manual VPS, DuckDNS, HTTPS, and
  Nginx setup
- [Postman API collection](postman/stage9.postman_collection.json)
