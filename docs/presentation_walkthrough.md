# Presentation Walkthrough

**"Explain your heap."**
The Key tuple is \`(effective_priority, scheduled_at, created_at, job_id)\`, where the structurally lowest numeric output dominates the node positions. I am rebuilding this tuple evaluation queue every single loop tick—this is crucial because effective priority continually modifies itself dynamically.

**"How do two workers not grab the same job?"**
The standard atomic, native conditional \`UPDATE … WHERE status='pending' … RETURNING\`. By deploying the locking strictly through standard pg/SQL, the database explicitly serializes the row write. I actively bypassed \`FOR UPDATE SKIP LOCKED\` so that my overall system doesn't maintain any active locks simultaneously while standard execution computes external side-effects offline.

**"Worker crashes mid-job?"**
Leases (\`locked_until\`) tied seamlessly to a passive reaper. My worker process does not rely on active ping heartbeats. Instead, an unattended row simply expires its clock sequence, defaulting gracefully backwards toward \`pending\` without burning its max retries allocation safely. 

**"Walk through starvation prevention."**
Age is factored directly from \`max(created_at, scheduled_at)\`. This completely stops arbitrary jobs scheduled weeks in advance from passively harvesting high internal priority parameters organically. 

**"Cancellation while processing?"**
Cooperative check-pointing limits mid-run breakages, preventing external calls (like SMTP transmission) from emitting partial/split payloads unexpectedly.

**"Why timing wheel, and tradeoffs?"**
\`O(1)\` constant-time slot inserts naturally outperform standard \`O(log n)\` trees under very heavy volumes. However, resolution locks onto structural granular configurations, requiring excessive backend management cycles over bucket overflows specifically.

**"Retry math / off-by-one?"**
\`max_retries=3\` creates exactly 4 execution iterations total, triggering standard array offsets spanning `1, 5, 25` seconds + an automated ±25% random jitter distribution framework safely.

**"DAG cycle handling?"**
Dependent children natively remain inside the \`pending\` tables blockaded permanently until their parent resolves successfully. I specifically engineered failures to isolate gracefully—they never crash external trees.
