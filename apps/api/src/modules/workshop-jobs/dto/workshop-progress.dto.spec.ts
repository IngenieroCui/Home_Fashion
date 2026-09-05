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

  it('accepts a valid optional evidence URL snapshot', async () => {
    await expect(validate(validProgress({ evidenceUrls: ['https://example.com/evidence.jpg'] }))).resolves.toHaveLength(0);
  });

  it.each([
    ['six evidence URLs', { evidenceUrls: Array.from({ length: 6 }, (_value, index) => `https://example.com/${index}`) }],
    ['an invalid evidence URL', { evidenceUrls: ['not-a-url'] }],
    ['an empty evidence URL', { evidenceUrls: [''] }],
    ['a non-string evidence value', { evidenceUrls: [5] }],
    ['a blank message', { message: '   ' }]
  ])('rejects %s', async (_name, values) => {
    await expect(validate(validProgress(values))).resolves.not.toHaveLength(0);
  });

  it('requires a non-blank comment only for rejection', async () => {
    const reject = plainToInstance(ReviewWorkshopProgressDto, { decision: WorkshopProgressReviewDecision.REJECT, comment: ' ' });
    const approve = plainToInstance(ReviewWorkshopProgressDto, { decision: WorkshopProgressReviewDecision.APPROVE });
    await expect(validate(reject)).resolves.not.toHaveLength(0);
    await expect(validate(approve)).resolves.toHaveLength(0);
  });
});
