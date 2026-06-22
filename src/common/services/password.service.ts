import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly minLength: number;
  private readonly maxLength: number;

  constructor(private readonly configService: ConfigService) {
    this.minLength = Number(this.configService.get<number>('PWD_MIN_LEN', 8));
    this.maxLength = Number(this.configService.get<number>('PWD_MAX_LEN', 64));
  }

  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty',
      'abc123', 'password123', 'admin', 'letmein', 'welcome', 'monkey',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    return { isValid: errors.length === 0, errors };
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async generateRandomPassword(length: number = 12): Promise<string> {
    return this.generateSecurePassword(length);
  }
}
