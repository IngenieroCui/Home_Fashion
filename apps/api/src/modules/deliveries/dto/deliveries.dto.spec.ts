import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompleteDeliveryDto, CreateDeliveryDto, DeliveryAssigneeQueryDto, DeliveryQueryDto } from './deliveries.dto';
import { DeliveryStatus, DeliveryType } from '../deliveries.types';

describe('Delivery DTOs', () => {
  const createInput = () => ({
    orderId: 7,
    address: ' Calle 1 ',
    contactName: ' Cliente ',
    contactPhone: '3001234567',
    scheduledDate: '2026-08-20',
    deliveryType: DeliveryType.OWNER,
    assignedUserId: 1,
    fee: 25000
  });

  it('transforms identifiers, decimal values and trimmed scheduling fields', async () => {
    const dto = plainToInstance(CreateDeliveryDto, createInput());
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ orderId: '7', assignedUserId: '1', address: 'Calle 1', contactName: 'Cliente', fee: '25000' });
  });

  it.each([
    [{ ...createInput(), address: ' ' }],
    [{ ...createInput(), scheduledDate: 'not-a-date' }],
    [{ ...createInput(), fee: '-1' }],
    [{ ...createInput(), fee: '1.001' }],
    [{ ...createInput(), deliveryType: 'OTHER' }]
  ])('rejects an invalid create payload %#', async (input) => {
    await expect(validate(plainToInstance(CreateDeliveryDto, input))).resolves.not.toHaveLength(0);
  });

  it('accepts the DECIMAL(12,2) fee ceiling and rejects the first cent above it', async () => {
    await expect(validate(plainToInstance(CreateDeliveryDto, { ...createInput(), fee: '9999999999.99' }))).resolves.toHaveLength(0);
    await expect(validate(plainToInstance(CreateDeliveryDto, { ...createInput(), fee: '10000000000.00' }))).resolves.not.toHaveLength(0);
  });

  it('validates fee by numeric value while allowing harmless leading zeroes', async () => {
    await expect(validate(plainToInstance(CreateDeliveryDto, { ...createInput(), fee: '00000000001.25' }))).resolves.toHaveLength(0);
  });

  it('accepts one to five valid evidence URLs and trims the receiver', async () => {
    const dto = plainToInstance(CompleteDeliveryDto, { receiverName: ' Ana ', evidenceUrls: ['https://example.com/evidence.jpg'] });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.receiverName).toBe('Ana');
  });

  it.each([
    [{ receiverName: 'Ana', evidenceUrls: [] }],
    [{ receiverName: 'Ana', evidenceUrls: Array.from({ length: 6 }, (_, index) => `https://example.com/${index}`) }],
    [{ receiverName: 'Ana', evidenceUrls: ['local/file.jpg'] }],
    [{ receiverName: ' ', evidenceUrls: ['https://example.com/a.jpg'] }]
  ])('rejects invalid completion evidence %#', async (input) => {
    await expect(validate(plainToInstance(CompleteDeliveryDto, input))).resolves.not.toHaveLength(0);
  });

  it('transforms SQL pagination filters and limits pages to fifty rows', async () => {
    const query = plainToInstance(DeliveryQueryDto, { page: '2', limit: '50', orderId: 8, assignedUserId: 3, status: DeliveryStatus.SCHEDULED });
    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, limit: 50, orderId: '8', assignedUserId: '3' });
    await expect(validate(plainToInstance(DeliveryQueryDto, { limit: '51' }))).resolves.not.toHaveLength(0);
  });

  it('only accepts OWNER or EMPLOYEE when listing internal assignees', async () => {
    await expect(validate(plainToInstance(DeliveryAssigneeQueryDto, { deliveryType: DeliveryType.OWNER }))).resolves.toHaveLength(0);
    await expect(validate(plainToInstance(DeliveryAssigneeQueryDto, { deliveryType: DeliveryType.EXTERNAL_DRIVER }))).resolves.not.toHaveLength(0);
  });
});
