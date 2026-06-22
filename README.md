# Partnership Management Information System (PMIS)

A production-ready **NestJS + Prisma** backend database service and API boilerplate for the Partnership Management Information System (PMIS).


---

## ✨ Features

| Area | What's included |
|---|---|
| **User Auth** | Register, login, logout, refresh token, change password |
| **Employee Auth** | Login, logout, refresh token, change password, OTP verification |
| **RBAC** | Roles, Permission Resources, Permission Actions, Employee Role assignments |
| **OTP** | Time-limited codes, max-attempt lockout, re-send support |
| **Refresh Tokens** | Rotating refresh tokens, server-side session tracking |
| **Rate Limiting** | Per-identifier sliding-window limits on sensitive endpoints |
| **Audit Log** | Immutable auth event log (login, logout, password change, OTP …) |
| **Notifications** | In-app notification CRUD (push channel is a stub — wire your own) |
| **Token Cleanup** | Scheduled cron jobs to purge expired tokens/OTPs/audit logs |
| **Swagger** | Full API documentation auto-generated at `/api/docs` |

---

## 🗂 Project Structure

```
auth-bootstrap-package/
├── prisma/
│   └── schema.prisma            # Prisma schema (User, Employee, Role, OTP …)
└── src/
    ├── app.module.ts            # Root module
    ├── main.ts                  # Bootstrap / Swagger setup
    ├── common/
    │   ├── constants/
    │   │   ├── actions.ts       # Enum of RBAC actions (CREATE, READ …)
    │   │   └── resource.ts      # Enum of RBAC resource names
    │   ├── database/
    │   │   ├── database.module.ts
    │   │   └── database.service.ts   # Prisma client wrapper
    │   ├── decorators/
    │   │   ├── is-phone-number.decorator.ts
    │   │   ├── public.decorator.ts
    │   │   ├── refresh-token.decorator.ts   # @RefreshToken() metadata decorator
    │   │   └── resource.decorator.ts
    │   ├── dtos/
    │   │   └── global.dto.ts    # PaginationDto, shared types
    │   ├── guards/
    │   │   ├── auth.guard.ts                    # User JWT guard
    │   │   ├── employee-auth.guard.ts            # Employee JWT guard
    │   │   ├── refresh-token.guard.ts            # User refresh-token guard
    │   │   ├── employee-refresh-token.guard.ts   # Employee refresh-token guard
    │   │   └── roles.guard.ts                    # RBAC guard
    │   ├── interfaces/
    │   │   ├── login.interface.ts
    │   │   └── employee-login.interface.ts
    │   ├── services/
    │   │   ├── authorization.module.ts
    │   │   ├── authorization.service.ts  # Resource/action permission checks
    │   │   ├── auth-audit.service.ts
    │   │   ├── otp.service.ts
    │   │   ├── password.service.ts
    │   │   ├── rate-limit.service.ts
    │   │   ├── refresh-token.service.ts
    │   │   ├── sms.service.ts           # Stub — plug in your SMS provider
    │   │   └── token-cleanup.service.ts # Scheduled cleanup cron jobs
    │   └── utils/
    │       ├── generate-code.ts
    │       └── paginater.ts
    └── models/
        ├── auth/
        │   ├── auth/                    # User-facing auth
        │   │   ├── auth.controller.ts
        │   │   ├── auth.controller.spec.ts
        │   │   ├── auth.module.ts
        │   │   ├── auth.service.ts
        │   │   ├── auth.service.spec.ts
        │   │   └── dto.ts
        │   ├── employee-auth/           # Employee/admin auth
        │   │   ├── employee-auth.controller.ts
        │   │   ├── employee-auth.controller.spec.ts
        │   │   ├── employee-auth.module.ts
        │   │   ├── employee-auth.service.ts
        │   │   ├── employee-auth.service.spec.ts
        │   │   └── dto.ts
        │   ├── role/                    # RBAC roles
        │   │   ├── role.controller.ts
        │   │   ├── role.module.ts
        │   │   ├── role.service.ts
        │   │   └── dto/
        │   ├── permission-resource/
        │   │   ├── permission-resource.controller.ts
        │   │   ├── permission-resource.module.ts
        │   │   ├── permission-resource.service.ts
        │   │   └── dto/
        │   └── permission-action/
        │       ├── permission-action.controller.ts
        │       ├── permission-action.module.ts
        │       ├── permission-action.service.ts
        │       └── dto/
        ├── user/
        │   ├── user.controller.ts
        │   ├── user.module.ts
        │   ├── user.service.ts
        │   └── dto.ts
        ├── employee/
        │   ├── employee.controller.ts
        │   ├── public-employee.controller.ts
        │   ├── employee.module.ts
        │   ├── employee.service.ts
        │   └── dto/
        ├── employee-role/
        │   ├── employee-role.controller.ts
        │   ├── employee-role.module.ts
        │   ├── employee-role.service.ts
        │   └── dto.ts
        ├── permission-resource/
        │   ├── permission-resource.controller.ts
        │   ├── permission-resource.module.ts
        │   ├── permission-resource.service.ts
        │   └── dto/
        ├── permission-action/
        │   ├── permission-action.controller.ts
        │   ├── permission-action.module.ts
        │   ├── permission-action.service.ts
        │   └── dto/
        └── notifications/
            ├── notifications.controller.ts
            ├── notifications.module.ts
            ├── notifications.service.ts
            └── dto.ts
```

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14
- Yarn or npm

### 2. Install dependencies

```bash
yarn install
# or
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `DATABASE_URL` — your PostgreSQL connection string
- `AUTH_JWT_SECRET` and `AUTH_REFRESH_JWT_SECRET`
- `EMPLOYEE_AUTH_JWT_SECRET` and `EMPLOYEE_AUTH_REFRESH_JWT_SECRET`

### 4. Run Prisma migrations

```bash
yarn db:migrate
# or first-time push (no migration history):
yarn db:push
```

### 5. Start the dev server

```bash
yarn start:dev
```

Swagger UI will be available at: **http://localhost:3000/api/docs**

---

## 🔐 Authentication Flow

### User Auth (`/auth/*`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup/request` | Request signup OTP |
| POST | `/auth/signup/verify` | Verify OTP & create account |
| POST | `/auth/login` | Login → `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Invalidate current session |
| PUT | `/auth/change-password` | Change password (authenticated) |

### Employee Auth (`/employee-auth/*`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/employee-auth/login` | Login with phone + password |
| POST | `/employee-auth/refresh` | Refresh access token |
| POST | `/employee-auth/logout` | Invalidate session |
| POST | `/employee-auth/verify-otp` | Verify login OTP |
| POST | `/employee-auth/resend-otp` | Re-send OTP |
| PUT | `/employee-auth/change-password` | Change own password |

---

## 🛡 RBAC (Role-Based Access Control)

### Data model

```
Employee ──has many──▶ EmployeeRole ──belongs to──▶ Role
                                                       │
                                         has many──▶ PermissionAction
                                                       │
                                         belongs to──▶ PermissionResource
```

### Using the guard in your controllers

```typescript
import { Resource } from '../../common/decorators/resource.decorator';
import { Actions } from '../../common/constants/actions';
import { Resource as R } from '../../common/constants/resource';

@Get()
@Resource(R.USER, Actions.READ)  // only employees with this permission pass
findAll() { … }
```

Mark endpoints that skip auth entirely with:

```typescript
import { Public } from '../../common/decorators/public.decorator';

@Get('health')
@Public()
health() { return 'ok'; }
```

---

## 🔧 Customisation Guide

### Plug in a real SMS provider

Replace the stub implementation in [`src/common/services/sms.service.ts`](src/common/services/sms.service.ts):

```typescript
// Example: Twilio
async sendSms(to: string, message: string): Promise<void> {
  await this.twilioClient.messages.create({
    body: message,
    from: process.env.SMS_SENDER_ID,
    to,
  });
}
```

### Add a new resource / action

1. Add the constant to `src/common/constants/resource.ts` and `actions.ts`.
2. Seed the new `PermissionResource` and `PermissionAction` records via the Prisma seed script.
3. Assign the action to a `Role` through the `permission-action` endpoints.

### Extend the User model

1. Add fields to the `User` model in `prisma/schema.prisma`.
2. Run `yarn db:migrate`.
3. Update `CreateUserDto` / `UpdateUserDto` in `src/models/user/dto.ts`.
4. Update `UserService` accordingly.

---

## 🌱 Prisma Seed

Create `prisma/seed.ts` to pre-populate roles and permissions:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create base resources
  const userResource = await prisma.permissionResource.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'User management' },
  });

  // Create actions
  await prisma.permissionAction.upsert({
    where: { name_resourceId: { name: 'READ', resourceId: userResource.id } },
    update: {},
    create: { name: 'READ', resourceId: userResource.id },
  });

  // Create admin role
  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'System administrator' },
  });
}

main().finally(() => prisma.$disconnect());
```

Run with: `yarn db:seed`

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `@nestjs/common`, `@nestjs/core` | NestJS framework |
| `@nestjs/jwt` | JWT token issuance & verification |
| `@nestjs/config` | Environment variable loading |
| `@nestjs/schedule` | Cron-based token cleanup |
| `@nestjs/swagger` | Auto-generated API docs |
| `@prisma/client` | Database ORM |
| `bcrypt` / `bcryptjs` | Password hashing |
| `class-validator` + `class-transformer` | DTO validation & serialisation |

---

## 🗑 What Was Removed vs. the Source Project

| Removed | Reason |
|---|---|
| `nestjs-i18n` | Project-specific multi-language support |
| `IntegrationModule` (NID, TIN, CRRSA) | Government-specific identity services |
| `MinioClientModule` | File storage (not auth-related) |
| `SmsModule` (full) | Replaced by a simple stub service |
| All `TitleDeed*`, `Plot*`, `Bank*` modules | Land-registry domain logic |
| `GlobalApiKeyUsageInterceptor` | Service-account API key tracking |
| Appointment, Rating, Branch on Employee | Domain-specific employee fields |

---

## 📝 License

MIT
