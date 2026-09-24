import { createSequelizeOptions, type DatabaseConfig } from './sequelize.config';

const base: DatabaseConfig = {
  host: 'example.aivencloud.com',
  port: 12345,
  database: 'defaultdb',
  username: 'user',
  password: 'secret',
  logging: false,
  sslMode: 'REQUIRED',
  sslCaPath: __filename
};

describe('MySQL TLS configuration', () => {
  it('uses an environment CA for serverless deployments and verifies the server certificate', () => {
    const ca = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
    const options = createSequelizeOptions({ ...base, sslCaBase64: Buffer.from(ca).toString('base64') });
    expect(options.dialectOptions).toEqual({
      ssl: { ca, rejectUnauthorized: true }
    });
  });

  it('fails before connecting when the required CA cannot be read', () => {
    expect(() => createSequelizeOptions({ ...base, sslCaPath: 'certs/missing-ca.pem' }))
      .toThrow('DB_SSL_CA_PATH');
  });

  it('rejects invalid environment CA contents', () => {
    expect(() => createSequelizeOptions({ ...base, sslCaBase64: Buffer.from('invalid').toString('base64') }))
      .toThrow('DB_SSL_CA_BASE64');
  });

  it('omits TLS only when explicitly disabled for local tests', () => {
    expect(createSequelizeOptions({ ...base, sslMode: 'DISABLED' }).dialectOptions).toBeUndefined();
  });
});
