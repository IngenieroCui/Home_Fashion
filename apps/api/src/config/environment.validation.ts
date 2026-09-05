import * as Joi from 'joi';

export interface ValidatedEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_LOGGING: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d')
});

export function validateEnvironment(
  environment: Record<string, unknown>
): ValidatedEnvironment {
  const { error, value } = environmentValidationSchema.validate(environment, {
    abortEarly: false,
    allowUnknown: true
  });

  if (error) {
    const details = error.details
      .map((detail) => `"${detail.path.join('.')}" ${detail.type === 'any.required' ? 'is required' : 'is invalid'}`)
      .join('. ');

    throw new Error(`Config validation error: ${details}`);
  }

  return value as ValidatedEnvironment;
}
