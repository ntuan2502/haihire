import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import { correlationStorage } from "../middleware/correlation-id.middleware";

@Injectable({ scope: Scope.TRANSIENT })
export class CorrelationLogger extends ConsoleLogger {
  protected override formatMessage(
    _logLevel: string,
    message: unknown,
    _pidMessage: string,
    _formattedLogLevel: string,
    context?: string,
  ): string {
    const store = correlationStorage.getStore();
    const requestId = store?.requestId || "no-correlation";
    return `[${requestId}] ${context ? `[${context}] ` : ""}${message}\n`;
  }
}
