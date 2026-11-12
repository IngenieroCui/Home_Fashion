import { Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RoleCode } from '../auth/auth.types';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { MediaCleanupService } from './media-cleanup.service';

@Controller('admin/media-cleanup')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('USER_MANAGE')
export class MediaCleanupController {
  constructor(private readonly cleanup: MediaCleanupService, private readonly auth: AuthService) {}

  @Post('drain')
  async drain(@CurrentUser() actor: { id: string }) {
    if ((await this.auth.getAuthenticatedUser(actor.id)).role !== RoleCode.ADMIN) throw new ForbiddenException();
    return this.cleanup.drain();
  }
}
