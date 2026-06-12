# Stage 9 Postman Pack

## Quick start

1. Import `stage9.postman_collection.json`.
2. Import either `local.postman_environment.json` or `live.postman_environment.json`.
3. Select the imported environment before sending requests or running folders.

The local environment provides `baseUrl` as `http://localhost:3000`. The live
environment provides `baseUrl` as `https://hng14-stage9-vm.duckdns.org`.

Run the self-verifying folders headlessly with Newman:

```bash
npx --yes newman run postman/stage9.postman_collection.json \
  -e postman/live.postman_environment.json --folder Dashboard --folder Jobs \
  --folder Workflows --folder DLQ
```

## Folder map

- `Dashboard`: verifies scheduler totals and active worker reporting.
- `Jobs`: creates a future job, gets it, lists jobs, and cancels it.
- `Workflows`: creates both workflow variants and verifies a returned job.
- `DLQ`: lists dead letter entries and retries one when an entry is available.
- `Live Events`: opens the long-lived SSE stream manually; do not include it in
  Collection Runner or Newman runs.

The environment files contain only `baseUrl`; credentials are not stored.
