import { z } from "zod";

const acceptMessageSchema = z.object({
  client_message_id: z.string().trim().min(1, "client message id is required"),
  content: z.string().trim().min(1, "message content must be a non-empty string"),
});

const assistantEventSchema = z.discriminatedUnion("event_type", [
  z.object({
    event_type: z.literal("message.assistant.delta"),
    turn_id: z.string().trim().min(1, "turn id is required"),
    delta: z.string().trim().min(1, "assistant delta must be a non-empty string"),
  }),
  z.object({
    event_type: z.literal("message.assistant.completed"),
    turn_id: z.string().trim().min(1, "turn id is required"),
    content: z.string().trim().min(1, "assistant content must be a non-empty string"),
  }),
]);

export function parseAcceptMessageInput(input: unknown) {
  return acceptMessageSchema.parse(input);
}

export function parseAssistantEventInput(input: unknown) {
  return assistantEventSchema.parse(input);
}
