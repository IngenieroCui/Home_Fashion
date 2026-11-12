import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { Sequelize } from 'sequelize-typescript';

@Controller('health')
export class HealthController {
  constructor(private readonly database: Sequelize) {}

  @Get('ready')
  async readiness() {
    try { await this.database.authenticate(); }
    catch { throw new ServiceUnavailableException('Database unavailable'); }
    return { status: 'ready' };
  }

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'home-fashion-api'
    };
  }
}
