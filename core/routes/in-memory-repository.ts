import { z } from "zod";
import { CaseV3Schema, type CaseV3 } from "@/core/case/schema";
import {
  RouteRepositoryError,
  type Immutable,
  type RouteSnapshotRepository,
  type SaveRouteSnapshotCommand,
  type SaveRouteSnapshotResult,
} from "@/core/routes/repository";
import { RouteV3Schema, type RouteV3 } from "@/core/routes/schema";

const SaveRouteSnapshotCommandMetadataSchema = z.object({
  caseId: z.string().min(1).max(160),
  expectedCaseVersion: z.number().int().positive(),
}).strict();

type RepositoryState = {
  cases: ReadonlyMap<string, CaseV3>;
  routeSnapshots: ReadonlyMap<string, Immutable<RouteV3>>;
  routeIdByCaseVersion: ReadonlyMap<string, string>;
};

function caseVersionKey(caseId: string, caseVersion: number): string {
  return `${caseId}:v${caseVersion}`;
}

function deepFreeze<T>(value: T): Immutable<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value as Immutable<T>;
}

function immutableRouteSnapshot(route: RouteV3): Immutable<RouteV3> {
  return deepFreeze(structuredClone(RouteV3Schema.parse(route)));
}

function sameSnapshot(
  left: Immutable<RouteV3>,
  right: Immutable<RouteV3>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameJurisdiction(
  left: CaseV3["currentJurisdiction"],
  right: RouteV3["jurisdiction"],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class InMemoryRouteSnapshotRepository
implements RouteSnapshotRepository {
  private state: RepositoryState;

  constructor(initialCases: readonly CaseV3[]) {
    const cases = new Map<string, CaseV3>();
    initialCases.forEach((caseInput) => {
      const caseValue = CaseV3Schema.parse(structuredClone(caseInput));
      if (cases.has(caseValue.id)) {
        throw new Error(`Duplicate initial Case id: ${caseValue.id}`);
      }
      cases.set(caseValue.id, caseValue);
    });
    this.state = {
      cases,
      routeSnapshots: new Map(),
      routeIdByCaseVersion: new Map(),
    };
  }

  async getCase(caseId: string): Promise<CaseV3 | null> {
    const caseValue = this.state.cases.get(caseId);
    return caseValue ? structuredClone(caseValue) : null;
  }

  async getRouteSnapshot(
    routeId: string,
  ): Promise<Immutable<RouteV3> | null> {
    const snapshot = this.state.routeSnapshots.get(routeId);
    return snapshot
      ? immutableRouteSnapshot(snapshot as RouteV3)
      : null;
  }

  async listRouteSnapshots(
    caseId: string,
  ): Promise<readonly Immutable<RouteV3>[]> {
    return [...this.state.routeSnapshots.values()]
      .filter((route) => route.caseId === caseId)
      .sort((left, right) => left.caseVersion - right.caseVersion)
      .map((route) => immutableRouteSnapshot(route as RouteV3));
  }

  async saveRouteSnapshot(
    command: SaveRouteSnapshotCommand,
  ): Promise<SaveRouteSnapshotResult> {
    const metadata = SaveRouteSnapshotCommandMetadataSchema.parse({
      caseId: command.caseId,
      expectedCaseVersion: command.expectedCaseVersion,
    });
    const route = RouteV3Schema.parse(structuredClone(command.route));
    const currentCase = this.state.cases.get(metadata.caseId);

    if (!currentCase) {
      throw new RouteRepositoryError(
        "CASE_NOT_FOUND",
        `Case ${metadata.caseId} was not found`,
      );
    }
    if (currentCase.version !== metadata.expectedCaseVersion) {
      throw new RouteRepositoryError(
        "CASE_VERSION_CONFLICT",
        `Expected Case version ${metadata.expectedCaseVersion}, received ${currentCase.version}`,
      );
    }
    if (route.caseId !== currentCase.id) {
      throw new RouteRepositoryError(
        "ROUTE_CASE_MISMATCH",
        "Route snapshot belongs to a different Case",
      );
    }
    if (route.caseVersion !== currentCase.version) {
      throw new RouteRepositoryError(
        "ROUTE_VERSION_MISMATCH",
        "Route snapshot was generated for a different Case version",
      );
    }
    if (!sameJurisdiction(currentCase.currentJurisdiction, route.jurisdiction)) {
      throw new RouteRepositoryError(
        "ROUTE_JURISDICTION_MISMATCH",
        "Route snapshot jurisdiction does not match the Case jurisdiction",
      );
    }
    if (route.status !== "current" || route.needsRecalculation) {
      throw new RouteRepositoryError(
        "ROUTE_NOT_CURRENT",
        "Only a current Route that does not require recalculation can be saved",
      );
    }

    const candidateSnapshot = immutableRouteSnapshot(route);
    const existingById = this.state.routeSnapshots.get(route.id);
    const versionKey = caseVersionKey(route.caseId, route.caseVersion);
    const existingRouteIdForVersion = this.state.routeIdByCaseVersion.get(versionKey);

    if (existingById && !sameSnapshot(existingById, candidateSnapshot)) {
      throw new RouteRepositoryError(
        "ROUTE_SNAPSHOT_CONFLICT",
        `Route snapshot ${route.id} already exists with different content`,
      );
    }
    if (existingRouteIdForVersion && existingRouteIdForVersion !== route.id) {
      throw new RouteRepositoryError(
        "ROUTE_SNAPSHOT_CONFLICT",
        `Case version ${route.caseVersion} already has Route snapshot ${existingRouteIdForVersion}`,
      );
    }

    const nextCase = CaseV3Schema.parse({
      ...currentCase,
      routeState: {
        status: "current",
        needsRecalculation: false,
      },
    });
    const nextCases = new Map(this.state.cases);
    const nextSnapshots = new Map(this.state.routeSnapshots);
    const nextRoutesByVersion = new Map(this.state.routeIdByCaseVersion);
    nextCases.set(nextCase.id, nextCase);
    nextSnapshots.set(route.id, existingById ?? candidateSnapshot);
    nextRoutesByVersion.set(versionKey, route.id);

    this.state = {
      cases: nextCases,
      routeSnapshots: nextSnapshots,
      routeIdByCaseVersion: nextRoutesByVersion,
    };

    return {
      caseValue: structuredClone(nextCase),
      routeSnapshot: immutableRouteSnapshot(
        nextSnapshots.get(route.id) as RouteV3,
      ),
      created: !existingById,
    };
  }
}
