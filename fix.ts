import fs from 'fs';
import path from 'path';

const files = [
  'src/components/Sidebar.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/Jobs.tsx',
  'src/pages/DLQ.tsx',
  'src/pages/CreateJob.tsx',
  'src/pages/WorkflowDemo.tsx',
  'src/worker/handlers/index.ts',
  'server.ts',
  'src/worker/main.ts',
  'start-worker.ts'
];

for(const file of files) {
  const fp = path.join(process.cwd(), file);
  if(fs.existsSync(fp)) {
    const raw = fs.readFileSync(fp, 'utf-8');
    fs.writeFileSync(fp, raw.replace(/\\\`/g, '`'));
  }
}
