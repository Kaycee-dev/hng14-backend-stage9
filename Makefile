up:        ## start local stack (1 worker)
	docker compose up --build
up2:       ## start with 2 workers (duplicate-protection demo)
	docker compose up --build --scale worker=2
down:
	docker compose down -v
bench:     ## run benchmarks -> docs/benchmark_results.md
	npx tsx scripts/run_benchmarks.ts
smoke:     ## smoke test against $(URL)
	URL=$(URL) bash scripts/smoke_test.sh
logs:
	docker compose logs -f worker
seed:
	npx tsx scripts/seed_demo_jobs.ts
