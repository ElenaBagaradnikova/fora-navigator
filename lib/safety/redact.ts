export type RedactionResult = {
  text: string;
  detected: Array<"email" | "phone" | "document_number">;
};

const patterns: Array<{
  type: RedactionResult["detected"][number];
  pattern: RegExp;
  replacement: string;
}> = [
  {
    type: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[ЭЛЕКТРОННАЯ ПОЧТА СКРЫТА]",
  },
  {
    type: "phone",
    pattern: /(?<!\d)(?:\+?34[\s-]?)?(?:6|7|8|9)\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/g,
    replacement: "[ТЕЛЕФОН СКРЫТ]",
  },
  {
    type: "document_number",
    pattern: /\b[XYZ]\s?\d{7}\s?[A-Z]\b/gi,
    replacement: "[НОМЕР ДОКУМЕНТА СКРЫТ]",
  },
  {
    type: "document_number",
    pattern: /\b(?:паспорт|passport|NIE|DNI)\s*(?:№|no\.?|number|номер)?\s*[:#-]?\s*[A-ZА-Я0-9-]{6,18}\b/gi,
    replacement: "[НОМЕР ДОКУМЕНТА СКРЫТ]",
  },
];

export function redactSensitiveText(value: string): RedactionResult {
  let text = value;
  const detected = new Set<RedactionResult["detected"][number]>();

  for (const item of patterns) {
    if (item.pattern.test(text)) {
      detected.add(item.type);
      item.pattern.lastIndex = 0;
      text = text.replace(item.pattern, item.replacement);
    }
  }

  return { text, detected: [...detected] };
}
