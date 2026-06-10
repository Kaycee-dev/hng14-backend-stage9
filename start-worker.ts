import { runWorkerLoop } from "./src/worker/main";

const workerId = process.env.WORKER_ID || `worker-\${Math.floor(Math.random() * 1000)}`;
runWorkerLoop(workerId, 1);
