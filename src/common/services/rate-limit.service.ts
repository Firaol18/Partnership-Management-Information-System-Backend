import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  reason?: string;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly limits: Record<string, { requests: number; windowMinutes: number }>;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.limits = {
      signup: {
        requests: Number(this.configService.get<number>('RATE_LIMIT_SIGNUP_REQUESTS', 5)),
        windowMinutes: Number(this.configService.get<number>('RATE_LIMIT_SIGNUP_WINDOW_MINUTES', 5)),
      },
      otp_verify: {
        requests: Number(this.configService.get<number>('RATE_LIMIT_OTP_VERIFY_REQUESTS', 50)),
        windowMinutes: Number(this.configService.get<number>('RATE_LIMIT_OTP_VERIFY_WINDOW_MINUTES', 60)),
      },
      login: {
        requests: Number(this.configService.get<number>('RATE_LIMIT_LOGIN_REQUESTS', 5)),
        windowMinutes: Number(this.configService.get<number>('RATE_LIMIT_LOGIN_WINDOW_MINUTES', 5)),
      },
      password_reset: {
        requests: Number(this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_REQUESTS', 30)),
        windowMinutes: Number(this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_WINDOW_MINUTES', 60)),
      },
    };
  }

  private formatRemainingUntil(resetTime: Date): string {
    const ms = Math.max(0, resetTime.getTime() - Date.now());
    const hourMs = 60 * 60 * 1000;
    const minuteMs = 60 * 1000;
    if (ms >= hourMs) {
      const hours = Math.ceil(ms / hourMs);
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    if (ms >= minuteMs) {
      const minutes = Math.ceil(ms / minuteMs);
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  async checkRateLimit(
    identifier: string,
    attemptType: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RateLimitResult> {
    const limit = this.limits[attemptType];
    if (!limit) {
      return { allowed: true, remaining: Infinity, resetTime: new Date() };
    }

    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - limit.windowMinutes);

    const attemptCount = await this.prisma.authAttempt.count({
      where: {
        identifier,
        attempt_type: attemptType,
        attempted_at: { gte: windowStart },
      },
    });

    const remaining = Math.max(0, limit.requests - attemptCount);
    const resetTime = new Date();
    resetTime.setMinutes(resetTime.getMinutes() + limit.windowMinutes);

    if (attemptCount >= limit.requests) {
      this.logger.warn(`Rate limit exceeded for ${identifier}, type: ${attemptType}`);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        reason: `Rate limit exceeded. Try again after ${this.formatRemainingUntil(resetTime)}.`,
      };
    }

    return { allowed: true, remaining, resetTime };
  }

  async recordAttempt(
    identifier: string,
    attemptType: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.authAttempt.create({
      data: {
        identifier,
        attempt_type: attemptType,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        failure_reason: failureReason,
        metadata,
      },
    });
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1);
    const failedAttempts = await this.prisma.authAttempt.count({
      where: { ip_address: ipAddress, success: false, attempted_at: { gte: windowStart } },
    });
    return failedAttempts > 20;
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - 30);
    const failedAttempts = await this.prisma.authAttempt.count({
      where: { identifier, success: false, attempted_at: { gte: windowStart } },
    });
    return failedAttempts > 10;
  }

  async cleanupOldAttempts(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const deleted = await this.prisma.authAttempt.deleteMany({
      where: { attempted_at: { lt: cutoffDate } },
    });
    this.logger.log(`Cleaned up ${deleted.count} old authentication attempts`);
  }
}
