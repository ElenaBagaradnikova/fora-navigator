import { z } from "zod";

export const FactVerificationStatusSchema = z.enum([
  "extracted",
  "user_confirmed",
  "professional_confirmed",
  "authority_confirmed",
  "disputed",
]);

export type FactVerificationStatus = z.infer<
  typeof FactVerificationStatusSchema
>;
