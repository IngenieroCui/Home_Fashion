import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkshopProgressService } from './workshop-progress.service';
import { WorkshopJobStatus, WorkshopProgressReportType, WorkshopProgressReviewStatus } from './workshop-jobs.types';
import { OrderStatus } from '../orders/orders.types';

describe('WorkshopProgressService', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const job = (status = WorkshopJobStatus.ASSIGNED) => {
    const value: { id: string; orderItemId: string; status: string; update: jest.Mock } = {
      id: '10', orderItemId: '20', status, update: jest.fn(async (changes) => Object.assign(value, changes))
    };
    return value;
  };
  const item = (status = 'PENDING_PRODUCTION') => {
    const value: { id: string; orderId: string; status: string; update: jest.Mock } = {
      id: '20', orderId: '1', status, update: jest.fn(async (changes) => Object.assign(value, changes))
    };
    return value;
  };
  function setup({ currentJob = job(), currentItem = item(), user = { id: '8', isActive: true, role: { code: 'WORKSHOP' } }, report = null as Record<string, unknown> | null } = {}) {
    const reports = { sequelize: { transaction: jest.fn(async (callback) => callback(transaction)) }, create: jest.fn(async (values) => ({ ...values, id: '30', get: () => ({ ...values, id: '30' }) })), findByPk: jest.fn().mockResolvedValue(report), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) };
    const jobs = { findOne: jest.fn().mockResolvedValue(currentJob), findByPk: jest.fn().mockResolvedValue(currentJob), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) };
    const order: { id: string; status: OrderStatus; update: jest.Mock } = {
      id: '1', status: OrderStatus.OPEN, update: jest.fn(async (changes) => Object.assign(order, changes))
    };
    const orderItems = { findByPk: jest.fn().mockResolvedValue(currentItem), findAll: jest.fn().mockResolvedValue([currentItem]) };
    const orders = { findByPk: jest.fn().mockResolvedValue(order) };
    const users = { findByPk: jest.fn().mockResolvedValue(user) };
    return { service: new WorkshopProgressService(jobs as never, reports as never, orderItems as never, orders as never, users as never), reports, jobs, orderItems, orders, order, currentJob, currentItem };
  }
  const submit = (type: WorkshopProgressReportType, progressPercent?: number) => ({ type, message: 'Avance comprobado', ...(progressPercent === undefined ? {} : { progressPercent }) });

  it('lists only the authenticated workshop jobs with SQL pagination', async () => {
    const { service, jobs } = setup();
    await service.listOwnJobs('8', { page: 2, limit: 5 });
    expect(jobs.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: { workshopUserId: '8' }, limit: 5, offset: 5 }));
    const include = jobs.findAndCountAll.mock.calls[0][0].include as Array<{ include?: Array<{ include?: unknown[] }> }>;
    expect(include[0].include?.[0].include).toBeUndefined();
  });

  it('returns 404 for an owned-job lookup that does not belong to the workshop', async () => {
    const { service, jobs } = setup(); jobs.findOne.mockResolvedValue(null);
    await expect(service.ownJobDetail('8', '99')).rejects.toBeInstanceOf(NotFoundException);
    expect(jobs.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '99', workshopUserId: '8' } }));
  });

  it('returns 404 when a workshop attempts to report a job assigned to someone else', async () => {
    const { service, jobs } = setup(); jobs.findOne.mockResolvedValue(null);
    await expect(service.submit('8', '99', submit(WorkshopProgressReportType.STARTED))).rejects.toBeInstanceOf(NotFoundException);
    expect(jobs.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '99', workshopUserId: '8' } }));
  });

  it('submits STARTED atomically and moves job and item into production', async () => {
    const { service, reports, jobs, orderItems, orders, order, currentJob, currentItem } = setup();
    await service.submit('8', '10', submit(WorkshopProgressReportType.STARTED));
    expect(reports.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(jobs.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: 'UPDATE', transaction }));
    expect(orderItems.findByPk).toHaveBeenCalledWith('20', expect.objectContaining({ lock: 'UPDATE', transaction }));
    expect(reports.create).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW, submittedByUserId: '8' }), { transaction });
    expect(currentJob.update).toHaveBeenCalledWith({ status: WorkshopJobStatus.IN_PROGRESS }, { transaction });
    expect(currentItem.update).toHaveBeenCalledWith({ status: 'IN_PRODUCTION' }, { transaction });
    expect(orders.findByPk).toHaveBeenCalledWith('1', { transaction, lock: 'UPDATE' });
    expect(order.update).toHaveBeenCalledWith({ status: OrderStatus.IN_PROGRESS }, { transaction });
  });

  it('rejects a second STARTED after production began', async () => {
    const { service } = setup({ currentJob: job(WorkshopJobStatus.IN_PROGRESS), currentItem: item('IN_PRODUCTION') });
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.STARTED))).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([-1, 101])('rejects progress percentages outside 0..100 (%s)', async (progressPercent) => {
    const { service } = setup({ currentJob: job(WorkshopJobStatus.IN_PROGRESS), currentItem: item('IN_PRODUCTION') });
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.PROGRESS, progressPercent))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forces READY_FOR_REVIEW to 100 and does not mark the order item READY', async () => {
    const { service, reports, currentJob, currentItem } = setup({ currentJob: job(WorkshopJobStatus.IN_PROGRESS), currentItem: item('IN_PRODUCTION') });
    await service.submit('8', '10', submit(WorkshopProgressReportType.READY_FOR_REVIEW, 25));
    expect(reports.create).toHaveBeenCalledWith(expect.objectContaining({ progressPercent: 100 }), expect.anything());
    expect(currentJob.update).toHaveBeenCalledWith({ status: WorkshopJobStatus.READY_FOR_REVIEW }, expect.anything());
    expect(currentItem.update).not.toHaveBeenCalled();
  });

  it('does not accept reports while a READY_FOR_REVIEW job awaits its decision', async () => {
    const { service } = setup({ currentJob: job(WorkshopJobStatus.READY_FOR_REVIEW), currentItem: item('IN_PRODUCTION') });
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.PROGRESS, 50))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an active WORKSHOP user even if a permission was granted', async () => {
    const { service } = setup({ user: { id: '8', isActive: true, role: { code: 'EMPLOYEE' } } });
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.STARTED))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an inactive workshop user before loading or changing the job', async () => {
    const { service, jobs } = setup({ user: { id: '8', isActive: false, role: { code: 'WORKSHOP' } } });
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.STARTED))).rejects.toBeInstanceOf(ForbiddenException);
    expect(jobs.findOne).not.toHaveBeenCalled();
  });

  it.each([
    [0, true], [1, false], [99, false], [100, true]
  ])('enforces PROGRESS boundary %s', async (progressPercent, invalid) => {
    const { service } = setup({ currentJob: job(WorkshopJobStatus.IN_PROGRESS), currentItem: item('IN_PRODUCTION') });
    const request = service.submit('8', '10', submit(WorkshopProgressReportType.PROGRESS, progressPercent));
    if (invalid) await expect(request).rejects.toBeInstanceOf(BadRequestException);
    else await expect(request).resolves.toMatchObject({ progressPercent });
  });

  it('rolls back STARTED before either state changes when report persistence fails', async () => {
    const { service, reports, currentJob, currentItem } = setup(); reports.create.mockRejectedValue(new Error('write failed'));
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.STARTED))).rejects.toThrow('write failed');
    expect(currentJob.update).not.toHaveBeenCalled();
    expect(currentItem.update).not.toHaveBeenCalled();
  });

  it('keeps STARTED and its derived order-state update in the same transaction', async () => {
    const { service, reports, currentJob, currentItem, order } = setup();
    order.update.mockRejectedValue(new Error('order state write failed'));
    await expect(service.submit('8', '10', submit(WorkshopProgressReportType.STARTED))).rejects.toThrow('order state write failed');
    expect(reports.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(currentJob.update).toHaveBeenCalledWith({ status: WorkshopJobStatus.IN_PROGRESS }, { transaction });
    expect(currentItem.update).toHaveBeenCalledWith({ status: 'IN_PRODUCTION' }, { transaction });
  });

  it('approves READY_FOR_REVIEW atomically and recalculates the order to READY', async () => {
    const report = { id: '30', workshopJobId: '10', type: WorkshopProgressReportType.READY_FOR_REVIEW, reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW, update: jest.fn(async (changes) => Object.assign(report, changes)), get: () => report };
    const { service, order, currentJob, currentItem } = setup({ currentJob: job(WorkshopJobStatus.READY_FOR_REVIEW), currentItem: item('IN_PRODUCTION'), report });
    await service.review('30', '1', { decision: 'APPROVE' as never, comment: 'Validado' });
    expect(currentJob.update).toHaveBeenCalledWith({ status: WorkshopJobStatus.COMPLETED }, { transaction });
    expect(currentItem.update).toHaveBeenCalledWith({ status: 'READY' }, { transaction });
    expect(order.update).toHaveBeenCalledWith({ status: OrderStatus.READY }, { transaction });
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: WorkshopProgressReviewStatus.APPROVED, reviewedByUserId: '1' }), { transaction });
  });

  it.each([WorkshopProgressReportType.STARTED, WorkshopProgressReportType.PROGRESS])('approves %s without changing operational states', async (type) => {
    const report = { id: '30', workshopJobId: '10', type, reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW, update: jest.fn(async (changes) => Object.assign(report, changes)), get: () => report };
    const { service, currentJob, currentItem } = setup({ currentJob: job(WorkshopJobStatus.IN_PROGRESS), currentItem: item('IN_PRODUCTION'), report });
    await service.review('30', '1', { decision: 'APPROVE' as never });
    expect(currentJob.update).not.toHaveBeenCalled();
    expect(currentItem.update).not.toHaveBeenCalled();
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: WorkshopProgressReviewStatus.APPROVED }), { transaction });
  });

  it('rejects READY_FOR_REVIEW back to IN_PROGRESS without deleting its report', async () => {
    const report = { id: '30', workshopJobId: '10', type: WorkshopProgressReportType.READY_FOR_REVIEW, reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW, update: jest.fn(async (changes) => Object.assign(report, changes)), get: () => report };
    const { service, order, currentJob, currentItem } = setup({ currentJob: job(WorkshopJobStatus.READY_FOR_REVIEW), currentItem: item('IN_PRODUCTION'), report });
    await service.review('30', '1', { decision: 'REJECT' as never, comment: 'Falta evidencia' });
    expect(currentJob.update).toHaveBeenCalledWith({ status: WorkshopJobStatus.IN_PROGRESS }, { transaction });
    expect(currentItem.update).toHaveBeenCalledWith({ status: 'IN_PRODUCTION' }, { transaction });
    expect(order.update).toHaveBeenCalledWith({ status: OrderStatus.IN_PROGRESS }, { transaction });
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ reviewStatus: WorkshopProgressReviewStatus.REJECTED }), { transaction });
  });

  it('locks the report and rejects a second review without overwriting it', async () => {
    const report = { id: '30', workshopJobId: '10', type: WorkshopProgressReportType.PROGRESS, reviewStatus: WorkshopProgressReviewStatus.APPROVED, update: jest.fn(), get: () => report };
    const { service, reports } = setup({ report });
    await expect(service.review('30', '1', { decision: 'REJECT' as never, comment: 'No aplica' })).rejects.toBeInstanceOf(BadRequestException);
    expect(reports.findByPk).toHaveBeenCalledWith('30', expect.objectContaining({ lock: 'UPDATE', transaction }));
    expect(report.update).not.toHaveBeenCalled();
  });

  it('uses one paginated administrative query with joined data and no per-report lookups', async () => {
    const { service, reports, jobs, orderItems } = setup();
    await service.listAdmin({ page: 2, limit: 5, reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW });
    expect(reports.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 5, offset: 5, include: expect.any(Array) }));
    expect(jobs.findByPk).not.toHaveBeenCalled();
    expect(orderItems.findByPk).not.toHaveBeenCalled();
  });
});
