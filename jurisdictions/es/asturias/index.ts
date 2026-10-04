import { defineJurisdictionPack } from "@/core/jurisdictions/pack";
import { AsturiasRules } from "@/jurisdictions/es/asturias/rules";

export const AsturiasJurisdictionPack = defineJurisdictionPack({
  jurisdictionId: "ES-ASTURIAS",
  version: "0.1",
  displayName: "Asturias, Spain",
  geographicScope: {
    countryCode: "ES",
    regionCodes: ["ASTURIAS"],
    municipalities: [],
  },
  supportedDomains: [],
  sourceReferences: [],
  lifecycle: {
    status: "draft",
  },
  routeRules: AsturiasRules,
});
