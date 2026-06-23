import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './common/database/database.module';
import { AuthorizationModule } from './common/services/authorization.module';
import { TokenCleanupService } from './common/services/token-cleanup.service';
import { AuthModule } from './models/auth/auth/auth.module';
import { EmployeeAuthModule } from './models/auth/employee-auth/employee-auth.module';
import { UserModule } from './models/user/user.module';
import { EmployeeModule } from './models/employee/employee.module';
import { RoleModule } from './models/auth/role/role.module';
import { EmployeeRoleModule } from './models/employee-role/employee-role.module';
import { PermissionResourceModule } from './models/auth/permission-resource/permission-resource.module';
import { PermissionActionModule } from './models/auth/permission-action/permission-action.module';
import { NotificationsModule } from './models/notifications/notifications.module';
import { EventAndVisitModule } from './models/event-and-visit/event-and-visit.module';
import { PartnershipOpportunityModule } from './models/partnership-opportunity/partnership-opportunity.module';
import { PartnerModule } from './models/partner/partner.module';
import { PartnershipEngagementModule } from './models/partnership-engagement/partnership-engagement.module';
import { PartnershipAgreementModule } from './models/partnership-agreement/partnership-agreement.module';

@Module({
  imports: [
    // Load environment variables globally – create a .env file based on .env.example
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Enable @nestjs/schedule for token cleanup cron jobs
    ScheduleModule.forRoot(),

    // Core infrastructure
    DatabaseModule,
    AuthorizationModule,

    // Domain modules
    AuthModule,
    EmployeeAuthModule,
    UserModule,
    EmployeeModule,
    EventAndVisitModule,
    PartnershipOpportunityModule,
    PartnerModule,
    PartnershipEngagementModule,
    PartnershipAgreementModule,

    // RBAC modules
    RoleModule,
    EmployeeRoleModule,
    PermissionResourceModule,
    PermissionActionModule,

    // Supporting modules
    NotificationsModule,
  ],
  providers: [
    // Scheduled job: purge expired tokens / OTPs
    TokenCleanupService,
  ],
})
export class AppModule {}
