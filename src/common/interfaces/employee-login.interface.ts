export interface IUserRole {
  role: {
    id: string;
    name: string;
    rolePermissionResources: {
      rolePermissionResourceActions: {
        permissionAction: {
          id: string;
          action: any;
        };
      }[];
      permissionResource: {
        name: string;
      };
    }[];
  };
}

export interface IEmployeeLogin {
  id: string;
  name?: string | null;
  username: string;
  email?: string | null;
  branch_id?: string | null;
  group_id?: string | null;
  bank_id?: string | null;
  require_password_change: boolean;
  username_verified: boolean;
  resourcePermissions: AuthPermission[];
}

export interface AuthPermission {
  resource: string;
  permissions: string[];
}

export interface EmployeeTokenClaim {
  user: {
    sub: string;
    username: string;
    username_verified: boolean;
    language: string;
    branch_id?: string;
    group_id?: string;
    bank_id?: string;
    jti: string; // JWT ID for logout functionality
    subject_type?: string;
  };
}
