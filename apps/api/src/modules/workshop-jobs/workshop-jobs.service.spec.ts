import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateWorkshopJobDto } from './dto/workshop-jobs.dto';
import { WorkshopJobsService } from './workshop-jobs.service';

describe('WorkshopJobsService', () => {
  const dto = (overrides: Partial<CreateWorkshopJobDto> = {}): CreateWorkshopJobDto => ({
    orderItemId: '20', workshopUserId: '8', instructions: 'Usar tela azul', expectedCompletionDate: '2026-09-20', ...overrides
  });
  const detailJob = () => ({
    get: () => ({
      id: '7', code: 'HF-TAL-2026-00007', status: 'ASSIGNED', instructions: 'Usar tela azul', expectedCompletionDate: '2026-09-20', assignedAt: new Date('2026-08-06T12:00:00Z'),
      workshopUser: { id: '8', fullName: 'Taller Uno', email: 'taller@example.com', isActive: true },
      assignedByUser: { id: '1', fullName: 'Administradora', email: 'admin@example.com' },
      orderItem: { id: '20', orderId: '30', productNameSnapshot: 'Sofá', variantNameSnapshot: 'Azul', customization: { fabric: 'Lino' }, quantity: 2, supplyType: 'MADE_TO_ORDER', status: 'PENDING_PRODUCTION', order: { id: '30', code: 'HF-PED-2026-00030', status: 'OPEN', customer: { id: '4', fullName: 'Ana', phone: '3000000000' } } }
    })
  });
  function setup(options: { item?: Record<string, unknown> | null; order?: Record<string, unknown> | null; workshopUser?: Record<string, unknown> | null; existing?: unknown } = {}) {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const item = options.item === undefined ? { id: '20', orderId: '30', supplyType: 'MADE_TO_ORDER', status: 'PENDING_PRODUCTION' } : options.item;
    const order = options.order === undefined ? { id: '30', status: 'OPEN' } : options.order;
    const workshopUser = options.workshopUser === undefined ? { id: '8', isActive: true, role: { code: 'WORKSHOP' } } : options.workshopUser;
    const jobs = {
      sequelize: { transaction: jest.fn(async (callback) => callback(transaction)) },
      findOne: jest.fn().mockResolvedValue(options.existing ?? null),
      create: jest.fn(async (values) => {
        const job = { ...values, id: 7, update: jest.fn(async (changes) => Object.assign(job, changes)) };
        return job;
      }),
      findByPk: jest.fn().mockResolvedValue(detailJob()),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 })
    };
    const orderItems = { findByPk: jest.fn().mockResolvedValue(item) };
    const orders = { findByPk: jest.fn().mockResolvedValue(order) };
    const users = { findByPk: jest.fn().mockResolvedValue(workshopUser), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) };
    const service = new WorkshopJobsService(jobs as never, orderItems as never, orders as never, users as never);
    return { service, jobs, orderItems, orders, users };
  }

  it('lists only active WORKSHOP users using SQL pagination and safe fields', async () => {
    const { service, users } = setup();
    users.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: '8', fullName: 'Taller Uno', email: 'taller@example.com', isActive: true, role: { code: 'WORKSHOP' } }] });
    await expect(service.listWorkshopUsers({ q: 'Uno', page: 2, limit: 5 })).resolves.toEqual({ data: [{ id: '8', name: 'Taller Uno', email: 'taller@example.com', active: true, role: 'WORKSHOP' }], pagination: { page: 2, limit: 5, total: 1, totalPages: 1 } });
    expect(users.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ attributes: ['id', 'fullName', 'email', 'isActive'], limit: 5, offset: 5, include: [expect.objectContaining({ where: { code: 'WORKSHOP' } })] }));
    expect(JSON.stringify(users.findAndCountAll.mock.calls[0][0])).toContain('isActive');
    expect(JSON.stringify(users.findAndCountAll.mock.calls[0][0])).not.toContain('passwordHash');
  });

  it.each([
    ['an inactive workshop user', { isActive: false, role: { code: 'WORKSHOP' } }, BadRequestException],
    ['an ADMIN user', { isActive: true, role: { code: 'ADMIN' } }, ForbiddenException],
    ['an EMPLOYEE user', { isActive: true, role: { code: 'EMPLOYEE' } }, ForbiddenException]
  ])('rejects %s', async (_name, workshopUser, exception) => {
    const { service } = setup({ workshopUser });
    await expect(service.create(dto(), '1')).rejects.toBeInstanceOf(exception);
  });

  it('creates an ASSIGNED job in a transaction, locks the order item and generates its final code from the id', async () => {
    const { service, jobs, orderItems } = setup();
    await expect(service.create(dto(), '1')).resolves.toMatchObject({ id: '7', status: 'ASSIGNED' });
    expect(jobs.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(orderItems.findByPk).toHaveBeenCalledWith('20', expect.objectContaining({ lock: 'UPDATE', transaction: expect.anything() }));
    expect(jobs.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'ASSIGNED', orderItemId: '20', workshopUserId: '8', assignedByUserId: '1', code: expect.stringMatching(/^TMP-/) }), expect.objectContaining({ transaction: expect.anything() }));
    const job = await jobs.create.mock.results[0].value;
    expect(job.update).toHaveBeenCalledWith(expect.objectContaining({ code: expect.stringMatching(/^HF-TAL-\d{4}-00007$/) }), expect.objectContaining({ transaction: expect.anything() }));
  });

  it.each([
    ['a missing order item', { item: null }, NotFoundException],
    ['an IN_STOCK order item', { item: { id: '20', orderId: '30', supplyType: 'IN_STOCK', status: 'RESERVED' } }, BadRequestException],
    ['an order item outside PENDING_PRODUCTION', { item: { id: '20', orderId: '30', supplyType: 'MADE_TO_ORDER', status: 'READY' } }, BadRequestException],
    ['a CANCELLED order', { order: { id: '30', status: 'CANCELLED' } }, BadRequestException],
    ['a COMPLETED order', { order: { id: '30', status: 'COMPLETED' } }, BadRequestException],
    ['a missing workshop user', { workshopUser: null }, NotFoundException],
    ['an already assigned order item', { existing: { id: '6' } }, ConflictException]
  ])('rejects %s', async (_name, options, exception) => {
    const { service, jobs } = setup(options);
    await expect(service.create(dto(), '1')).rejects.toBeInstanceOf(exception);
    expect(jobs.create).not.toHaveBeenCalled();
  });

  it('translates the unique constraint race into an assignment conflict', async () => {
    const { service, jobs } = setup();
    jobs.sequelize.transaction.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    await expect(service.create(dto(), '1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not update the order item or inventory while assigning', async () => {
    const { service, orderItems } = setup();
    await service.create(dto(), '1');
    expect(orderItems.findByPk.mock.calls).toHaveLength(1);
    expect(JSON.stringify(orderItems.findByPk.mock.calls)).not.toContain('update');
  });

  it('lists jobs through one paginated query with joined data and no per-job lookups', async () => {
    const { service, jobs, orderItems, orders, users } = setup();
    jobs.findAndCountAll.mockResolvedValue({ count: 1, rows: [detailJob()] });
    await expect(service.list({ page: 1, limit: 12, workshopUserId: '8', orderId: '30' })).resolves.toMatchObject({ data: [expect.objectContaining({ orderCode: 'HF-PED-2026-00030', productNameSnapshot: 'Sofá' })] });
    expect(jobs.findAndCountAll).toHaveBeenCalledTimes(1);
    expect(jobs.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 12, offset: 0, include: expect.any(Array) }));
    expect(orderItems.findByPk).not.toHaveBeenCalled();
    expect(orders.findByPk).not.toHaveBeenCalled();
    expect(users.findByPk).not.toHaveBeenCalled();
  });

  it('returns the administrative detail without prices, costs, progress or evidence', async () => {
    const { service, jobs } = setup();
    await expect(service.detail('7')).resolves.toMatchObject({ code: 'HF-TAL-2026-00007', workshopUser: { id: '8' }, assignedByUser: { id: '1' }, orderItem: { customization: { fabric: 'Lino' }, supplyType: 'MADE_TO_ORDER' } });
    expect(jobs.findByPk).toHaveBeenCalledWith('7', expect.objectContaining({ include: expect.any(Array) }));
  });

  it('includes the order item SKU and notes required by the read-only administrative detail', async () => {
    const { service, jobs } = setup();
    await service.detail('7');
    const orderItemInclude = jobs.findByPk.mock.calls[0][1].include.find((entry) => entry.model.name === 'OrderItem');
    expect(orderItemInclude.attributes).toEqual(expect.arrayContaining(['skuSnapshot', 'notes']));
  });

  it('serializes the order item SKU and notes in the administrative detail', async () => {
    const { service, jobs } = setup();
    const value = detailJob().get();
    value.orderItem.skuSnapshot = 'SKU-001';
    value.orderItem.notes = 'Usar acceso lateral';
    jobs.findByPk.mockResolvedValue({ get: () => value });
    await expect(service.detail('7')).resolves.toMatchObject({
      orderItem: { skuSnapshot: 'SKU-001', notes: 'Usar acceso lateral' }
    });
  });
});
