import { z } from "zod";

const threadInputSchema = z.object({
  client_request_id: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20_000),
});

const threadResponseSchema = z.object({
  decision: z.enum(["approved", "denied"]),
});

export function parseThreadInput(body: unknown) {
  return threadInputSchema.parse(body);
}

export function parseThreadResponse(body: unknown) {
  return threadResponseSchema.parse(body);
}
