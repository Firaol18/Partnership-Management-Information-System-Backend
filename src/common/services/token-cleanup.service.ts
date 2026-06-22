import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

/**
 * Runs on a schedule to clean up expired tokens and OTPs.
 * Register this as a provider in AppModule alongside ScheduleModule.forRoot().
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Deletes expired refresh tokens every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRefreshTokens(): Promise<void> {
    try {
      const result = await this.db.refreshToken.deleteMany({
        where: {
          expires_at: { lt: new Date() },
        },
      });
      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} expired refresh token(s).`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to clean up expired refresh tokens', err);
    }
  }

  /**
   * Deletes expired OTPs every 30 minutes.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupExpiredOtps(): Promise<void> {
    try {
      const result = await this.db.otp.deleteMany({
        where: {
          expires_at: { lt: new Date() },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired OTP(s).`);
      }
    } catch (err) {
      this.logger.error('Failed to clean up expired OTPs', err);
    }
  }

  /**
   * Deletes old auth audit log entries (older than 90 days) every day at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldAuditLogs(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.db.authAuditLog.deleteMany({
        where: {
          created_at: { lt: ninetyDaysAgo },
        },
      });
      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} old auth audit log entry(s).`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to clean up old auth audit logs', err);
    }
  }
}
