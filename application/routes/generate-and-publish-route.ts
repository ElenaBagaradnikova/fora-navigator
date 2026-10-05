import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";
import {
  generateRouteFromJurisdictionPack,
  type JurisdictionPack,
  type JurisdictionPackProvenance,
} from "@/core/jurisdictions/pack";
import {
  RouteRepositoryError,
  type RouteRepositoryErrorCode,
  type RouteSnapshotRepository,
  type SaveRouteSnapshotResult,
} from "@/core/routes/repository";

export type GenerateAndPublishRouteInput = {
  caseValue: CaseV3;
  jurisdictionPack: JurisdictionPack;
  routeId: string;
  generatedAt: string;
};

export type GenerateAndPublishRouteSuccess = SaveRouteSnapshotResult & {
  ok: true;
  jurisdictionPackProvenance: Readonly<JurisdictionPackProvenance>;
};

export type GenerateAndPublishRouteError =
  | {
      code: "INVALID_CASE";
      message: string;
    }
  | {
      code: "JURISDICTION_PACK_NOT_APPLICABLE";
      message: string;
      caseId: string;
      jurisdictionPackProvenance: Readonly<JurisdictionPackProvenance>;
    }
  | {
      code: "ROUTE_GENERATION_FAILED";
      message: string;
    }
  | {
      code: "ROUTE_PUBLICATION_REJECTED";
      message: string;
      repositoryCode: RouteRepositoryErrorCode;
    }
  | {
      code: "ROUTE_PUBLICATION_FAILED";
      message: string;
    };

export type GenerateAndPublishRouteFailure = {
  ok: false;
  error: GenerateAndPublishRouteError;
};

export type GenerateAndPublishRouteResult =
  | GenerateAndPublishRouteSuccess
  | GenerateAndPublishRouteFailure;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown application error";
}

export class GenerateAndPublishRouteUseCase {
  constructor(private readonly repository: RouteSnapshotRepository) {}

  async execute(
    input: GenerateAndPublishRouteInput,
  ): Promise<GenerateAndPublishRouteResult> {
    let caseValue: CaseV3;
    try {
      caseValue = CaseV3Schema.parse(structuredClone(input.caseValue));
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "INVALID_CASE",
          message: errorMessage(error),
        },
      };
    }

    if (!input.jurisdictionPack.appliesTo(caseValue)) {
      return {
        ok: false,
        error: {
          code: "JURISDICTION_PACK_NOT_APPLICABLE",
          message: `Jurisdiction pack ${input.jurisdictionPack.jurisdictionId}@${input.jurisdictionPack.version} does not apply to Case ${caseValue.id}`,
          caseId: caseValue.id,
          jurisdictionPackProvenance: input.jurisdictionPack.provenance,
        },
      };
    }

    let route;
    try {
      route = generateRouteFromJurisdictionPack({
        caseValue,
        jurisdictionPack: input.jurisdictionPack,
        routeId: input.routeId,
        generatedAt: input.generatedAt,
      });
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "ROUTE_GENERATION_FAILED",
          message: errorMessage(error),
        },
      };
    }

    try {
      const publication = await this.repository.saveRouteSnapshot({
        caseId: caseValue.id,
        expectedCaseVersion: caseValue.version,
        route,
      });

      return {
        ok: true,
        ...publication,
        jurisdictionPackProvenance: input.jurisdictionPack.provenance,
      };
    } catch (error) {
      if (error instanceof RouteRepositoryError) {
        return {
          ok: false,
          error: {
            code: "ROUTE_PUBLICATION_REJECTED",
            message: error.message,
            repositoryCode: error.code,
          },
        };
      }

      return {
        ok: false,
        error: {
          code: "ROUTE_PUBLICATION_FAILED",
          message: errorMessage(error),
        },
      };
    }
  }
}
