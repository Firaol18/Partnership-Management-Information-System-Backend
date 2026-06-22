import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { randomUUID } from 'crypto';

export interface AuthAuditEvent {
  actorType: 'user' | 'employee' | 'system';
  actorId: string;
  action: string;
  result: 'success' | 'failure';
  ip?: string;
  userAgent?: string;
  tokenJti?: string;
  sessionId?: string;
  metadata?: any;
}

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async logAuthEvent(event: AuthAuditEvent): Promise<void> {
    try {
      const eventId = randomUUID();
      await this.prisma.authAuditLog.create({
        data: {
          event_id: eventId,
          actor_type: event.actorType,
          actor_id: event.actorId,
          action: event.action,
          result: event.result,
          ip: event.ip,
          user_agent: event.userAgent,
          token_jti: event.tokenJti,
          session_id: event.sessionId,
          metadata: event.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error.message}`);
    }
  }

  async logSignup(userId: string, username: string, result: 'success' | 'failure', ip?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'signup', result, ip, userAgent, metadata: { username, reason } });
  }

  async logOtpGenerated(userId: string, purpose: string, ip?: string, userAgent?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'otp_generated', result: 'success', ip, userAgent, metadata: { purpose } });
  }

  async logOtpVerification(userId: string, result: 'success' | 'failure', ip?: string, userAgent?: string, reason?: string, attemptCount?: number): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'otp_verification', result, ip, userAgent, metadata: { reason, attemptCount } });
  }

  async logLogin(userId: string, username: string, result: 'success' | 'failure', ip?: string, userAgent?: string, tokenJti?: string, reason?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'login', result, ip, userAgent, tokenJti, metadata: { username, reason } });
  }

  async logLogout(userId: string, tokenJti: string, ip?: string, userAgent?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'logout', result: 'success', ip, userAgent, tokenJti });
  }

  async logPasswordChange(userId: string, result: 'success' | 'failure', ip?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'password_change', result, ip, userAgent, metadata: { reason } });
  }

  async logPasswordReset(userId: string, result: 'success' | 'failure', ip?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'password_reset', result, ip, userAgent, metadata: { reason } });
  }

  async logRateLimitExceeded(identifier: string, attemptType: string, ip?: string, userAgent?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'system', actorId: identifier, action: 'rate_limit_exceeded', result: 'failure', ip, userAgent, metadata: { attemptType } });
  }

  async logAccountLockout(userId: string, reason: string, ip?: string, userAgent?: string): Promise<void> {
    await this.logAuthEvent({ actorType: 'user', actorId: userId, action: 'account_lockout', result: 'failure', ip, userAgent, metadata: { reason } });
  }

  async getUserAuthEvents(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return this.prisma.authAuditLog.findMany({
      where: { actor_id: userId },
      orderBy: { occurred_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const deleted = await this.prisma.authAuditLog.deleteMany({
      where: { occurred_at: { lt: cutoffDate } },
    });
    this.logger.log(`Cleaned up ${deleted.count} old authentication audit logs`);
  }
}
