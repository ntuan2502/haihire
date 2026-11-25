import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

import { PermissionResolverService } from "./permission-resolver.service";
import { RolesGuard } from "./roles.guard";
import { UserSecurityService } from "./user-security.service";
import { MinioModule } from "../minio/minio.module";
import { env } from "../config/env";

@Global()
@Module({
  imports: [
    MinioModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      global: true,
      secret: env.JWT_SECRET,
      signOptions: {
        expiresIn: "15m",
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PermissionResolverService,
    RolesGuard,
    UserSecurityService,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    PermissionResolverService,
    RolesGuard,
    UserSecurityService,
  ],
})
export class AuthModule {}
