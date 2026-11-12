import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReviewWorkshopProgressDto, SubmitWorkshopProgressDto, WorkshopProgressReviewDecision } from './workshop-progress.dto';
import { WorkshopProgressReportType } from '../workshop-jobs.types';

describe('Workshop progress DTOs', () => {
  const validProgress = (overrides: Record<string, unknown> = {}) => plainToInstance(SubmitWorkshopProgressDto, {
    type: WorkshopProgressReportType.PROGRESS,
    message: 'Estructura terminada',
    ...overrides
  });

  it('accepts a text-only progress report', async () => {
    await expect(validate(validProgress())).resolves.toHaveLength(0);
  });

  it('rejects a blank message', async () => {
    await expect(validate(validProgress({ message: '   ' }))).resolves.not.toHaveLength(0);
  });

  it('requires a non-blank comment only for rejection', async () => {
    const reject = plainToInstance(ReviewWorkshopProgressDto, { decision: WorkshopProgressReviewDecision.REJECT, comment: ' ' });
    const approve = plainToInstance(ReviewWorkshopProgressDto, { decision: WorkshopProgressReviewDecision.APPROVE });
    await expect(validate(reject)).resolves.not.toHaveLength(0);
    await expect(validate(approve)).resolves.toHaveLength(0);
  });
});
