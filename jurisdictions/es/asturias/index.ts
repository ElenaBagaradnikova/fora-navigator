import { z } from "zod";

export const JurisdictionPackDescriptorSchema = z.object({
  id: z.string().min(3).max(120),
  version: z.string().min(1).max(40),
  countryCode: z.string().length(2),
  regionCode: z.string().min(2).max(80).optional(),
  displayName: z.string().min(2).max(160),
  status: z.enum(["draft", "validated", "retired"]),
  reviewedAt: z.string().date().optional(),
}).strict();

export type JurisdictionPackDescriptor = z.infer<
  typeof JurisdictionPackDescriptorSchema
>;

export const AsturiasJurisdictionPack = JurisdictionPackDescriptorSchema.parse({
  id: "ES-ASTURIAS",
  version: "0.1",
  countryCode: "ES",
  regionCode: "ASTURIAS",
  displayName: "Asturias, Spain",
  status: "draft",
});
