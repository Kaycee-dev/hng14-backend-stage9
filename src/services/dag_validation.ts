export type WfJob = {
  client_id: string;
  type: string;
  payload?: any;
  priority?: number;
  scheduled_at?: string;
  recurring_interval?: string | null;
  depends_on?: string[];
};

export function validateWorkflow(
  jobs: WfJob[]
): { ok: true; order: string[] } | { ok: false; error: string } {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return { ok: false, error: "jobs must be a non-empty array" };
  }

  const clientIds = new Set<string>();
  for (const job of jobs) {
    if (clientIds.has(job.client_id)) {
      return {
        ok: false,
        error: `duplicate client_id '${job.client_id}'`
      };
    }
    clientIds.add(job.client_id);
  }

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const clientId of clientIds) {
    indegree.set(clientId, 0);
    adjacency.set(clientId, []);
  }

  for (const job of jobs) {
    for (const dependency of job.depends_on ?? []) {
      if (dependency === job.client_id) {
        return {
          ok: false,
          error: `self-dependency on '${job.client_id}'`
        };
      }
      if (!clientIds.has(dependency)) {
        return {
          ok: false,
          error: `unknown dependency '${dependency}' for '${job.client_id}'`
        };
      }

      adjacency.get(dependency)!.push(job.client_id);
      indegree.set(job.client_id, indegree.get(job.client_id)! + 1);
    }
  }

  const queue = jobs
    .filter((job) => indegree.get(job.client_id) === 0)
    .map((job) => job.client_id);
  const order: string[] = [];

  for (let index = 0; index < queue.length; index += 1) {
    const clientId = queue[index];
    order.push(clientId);

    for (const dependent of adjacency.get(clientId)!) {
      const nextIndegree = indegree.get(dependent)! - 1;
      indegree.set(dependent, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(dependent);
      }
    }
  }

  if (order.length !== jobs.length) {
    return { ok: false, error: "cycle detected" };
  }

  return { ok: true, order };
}
