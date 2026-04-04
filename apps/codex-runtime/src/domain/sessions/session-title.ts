import { z } from "zod";

const createSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "session title must be 1-200 non-empty characters")
    .max(200, "session title must be 1-200 non-empty characters"),
});

export function parseCreateSessionInput(input: unknown) {
  return createSessionSchema.parse(input);
}
