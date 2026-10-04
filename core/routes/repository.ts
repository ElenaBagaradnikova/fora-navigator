import type { CaseV3 } from "@/core/case/schema";
import type { RouteV3 } from "@/core/routes/schema";

export type Immutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly Immutable<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: Immutable<T[Key]> }
      : T;

export type SaveRouteSnapshotCommand = {
  caseId: string;
  expectedCaseVersion: number;
  route: RouteV3;
};

export type SaveRouteSnapshotResult = {
  caseValue: CaseV3;
  routeSnapshot: Immutable<RouteV3>;
  created: boolean;
};

export type RouteRepositoryErrorCode =
  | "CASE_NOT_FOUND"
  | "CASE_VERSION_CONFLICT"
  | "ROUTE_CASE_MISMATCH"
  | "ROUTE_VERSION_MISMATCH"
  | "ROUTE_JURISDICTION_MISMATCH"
  | "ROUTE_NOT_CURRENT"
  | "ROUTE_SNAPSHOT_CONFLICT";

export class RouteRepositoryError extends Error {
  constructor(
    readonly code: RouteRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RouteRepositoryError";
  }
}

export interface RouteSnapshotRepository {
  getCase(caseId: string): Promise<CaseV3 | null>;
  getRouteSnapshot(routeId: string): Promise<Immutable<RouteV3> | null>;
  listRouteSnapshots(caseId: string): Promise<readonly Immutable<RouteV3>[]>;
  saveRouteSnapshot(
    command: SaveRouteSnapshotCommand,
  ): Promise<SaveRouteSnapshotResult>;
}
