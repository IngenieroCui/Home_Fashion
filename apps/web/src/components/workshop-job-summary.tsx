import Link from 'next/link';
import { formatDate, type WorkshopJobSummary } from '@/lib/workshop-jobs';
import { WorkshopJobStatusBadge } from './workshop-job-status-badge';

export function WorkshopJobSummary({ job }: { job: WorkshopJobSummary }) {
  return (
    <section className="mt-4 rounded-lg border border-[#ddcfbc] bg-[#fffdf8] p-4">
      <p className="eyebrow">Asignación a taller</p>
      <p>
        <strong>{job.code}</strong>
      </p>
      <p>Taller: {job.workshopUser.fullName}</p>
      <p className="flex items-center gap-2">
        Estado: <WorkshopJobStatusBadge status={job.status} />
      </p>
      <p>Fecha esperada: {formatDate(job.expectedCompletionDate)}</p>
      <Link className="text-link" href={`/panel/talleres/trabajos/${job.id}`}>
        Ver trabajo
      </Link>
    </section>
  );
}
