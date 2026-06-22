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

export interface ILogin {
  id: string;
  name?: string | null;
  username: string;
  email?: string | null;
  require_password_change: boolean;
  username_verified: boolean;
  userRoles: IUserRole[];
}

export interface TokenClaim {
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
