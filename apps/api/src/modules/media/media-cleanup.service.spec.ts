import { MediaCleanupService } from './media-cleanup.service';

describe('persistent media cleanup', () => {
  it('records failure and completes the same asset on retry', async () => {
    const job = { kind: 'deliveries', public_id: 'home-fashion/deliveries/qa', attempts: 0 };
    const database = { query: jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT')) return [job];
      if (sql.includes('SET due_at')) return [undefined, 1];
      return [];
    }) };
    const cloud = { destroy: jest.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce(undefined) };
    const cleanup = new MediaCleanupService(database as never, cloud as never);
    await cleanup.scheduleRollback('deliveries', [job.public_id]);
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO media_cleanup'), expect.objectContaining({
      replacements: ['deliveries', job.public_id]
    }));
    await expect(cleanup.drain()).resolves.toEqual({ checked: 1, completed: 0 });
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('attempts = attempts + 1'), {
      replacements: [2, 'deliveries', job.public_id]
    });
    await expect(cleanup.drain()).resolves.toEqual({ checked: 1, completed: 1 });
    expect(cloud.destroy).toHaveBeenLastCalledWith(job.public_id, 'deliveries');
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('completed_at = NOW()'), {
      replacements: ['deliveries', job.public_id]
    });
  });
});
