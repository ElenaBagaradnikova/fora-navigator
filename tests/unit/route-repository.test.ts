import { describe, expect, it } from "vitest";
import { InMemoryRouteSnapshotRepository } from "@/core/routes/in-memory-repository";
import { generateRoute } from "@/core/routes/engine";
import {
  createSyntheticRouteCase,
  SYNTHETIC_ROUTE_GENERATED_AT,
} from "@/tests/fixtures/route-case";
import { createSyntheticRouteRules } from "@/tests/fixtures/route-rules";

function createScenario() {
  const caseValue = createSyntheticRouteCase();
  const route = generateRoute({
    caseValue,
    rules: createSyntheticRouteRules(),
    routeId: "synthetic-route-v8",
    generatedAt: SYNTHETIC_ROUTE_GENERATED_AT,
  });
  const repository = new InMemoryRouteSnapshotRepository([caseValue]);

  return { caseValue, route, repository };
}

describe("RouteSnapshotRepository", () => {
  it("saves an immutable RouteV3 snapshot with its Case and provenance links", async () => {
    const { caseValue, route, repository } = createScenario();

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
    expect(stored).toMatchObject({
      caseId: caseValue.id,
      caseVersion: caseValue.version,
      jurisdiction: caseValue.currentJurisdiction,
      provenanceReferences: route.provenanceReferences,
    });
  });

  it("atomically marks Case.routeState current without changing Case.version", async () => {
    const { caseValue, route, repository } = createScenario();

    const result = await repository.saveRouteSnapshot({
      caseId: caseValue.id,
      expectedCaseVersion: caseValue.version,
      route,
    });
    const storedCase = await repository.getCase(caseValue.id);

    expect(result.caseValue.version).toBe(caseValue.version);
    expect(result.caseValue.routeState).toEqual({
      status: "current",
      needsRecalculation: false,
    });
    expect(storedCase).toEqual(result.caseValue);
  });

  it("rejects an optimistic concurrency conflict without partial writes", async () => {
    const { caseValue, route } = createScenario();
    const newerCase = {
      ...caseValue,
      version: caseValue.version + 1,
      updatedAt: "2026-10-03T16:00:00.000Z",
    };
    const repository = new InMemoryRouteSnapshotRepository([newerCase]);

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

  it("never overwrites an existing historical Route snapshot", async () => {
    const { caseValue, route, repository } = createScenario();
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

  it("does not mutate source Case or Route objects", async () => {
    const { caseValue, route, repository } = createScenario();
    const caseBefore = structuredClone(caseValue);
    const routeBefore = structuredClone(route);

    await repository.saveRouteSnapshot({
      caseId: caseValue.id,
      expectedCaseVersion: caseValue.version,
      route,
    });

    expect(caseValue).toEqual(caseBefore);
    expect(route).toEqual(routeBefore);
    expect(caseValue.routeState.status).toBe("stale");
  });

  it("requires the Route to match the exact current Case version", async () => {
    const { caseValue, route, repository } = createScenario();
    const mismatchedRoute = {
      ...route,
      caseVersion: route.caseVersion + 1,
    };

    await expect(repository.saveRouteSnapshot({
      caseId: caseValue.id,
      expectedCaseVersion: caseValue.version,
      route: mismatchedRoute,
    })).rejects.toMatchObject({
      code: "ROUTE_VERSION_MISMATCH",
    });
    expect(await repository.getRouteSnapshot(route.id)).toBeNull();
    expect((await repository.getCase(caseValue.id))?.routeState.status).toBe("stale");
  });

  it("is idempotent when the same save command is repeated", async () => {
    const { caseValue, route, repository } = createScenario();
    const command = {
      caseId: caseValue.id,
      expectedCaseVersion: caseValue.version,
      route,
    };

    const first = await repository.saveRouteSnapshot(command);
    const second = await repository.saveRouteSnapshot(command);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.routeSnapshot).toEqual(first.routeSnapshot);
    expect(await repository.listRouteSnapshots(caseValue.id)).toHaveLength(1);
    expect(second.caseValue.routeState.status).toBe("current");
  });

  it("does not escalate fact or verification status while publishing a Route", async () => {
    const { caseValue, route, repository } = createScenario();
    const factsBefore = structuredClone(caseValue.facts);

    const result = await repository.saveRouteSnapshot({
      caseId: caseValue.id,
      expectedCaseVersion: caseValue.version,
      route,
    });

    expect(result.caseValue.facts).toEqual(factsBefore);
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
