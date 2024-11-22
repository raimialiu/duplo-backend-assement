import { Role } from "src/common/decorators/public.decorator";

export interface JwtPayload {
    sub: string;
    username: string;
    roles: Role[];
    businessId?: string;
    departmentId?: string;
    iat?: number;
    exp?: number;
  }
  