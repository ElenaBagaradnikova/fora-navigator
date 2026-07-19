import type { UserCase } from "@/lib/schemas";
import type { AppLocale } from "@/lib/i18n";

export type DemoCase = {
  slug: string;
  label: string;
  short: string;
  userCase: UserCase;
};

const standardUrgency = {
  level: "standard" as const,
  signals: [],
  stopNormalFlow: false,
  message: "Признаков чрезвычайной ситуации в ответах не обнаружено.",
};

export const demoCases: DemoCase[] = [
  {
    slug: "teen-autism-oviedo",
    label: "Подросток, 16 лет",
    short: "Аутизм · Oviedo · нужна медицина, школа и признание инвалидности",
    userCase: {
      id: "demo-autism-001",
      locale: "ru",
      country: "ES",
      region: "Asturias",
      municipality: "Oviedo",
      narrative:
        "Мы недавно переехали в Овьедо. С нами подросток 16 лет с расстройством аутистического спектра. Испанского признания инвалидности пока нет. Я плохо говорю по-испански и не понимаю, с чего начать: медицина, школа или документы.",
      household: [
        {
          id: "member-teen",
          role: "child",
          ageRange: "12-17",
          supportNeeds: ["аутизм", "образовательная поддержка", "предсказуемая коммуникация"],
        },
        { id: "member-caregiver", role: "caregiver", ageRange: "adult", supportNeeds: [] },
      ],
      immigrationStatus: "temporary_protection",
      healthcareCoverage: "unknown",
      registeredAtAddress: "yes",
      diagnosticDocuments: "originals",
      spanishLevel: "basic",
      mainProblem: "Понять первые шаги для медицины, обучения и признания степени инвалидности.",
      needs: [
        { category: "healthcare", priority: "high", detail: "Получить доступ к первичной медицине" },
        {
          category: "disability_recognition",
          priority: "high",
          detail: "Начать reconocimiento del grado de discapacidad",
        },
        { category: "education", priority: "high", detail: "Организовать продолжение обучения" },
        { category: "language", priority: "normal", detail: "Подготовить обращения на испанском" },
      ],
      urgency: standardUrgency,
    },
  },
  {
    slug: "young-adult-intellectual",
    label: "Молодой взрослый, 22 года",
    short: "Ментальная инвалидность · Avilés · неизвестный статус и нет документов",
    userCase: {
      id: "demo-adult-002",
      locale: "ru",
      country: "ES",
      region: "Asturias",
      municipality: "Avilés",
      narrative:
        "Мы живём в Авилесе и сопровождаем молодого взрослого 22 лет с ментальной инвалидностью. Иммиграционный статус пока уточняется, медицинского покрытия не знаем. Часть медицинских документов потеряна. Нужна понятная очередь действий и контакт с социальной службой.",
      household: [
        {
          id: "member-adult",
          role: "young_adult",
          ageRange: "18-25",
          supportNeeds: ["поддержка принятия решений", "простая коммуникация"],
        },
        { id: "member-caregiver", role: "caregiver", ageRange: "adult", supportNeeds: [] },
      ],
      immigrationStatus: "unknown",
      healthcareCoverage: "unknown",
      registeredAtAddress: "yes",
      diagnosticDocuments: "none",
      spanishLevel: "none",
      mainProblem: "Восстановить медицинскую документацию и понять доступные социальные маршруты.",
      needs: [
        { category: "healthcare", priority: "high", detail: "Уточнить доступ к первичной медицине" },
        { category: "social", priority: "high", detail: "Получить первичную социальную консультацию" },
        { category: "documents", priority: "high", detail: "Восстановить медицинские отчёты" },
        { category: "language", priority: "normal", detail: "Нужна языковая поддержка" },
      ],
      urgency: standardUrgency,
    },
  },
  {
    slug: "child-mobility",
    label: "Ребёнок, 9 лет",
    short: "Двигательные нарушения · Gijón · школа и доступная среда",
    userCase: {
      id: "demo-mobility-003",
      locale: "ru",
      country: "ES",
      region: "Asturias",
      municipality: "Gijón",
      narrative:
        "Семья переехала в Хихон с ребёнком 9 лет с двигательными нарушениями. Есть иностранные медицинские заключения, но мы не знаем, нужен ли перевод или апостиль. Главная задача — школа с подходящей поддержкой и непрерывность медицинского наблюдения.",
      household: [
        {
          id: "member-child",
          role: "child",
          ageRange: "6-11",
          supportNeeds: ["доступная среда", "двигательная поддержка", "образовательные адаптации"],
        },
        { id: "member-caregiver", role: "caregiver", ageRange: "adult", supportNeeds: [] },
      ],
      immigrationStatus: "residence_or_visa",
      healthcareCoverage: "yes",
      registeredAtAddress: "yes",
      diagnosticDocuments: "copies",
      spanishLevel: "basic",
      mainProblem: "Найти школьный маршрут с поддержкой и подготовить иностранные медицинские документы.",
      needs: [
        { category: "education", priority: "high", detail: "Начать школьное устройство и оценку поддержки" },
        { category: "healthcare", priority: "high", detail: "Продолжить медицинское наблюдение" },
        { category: "documents", priority: "normal", detail: "Уточнить перевод и легализацию документов" },
      ],
      urgency: standardUrgency,
    },
  },
];

const translatedDemoContent: Record<Exclude<AppLocale, "ru">, Array<{
  label: string;
  short: string;
  narrative: string;
  mainProblem: string;
  supportNeeds: string[];
  needDetails: string[];
}>> = {
  uk: [
    {
      label: "Підліток, 16 років",
      short: "Аутизм · Oviedo · потрібні медицина, школа та визнання інвалідності",
      narrative: "Ми нещодавно переїхали до Ов'єдо. З нами підліток 16 років із розладом аутистичного спектра. Іспанського визнання інвалідності поки немає. Я погано розмовляю іспанською і не розумію, з чого почати: медицина, школа чи документи.",
      mainProblem: "Зрозуміти перші кроки для медицини, навчання та визнання ступеня інвалідності.",
      supportNeeds: ["аутизм", "освітня підтримка", "передбачувана комунікація"],
      needDetails: ["Отримати доступ до первинної медицини", "Почати визнання ступеня інвалідності", "Організувати продовження навчання", "Підготувати звернення іспанською"],
    },
    {
      label: "Молода доросла людина, 22 роки",
      short: "Інтелектуальна інвалідність · Avilés · статус невідомий і документів немає",
      narrative: "Ми живемо в Авілесі та супроводжуємо молоду дорослу людину 22 років з інтелектуальною інвалідністю. Міграційний статус ще уточнюється, про медичне покриття не знаємо. Частину медичних документів втрачено. Потрібна зрозуміла черговість дій і контакт із соціальною службою.",
      mainProblem: "Відновити медичну документацію та зрозуміти доступні соціальні маршрути.",
      supportNeeds: ["підтримка прийняття рішень", "проста комунікація"],
      needDetails: ["Уточнити доступ до первинної медицини", "Отримати первинну соціальну консультацію", "Відновити медичні звіти", "Потрібна мовна підтримка"],
    },
    {
      label: "Дитина, 9 років",
      short: "Порушення мобільності · Gijón · школа та доступне середовище",
      narrative: "Сім'я переїхала до Хіхона з дитиною 9 років із порушеннями мобільності. Є іноземні медичні висновки, але ми не знаємо, чи потрібен переклад або апостиль. Головне завдання — школа з належною підтримкою та безперервне медичне спостереження.",
      mainProblem: "Знайти шкільний маршрут із підтримкою та підготувати іноземні медичні документи.",
      supportNeeds: ["доступне середовище", "підтримка мобільності", "освітні адаптації"],
      needDetails: ["Почати зарахування до школи й оцінку підтримки", "Продовжити медичне спостереження", "Уточнити переклад і легалізацію документів"],
    },
  ],
  en: [
    {
      label: "Teenager, age 16",
      short: "Autism · Oviedo · healthcare, school and disability recognition",
      narrative: "We recently moved to Oviedo with a 16-year-old teenager on the autism spectrum. There is no Spanish disability recognition yet. I speak little Spanish and do not know where to start: healthcare, school or documents.",
      mainProblem: "Understand the first steps for healthcare, education and disability-degree recognition.",
      supportNeeds: ["autism", "education support", "predictable communication"],
      needDetails: ["Access primary healthcare", "Start disability-degree recognition", "Arrange continued education", "Prepare requests in Spanish"],
    },
    {
      label: "Young adult, age 22",
      short: "Intellectual disability · Avilés · status unclear and documents missing",
      narrative: "We live in Avilés and support a 22-year-old young adult with an intellectual disability. Their immigration status is still unclear and we do not know whether healthcare coverage is active. Some medical records were lost. We need a clear order of actions and contact with social services.",
      mainProblem: "Restore medical records and understand the available social-service pathways.",
      supportNeeds: ["supported decision-making", "plain communication"],
      needDetails: ["Confirm access to primary healthcare", "Get an initial social-services consultation", "Restore medical reports", "Arrange language support"],
    },
    {
      label: "Child, age 9",
      short: "Mobility impairment · Gijón · school and accessibility",
      narrative: "A family moved to Gijón with a 9-year-old child with mobility impairments. They have foreign medical reports but do not know whether translation or an apostille is required. Their priorities are a school with appropriate support and continuity of healthcare.",
      mainProblem: "Find a supported school pathway and prepare the foreign medical documents.",
      supportNeeds: ["accessible environment", "mobility support", "education adjustments"],
      needDetails: ["Start school placement and support assessment", "Continue healthcare follow-up", "Check translation and legalisation requirements"],
    },
  ],
};

export function getDemoCases(locale: AppLocale): DemoCase[] {
  if (locale === "ru") return demoCases.map((item) => ({ ...item, userCase: { ...item.userCase, locale } }));
  return demoCases.map((item, index) => {
    const content = translatedDemoContent[locale][index];
    return {
      ...item,
      label: content.label,
      short: content.short,
      userCase: {
        ...item.userCase,
        locale,
        narrative: content.narrative,
        mainProblem: content.mainProblem,
        household: item.userCase.household.map((member) =>
          member.role === "caregiver" ? member : { ...member, supportNeeds: content.supportNeeds },
        ),
        needs: item.userCase.needs.map((need, needIndex) => ({ ...need, detail: content.needDetails[needIndex] })),
      },
    };
  });
}

export function createBlankCase(narrative: string, locale: AppLocale = "ru"): UserCase {
  return {
    id: `local-${Date.now()}`,
    locale,
    country: "ES",
    region: "Asturias",
    municipality: "Oviedo",
    narrative,
    household: [
      { id: "supported-person", role: "child", ageRange: "12-17", supportNeeds: ["требуется уточнить"] },
      { id: "caregiver", role: "caregiver", ageRange: "adult", supportNeeds: [] },
    ],
    immigrationStatus: "unknown",
    healthcareCoverage: "unknown",
    registeredAtAddress: "unknown",
    diagnosticDocuments: "unknown",
    spanishLevel: "basic",
    mainProblem: narrative.slice(0, 500),
    needs: [{ category: "social", priority: "normal", detail: "Определить подходящий маршрут" }],
    urgency: standardUrgency,
  };
}
