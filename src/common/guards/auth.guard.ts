import { 
    Injectable, 
    ExecutionContext, 
    UnauthorizedException,
    CanActivate
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { JwtService } from '@nestjs/jwt';
  import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
  
  @Injectable()
  export class AuthGuard implements CanActivate {
    constructor(
      private jwtService: JwtService,
      private reflector: Reflector,
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // Check if the endpoint is marked as public
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );
  
      if (isPublic) {
        return true;
      }
  
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
  
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET
        });
  
        // Attach user to request object
        request['user'] = payload;
  
        // Check roles if specified
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
          ROLES_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );
  
        if (!requiredRoles) {
          return true;
        }
  
        return requiredRoles.some((role) => payload.roles?.includes(role));
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    }
  
    private extractTokenFromHeader(request: Request): string | undefined {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
  }