import { InMemoryRouteSnapshotRepository } from "@/core/routes/in-memory-repository";
import { defineRouteRepositoryConformanceSuite } from "@/tests/conformance/route-repository.conformance";

defineRouteRepositoryConformanceSuite({
  adapterName: "InMemoryRouteSnapshotRepository",
  createHarness: (initialCases) => ({
    repository: new InMemoryRouteSnapshotRepository(initialCases),
  }),
});
