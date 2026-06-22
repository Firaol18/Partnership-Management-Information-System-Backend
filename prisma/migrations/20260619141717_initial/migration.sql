-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ORGANIZATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('FAYDA_ID', 'GOVERNMENT_ID', 'TIN_NUMBER', 'PASSPORT', 'ORIGIN_ID', 'BIRTH_CERTIFICATE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "user_type" "UserType" NOT NULL,
    "id_type" "IdType" NOT NULL,
    "migrated_from_xoka_system" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "code_hash" TEXT,
    "profile_image" TEXT,
    "code_expiration" TIMESTAMP(3),
    "require_password_change" BOOLEAN NOT NULL DEFAULT false,
    "username_verified" BOOLEAN NOT NULL DEFAULT false,
    "username_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_status_updated_at" TIMESTAMP(3),
    "active_status_updated_by_id" TEXT,
    "status_update_note" TEXT,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_status_updated_at" TIMESTAMP(3),
    "suspended_status_updated_by_id" TEXT,
    "suspended_status_update_note" TEXT,
    "secondary_id_type" "IdType",
    "secondary_id" TEXT,
    "primary_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "secondary_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "admin_created" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "code_hash" TEXT,
    "profile_image" TEXT,
    "code_expiration" TIMESTAMP(3),
    "require_password_change" BOOLEAN NOT NULL DEFAULT false,
    "username_verified" BOOLEAN NOT NULL DEFAULT false,
    "username_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_status_updated_at" TIMESTAMP(3),
    "active_status_updated_by_id" TEXT,
    "status_update_note" TEXT,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_status_updated_at" TIMESTAMP(3),
    "suspended_status_updated_by_id" TEXT,
    "suspended_status_update_note" TEXT,
    "average_rating" DOUBLE PRECISION,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "group_id" TEXT,
    "is_supervisor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_group_id" TEXT,
    "path" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "drafted_at" TIMESTAMP(3),
    "drafted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "employee_id" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "switchable" BOOLEAN NOT NULL DEFAULT false,
    "editable" BOOLEAN NOT NULL DEFAULT false,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_actions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission_resources" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission_resource_actions" (
    "id" TEXT NOT NULL,
    "permission_action_id" TEXT NOT NULL,
    "role_permission_resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_resource_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_roles" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "employee_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "subject_user_id" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "last_ip" TEXT,
    "last_user_agent" TEXT,
    "last_device_fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_type" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "idle_timeout_at" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "token_jti" TEXT,
    "session_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_access_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "lat" TEXT,
    "lng" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_login_histories" (
    "id" TEXT NOT NULL,
    "is_successful" BOOLEAN NOT NULL DEFAULT true,
    "employee_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "lat" TEXT,
    "lng" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "employee_id" TEXT,
    "otp" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "locked_until" TIMESTAMP(3),
    "purpose" TEXT NOT NULL DEFAULT 'verification',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "attempt_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_username_key" ON "employees"("username");

-- CreateIndex
CREATE UNIQUE INDEX "employees_phone_number_key" ON "employees"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_parent_group_id_idx" ON "groups"("parent_group_id");

-- CreateIndex
CREATE INDEX "groups_path_idx" ON "groups"("path");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_created_at_idx" ON "notifications"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_employee_id_status_created_at_idx" ON "notifications"("employee_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_employee_id_created_at_idx" ON "notifications"("employee_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_resources_name_key" ON "permission_resources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_actions_action_key" ON "permission_actions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_resources_permission_resource_id_role_id_key" ON "role_permission_resources"("permission_resource_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_resource_actions_role_permission_resource_i_key" ON "role_permission_resource_actions"("role_permission_resource_id", "permission_action_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_role_id_user_id_key" ON "user_roles"("role_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_roles_role_id_employee_id_key" ON "employee_roles"("role_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_subject_user_id_subject_type_idx" ON "refresh_tokens"("subject_user_id", "subject_type");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_id_key" ON "sessions"("session_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_user_type_idx" ON "sessions"("user_id", "user_type");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_idle_timeout_at_idx" ON "sessions"("idle_timeout_at");

-- CreateIndex
CREATE INDEX "sessions_revoked_at_idx" ON "sessions"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_audit_logs_event_id_key" ON "auth_audit_logs"("event_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_actor_type_actor_id_idx" ON "auth_audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_action_idx" ON "auth_audit_logs"("action");

-- CreateIndex
CREATE INDEX "auth_audit_logs_occurred_at_idx" ON "auth_audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_token_jti_idx" ON "auth_audit_logs"("token_jti");

-- CreateIndex
CREATE INDEX "auth_audit_logs_session_id_idx" ON "auth_audit_logs"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_access_tokens_jti_key" ON "revoked_access_tokens"("jti");

-- CreateIndex
CREATE INDEX "revoked_access_tokens_expires_at_idx" ON "revoked_access_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "otp_user_id_purpose_idx" ON "otp"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "otp_employee_id_purpose_idx" ON "otp"("employee_id", "purpose");

-- CreateIndex
CREATE INDEX "otp_expires_at_idx" ON "otp"("expires_at");

-- CreateIndex
CREATE INDEX "auth_attempts_identifier_idx" ON "auth_attempts"("identifier");

-- CreateIndex
CREATE INDEX "auth_attempts_attempt_type_idx" ON "auth_attempts"("attempt_type");

-- CreateIndex
CREATE INDEX "auth_attempts_ip_address_idx" ON "auth_attempts"("ip_address");

-- CreateIndex
CREATE INDEX "auth_attempts_attempted_at_idx" ON "auth_attempts"("attempted_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission_resources" ADD CONSTRAINT "role_permission_resources_permission_resource_id_fkey" FOREIGN KEY ("permission_resource_id") REFERENCES "permission_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission_resources" ADD CONSTRAINT "role_permission_resources_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission_resource_actions" ADD CONSTRAINT "role_permission_resource_actions_permission_action_id_fkey" FOREIGN KEY ("permission_action_id") REFERENCES "permission_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission_resource_actions" ADD CONSTRAINT "role_permission_resource_actions_role_permission_resource__fkey" FOREIGN KEY ("role_permission_resource_id") REFERENCES "role_permission_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_histories" ADD CONSTRAINT "login_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_login_histories" ADD CONSTRAINT "employee_login_histories_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
