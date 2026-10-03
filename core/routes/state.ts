import { z } from "zod";

export const RouteStateSchema = z.object({
  status: z.enum(["not_generated", "current", "stale"]),
  needsRecalculation: z.boolean(),
  invalidatedAt: z.string().datetime().optional(),
  invalidationReason: z.enum(["case_fact_changed"]).optional(),
}).strict().superRefine((routeState, context) => {
  if (routeState.status === "stale") {
    if (!routeState.needsRecalculation) {
      context.addIssue({
        code: "custom",
        path: ["needsRecalculation"],
        message: "A stale route must require recalculation",
      });
    }
    if (!routeState.invalidatedAt) {
      context.addIssue({
        code: "custom",
        path: ["invalidatedAt"],
        message: "A stale route must record when it was invalidated",
      });
    }
    if (!routeState.invalidationReason) {
      context.addIssue({
        code: "custom",
        path: ["invalidationReason"],
        message: "A stale route must record why it was invalidated",
      });
    }
  } else if (routeState.needsRecalculation) {
    context.addIssue({
      code: "custom",
      path: ["needsRecalculation"],
      message: "Only a stale route can require recalculation",
    });
  }
});

export type RouteState = z.infer<typeof RouteStateSchema>;
