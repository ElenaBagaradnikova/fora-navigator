import { describe, expect, it } from "vitest";
import type { CaseV3 } from "@/core/case/schema";
import { generateRoute } from "@/core/routes/engine";
import type { RouteSnapshotRepository } from "@/core/routes/repository";
import {
  createSyntheticRouteCase,
  SYNTHETIC_ROUTE_GENERATED_AT,
} from "@/tests/fixtures/route-case";
import { createSyntheticRouteRules } from "@/tests/fixtures/route-rules";

type Awaitable<T> = T | Promise<T>;

export type RouteRepositoryConformanceHarness = {
  repository: RouteSnapshotRepository;
  cleanup?: () => Awaitable<void>;
};

export type RouteRepositoryConformanceConfig = {
  adapterName: string;
  createHarness: (
    initialCases: readonly CaseV3[],
  ) => Awaitable<RouteRepositoryConformanceHarness>;
};

function createSyntheticScenario() {
  const caseValue = createSyntheticRouteCase();
  const route = generateRoute({
    caseValue,
    rules: createSyntheticRouteRules(),
    routeId: "synthetic-route-v8",
    generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
  });

  return { caseValue, route };
}

export function defineRouteRepositoryConformanceSuite(
  config: RouteRepositoryConformanceConfig,
): void {
  async function withRepository<T>(
    initialCases: readonly CaseV3[],
    run: (repository: RouteSnapshotRepository) => Promise<T>,
  ): Promise<T> {
    const harness = await config.createHarness(initialCases);
    try {
      return await run(harness.repository);
    } finally {
      await harness.cleanup?.();
    }
  }

  describe(`${config.adapterName} RouteSnapshotRepository conformance`, () => {
    it("saves an immutable snapshot with Case, jurisdiction, and provenance links", async () => {
      const { caseValue, route } = createSyntheticScenario();

      await withRepository([caseValue], async (repository) => {
        const result = await repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route,
        });
        const stored = await repository.getRouteSnapshot(route.id);

        expect(result.created).toBe(true);
        expect(result.routeSnapshot).toEqual(route);
        expect(stored).toEqual(route);
        expect(Object.isFrozen(result.routeSnapshot)).toBe(true);
        expect(Object.isFrozen(result.routeSnapshot.steps)).toBe(true);
        expect(Object.isFrozen(result.routeSnapshot.steps[0])).toBe(true);
        expect(stored).not.toBeNull();
        expect(Object.isFrozen(stored)).toBe(true);
        expect(stored).toMatchObject({
          caseId: caseValue.id,
          caseVersion: caseValue.version,
          jurisdiction: caseValue.currentJurisdiction,
          provenanceReferences: route.provenanceReferences,
        });
      });
    });

    it("atomically publishes the Route and marks Case.routeState current", async () => {
      const { caseValue, route } = createSyntheticScenario();

      await withRepository([caseValue], async (repository) => {
        const result = await repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route,
        });
        const storedCase = await repository.getCase(caseValue.id);
        const storedRoute = await repository.getRouteSnapshot(route.id);

        expect(result.caseValue.version).toBe(caseValue.version);
        expect(result.caseValue.routeState).toEqual({
          status: "current",
          needsRecalculation: false,
        });
        expect(storedCase).toEqual(result.caseValue);
        expect(storedRoute).toEqual(route);
      });
    });

    it("rejects optimistic concurrency conflicts without partial state", async () => {
      const { caseValue, route } = createSyntheticScenario();
      const newerCase = {
        ...caseValue,
        version: caseValue.version + 1,
        updatedAt: "2026-10-03T16:00:00.000Z",
      };

      await withRepository([newerCase], async (repository) => {
        await expect(repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: route.caseVersion,
          route,
        })).rejects.toMatchObject({
          code: "CASE_VERSION_CONFLICT",
        });
        expect(await repository.getRouteSnapshot(route.id)).toBeNull();
        expect(await repository.getCase(caseValue.id)).toEqual(newerCase);
      });
    });

    it("never overwrites a historical Route snapshot", async () => {
      const { caseValue, route } = createSyntheticScenario();

      await withRepository([caseValue], async (repository) => {
        await repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route,
        });
        const conflictingRoute = {
          ...route,
          generatedAt: "2026-10-03T15:01:00.000Z",
        };

        await expect(repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route: conflictingRoute,
        })).rejects.toMatchObject({
          code: "ROUTE_SNAPSHOT_CONFLICT",
        });
        expect(await repository.getRouteSnapshot(route.id)).toEqual(route);
        expect(await repository.listRouteSnapshots(caseValue.id)).toHaveLength(1);
      });
    });

    it("does not mutate source Case or Route objects", async () => {
      const { caseValue, route } = createSyntheticScenario();
      const caseBefore = structuredClone(caseValue);
      const routeBefore = structuredClone(route);

      await withRepository([caseValue], async (repository) => {
        await repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route,
        });

        expect(caseValue).toEqual(caseBefore);
        expect(route).toEqual(routeBefore);
        expect(caseValue.routeState.status).toBe("stale");
      });
    });

    it("rejects a Route for a different Case version without partial state", async () => {
      const { caseValue, route } = createSyntheticScenario();
      const mismatchedRoute = {
        ...route,
        caseVersion: route.caseVersion + 1,
      };

      await withRepository([caseValue], async (repository) => {
        await expect(repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route: mismatchedRoute,
        })).rejects.toMatchObject({
          code: "ROUTE_VERSION_MISMATCH",
        });
        expect(await repository.getRouteSnapshot(route.id)).toBeNull();
        expect(await repository.getCase(caseValue.id)).toEqual(caseValue);
      });
    });

    it("is idempotent when the same publication is repeated", async () => {
      const { caseValue, route } = createSyntheticScenario();
      const command = {
        caseId: caseValue.id,
        expectedCaseVersion: caseValue.version,
        route,
      };

      await withRepository([caseValue], async (repository) => {
        const first = await repository.saveRouteSnapshot(command);
        const second = await repository.saveRouteSnapshot(command);

        expect(first.created).toBe(true);
        expect(second.created).toBe(false);
        expect(second.routeSnapshot).toEqual(first.routeSnapshot);
        expect(await repository.listRouteSnapshots(caseValue.id)).toHaveLength(1);
        expect(second.caseValue.routeState).toEqual({
          status: "current",
          needsRecalculation: false,
        });
      });
    });

    it("preserves facts and verification statuses without escalation", async () => {
      const { caseValue, route } = createSyntheticScenario();
      const factsBefore = structuredClone(caseValue.facts);

      await withRepository([caseValue], async (repository) => {
        const result = await repository.saveRouteSnapshot({
          caseId: caseValue.id,
          expectedCaseVersion: caseValue.version,
          route,
        });
        const storedCase = await repository.getCase(caseValue.id);

        expect(result.caseValue.facts).toEqual(factsBefore);
        expect(storedCase?.facts).toEqual(factsBefore);
        expect(result.caseValue.facts).toHaveLength(1);
        expect(result.caseValue.facts[0]).toMatchObject({
          type: "historical_diagnosis_recorded",
          verificationStatus: "user_confirmed",
        });
        expect(result.caseValue.facts.some((fact) => [
          "professional_confirmed",
          "authority_confirmed",
        ].includes(fact.verificationStatus))).toBe(false);
      });
    });
  });
}
