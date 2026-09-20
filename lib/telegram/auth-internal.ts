import { authenticateInternalApiRequest } from "@/lib/auth/internal-api";

export function authenticateInternalTelegramRequest(request: Request) {
  return authenticateInternalApiRequest(request);
}
