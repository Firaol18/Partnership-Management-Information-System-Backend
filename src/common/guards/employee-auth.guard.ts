import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { EmployeeTokenClaim } from '../interfaces/employee-login.interface';
import { RefreshTokenService } from '../services/refresh-token.service';

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  private readonly logger = new Logger(EmployeeAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('AUTH_JWT_SECRET'),
        algorithms: ['HS256'],
        issuer: this.configService.get('JWT_ISSUER', 'pmis-backend'),
        audience: this.configService.get('JWT_AUDIENCE', 'pmis-users'),
        clockTolerance: 30,
      });

      this.validateRequiredClaims(payload);
      this.validateAccessToken(payload);

      const isRevoked = await this.refreshTokenService.isAccessTokenRevoked(
        payload.jti,
      );
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const tokenClaim: EmployeeTokenClaim['user'] = {
        sub: payload.sub,
        username: payload.username,
        branch_id: payload.branch_id,
        group_id: payload.group_id,
        bank_id: payload.bank_id,
        username_verified: payload.username_verified || false,
        language: payload.language || 'en',
        jti: payload.jti,
        subject_type: 'employee',
      };

      request['user'] = tokenClaim;
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`, {
        error: error.name,
        token: token.substring(0, 20) + '...',
      });
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private validateRequiredClaims(payload: any): void {
    const requiredClaims = ['sub', 'iss', 'aud', 'exp', 'iat', 'jti', 'type'];
    for (const claim of requiredClaims) {
      if (!payload[claim]) {
        throw new UnauthorizedException(`Missing required claim: ${claim}`);
      }
    }
  }

  private validateAccessToken(payload: any): void {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
