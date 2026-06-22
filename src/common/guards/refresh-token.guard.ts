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
import { REFRESH_TOKEN_KEY } from '../decorators/refresh-token.decorator';
import { RefreshTokenService } from '../services/refresh-token.service';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRefreshToken = this.reflector.getAllAndOverride<boolean>(
      REFRESH_TOKEN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isRefreshToken) {
      return true; // Let other guards handle this
    }

    // For refresh token endpoints, we handle all validation ourselves
    // This prevents conflicts with the global AuthGuard

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      this.logger.warn('No refresh token provided in request');
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('AUTH_JWT_SECRET'),
        algorithms: ['HS256'], // Pin to HS256 only
        issuer: this.configService.get('JWT_ISSUER', 'pmis-backend'),
        clockTolerance: 30, // 30 seconds tolerance for clock skew
      });

      // Validate required claims
      this.validateRequiredClaims(payload);

      // Validate that this is actually a refresh token
      this.validateRefreshToken(payload);

      // Check if the refresh token exists and is valid in the database
      const refreshTokenData =
        await this.refreshTokenService.validateRefreshToken(payload.jti);
      if (!refreshTokenData) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Add the validated payload to the request
      request['refreshTokenPayload'] = payload;
    } catch (error) {
      this.logger.warn(`Refresh token validation failed: ${error.message}`, {
        error: error.name,
        token: token.substring(0, 20) + '...',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    return true;
  }

  private validateRequiredClaims(payload: any): void {
    const requiredClaims = [
      'sub',
      'iss',
      'exp',
      'iat',
      'jti',
      'type',
      'family_id',
      'subject_type',
    ];
    for (const claim of requiredClaims) {
      if (!payload[claim]) {
        throw new UnauthorizedException(`Missing required claim: ${claim}`);
      }
    }
  }

  private validateRefreshToken(payload: any): void {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(
        'Invalid token type - expected refresh token',
      );
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
