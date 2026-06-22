import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACTIONS } from 'src/common/constants/actions';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { AuthorizationService } from '../services/authorization.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<
      {
        resource: string;
        actions: ACTIONS[];
      }[]
    >(RESOURCE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || !requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    try {
      const user = request.user;

      if (!user) {
        this.logger.warn('No user found in request');
        return false;
      }

      const isEmployee = true;

      // Check each required permission
      for (const permission of requiredPermissions) {
        for (const action of permission.actions) {
          const hasPermission = await this.authorizationService.hasPermission(
            user.sub,
            permission.resource,
            action,
            isEmployee,
          );

          if (hasPermission) {
            return true;
          }
        }
      }

      this.logger.warn(`User ${user.sub} lacks required permissions`, {
        requiredPermissions,
        userId: user.sub,
        isEmployee,
      });

      return false;
    } catch (error) {
      this.logger.error('Error checking permissions:', error);
      throw new UnauthorizedException('Permission check failed');
    }
  }
}
