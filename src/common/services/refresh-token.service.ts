import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface RefreshTokenData {
  jti: string;
  family_id: string;
  subject_user_id: string;
  subject_type: 'user' | 'employee';
  issued_at: Date;
  expires_at: Date;
  rotated_at?: Date;
  revoked_at?: Date;
  revoked_reason?: string;
  last_ip?: string;
  last_user_agent?: string;
  last_device_fingerprint?: string;
}

export interface TokenRotationResult {
  newAccessToken: string;
  newRefreshToken: string;
  oldTokenRevoked: boolean;
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new refresh token family for a user login
   */
  async createRefreshToken(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
    username?: string,
    ip?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<{ refreshToken: string; family_id: string }> {
    const family_id = randomUUID();
    // Generate JTI in the same format as the original auth services
    const jti =
      subject_type === 'employee'
        ? `emp-${subject_user_id}-${Date.now()}`
        : `${subject_user_id}-${Date.now()}`;

    // Calculate expiration time (11 hours from now)
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 11);

    // Store the refresh token in the database
    await this.prisma.refreshToken.create({
      data: {
        jti,
        family_id,
        subject_user_id,
        subject_type,
        issued_at: new Date(),
        expires_at,
        last_ip: ip,
        last_user_agent: userAgent,
        last_device_fingerprint: deviceFingerprint,
      },
    });

    // Create the JWT refresh token
    const refreshToken = this.jwtService.sign(
      {
        sub: subject_user_id,
        username: username || subject_user_id, // Include username for lookup
        jti,
        family_id,
        subject_type,
        type: 'refresh',
      },
      {
        algorithm: 'HS256',
        expiresIn: '11h',
        issuer: this.configService.get('JWT_ISSUER', 'pmis-backend'),
      },
    );

    // Create a session
    await this.createSession(
      subject_user_id,
      subject_type,
      ip,
      userAgent,
      deviceFingerprint,
    );

    // Log the token creation
    await this.logAuthEvent({
      actor_type: subject_type,
      actor_id: subject_user_id,
      action: 'token_created',
      result: 'success',
      ip,
      user_agent: userAgent,
      token_jti: jti,
      metadata: { family_id },
    });

    return { refreshToken, family_id };
  }

  /**
   * Rotate refresh token - invalidate old one and create new one
   */
  async rotateRefreshToken(
    oldJti: string,
    ip?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<TokenRotationResult> {
    return await this.prisma.$transaction(async (tx) => {
      // Find the existing refresh token
      const existingToken = await tx.refreshToken.findUnique({
        where: { jti: oldJti },
      });

      if (!existingToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (existingToken.expires_at < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Check if token is already revoked
      if (existingToken.revoked_at) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      // Check if token has already been rotated (reuse detection)
      if (existingToken.rotated_at) {
        // This is a reuse attempt - revoke the entire family
        await this.revokeTokenFamily(
          tx,
          existingToken.family_id,
          'reuse_detected',
        );

        await this.logAuthEvent({
          actor_type: existingToken.subject_type as 'user' | 'employee',
          actor_id: existingToken.subject_user_id,
          action: 'token_reuse_detected',
          result: 'denied',
          ip,
          user_agent: userAgent,
          token_jti: oldJti,
          metadata: { family_id: existingToken.family_id },
        });

        throw new UnauthorizedException('Token reuse detected');
      }

      // Mark the old token as rotated
      await tx.refreshToken.update({
        where: { jti: oldJti },
        data: {
          rotated_at: new Date(),
          last_ip: ip,
          last_user_agent: userAgent,
          last_device_fingerprint: deviceFingerprint,
        },
      });

      // Create a new refresh token in the same family
      const newJti =
        existingToken.subject_type === 'employee'
          ? `emp-${existingToken.subject_user_id}-${Date.now()}`
          : `${existingToken.subject_user_id}-${Date.now()}`;
      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + 11);

      await tx.refreshToken.create({
        data: {
          jti: newJti,
          family_id: existingToken.family_id,
          subject_user_id: existingToken.subject_user_id,
          subject_type: existingToken.subject_type as 'user' | 'employee',
          issued_at: new Date(),
          expires_at,
          last_ip: ip,
          last_user_agent: userAgent,
          last_device_fingerprint: deviceFingerprint,
        },
      });

      // Update session last seen
      await this.updateSessionLastSeen(
        existingToken.subject_user_id,
        existingToken.subject_type as 'user' | 'employee',
        ip,
        userAgent,
        deviceFingerprint,
      );

      // Retrieve the actual username from the database
      const username = await this.getUsernameById(
        existingToken.subject_user_id,
        existingToken.subject_type as 'user' | 'employee',
      );

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(
        existingToken.subject_user_id,
        existingToken.subject_type as 'user' | 'employee',
        username || existingToken.subject_user_id, // Use actual username or fallback to ID
      );

      const newRefreshToken = this.jwtService.sign(
        {
          sub: existingToken.subject_user_id,
          username: username || existingToken.subject_user_id, // Use actual username or fallback to ID
          jti: newJti,
          family_id: existingToken.family_id,
          subject_type: existingToken.subject_type,
          type: 'refresh',
        },
        {
          algorithm: 'HS256',
          expiresIn: '11h',
          issuer: this.configService.get('JWT_ISSUER', 'pmis-backend'),
        },
      );

      // Log the token rotation
      await this.logAuthEvent({
        actor_type: existingToken.subject_type as 'user' | 'employee',
        actor_id: existingToken.subject_user_id,
        action: 'token_refresh',
        result: 'success',
        ip,
        user_agent: userAgent,
        token_jti: newJti,
        metadata: {
          family_id: existingToken.family_id,
          old_jti: oldJti,
        },
      });

      return {
        newAccessToken,
        newRefreshToken,
        oldTokenRevoked: true,
      };
    });
  }

  /**
   * Find the active refresh token for a user (for logout purposes)
   */
  async findActiveRefreshToken(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
  ): Promise<{ jti: string; family_id: string } | null> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        subject_user_id,
        subject_type,
        revoked_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
      select: {
        jti: true,
        family_id: true,
      },
      orderBy: {
        issued_at: 'desc',
      },
    });

    return token;
  }

  /**
   * Revoke a specific refresh token (logout current device)
   */
  async revokeRefreshToken(
    jti: string,
    reason: string = 'logout',
    accessTokenJti?: string,
    accessTokenExpiresAt?: Date,
  ): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    if (!token) {
      return; // Token doesn't exist, nothing to revoke
    }

    await this.prisma.refreshToken.update({
      where: { jti },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });

    // Revoke associated session
    await this.revokeSession(
      token.subject_user_id,
      token.subject_type as 'user' | 'employee',
      reason,
    );

    // Revoke access token if provided (for immediate invalidation)
    if (accessTokenJti && accessTokenExpiresAt) {
      await this.revokeAccessToken(
        accessTokenJti,
        accessTokenExpiresAt,
        reason,
      );
    }

    await this.logAuthEvent({
      actor_type: token.subject_type as 'user' | 'employee',
      actor_id: token.subject_user_id,
      action: 'logout',
      result: 'success',
      token_jti: jti,
      session_id: token.family_id, // Use family_id as session correlation
      metadata: {
        family_id: token.family_id,
        reason,
        access_token_jti: accessTokenJti,
      },
    });
  }

  /**
   * Revoke current user session (logout current device)
   * This method finds the active refresh token and revokes it
   */
  async revokeCurrentUserSession(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
    accessTokenJti: string,
    accessTokenExpiresAt: Date,
    reason: string = 'logout',
  ): Promise<void> {
    // Find the active refresh token for this user
    const activeToken = await this.findActiveRefreshToken(
      subject_user_id,
      subject_type,
    );

    if (activeToken) {
      // Revoke the specific refresh token
      await this.revokeRefreshToken(
        activeToken.jti,
        reason,
        accessTokenJti,
        accessTokenExpiresAt,
      );
    } else {
      // No active refresh token found, just revoke the access token
      await this.revokeAccessToken(
        accessTokenJti,
        accessTokenExpiresAt,
        reason,
      );

      await this.logAuthEvent({
        actor_type: subject_type,
        actor_id: subject_user_id,
        action: 'logout',
        result: 'success',
        token_jti: accessTokenJti,
        metadata: {
          reason,
          note: 'No active refresh token found',
        },
      });
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
    reason: string = 'logout_all',
  ): Promise<void> {
    // Get all active refresh tokens for the user
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        subject_user_id,
        subject_type,
        revoked_at: null,
      },
      select: {
        jti: true,
        family_id: true,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: {
        subject_user_id,
        subject_type,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });

    // Revoke all sessions for the user
    await this.revokeAllUserSessions(subject_user_id, subject_type, reason);

    // Log the logout_all event with all affected tokens
    await this.logAuthEvent({
      actor_type: subject_type,
      actor_id: subject_user_id,
      action: 'logout_all',
      result: 'success',
      metadata: {
        reason,
        revoked_tokens_count: activeTokens.length,
        token_jtis: activeTokens.map((t) => t.jti),
        family_ids: activeTokens.map((t) => t.family_id),
      },
    });
  }

  /**
   * Validate a refresh token
   */
  async validateRefreshToken(jti: string): Promise<RefreshTokenData | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (token.expires_at < new Date()) {
      return null;
    }

    // Check if token is revoked
    if (token.revoked_at) {
      return null;
    }

    return {
      jti: token.jti,
      family_id: token.family_id,
      subject_user_id: token.subject_user_id,
      subject_type: token.subject_type as 'user' | 'employee',
      issued_at: token.issued_at,
      expires_at: token.expires_at,
      rotated_at: token.rotated_at,
      revoked_at: token.revoked_at,
      revoked_reason: token.revoked_reason,
      last_ip: token.last_ip,
      last_user_agent: token.last_user_agent,
      last_device_fingerprint: token.last_device_fingerprint,
    };
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Clean up revoked access tokens (should be run periodically)
   */
  async cleanupRevokedAccessTokens(): Promise<number> {
    const result = await this.prisma.revokedAccessToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { idle_timeout_at: { lt: new Date() } },
        ],
      },
    });

    return result.count;
  }

  /**
   * Add an access token to the revocation list
   */
  async revokeAccessToken(
    jti: string,
    expires_at: Date,
    reason: string = 'logout',
  ): Promise<void> {
    await this.prisma.revokedAccessToken.create({
      data: {
        jti,
        expires_at,
        revoked_reason: reason,
      },
    });
  }

  /**
   * Check if an access token is revoked
   */
  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    const revokedToken = await this.prisma.revokedAccessToken.findUnique({
      where: { jti },
    });

    return !!revokedToken;
  }

  /**
   * Retrieve username by user/employee ID
   */
  private async getUsernameById(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
  ): Promise<string | null> {
    try {
      if (subject_type === 'employee') {
        const employee = await this.prisma.employee.findUnique({
          where: { id: subject_user_id },
          select: { username: true },
        });
        return employee?.username || null;
      } else {
        const user = await this.prisma.user.findUnique({
          where: { id: subject_user_id },
          select: { username: true },
        });
        return user?.username || null;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve username:', error);
      return null;
    }
  }

  /**
   * Generate a new access token
   */
  private generateAccessToken(
    subject_user_id: string,
    subject_type: 'user' | 'employee',
    username?: string,
  ): string {
    // Generate JTI in the same format as the original auth services
    const jti =
      subject_type === 'employee'
        ? `emp-${subject_user_id}-${Date.now()}`
        : `${subject_user_id}-${Date.now()}`;

    return this.jwtService.sign(
      {
        sub: subject_user_id,
        username: username || subject_user_id,
        username_verified: false, // Default value
        language: 'en',
        jti,
        type: 'access',
      },
      {
        algorithm: 'HS256',
        expiresIn: '15m', // Short-lived access tokens
        issuer: this.configService.get('JWT_ISSUER', 'pmis-backend'),
        audience: this.configService.get('JWT_AUDIENCE', 'pmis-users'),
      },
    );
  }

  /**
   * Revoke an entire token family
   */
  private async revokeTokenFamily(
    tx: any,
    family_id: string,
    reason: string,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: {
        family_id,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });
  }

  /**
   * Create a new session
   */
  private async createSession(
    user_id: string,
    user_type: 'user' | 'employee',
    ip?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<void> {
    const session_id = randomUUID();
    const now = new Date();
    const expires_at = new Date(now.getTime() + 11 * 60 * 60 * 1000); // 11 hours
    const idle_timeout_at = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes idle

    await this.prisma.session.create({
      data: {
        session_id,
        user_id,
        user_type,
        created_at: now,
        last_seen_at: now,
        expires_at,
        idle_timeout_at,
        ip,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
      },
    });
  }

  /**
   * Update session last seen time
   */
  private async updateSessionLastSeen(
    user_id: string,
    user_type: 'user' | 'employee',
    ip?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<void> {
    const now = new Date();
    const idle_timeout_at = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes idle

    await this.prisma.session.updateMany({
      where: {
        user_id,
        user_type,
        revoked_at: null,
      },
      data: {
        last_seen_at: now,
        idle_timeout_at,
        ip,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
      },
    });
  }

  /**
   * Revoke a user's session
   */
  private async revokeSession(
    user_id: string,
    user_type: 'user' | 'employee',
    reason: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        user_id,
        user_type,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });
  }

  /**
   * Revoke all sessions for a user
   */
  private async revokeAllUserSessions(
    user_id: string,
    user_type: 'user' | 'employee',
    reason: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        user_id,
        user_type,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason,
      },
    });
  }

  /**
   * Log authentication events
   */
  private async logAuthEvent(data: {
    actor_type: string;
    actor_id: string;
    action: string;
    result: string;
    ip?: string;
    user_agent?: string;
    token_jti?: string;
    session_id?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          event_id: randomUUID(),
          occurred_at: new Date(),
          actor_type: data.actor_type,
          actor_id: data.actor_id,
          action: data.action,
          result: data.result,
          ip: data.ip,
          user_agent: data.user_agent,
          token_jti: data.token_jti,
          session_id: data.session_id,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log auth event:', error);
    }
  }
}
