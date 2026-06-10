# Architecture

## Overview
This platform employs a stateless worker design with **PostgreSQL** as the single source of truth. The system ensures robust execution of scheduled and recurring async jobs while averting starvation and contention. 

## Design Principles
1. **PostgreSQL as single source of truth**: Workers do not maintain internal state. Ownership of a job is negotiated synchronously with the database.
2. **Dynamic Heap Execution**: The worker extracts \`pending\` candidates into memory, scoring them into a Min-Heap. The heap determines optimal local processing order, rebuilt structurally per-poll, meaning priority dynamically recalculates based on wait age.
3. **Atomic Ownership**: Ordering lies with the heap, but ownership lies with the conditional atomic DB claim (\`UPDATE... RETURNING\`).
4. **Universal UTC Time**: All logic stores and calculates exclusively in UTC time bounds.

## Duplicate Protection
Multiple instances naturally poll for new candidates. Concurrency conflicts are solved because PostgreSQL correctly serializes standard conditional UPDATE statements. When Worker 1 and Worker 2 hit the same Job ID, exactly one receives an updated response row, while the other proceeds down the heap queue seamlessly.
