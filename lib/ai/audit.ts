import { administrativeKnowledge } from "@/lib/knowledge/asturias";
import { redactSensitiveText } from "@/lib/safety/redact";
import {
  ModelNavigationPlanSchema,
  getPreliminaryCaveat,
  type ModelNavigationPlan,
  type SourceReference,
  type UserCase,
} from "@/lib/schemas";

const forbiddenClaims = [
  /(?:мы\s+)?гарантируем/i,
  /вам\s+гарантирован(?:а|о|ы)?/i,
  /вы\s+точно\s+(?:получите|получаете)/i,
  /вам\s+положена\s+выплата/i,
  /(?:ми\s+)?гарантуємо/i,
  /вам\s+гарантован(?:а|о|і)?/i,
  /ви\s+точно\s+отримаєте/i,
  /\bwe\s+guarantee\b/i,
  /\byou\s+will\s+definitely\s+(?:receive|get)\b/i,
  /\byou\s+are\s+guaranteed\s+(?:a\s+)?(?:benefit|payment|status|service)\b/i,
  /\bgarantizamos\b/i,
  /\b(?:usted|tú)\s+recibirá?s?\s+con\s+seguridad\b/i,
  /(?:диагноз|діагноз|diagnosis|diagnóstico)\s*[:—-]/i,
  /назнач(?:ьте|аем)\s+(?:лечение|препарат)/i,
  /признач(?:те|аємо)\s+(?:лікування|препарат)/i,
  /\b(?:prescribe|prescribimos|recete)\s+(?:treatment|medication|tratamiento|medicamento)\b/i,
];

const sourceFields: Array<keyof SourceReference> = [
  "id",
  "title",
  "url",
  "sourceType",
  "jurisdiction",
  "lastVerifiedDate",
  "nextReviewDate",
  "verificationMethod",
  "contentOwner",
];

function assertUnique(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label}: повторяющийся идентификатор ${id}.`);
    seen.add(id);
  }
}

function assertKnownSourceIds(
  sourceIds: string[],
  owner: string,
  returnedSources: Map<string, SourceReference>,
  allowedSources: Map<string, SourceReference>,
) {
  for (const sourceId of sourceIds) {
    if (!returnedSources.has(sourceId) || !allowedSources.has(sourceId)) {
      throw new Error(`${owner} ссылается на неизвестный источник ${sourceId}.`);
    }
  }
}

function assertAcyclicDependencies(plan: ModelNavigationPlan) {
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(actionId: string) {
    if (visiting.has(actionId)) throw new Error(`Зависимости действий содержат цикл с шагом ${actionId}.`);
    if (visited.has(actionId)) return;

    const action = actions.get(actionId);
    if (!action) throw new Error(`Неизвестный шаг ${actionId}.`);
    visiting.add(actionId);
    for (const dependencyId of action.dependsOnActionIds) {
      if (dependencyId === actionId) throw new Error(`Шаг ${actionId} не может зависеть от самого себя.`);
      if (!actions.has(dependencyId)) {
        throw new Error(`Шаг ${actionId} зависит от неизвестного шага ${dependencyId}.`);
      }
      visit(dependencyId);
    }
    visiting.delete(actionId);
    visited.add(actionId);
  }

  for (const actionId of actions.keys()) visit(actionId);
}

export function auditModelPlan(
  input: unknown,
  expectedCase?: Pick<UserCase, "locale" | "urgency">,
): ModelNavigationPlan {
  const plan = ModelNavigationPlanSchema.parse(input);
  if (expectedCase && plan.locale !== expectedCase.locale) {
    throw new Error(`Язык плана ${plan.locale} не совпадает с выбранным языком ${expectedCase.locale}.`);
  }
  if (expectedCase && JSON.stringify(plan.urgency) !== JSON.stringify(expectedCase.urgency)) {
    throw new Error("Модель изменила результат детерминированной проверки срочности.");
  }

  assertUnique(plan.sources.map((source) => source.id), "Источники");
  assertUnique(plan.actions.map((action) => action.id), "Действия");
  assertUnique(plan.documents.map((document) => document.id), "Документы");
  assertUnique(plan.drafts.map((draft) => draft.id), "Черновики");
  assertUnique(plan.immediateFocus, "Ближайшие фокусы");

  const allowedSources = new Map(administrativeKnowledge.map((entry) => [entry.source.id, entry.source]));
  const returnedSources = new Map(plan.sources.map((source) => [source.id, source]));

  for (const source of plan.sources) {
    const canonical = allowedSources.get(source.id);
    if (!canonical || sourceFields.some((field) => source[field] !== canonical[field])) {
      throw new Error(`Источник ${source.id} не совпадает с разрешённой базой знаний.`);
    }
  }

  const documents = new Set(plan.documents.map((document) => document.id));
  const actionTitles = new Set(plan.actions.map((action) => action.title));
  for (const focus of plan.immediateFocus) {
    if (!actionTitles.has(focus)) throw new Error(`Ближайший фокус не соответствует действию: ${focus}.`);
  }

  for (const action of plan.actions) {
    assertKnownSourceIds(action.verification.sourceIds, `Шаг ${action.id}`, returnedSources, allowedSources);
    for (const documentId of action.documentIds) {
      if (!documents.has(documentId)) {
        throw new Error(`Шаг ${action.id} ссылается на неизвестный документ ${documentId}.`);
      }
    }

    if (action.verification.sourceIds.length === 0 && !action.verification.needsHumanVerification) {
      throw new Error(`Шаг ${action.id} без источника должен требовать ручной проверки.`);
    }

    if (action.verification.confidence !== "high" && action.verification.caveat !== getPreliminaryCaveat(plan.locale)) {
      throw new Error(`Шаг ${action.id} с неопределённостью не содержит обязательную оговорку.`);
    }
  }

  for (const document of plan.documents) {
    assertKnownSourceIds(document.verification.sourceIds, `Документ ${document.id}`, returnedSources, allowedSources);
    if (document.verification.sourceIds.length === 0 && !document.verification.needsHumanVerification) {
      throw new Error(`Документ ${document.id} без источника должен требовать ручной проверки.`);
    }
    if (document.verification.confidence !== "high" && document.verification.caveat !== getPreliminaryCaveat(plan.locale)) {
      throw new Error(`Документ ${document.id} с неопределённостью не содержит обязательную оговорку.`);
    }
  }

  assertAcyclicDependencies(plan);

  if (plan.urgency.stopNormalFlow && plan.actions.length > 0) {
    throw new Error("Экстренный план не должен продолжать административный маршрут.");
  }

  const allText = JSON.stringify(plan);
  if (redactSensitiveText(allText).detected.length > 0) {
    throw new Error("План содержит контактные данные или идентификатор документа.");
  }
  if (forbiddenClaims.some((pattern) => pattern.test(allText))) {
    throw new Error("План содержит запрещённое обещание, диагноз или назначение.");
  }

  return plan;
}
