import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto, DeliveryAssigneeQueryDto, DeliveryQueryDto } from './dto/deliveries.dto';
import { DeliveryStatus, DeliveryType } from './deliveries.types';
import { OrderItemStatus, OrderStatus } from '../orders/orders.types';

type Values = Record<string, unknown>;

function modelRow<T extends Values>(source: T) {
  const value = { ...source } as T & { update: jest.Mock; get: jest.Mock };
  value.update = jest.fn(async (changes: Values) => Object.assign(value, changes));
  value.get = jest.fn(() => ({ ...value, update: undefined, get: undefined }));
  return value;
}

describe('DeliveriesService', () => {
  const createDto = (overrides: Partial<CreateDeliveryDto> = {}): CreateDeliveryDto => ({
    orderId: '7',
    address: 'Calle 1 # 2-3',
    contactName: 'Ana Cliente',
    contactPhone: '3001234567',
    scheduledDate: '2026-08-20',
    deliveryType: DeliveryType.OWNER,
    assignedUserId: '1',
    fee: '25000',
    ...overrides
  });

  function setup(options: {
    delivery?: Values | null;
    order?: Values | null;
    itemStatuses?: OrderItemStatus[];
    existing?: unknown;
    assignedUser?: Values | null;
    permissions?: string[];
  } = {}) {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const order = options.order === null ? null : modelRow({ id: '7', code: 'HF-PED-2026-00007', status: OrderStatus.OPEN, ...(options.order ?? {}) });
    const items = (options.itemStatuses ?? [OrderItemStatus.RESERVED, OrderItemStatus.READY, OrderItemStatus.CANCELLED])
      .map((status, index) => modelRow({ id: String(index + 1), orderId: '7', status }));
    const delivery = options.delivery === null ? null : modelRow({
      id: '5', code: 'HF-ENT-2026-00005', orderId: '7', status: DeliveryStatus.SCHEDULED,
      scheduledDate: '2026-08-20', deliveryType: DeliveryType.OWNER, address: 'Calle 1',
      contactName: 'Ana', contactPhone: '300', assignedUserId: '1', externalDriverName: null,
      order: order ? { id: order.id, code: order.code, status: order.status, customer: { id: '2', fullName: 'Ana' }, items: [] } : undefined,
      assignedUser: { id: '1', fullName: 'Dueño' }, createdByUser: { id: '1', fullName: 'Dueño' },
      ...(options.delivery ?? {})
    });
    const assignedUser = options.assignedUser === null ? null : modelRow({
      id: '1', fullName: 'Dueño', email: 'owner@example.com', isActive: true, role: { id: '1', code: 'ADMIN' },
      ...(options.assignedUser ?? {})
    });
    const deliveries = {
      sequelize: { transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<unknown>) => callback(transaction)) },
      findOne: jest.fn().mockResolvedValue(options.existing ?? null),
      findByPk: jest.fn().mockResolvedValue(delivery),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      create: jest.fn(async (values: Values) => modelRow({ ...values, id: 5 }))
    };
    const orders = { findByPk: jest.fn().mockResolvedValue(order) };
    const orderItems = { findAll: jest.fn().mockResolvedValue(items) };
    const users = {
      findByPk: jest.fn().mockResolvedValue(assignedUser),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 })
    };
    const auth = { getAuthenticatedUser: jest.fn().mockResolvedValue({ permissions: options.permissions ?? ['ORDER_MANAGE'] }) };
    const service = new DeliveriesService(deliveries as never, orders as never, orderItems as never, users as never, auth as never);
    return { service, deliveries, orders, orderItems, users, auth, transaction, delivery, order, items, assignedUser };
  }

  it('creates a SCHEDULED OWNER delivery transactionally and generates its code from the id', async () => {
    const { service, deliveries, orders, users, transaction } = setup();
    await expect(service.create(createDto(), 'actor-1')).resolves.toBeDefined();
    expect(orders.findByPk).toHaveBeenCalledWith('7', { transaction, lock: 'UPDATE' });
    expect(deliveries.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { orderId: '7' }, lock: 'UPDATE' }));
    expect(users.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ transaction, lock: 'UPDATE' }));
    expect(deliveries.create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: '7', status: DeliveryStatus.SCHEDULED, assignedUserId: '1', externalDriverName: null, fee: '25000.00', createdByUserId: 'actor-1'
    }), { transaction });
    const created = await deliveries.create.mock.results[0].value;
    expect(created.update).toHaveBeenCalledWith({ code: expect.stringMatching(/^HF-ENT-\d{4}-00005$/) }, { transaction });
  });

  it('creates an EXTERNAL_DRIVER delivery without consulting or storing an internal assignee', async () => {
    const { service, deliveries, users } = setup();
    await service.create(createDto({ deliveryType: DeliveryType.EXTERNAL_DRIVER, assignedUserId: undefined, externalDriverName: 'Conductor Externo' }), 'actor-1');
    expect(users.findByPk).not.toHaveBeenCalled();
    expect(deliveries.create).toHaveBeenCalledWith(expect.objectContaining({ assignedUserId: null, externalDriverName: 'Conductor Externo' }), expect.anything());
  });

  it('reprograms the same cancelled delivery row and code while clearing prior completion data', async () => {
    const current = setup({ delivery: {
      receiverName: 'Receptor anterior',
      evidenceUrls: ['https://example.com/old.jpg'],
      deliveredAt: new Date('2026-08-20T12:00:00.000Z')
    } });
    await current.service.cancel('5', 'actor-1');
    current.deliveries.findOne.mockResolvedValue(current.delivery);
    await current.service.create(createDto({
      address: 'Nueva dirección',
      scheduledDate: '2026-08-25',
      deliveryType: DeliveryType.EXTERNAL_DRIVER,
      assignedUserId: undefined,
      externalDriverName: 'Nuevo conductor'
    }), 'actor-2');
    expect(current.deliveries.create).not.toHaveBeenCalled();
    expect(current.delivery!.code).toBe('HF-ENT-2026-00005');
    expect(current.delivery!.update).toHaveBeenLastCalledWith(expect.objectContaining({
      status: DeliveryStatus.SCHEDULED,
      address: 'Nueva dirección',
      scheduledDate: '2026-08-25',
      deliveryType: DeliveryType.EXTERNAL_DRIVER,
      assignedUserId: null,
      externalDriverName: 'Nuevo conductor',
      receiverName: null,
      evidenceUrls: null,
      deliveredAt: null
    }), expect.objectContaining({ transaction: current.transaction }));
  });

  it.each([DeliveryStatus.SCHEDULED, DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.DELIVERED])('keeps returning conflict for an existing %s delivery', async (status) => {
    const current = setup({ existing: modelRow({ id: 'other', orderId: '7', status }) });
    await expect(current.service.create(createDto(), 'actor-1')).rejects.toBeInstanceOf(ConflictException);
    expect(current.deliveries.create).not.toHaveBeenCalled();
  });

  it('leaves a cancelled row unchanged when reprogramming assignment validation fails', async () => {
    const cancelled = modelRow({ id: '5', orderId: '7', status: DeliveryStatus.CANCELLED, code: 'HF-ENT-2026-00005' });
    const current = setup({ existing: cancelled });
    await expect(current.service.create(createDto({ assignedUserId: undefined }), 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(cancelled.update).not.toHaveBeenCalled();
    expect(current.deliveries.create).not.toHaveBeenCalled();
  });

  it.each([
    ['missing order', { order: null }, NotFoundException],
    ['cancelled order', { order: { status: OrderStatus.CANCELLED } }, BadRequestException],
    ['completed order', { order: { status: OrderStatus.COMPLETED } }, BadRequestException],
    ['duplicate order delivery', { existing: { id: 'other' } }, ConflictException]
  ])('rejects create for a %s', async (_label, options, exception) => {
    const { service, deliveries } = setup(options);
    await expect(service.create(createDto(), 'actor-1')).rejects.toBeInstanceOf(exception);
    expect(deliveries.create).not.toHaveBeenCalled();
  });

  it.each([
    ['external driver with an internal user', createDto({ deliveryType: DeliveryType.EXTERNAL_DRIVER, externalDriverName: 'Driver' }), {}, BadRequestException],
    ['external driver without a name', createDto({ deliveryType: DeliveryType.EXTERNAL_DRIVER, assignedUserId: undefined }), {}, BadRequestException],
    ['owner without a user', createDto({ assignedUserId: undefined }), {}, BadRequestException],
    ['owner with an external name', createDto({ externalDriverName: 'Driver' }), {}, BadRequestException],
    ['inactive owner', createDto(), { assignedUser: { isActive: false } }, BadRequestException],
    ['employee backed by ADMIN', createDto({ deliveryType: DeliveryType.EMPLOYEE }), {}, ForbiddenException]
  ])('rejects invalid assignment: %s', async (_label, dto, options, exception) => {
    const { service, deliveries } = setup(options);
    await expect(service.create(dto, 'actor-1')).rejects.toBeInstanceOf(exception);
    expect(deliveries.create).not.toHaveBeenCalled();
  });

  it('accepts an active EMPLOYEE only for EMPLOYEE deliveries', async () => {
    const { service, deliveries } = setup({ assignedUser: { role: { id: '2', code: 'EMPLOYEE' } } });
    await service.create(createDto({ deliveryType: DeliveryType.EMPLOYEE }), 'actor-1');
    expect(deliveries.create).toHaveBeenCalledWith(expect.objectContaining({ deliveryType: DeliveryType.EMPLOYEE, assignedUserId: '1' }), expect.anything());
  });

  it('rejects a missing assigned user and maps a database uniqueness race to conflict', async () => {
    await expect(setup({ assignedUser: null }).service.create(createDto(), 'actor-1')).rejects.toBeInstanceOf(NotFoundException);
    const race = setup();
    race.deliveries.create.mockRejectedValue(Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' }));
    await expect(race.service.create(createDto(), 'actor-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires ORDER_MANAGE before accessing delivery data or starting a transaction', async () => {
    const { service, deliveries } = setup({ permissions: [] });
    await expect(service.create(createDto(), 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.list({ page: 1, limit: 12 }, 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(deliveries.sequelize.transaction).not.toHaveBeenCalled();
  });

  it('lists with SQL pagination and filters while serializing only selected associations', async () => {
    const { service, deliveries } = setup();
    deliveries.findAndCountAll.mockResolvedValue({ rows: [modelRow({
      id: '5', code: 'HF-ENT-2026-00005', status: DeliveryStatus.SCHEDULED, scheduledDate: '2026-08-20',
      deliveryType: DeliveryType.OWNER, address: 'Calle 1', contactName: 'Ana', contactPhone: '300', assignedUser: { id: '1', fullName: 'Dueño' },
      order: { id: '7', code: 'HF-PED-2026-00007', status: OrderStatus.OPEN, customer: { id: '2', fullName: 'Ana' } }
    })], count: 1 });
    const query: DeliveryQueryDto = { page: 2, limit: 10, q: 'Ana', status: DeliveryStatus.SCHEDULED, deliveryType: DeliveryType.OWNER, orderId: '7', assignedUserId: '1', dateFrom: '2026-08-01', dateTo: '2026-08-31' };
    const result = await service.list(query, 'actor-1');
    expect(result).toMatchObject({ data: [{ code: 'HF-ENT-2026-00005', order: { id: '7' }, customer: { id: '2' } }], pagination: { page: 2, limit: 10, total: 1, totalPages: 1 } });
    expect(deliveries.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: DeliveryStatus.SCHEDULED, deliveryType: DeliveryType.OWNER, orderId: '7', assignedUserId: '1' }),
      limit: 10, offset: 10, distinct: true, subQuery: false
    }));
  });

  it('lists only active assignees with the role implied by the delivery type', async () => {
    const { service, users } = setup();
    users.findAndCountAll.mockResolvedValue({ rows: [modelRow({ id: '1', fullName: 'Propietario', email: 'a@b.co', isActive: true })], count: 1 });
    const query: DeliveryAssigneeQueryDto = { page: 1, limit: 12, deliveryType: DeliveryType.OWNER };
    await expect(service.listAssignees(query, 'actor-1')).resolves.toMatchObject({ data: [{ id: '1', deliveryType: DeliveryType.OWNER }] });
    expect(users.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true },
      include: [expect.objectContaining({ where: { code: 'ADMIN' }, required: true })],
      limit: 12,
      offset: 0
    }));
  });

  it('returns an explicit safe detail and rejects a missing delivery', async () => {
    const current = setup();
    await expect(current.service.detail('5', 'actor-1')).resolves.toMatchObject({
      id: '5', assignedUser: { id: '1' }, order: { id: '7' }, customer: { id: '2' }, items: []
    });
    const missing = setup({ delivery: null });
    await expect(missing.service.detail('missing', 'actor-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('starts a scheduled delivery only after locking delivery, order and ordered items', async () => {
    const { service, deliveries, orders, orderItems, delivery, order, items, transaction } = setup();
    await service.start('5', 'actor-1');
    expect(deliveries.findByPk).toHaveBeenCalledWith('5', { transaction, lock: 'UPDATE' });
    expect(orders.findByPk).toHaveBeenCalledWith('7', { transaction, lock: 'UPDATE' });
    expect(orderItems.findAll).toHaveBeenCalledWith({ where: { orderId: '7' }, transaction, lock: 'UPDATE', order: [['id', 'ASC']] });
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.IN_PROGRESS }, { transaction });
    expect(delivery!.update).toHaveBeenCalledWith({ status: DeliveryStatus.OUT_FOR_DELIVERY }, { transaction });
    expect(items.every((item) => item.update.mock.calls.length === 0)).toBe(true);
  });

  it.each([
    ['wrong delivery state', { delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY } }],
    ['cancelled order', { order: { status: OrderStatus.CANCELLED } }],
    ['completed order', { order: { status: OrderStatus.COMPLETED } }],
    ['production item', { itemStatuses: [OrderItemStatus.IN_PRODUCTION] }],
    ['pending item', { itemStatuses: [OrderItemStatus.PENDING_PRODUCTION] }],
    ['already delivered item', { itemStatuses: [OrderItemStatus.DELIVERED] }],
    ['only cancelled items', { itemStatuses: [OrderItemStatus.CANCELLED] }]
  ])('does not partially start for %s', async (_label, options) => {
    const { service, delivery, order } = setup(options);
    await expect(service.start('5', 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(delivery!.update).not.toHaveBeenCalled();
    expect(order!.update).not.toHaveBeenCalled();
  });

  it('completes delivery, converts only RESERVED/READY items and completes the order', async () => {
    const { service, delivery, order, items, transaction } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS }
    });
    await service.complete('5', { receiverName: 'Ana', evidenceUrls: ['https://example.com/a.jpg'] }, 'actor-1');
    expect(items[0].update).toHaveBeenCalledWith({ status: OrderItemStatus.DELIVERED }, { transaction });
    expect(items[1].update).toHaveBeenCalledWith({ status: OrderItemStatus.DELIVERED }, { transaction });
    expect(items[2].update).not.toHaveBeenCalled();
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.COMPLETED }, { transaction });
    expect(delivery!.update).toHaveBeenCalledWith(expect.objectContaining({
      status: DeliveryStatus.DELIVERED, receiverName: 'Ana', evidenceUrls: ['https://example.com/a.jpg'], deliveredAt: expect.any(Date)
    }), { transaction });
  });

  it('accepts an already DELIVERED applicable item without rewriting it', async () => {
    const { service, items, order } = setup({ delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY }, order: { status: OrderStatus.IN_PROGRESS }, itemStatuses: [OrderItemStatus.DELIVERED, OrderItemStatus.CANCELLED] });
    await service.complete('5', { receiverName: 'Ana', evidenceUrls: ['https://example.com/a.jpg'] }, 'actor-1');
    expect(items[0].update).not.toHaveBeenCalled();
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.COMPLETED }, expect.anything());
  });

  it.each([
    ['scheduled delivery', { delivery: { status: DeliveryStatus.SCHEDULED } }, BadRequestException],
    ['completed order', { delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY }, order: { status: OrderStatus.COMPLETED } }, BadRequestException],
    ['item returned to production', { delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY }, order: { status: OrderStatus.IN_PROGRESS }, itemStatuses: [OrderItemStatus.IN_PRODUCTION] }, ConflictException],
    ['only cancelled items', { delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY }, order: { status: OrderStatus.IN_PROGRESS }, itemStatuses: [OrderItemStatus.CANCELLED] }, BadRequestException]
  ])('does not partially complete for %s', async (_label, options, exception) => {
    const { service, delivery, order, items } = setup(options);
    await expect(service.complete('5', { receiverName: 'Ana', evidenceUrls: ['https://example.com/a.jpg'] }, 'actor-1')).rejects.toBeInstanceOf(exception);
    expect(delivery!.update).not.toHaveBeenCalled();
    expect(order!.update).not.toHaveBeenCalled();
    expect(items.every((item) => item.update.mock.calls.length === 0)).toBe(true);
  });

  it('cancels SCHEDULED without changing order or items, while still locking the aggregate', async () => {
    const { service, delivery, order, orderItems, transaction } = setup();
    await service.cancel('5', 'actor-1');
    expect(delivery!.update).toHaveBeenCalledWith({ status: DeliveryStatus.CANCELLED }, { transaction });
    expect(order!.update).not.toHaveBeenCalled();
    expect(orderItems.findAll).toHaveBeenCalledWith({ where: { orderId: '7' }, transaction, lock: 'UPDATE', order: [['id', 'ASC']] });
  });

  it('restores READY when cancelling OUT_FOR_DELIVERY with all applicable items READY', async () => {
    const { service, delivery, order, items, transaction } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS },
      itemStatuses: [OrderItemStatus.READY, OrderItemStatus.READY, OrderItemStatus.CANCELLED]
    });
    await service.cancel('5', 'actor-1');
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.READY }, { transaction });
    expect(delivery!.update).toHaveBeenCalledWith({ status: DeliveryStatus.CANCELLED }, { transaction });
    expect(items.every((item) => item.update.mock.calls.length === 0)).toBe(true);
  });

  it('restores OPEN when cancelling OUT_FOR_DELIVERY with only initial items', async () => {
    const { service, order, transaction } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS },
      itemStatuses: [OrderItemStatus.RESERVED]
    });
    await service.cancel('5', 'actor-1');
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.OPEN }, { transaction });
  });

  it('keeps IN_PROGRESS when cancelling a delivery with mixed initial and ready items', async () => {
    const { service, order } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS },
      itemStatuses: [OrderItemStatus.RESERVED, OrderItemStatus.READY]
    });
    await service.cancel('5', 'actor-1');
    expect(order!.update).not.toHaveBeenCalled();
  });

  it('keeps IN_PROGRESS when a locked item concurrently leaves the start-eligible states', async () => {
    const { service, delivery, order } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS },
      itemStatuses: [OrderItemStatus.IN_PRODUCTION]
    });
    await service.cancel('5', 'actor-1');
    expect(order!.update).not.toHaveBeenCalled();
    expect(delivery!.update).toHaveBeenCalledWith({ status: DeliveryStatus.CANCELLED }, expect.anything());
  });

  it('rejects a concurrent order state change before cancelling an otherwise ready in-route delivery', async () => {
    const { service, delivery, order } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.READY }
    });
    await expect(service.cancel('5', 'actor-1')).rejects.toBeInstanceOf(ConflictException);
    expect(order!.update).not.toHaveBeenCalled();
    expect(delivery!.update).not.toHaveBeenCalled();
  });

  it('uses one transaction so failure after READY restoration rolls the aggregate back', async () => {
    const { service, delivery, order, transaction } = setup({
      delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      order: { status: OrderStatus.IN_PROGRESS },
      itemStatuses: [OrderItemStatus.READY]
    });
    delivery!.update.mockRejectedValue(new Error('delivery update failed'));
    await expect(service.cancel('5', 'actor-1')).rejects.toThrow('delivery update failed');
    expect(order!.update).toHaveBeenCalledWith({ status: OrderStatus.READY }, { transaction });
    expect(delivery!.update).toHaveBeenCalledWith({ status: DeliveryStatus.CANCELLED }, { transaction });
  });

  it.each([DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED])('rejects cancellation from terminal state %s', async (status) => {
    const { service, delivery, order } = setup({ delivery: { status } });
    await expect(service.cancel('5', 'actor-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(delivery!.update).not.toHaveBeenCalled();
    expect(order!.update).not.toHaveBeenCalled();
  });

  it('propagates a write failure inside the transaction and never marks the delivery delivered', async () => {
    const { service, delivery, items } = setup({ delivery: { status: DeliveryStatus.OUT_FOR_DELIVERY }, order: { status: OrderStatus.IN_PROGRESS } });
    items[0].update.mockRejectedValue(new Error('database write failed'));
    await expect(service.complete('5', { receiverName: 'Ana', evidenceUrls: ['https://example.com/a.jpg'] }, 'actor-1')).rejects.toThrow('database write failed');
    expect(delivery!.update).not.toHaveBeenCalled();
  });
});
