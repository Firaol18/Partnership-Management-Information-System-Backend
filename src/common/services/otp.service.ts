import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { SmsService } from './sms.service';
import * as bcrypt from 'bcrypt';
import { generateCode } from '../utils/generate-code';

export interface OtpGenerationResult {
  otp: string;
  hashedOtp: string;
  expiresAt: Date;
}

export interface OtpValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isLocked: boolean;
  remainingAttempts: number;
  reason?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpTtlMinutes: number;
  private readonly maxAttempts: number;
  private readonly testMode: boolean;
  private readonly testCode: string;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {
    this.otpTtlMinutes = Number(this.configService.get<number>('OTP_TTL_MIN', 15));
    this.maxAttempts = Number(this.configService.get<number>('OTP_MAX_ATTEMPTS', 5));
    this.testMode = this.configService.get<string>('OTP_TEST_MODE', 'false').toLowerCase() === 'true';
    this.testCode = this.configService.get<string>('OTP_TEST_CODE', '000000');
  }

  async generateOtp(
    userId: string,
    purpose: string = 'verification',
    userType: 'user' | 'employee' = 'user',
    phoneNumber?: string,
  ): Promise<OtpGenerationResult> {
    const otp = generateCode(6);
    const hashedOtp = await bcrypt.hash(otp, 12);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpTtlMinutes);

    await this.cleanupExpiredOtps(userId, purpose, userType);

    const otpData: any = {
      otp,
      otp_hash: hashedOtp,
      purpose,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: this.maxAttempts,
    };

    if (userType === 'user') {
      otpData.user_id = userId;
    } else {
      otpData.employee_id = userId;
    }

    await this.prisma.otp.create({ data: otpData });

    if (!this.testMode && phoneNumber) {
      try {
        const message = this.buildOtpMessage(otp, purpose);
        await this.smsService.sendSms(phoneNumber, message);
      } catch (error) {
        this.logger.error(`SMS sending error for ${userType} ${userId}:`, error);
      }
    } else if (this.testMode) {
      this.logger.log(`Test mode: OTP for ${userType} ${userId}, purpose: ${purpose}`);
    }

    return { otp, hashedOtp, expiresAt };
  }

  async validateOtp(
    userId: string,
    providedOtp: string,
    purpose: string = 'verification',
    userType: 'user' | 'employee' = 'user',
  ): Promise<OtpValidationResult> {
    if (this.testMode && providedOtp === this.testCode) {
      return { isValid: true, isExpired: false, isLocked: false, remainingAttempts: this.maxAttempts };
    }

    const whereClause: any = {
      purpose,
      expires_at: { gt: new Date() },
    };

    if (userType === 'user') {
      whereClause.user_id = userId;
    } else {
      whereClause.employee_id = userId;
    }

    const otpRecord = await this.prisma.otp.findFirst({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      return { isValid: false, isExpired: true, isLocked: false, remainingAttempts: 0, reason: 'No valid OTP found' };
    }

    if (otpRecord.locked_until && otpRecord.locked_until > new Date()) {
      return { isValid: false, isExpired: false, isLocked: true, remainingAttempts: 0, reason: 'OTP is locked' };
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      await this.prisma.otp.update({ where: { id: otpRecord.id }, data: { locked_until: lockUntil } });
      return { isValid: false, isExpired: false, isLocked: true, remainingAttempts: 0, reason: 'Maximum attempts exceeded' };
    }

    const isValid = await bcrypt.compare(providedOtp, otpRecord.otp_hash);
    await this.prisma.otp.update({ where: { id: otpRecord.id }, data: { attempts: otpRecord.attempts + 1 } });

    if (isValid) {
      await this.prisma.otp.delete({ where: { id: otpRecord.id } });
    }

    return {
      isValid,
      isExpired: false,
      isLocked: false,
      remainingAttempts: otpRecord.max_attempts - (otpRecord.attempts + 1),
      reason: isValid ? undefined : 'Invalid OTP',
    };
  }

  private async cleanupExpiredOtps(userId: string, purpose: string, userType: 'user' | 'employee' = 'user'): Promise<void> {
    const whereClause: any = {
      purpose,
      OR: [{ expires_at: { lt: new Date() } }, { attempts: { gte: this.maxAttempts } }],
    };
    if (userType === 'user') {
      whereClause.user_id = userId;
    } else {
      whereClause.employee_id = userId;
    }
    await this.prisma.otp.deleteMany({ where: whereClause });
  }

  private buildOtpMessage(otp: string, purpose: string): string {
    switch (purpose) {
      case 'verification':
        return `Your verification code is: ${otp}. Expires in ${this.otpTtlMinutes} minutes.`;
      case 'password_reset':
        return `Your password reset code is: ${otp}. Expires in ${this.otpTtlMinutes} minutes.`;
      default:
        return `Your code is: ${otp}. Expires in ${this.otpTtlMinutes} minutes.`;
    }
  }
}
