import { down, up } from '../../database/migrations/20260812000000-create-deliveries';

describe('create deliveries migration', () => {
  function setup() {
    const transaction = {};
    const context = {
      sequelize: {
        transaction: jest.fn(async (callback: (value: object) => Promise<void>) => callback(transaction)),
        query: jest.fn().mockResolvedValue(undefined)
      },
      createTable: jest.fn().mockResolvedValue(undefined),
      addIndex: jest.fn().mockResolvedValue(undefined),
      dropTable: jest.fn().mockResolvedValue(undefined)
    };
    return { context, transaction };
  }

  it('creates one delivery per order with restrictive foreign keys, enums, indexes and checks', async () => {
    const { context, transaction } = setup();
    await up({ context } as never);
    expect(context.createTable).toHaveBeenCalledWith('deliveries', expect.objectContaining({
      order_id: expect.objectContaining({ unique: true, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'RESTRICT' }),
      assigned_user_id: expect.objectContaining({ allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'RESTRICT' }),
      created_by_user_id: expect.objectContaining({ allowNull: false, references: { model: 'users', key: 'id' } }),
      address_reference: expect.anything(),
      time_window: expect.anything(),
      delivery_type: expect.anything(),
      evidence_urls: expect.anything()
    }), { transaction });
    expect(context.addIndex).toHaveBeenCalledWith('deliveries', ['status', 'scheduled_date'], { transaction });
    expect(context.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('chk_deliveries_assignment'), { transaction });
    expect(context.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('chk_deliveries_fee'), { transaction });
  });

  it('drops the delivery table transactionally', async () => {
    const { context, transaction } = setup();
    await down({ context } as never);
    expect(context.dropTable).toHaveBeenCalledWith('deliveries', { transaction });
  });
});
