import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

interface TenantRequest {
  user?: {
    organizationId?: string | null;
  };
}

/**
 * Propagates the authenticated tenant's organizationId into PrismaService's
 * AsyncLocalStorage context across the RxJS execution lifecycle of each request.
 */
@Injectable()
export class TenantRlsInterceptor implements NestInterceptor {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const tenantOrgId = req?.user?.organizationId ?? null;

    return new Observable((subscriber) =>
      this.prisma.runWithTenantContext(tenantOrgId, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
