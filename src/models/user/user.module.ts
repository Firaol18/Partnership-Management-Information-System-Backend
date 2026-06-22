import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthAuditService } from '../../common/services/auth-audit.service';
import { PasswordService } from '../../common/services/password.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PasswordService, AuthAuditService],
})
export class UserModule {}
