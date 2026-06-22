import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsResult {
  success: boolean;
  message?: string;
  messageId?: string;
}

/**
 * Pluggable SMS Service - replace `sendSms` body with your actual provider
 * (e.g. Twilio, AWS SNS, Africa's Talking, etc.)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
    // -----------------------------------------------------------------------
    // TODO: Replace this block with your real SMS provider integration.
    // Example (Twilio):
    //   const client = require('twilio')(this.configService.get('TWILIO_SID'), this.configService.get('TWILIO_TOKEN'));
    //   const msg = await client.messages.create({ body: message, from: '+1...', to: phoneNumber });
    //   return { success: true, messageId: msg.sid };
    // -----------------------------------------------------------------------
    this.logger.log(`[SMS MOCK] To: ${phoneNumber} | Message: ${message}`);
    return { success: true, message: 'SMS sent (mock)' };
  }
}
