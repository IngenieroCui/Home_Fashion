import { down, up } from '../../database/migrations/20260811000000-enable-public-quote-requests';

describe('public quote requests migration', () => {
  const transaction = {};
  const context = {
    sequelize: {
      transaction: jest.fn((callback: (value: object) => unknown) => callback(transaction)),
      query: jest.fn()
    },
    changeColumn: jest.fn(),
    addColumn: jest.fn(),
    addIndex: jest.fn(),
    removeIndex: jest.fn(),
    removeColumn: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context.sequelize.query.mockResolvedValue([{ public_audit_rows: 0 }]);
  });

  it('makes public audit nullable and adds a nullable unique request key', async () => {
    await up({ context: context as never });
    expect(context.changeColumn).toHaveBeenCalledTimes(4);
    expect(context.changeColumn).toHaveBeenCalledWith(
      'quotes',
      'created_by_user_id',
      expect.objectContaining({ allowNull: true }),
      { transaction }
    );
    expect(context.addColumn).toHaveBeenCalledWith(
      'quotes',
      'public_request_key',
      expect.objectContaining({ allowNull: true }),
      { transaction }
    );
    expect(context.addColumn).toHaveBeenCalledWith(
      'quotes',
      'public_request_payload_hash',
      expect.objectContaining({ allowNull: true }),
      { transaction }
    );
    expect(context.addIndex).toHaveBeenCalledWith(
      'quotes',
      ['public_request_key'],
      expect.objectContaining({ unique: true, name: 'uq_quotes_public_request_key', transaction })
    );
  });

  it('removes the key before restoring non-null audit on rollback', async () => {
    await down({ context: context as never });
    expect(context.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('public_audit_rows'),
      expect.objectContaining({ transaction })
    );
    expect(context.sequelize.query.mock.invocationCallOrder[0]).toBeLessThan(
      context.removeIndex.mock.invocationCallOrder[0]
    );
    expect(context.removeIndex).toHaveBeenCalledWith('quotes', 'uq_quotes_public_request_key', {
      transaction
    });
    expect(context.removeColumn).toHaveBeenCalledWith('quotes', 'public_request_key', {
      transaction
    });
    expect(context.removeColumn).toHaveBeenCalledWith('quotes', 'public_request_payload_hash', {
      transaction
    });
    expect(context.changeColumn).toHaveBeenCalledWith(
      'quotes',
      'updated_by_user_id',
      expect.objectContaining({ allowNull: false }),
      { transaction }
    );
  });

  it('refuses all rollback DDL when rows with public audit exist', async () => {
    context.sequelize.query.mockResolvedValue([{ public_audit_rows: 2 }]);
    await expect(down({ context: context as never })).rejects.toThrow('public audit rows exist');
    expect(context.removeIndex).not.toHaveBeenCalled();
    expect(context.removeColumn).not.toHaveBeenCalled();
    expect(context.changeColumn).not.toHaveBeenCalled();
  });
});
