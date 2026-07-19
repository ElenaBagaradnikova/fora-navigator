import { administrativeKnowledge, knowledgeSources } from "@/lib/knowledge/asturias";
import {
  FinalNavigationPlanSchema,
  preliminaryCaveat,
  type ActionStep,
  type ClarifyingQuestion,
  type DraftDocument,
  type FinalNavigationPlan,
  type RequiredDocument,
  type UserCase,
  type VerificationStatus,
} from "@/lib/schemas";
import type { AppLocale } from "@/lib/i18n";

const verified = (sourceId: string, human = true): VerificationStatus => ({
  confidence: "high",
  needsHumanVerification: human,
  sourceIds: [sourceId],
  ...(human ? { caveat: "Проверьте актуальные условия и применимость к вашему делу на официальной странице." } : {}),
});

const needsCheck = (sourceIds: string[] = []): VerificationStatus => ({
  confidence: "medium",
  needsHumanVerification: true,
  caveat: preliminaryCaveat,
  sourceIds,
});

function buildDocuments(userCase: UserCase): RequiredDocument[] {
  return [
    {
      id: "doc-identity",
      name: "Документ, удостоверяющий личность",
      status: "verify",
      appliesTo: ["health", "disability", "education", "social"],
      note: "Не вводите и не храните номер документа в FORA Navigator. Конкретный принимаемый документ уточните у органа.",
      verification: needsCheck(["src-health-tsi", "src-disability"]),
    },
    {
      id: "doc-address-registration",
      name: "Подтверждение проживания / empadronamiento",
      status: userCase.registeredAtAddress === "yes" ? "available" : "obtain",
      appliesTo: ["health", "disability", "education", "social"],
      note:
        userCase.registeredAtAddress === "yes"
          ? "Отмечено семьёй как имеющееся. Возьмите актуальную копию; требования зависят от процедуры."
          : "Уточните в Ayuntamiento порядок регистрации и документ, подтверждающий место проживания.",
      verification: needsCheck(["src-health-tsi", "src-social"]),
    },
    {
      id: "doc-medical-reports",
      name: "Медицинские и/или психологические отчёты",
      status:
        userCase.diagnosticDocuments === "none"
          ? "obtain"
          : userCase.diagnosticDocuments === "unknown"
            ? "verify"
            : "translate_recommended",
      appliesTo: ["health", "disability", "education"],
      note:
        "Для признания степени инвалидности официальный список предусматривает подтверждающие отчёты. Принимаемый формат и необходимость официального перевода уточняются для конкретной процедуры.",
      verification: verified("src-disability"),
    },
    {
      id: "doc-family-link",
      name: "Документ о родстве или представительстве",
      status: "verify",
      appliesTo: ["disability", "education", "health"],
      note: "Для несовершеннолетнего может потребоваться подтверждение родства/представительства; проверьте официальный список.",
      verification: verified("src-disability"),
    },
    {
      id: "doc-school-records",
      name: "Документы о предыдущем обучении",
      status: "translate_recommended",
      appliesTo: ["education"],
      note: "Соберите имеющиеся табели, заключения и планы поддержки. Требования к переводу уточните в школе или комиссии escolarización.",
      verification: needsCheck(["src-school"]),
    },
    {
      id: "doc-legalisation-check",
      name: "Проверка апостиля / легализации",
      status: "apostille_maybe",
      appliesTo: ["disability", "education"],
      note:
        "Апостиль или легализация нужны не всегда. Это зависит от страны, вида документа и процедуры; сначала запросите письменное подтверждение принимающего органа.",
      verification: verified("src-legalisation"),
    },
  ];
}

function healthAction(userCase: UserCase): ActionStep {
  const destination =
    userCase.healthcareCoverage === "yes"
      ? "Centro de Salud по месту проживания"
      : "Административная служба Centro de Salud по месту проживания";

  return {
    id: "action-health",
    timeframe: "now",
    priority: 1,
    title: "Уточнить доступ к первичной медицине",
    action:
      userCase.healthcareCoverage === "yes"
        ? "Свяжитесь с Centro de Salud по месту проживания, подтвердите действующую Tarjeta Sanitaria Individual и запросите порядок первичной записи."
        : "Обратитесь в административную службу Centro de Salud и опишите статус проживания и отсутствие/неясность покрытия. Попросите определить применимый официальный путь к медицинской помощи и TSI.",
    why: "Без подтверждённого медицинского маршрута нельзя безопасно планировать наблюдение и получать необходимые испанские отчёты.",
    destination,
    owner: "family",
    documentIds: ["doc-identity", "doc-address-registration", "doc-medical-reports"],
    dependsOnActionIds: [],
    expectedResult: "Письменный или устный список применимых шагов и документов; при наличии права — начало оформления/проверки TSI.",
    failureModes: [
      "Путь зависит от страхового и миграционного статуса — не соглашайтесь с универсальным ответом без проверки вашего случая.",
      "Онлайн-запись может быть недоступна без действующей TSI.",
    ],
    channel: "both",
    verification: verified(userCase.healthcareCoverage === "no" ? "src-health-foreign" : "src-health-tsi"),
  };
}

function disabilityAction(): ActionStep {
  return {
    id: "action-disability",
    timeframe: "seven_days",
    priority: 2,
    title: "Подготовить первичную заявку на признание степени инвалидности",
    action:
      "Откройте официальную процедуру CERT0001T01, скачайте актуальную форму и сопоставьте список документов с тем, что уже есть. До подачи уточните, какие иностранные отчёты будут приняты.",
    why: "Испанское административное признание — отдельная процедура; иностранный диагноз сам по себе не гарантирует признание степени.",
    destination: "Servicio de valoración de la discapacidad del Principado de Asturias / электронный реестр",
    owner: "family",
    documentIds: ["doc-identity", "doc-address-registration", "doc-medical-reports", "doc-family-link", "doc-legalisation-check"],
    dependsOnActionIds: ["action-health"],
    expectedResult: "Проверенный комплект для подачи или список недостающих документов, подтверждённый компетентным органом.",
    failureModes: [
      "Медицинские документы могут не описывать актуальные функциональные ограничения.",
      "Перевод, апостиль или легализация могут зависеть от происхождения документа и конкретного требования.",
    ],
    channel: "both",
    verification: verified("src-disability"),
  };
}

function educationAction(): ActionStep {
  return {
    id: "action-education",
    timeframe: "now",
    priority: 1,
    title: "Запросить школьный маршрут и оценку поддержки",
    action:
      "Свяжитесь с выбранным государственным/субсидируемым центром или комиссией escolarización и сообщите возраст, недавний переезд и наличие особых образовательных потребностей. Попросите письменно объяснить процедуру приёма в текущий момент и оценку NEE.",
    why: "Для ученика, который присоединяется к системе после переезда, важны одновременно распределение места и оценка необходимой поддержки.",
    destination: "Centro educativo или Comisión de Escolarización соответствующего муниципалитета",
    owner: "family",
    documentIds: ["doc-identity", "doc-address-registration", "doc-family-link", "doc-school-records", "doc-medical-reports"],
    dependsOnActionIds: [],
    expectedResult: "Подтверждённый канал подачи, перечень документов и следующий контакт по оценке образовательных потребностей.",
    failureModes: [
      "Обычный календарь приёма может не полностью описывать позднее зачисление после переезда.",
      "Административное признание инвалидности и образовательная оценка NEE — не одно и то же.",
    ],
    channel: "both",
    verification: verified("src-school"),
  };
}

function socialAction(userCase: UserCase): ActionStep {
  return {
    id: "action-social",
    timeframe: "seven_days",
    priority: 3,
    title: "Запросить первичную консультацию социальных служб",
    action:
      `Обратитесь в муниципальные социальные службы ${userCase.municipality}. Кратко опишите состав семьи, потребности и уже начатые медицинские/образовательные шаги; попросите определить специалиста первичного сопровождения.`,
    why: "Социальный работник помогает связать муниципальные и региональные маршруты, но не заменяет решение каждого отдельного органа.",
    destination: `Servicios Sociales муниципалитета ${userCase.municipality}`,
    owner: "family",
    documentIds: ["doc-identity", "doc-address-registration"],
    dependsOnActionIds: ["action-status"],
    expectedResult: "Назначенный канал консультации и список местных ресурсов, применимых к ситуации семьи.",
    failureModes: [
      "Контакты и зоны обслуживания меняются — найдите актуальный центр по месту проживания.",
      "Консультация не гарантирует назначения выплаты или услуги.",
    ],
    channel: "verify",
    verification:
      userCase.municipality === "Oviedo" ? verified("src-social") : needsCheck(["src-social"]),
  };
}

function statusAction(userCase: UserCase): ActionStep {
  const statusGuidance: Record<UserCase["immigrationStatus"], { action: string; expected: string }> = {
    eu_eea_swiss: {
      action: "Сверьте действующий документ гражданина ЕС/ЕЭЗ/Швейцарии или члена семьи и дату его действия. Используйте точное название документа при обращении в медицинскую и социальную службы.",
      expected: "Зафиксировано точное название действующего документа и срок его действия.",
    },
    residence_or_visa: {
      action: "Сверьте тип и срок действия визы или разрешения на проживание. Не отправляйте номер документа: для маршрута достаточно его вида и действительности.",
      expected: "Подтверждены вид разрешения и его действительность без сохранения номера документа.",
    },
    asylum_applicant: {
      action: "Сверьте действующий документ заявителя на международную защиту и дату следующего продления. Для вопросов о системе приёма используйте официальный канал Protección Internacional.",
      expected: "Понятно, какой документ подтверждает поданное заявление и когда его нужно продлить.",
    },
    international_protection: {
      action: "Сверьте решение или документ, подтверждающий статус беженца либо субсидиарную защиту. Уточняйте права и услуги как получатель международной защиты, а не как заявитель.",
      expected: "Точно определён предоставленный вид международной защиты и применимый официальный маршрут.",
    },
    temporary_protection: {
      action: "Сверьте документ Protección Temporal и действительность TIE. Временная защита для перемещённых из Украины — отдельный режим; не отмечайте её как статус беженца, если такого решения нет.",
      expected: "Подтверждены временная защита, действительность документа и следующий официальный канал.",
    },
    no_current_authorization: {
      action: "Запросите конфиденциальную консультацию по extranjería или международной защите у компетентной службы. Не делайте вывод о правах только из отсутствия действующей карточки.",
      expected: "Получен официальный или профессиональный канал для определения возможного пути легализации/защиты.",
    },
    unknown: {
      action: "Посмотрите только название действующего документа, не вводя его номер, и сопоставьте его с вариантами: гражданство ЕС, виза/резиденция, заявление на защиту, предоставленная защита или временная защита. Если остаются сомнения, запросите консультацию.",
      expected: "Определено точное название документа или сформулирован вопрос для компетентной консультации.",
    },
  };
  const guidance = statusGuidance[userCase.immigrationStatus];

  return {
    id: "action-status",
    timeframe: "now",
    priority: 1,
    title: "Подтвердить вид статуса проживания или защиты",
    action: guidance.action,
    why: "Статус заявителя, предоставленная международная защита, временная защита и обычное разрешение на проживание открывают разные административные маршруты.",
    destination: "Документ человека и официальный канал Extranjería / Protección Internacional",
    owner: "family",
    documentIds: ["doc-identity"],
    dependsOnActionIds: [],
    expectedResult: guidance.expected,
    failureModes: [
      "Назвать человека беженцем без решения о предоставлении соответствующего статуса.",
      "Смешать временную защиту с заявлением на международную защиту.",
    ],
    channel: "verify",
    verification: verified(
      userCase.immigrationStatus === "temporary_protection" ? "src-temporary-protection" : "src-international-protection",
    ),
  };
}

function documentAction(): ActionStep {
  return {
    id: "action-documents",
    timeframe: "month",
    priority: 4,
    title: "Проверить иностранные документы по каждой процедуре",
    action:
      "Составьте таблицу «документ → принимающий орган → нужен ли перевод → нужен ли апостиль/легализация». Запрашивайте требования отдельно у медицинского, образовательного и социального маршрута.",
    why: "Универсального требования к апостилю и присяжному переводу для всех документов нет.",
    destination: "Принимающий орган по каждой процедуре; при необходимости — официальный переводчик/консульская служба",
    owner: "family",
    documentIds: ["doc-medical-reports", "doc-school-records", "doc-legalisation-check"],
    dependsOnActionIds: [],
    expectedResult: "Проверенный список только необходимых переводов и формальностей без лишних затрат.",
    failureModes: [
      "Перевести документы до проверки и оплатить ненужную услугу.",
      "Принять общую рекомендацию за требование конкретного органа.",
    ],
    channel: "online",
    verification: verified("src-legalisation"),
  };
}

function buildDrafts(userCase: UserCase): DraftDocument[] {
  const supported = userCase.household.find((member) => member.role !== "caregiver");
  const isTeen = supported?.ageRange === "12-17";
  const ageRu = isTeen ? "16 лет" : "возраст указан в приложенных данных";
  const ageUk = isTeen ? "16 років" : "вік зазначено в доданих даних";
  const ageEn = isTeen ? "age 16" : "age provided in the attached information";
  const ageEs = isTeen ? "16 años" : "edad indicada en los datos adjuntos";
  const needs = supported?.supportNeeds.join(", ") || "особые потребности";

  return [
    {
      id: "draft-health",
      kind: "healthcare",
      title: "Запрос в центр здоровья",
      recipient: "Administración del Centro de Salud",
      subjectRu: "Запрос о доступе к медицинскому обслуживанию",
      subjectUk: "Запит щодо доступу до медичного обслуговування",
      subjectEn: "Request about access to healthcare",
      subjectEs: "Consulta sobre acceso a la asistencia sanitaria",
      bodyRu: `Здравствуйте. Мы недавно проживаем в ${userCase.municipality}, Asturias. В нашей семье есть человек (${ageRu}) с потребностями: ${needs}. Просим сообщить, какой порядок доступа к первичной медицинской помощи применяется в нашей ситуации и какие документы нужно предоставить. Медицинское покрытие: ${userCase.healthcareCoverage === "yes" ? "есть" : "требуется уточнить"}. Просим по возможности ответить письменно.`,
      bodyUk: `Добрий день. Ми нещодавно проживаємо в ${userCase.municipality}, Asturias. У нашій сім'ї є людина (${ageUk}) з такими потребами підтримки: ${needs}. Просимо повідомити, який порядок доступу до первинної медичної допомоги застосовується в нашій ситуації та які документи потрібно надати. Медичне покриття ${userCase.healthcareCoverage === "yes" ? "підтверджено" : "потрібно уточнити"}. Просимо, за можливості, відповісти письмово.`,
      bodyEn: `Hello. We recently began living in ${userCase.municipality}, Asturias. A person in our family (${ageEn}) has the following support needs: ${needs}. Please tell us which pathway to primary healthcare applies in our situation and which documents we should provide. Healthcare coverage ${userCase.healthcareCoverage === "yes" ? "is confirmed" : "needs to be confirmed"}. If possible, please reply in writing.`,
      bodyEs: `Buenos días. Residimos recientemente en ${userCase.municipality}, Asturias. En nuestra familia hay una persona (${ageEs}) con las siguientes necesidades de apoyo: ${needs}. Les agradeceríamos que nos indicaran qué procedimiento de acceso a la atención primaria corresponde a nuestra situación y qué documentos debemos presentar. La cobertura sanitaria ${userCase.healthcareCoverage === "yes" ? "está reconocida" : "debe confirmarse"}. Si es posible, solicitamos una respuesta por escrito.`,
      placeholders: [],
      requiresUserReview: true,
    },
    {
      id: "draft-school",
      kind: "school",
      title: "Запрос о школьном устройстве",
      recipient: "Centro educativo / Comisión de Escolarización",
      subjectRu: "Запрос о зачислении и образовательной поддержке",
      subjectUk: "Запит щодо зарахування та освітньої підтримки",
      subjectEn: "Request about school enrolment and education support",
      subjectEs: "Consulta sobre escolarización y apoyos educativos",
      bodyRu: `Здравствуйте. Наша семья недавно переехала в ${userCase.municipality}. Мы ищем школьный маршрут для ребёнка/подростка (${ageRu}) с особыми образовательными потребностями: ${needs}. Просим сообщить порядок подачи заявления сейчас, список документов и контакт для оценки необходимых мер поддержки. Имеющиеся иностранные документы готовы предоставить после уточнения формата и требований к переводу.`,
      bodyUk: `Добрий день. Наша сім'я нещодавно переїхала до ${userCase.municipality}. Ми шукаємо шкільний маршрут для дитини/підлітка (${ageUk}) з особливими освітніми потребами: ${needs}. Просимо повідомити чинний порядок подання заяви, перелік документів і контакт для оцінювання необхідної підтримки. Наявні іноземні документи готові надати після уточнення формату та вимог до перекладу.`,
      bodyEn: `Hello. Our family recently moved to ${userCase.municipality}. We need a school pathway for a child or teenager (${ageEn}) with specific education support needs: ${needs}. Please tell us the current application procedure, required documents and contact for assessment of support. We can provide the available foreign documents after the format and translation requirements are confirmed.`,
      bodyEs: `Buenos días. Nuestra familia se ha trasladado recientemente a ${userCase.municipality}. Necesitamos orientación para la escolarización de un/a menor (${ageEs}) con necesidades específicas de apoyo educativo: ${needs}. Les rogamos que nos indiquen el procedimiento de solicitud aplicable en este momento, la documentación necesaria y el contacto para valorar los apoyos educativos. Podemos aportar la documentación extranjera disponible una vez confirmados el formato y los requisitos de traducción.`,
      placeholders: [],
      requiresUserReview: true,
    },
    {
      id: "draft-social",
      kind: "social_service",
      title: "Краткое обращение в социальную службу",
      recipient: "Servicios Sociales",
      subjectRu: "Запрос первичной консультации для семьи",
      subjectUk: "Запит на первинну консультацію для сім'ї",
      subjectEn: "Request for an initial family consultation",
      subjectEs: "Solicitud de primera orientación para una familia",
      bodyRu: `Здравствуйте. Мы недавно проживаем в ${userCase.municipality} и сопровождаем человека с инвалидностью или особыми потребностями. Сейчас нам нужна первичная навигация между медицинскими, образовательными и административными процедурами, а также языковая поддержка. Просим сообщить, как получить первичную консультацию социального работника и какие сведения подготовить. Мы не направляем номера личных документов по электронной почте.`,
      bodyUk: `Добрий день. Ми нещодавно проживаємо в ${userCase.municipality} і підтримуємо людину з інвалідністю або особливими потребами. Нам потрібна первинна навігація між медичними, освітніми й адміністративними процедурами, а також мовна підтримка. Просимо повідомити, як отримати первинну консультацію соціального працівника та які відомості підготувати. Ми не надсилаємо номери особистих документів електронною поштою.`,
      bodyEn: `Hello. We recently began living in ${userCase.municipality} and support a person with a disability or specific needs. We need initial navigation across healthcare, education and administrative procedures, as well as language support. Please tell us how to request an initial social-work consultation and what information to prepare. We do not send personal identity-document numbers by email.`,
      bodyEs: `Buenos días. Residimos recientemente en ${userCase.municipality} y acompañamos a una persona con discapacidad o necesidades específicas. Necesitamos una primera orientación entre los procedimientos sanitarios, educativos y administrativos, así como apoyo lingüístico. Les rogamos que nos indiquen cómo solicitar una primera entrevista con trabajo social y qué información debemos preparar. No enviamos números de documentos personales por correo electrónico.`,
      placeholders: [],
      requiresUserReview: true,
    },
  ];
}

function missingInformation(userCase: UserCase): ClarifyingQuestion[] {
  const items: ClarifyingQuestion[] = [];
  if (userCase.immigrationStatus === "unknown") {
    items.push({
      id: "missing-status",
      field: "immigrationStatus",
      prompt: "Какой документ подтверждает текущий статус проживания?",
      reason: "Статус может менять медицинский и социальный маршрут.",
      kind: "single",
      required: false,
    });
  }
  if (userCase.healthcareCoverage === "unknown") {
    items.push({
      id: "missing-health",
      field: "healthcareCoverage",
      prompt: "Есть ли подтверждение права на государственную медицинскую помощь?",
      reason: "От этого зависит путь к Tarjeta Sanitaria Individual.",
      kind: "single",
      required: false,
    });
  }
  return items;
}

type ActionTranslation = Pick<ActionStep, "title" | "action" | "why" | "destination" | "expectedResult" | "failureModes">;
type DocumentTranslation = Pick<RequiredDocument, "name" | "note">;

function translatePlan(plan: FinalNavigationPlan, locale: AppLocale, userCase: UserCase): FinalNavigationPlan {
  if (locale === "ru") return plan;

  const isUk = locale === "uk";
  const usedFallback = plan.safetyNotes.some((note) => note.startsWith("Демонстрационный режим:"));
  const statusActions: Record<UserCase["immigrationStatus"], string> = isUk
    ? {
        eu_eea_swiss: "Звірте чинний документ громадянина ЄС/ЄЕЗ/Швейцарії або члена сім'ї та строк його дії. Використовуйте точну назву документа у зверненнях.",
        residence_or_visa: "Звірте тип і строк дії візи або дозволу на проживання. Для маршруту достатньо виду документа — не вводьте його номер.",
        asylum_applicant: "Звірте чинний документ заявника на міжнародний захист і дату наступного продовження. Для системи прийому використовуйте офіційний канал Protección Internacional.",
        international_protection: "Звірте рішення або документ про статус біженця чи субсидіарний захист. Уточнюйте послуги як отримувач захисту, а не як заявник.",
        temporary_protection: "Звірте документ Protección Temporal і чинність TIE. Тимчасовий захист для переміщених з України — окремий режим і не є статусом біженця без відповідного рішення.",
        no_current_authorization: "Запросіть конфіденційну консультацію з extranjería або міжнародного захисту. Не робіть висновок про права лише через відсутність чинної картки.",
        unknown: "Подивіться лише назву чинного документа, не вводячи номер, і зіставте її з варіантами у цій анкеті. Якщо сумніви залишаються, запросіть консультацію.",
      }
    : {
        eu_eea_swiss: "Check the current EU/EEA/Swiss citizen or family-member document and its expiry date. Use the document's exact name when contacting services.",
        residence_or_visa: "Check the type and validity of the visa or residence permit. The document type is enough for this pathway — do not enter its number.",
        asylum_applicant: "Check the current international-protection applicant document and its next renewal date. Use the official Protección Internacional channel for reception-system questions.",
        international_protection: "Check the decision or document confirming refugee status or subsidiary protection. Ask about services as a beneficiary, not as an applicant.",
        temporary_protection: "Check the Protección Temporal document and TIE validity. Temporary protection for people displaced from Ukraine is a separate regime and is not refugee status without a corresponding decision.",
        no_current_authorization: "Request confidential advice on extranjería or international protection from a competent service. Do not infer rights solely from the absence of a current card.",
        unknown: "Look only at the name of the current document, without entering its number, and match it to the options in this questionnaire. If it remains unclear, request advice.",
      };

  const actions: Record<string, ActionTranslation> = isUk
    ? {
        "action-status": {
          title: "Підтвердити вид статусу проживання або захисту",
          action: statusActions[userCase.immigrationStatus],
          why: "Статус заявника, наданий міжнародний захист, тимчасовий захист і звичайний дозвіл на проживання відкривають різні адміністративні маршрути.",
          destination: "Документ людини та офіційний канал Extranjería / Protección Internacional",
          expectedResult: "Визначено точну назву документа або сформульовано запитання для компетентної консультації.",
          failureModes: ["Назвати людину біженцем без рішення про надання цього статусу.", "Змішати тимчасовий захист із заявою на міжнародний захист."],
        },
        "action-health": {
          title: "Уточнити доступ до первинної медицини",
          action: userCase.healthcareCoverage === "yes" ? "Зв'яжіться з Centro de Salud за місцем проживання, підтвердьте чинну Tarjeta Sanitaria Individual і попросіть порядок первинного запису." : "Зверніться до адміністрації Centro de Salud, опишіть вид документа про проживання та відсутність або невизначеність покриття. Попросіть визначити офіційний шлях до медичної допомоги й TSI.",
          why: "Без підтвердженого медичного маршруту не можна безпечно планувати спостереження й отримувати необхідні іспанські звіти.",
          destination: userCase.healthcareCoverage === "yes" ? "Centro de Salud за місцем проживання" : "Адміністративна служба Centro de Salud за місцем проживання",
          expectedResult: "Перелік застосовних кроків і документів; за наявності права — початок оформлення або перевірки TSI.",
          failureModes: ["Шлях залежить від статусу й покриття — універсальна відповідь може не підходити.", "Онлайн-запис може бути недоступним без чинної TSI."],
        },
        "action-education": {
          title: "Запросити шкільний маршрут і оцінювання підтримки",
          action: "Зв'яжіться зі школою або Comisión de Escolarización і повідомте вік, нещодавній переїзд та особливі освітні потреби. Попросіть письмово пояснити чинну процедуру зарахування й оцінювання NEE.",
          why: "Після переїзду потрібно одночасно визначити місце навчання й необхідну підтримку.",
          destination: "Centro educativo або Comisión de Escolarización відповідного муніципалітету",
          expectedResult: "Підтверджений канал подання, перелік документів і наступний контакт щодо оцінювання підтримки.",
          failureModes: ["Звичайний календар прийому може не описувати пізнє зарахування після переїзду.", "Адміністративне визнання інвалідності й освітня оцінка NEE — різні процедури."],
        },
        "action-disability": {
          title: "Підготувати первинну заяву на визнання ступеня інвалідності",
          action: "Відкрийте офіційну процедуру CERT0001T01, завантажте чинну форму й зіставте перелік документів із наявними. До подання уточніть, які іноземні звіти приймуть.",
          why: "Іспанське адміністративне визнання є окремою процедурою; іноземний діагноз сам по собі не гарантує ступінь.",
          destination: "Servicio de valoración de la discapacidad del Principado de Asturias / електронний реєстр",
          expectedResult: "Перевірений комплект для подання або підтверджений перелік відсутніх документів.",
          failureModes: ["Звіти можуть не описувати актуальні функціональні обмеження.", "Переклад, апостиль або легалізація залежать від походження документа й вимог процедури."],
        },
        "action-social": {
          title: "Запросити первинну консультацію соціальних служб",
          action: `Зверніться до муніципальних соціальних служб ${userCase.municipality}. Коротко опишіть склад сім'ї, потреби й уже розпочаті кроки; попросіть визначити спеціаліста первинного супроводу.`,
          why: "Соціальний працівник допомагає пов'язати муніципальні й регіональні маршрути, але не замінює рішення окремих органів.",
          destination: `Servicios Sociales муніципалітету ${userCase.municipality}`,
          expectedResult: "Призначений канал консультації та перелік місцевих ресурсів, застосовних до ситуації.",
          failureModes: ["Контакти й зони обслуговування змінюються — перевірте центр за місцем проживання.", "Консультація не гарантує виплату або послугу."],
        },
        "action-documents": {
          title: "Перевірити іноземні документи для кожної процедури",
          action: "Складіть таблицю «документ → орган → чи потрібен переклад → чи потрібен апостиль/легалізація». Запитуйте вимоги окремо для кожного маршруту.",
          why: "Універсальної вимоги щодо апостиля й присяжного перекладу для всіх документів немає.",
          destination: "Орган, що приймає документ; за потреби — офіційний перекладач або консульська служба",
          expectedResult: "Перевірений перелік лише необхідних перекладів і формальностей без зайвих витрат.",
          failureModes: ["Оплатити непотрібний переклад до перевірки.", "Сприйняти загальну рекомендацію як вимогу конкретного органу."],
        },
      }
    : {
        "action-status": {
          title: "Confirm the type of residence or protection status",
          action: statusActions[userCase.immigrationStatus],
          why: "Applicant status, granted international protection, temporary protection and an ordinary residence permit lead to different administrative pathways.",
          destination: "The person's document and the official Extranjería / Protección Internacional channel",
          expectedResult: "The exact document name is identified, or a clear question is ready for competent advice.",
          failureModes: ["Calling someone a refugee without a decision granting that status.", "Confusing temporary protection with an international-protection application."],
        },
        "action-health": {
          title: "Confirm access to primary healthcare",
          action: userCase.healthcareCoverage === "yes" ? "Contact the local Centro de Salud, confirm the active Tarjeta Sanitaria Individual and ask how to book the first appointment." : "Contact the administration desk at the local Centro de Salud, describe the residence document and the absent or unclear coverage. Ask them to identify the official pathway to healthcare and a TSI.",
          why: "A confirmed healthcare pathway is needed before planning follow-up and obtaining the Spanish reports required by other procedures.",
          destination: userCase.healthcareCoverage === "yes" ? "Local Centro de Salud" : "Administration desk at the local Centro de Salud",
          expectedResult: "A list of applicable steps and documents; where entitled, the start of TSI registration or verification.",
          failureModes: ["The pathway depends on status and coverage, so a generic answer may not apply.", "Online booking may be unavailable without an active TSI."],
        },
        "action-education": {
          title: "Request a school pathway and support assessment",
          action: "Contact a school or the relevant Comisión de Escolarización. State the age, recent move and specific education needs, and ask for the current enrolment procedure and NEE assessment in writing.",
          why: "After a move, school placement and assessment of support need to be addressed together.",
          destination: "A local Centro educativo or Comisión de Escolarización",
          expectedResult: "A confirmed application channel, document list and next contact for support assessment.",
          failureModes: ["The standard admissions calendar may not cover late enrolment after a move.", "Administrative disability recognition and an education NEE assessment are different procedures."],
        },
        "action-disability": {
          title: "Prepare an initial disability-degree application",
          action: "Open the official CERT0001T01 procedure, download the current form and compare its document list with what is available. Before filing, confirm which foreign reports will be accepted.",
          why: "Spanish administrative recognition is a separate procedure; a foreign diagnosis does not by itself guarantee a recognised degree.",
          destination: "Servicio de valoración de la discapacidad del Principado de Asturias / electronic registry",
          expectedResult: "A checked filing pack or an authority-confirmed list of missing documents.",
          failureModes: ["Reports may not describe current functional limitations.", "Translation, apostille or legalisation depends on the document's origin and the procedure."],
        },
        "action-social": {
          title: "Request an initial social-services consultation",
          action: `Contact municipal social services in ${userCase.municipality}. Briefly describe the household, needs and steps already started, and ask for an initial support professional.`,
          why: "A social worker can connect municipal and regional pathways but does not replace each authority's decision.",
          destination: `Servicios Sociales in ${userCase.municipality}`,
          expectedResult: "A consultation channel and a list of local resources that may apply.",
          failureModes: ["Contacts and catchment areas change — verify the local centre.", "A consultation does not guarantee a benefit or service."],
        },
        "action-documents": {
          title: "Check foreign documents for each procedure",
          action: "Make a table: document → receiving authority → translation needed? → apostille/legalisation needed? Ask each pathway separately.",
          why: "There is no universal apostille or sworn-translation requirement for every document.",
          destination: "The receiving authority; if needed, a sworn translator or consular service",
          expectedResult: "A checked list of only the necessary translations and formalities, avoiding unnecessary expense.",
          failureModes: ["Paying for a translation before confirming it is needed.", "Treating general guidance as a specific authority requirement."],
        },
      };

  const documents: Record<string, DocumentTranslation> = isUk
    ? {
        "doc-identity": { name: "Документ, що посвідчує особу", note: "Не вводьте й не зберігайте номер документа у FORA Navigator. Уточніть прийнятний документ у відповідному органі." },
        "doc-address-registration": { name: "Підтвердження проживання / empadronamiento", note: userCase.registeredAtAddress === "yes" ? "Сім'я зазначила, що документ є. Візьміть актуальну копію; вимоги залежать від процедури." : "Уточніть в Ayuntamiento порядок реєстрації та потрібне підтвердження проживання." },
        "doc-medical-reports": { name: "Медичні та/або психологічні звіти", note: "Для визнання ступеня інвалідності потрібні підтвердні звіти. Формат і потребу в офіційному перекладі уточнюють для конкретної процедури." },
        "doc-family-link": { name: "Документ про спорідненість або представництво", note: "Для неповнолітнього може знадобитися підтвердження спорідненості або представництва; перевірте офіційний перелік." },
        "doc-school-records": { name: "Документи про попереднє навчання", note: "Зберіть табелі, висновки й плани підтримки. Вимоги до перекладу уточніть у школі або Comisión de Escolarización." },
        "doc-legalisation-check": { name: "Перевірка апостиля / легалізації", note: "Апостиль або легалізація потрібні не завжди. Спочатку отримайте письмове підтвердження органу, що приймає документ." },
      }
    : {
        "doc-identity": { name: "Identity document", note: "Do not enter or store its number in FORA Navigator. Confirm which document is accepted by the relevant authority." },
        "doc-address-registration": { name: "Proof of residence / empadronamiento", note: userCase.registeredAtAddress === "yes" ? "The family marked this as available. Take a current copy; requirements differ by procedure." : "Ask the Ayuntamiento about registration and the accepted proof of residence." },
        "doc-medical-reports": { name: "Medical and/or psychological reports", note: "Disability-degree recognition requires supporting reports. Confirm the accepted format and any official translation for the specific procedure." },
        "doc-family-link": { name: "Proof of family relationship or representation", note: "For a minor, proof of relationship or representation may be required; check the official list." },
        "doc-school-records": { name: "Previous education records", note: "Gather available reports, assessments and support plans. Confirm translation requirements with the school or Comisión de Escolarización." },
        "doc-legalisation-check": { name: "Apostille / legalisation check", note: "An apostille or legalisation is not always required. First obtain written confirmation from the receiving authority." },
      };

  const translatedActions = plan.actions.map((action) => ({
    ...action,
    ...actions[action.id],
    verification: {
      ...action.verification,
      ...(action.verification.caveat ? { caveat: isUk ? "Перевірте актуальні умови й застосовність до вашої справи на офіційній сторінці." : "Check the current conditions and whether they apply to your case on the official page." } : {}),
    },
  }));

  const translatedDrafts = plan.drafts.map((draft) => ({
    ...draft,
    title: isUk
      ? ({ "draft-health": "Запит до центру здоров'я", "draft-school": "Запит щодо школи", "draft-social": "Коротке звернення до соціальної служби" }[draft.id] || draft.title)
      : ({ "draft-health": "Request to a health centre", "draft-school": "School placement request", "draft-social": "Short request to social services" }[draft.id] || draft.title),
  }));

  return {
    ...plan,
    locale,
    caseSummary: isUk
      ? `Сім'я перебуває в ${userCase.municipality}, Asturias, і підтримує людину з такими потребами: ${userCase.household.filter((member) => member.role !== "caregiver").flatMap((member) => member.supportNeeds).join(", ") || "потрібно уточнити"}. Головне завдання: ${userCase.mainProblem} Дані враховано лише так, як їх зазначила сім'я.`
      : `The family is in ${userCase.municipality}, Asturias, and supports a person with these needs: ${userCase.household.filter((member) => member.role !== "caregiver").flatMap((member) => member.supportNeeds).join(", ") || "needs clarification"}. Main goal: ${userCase.mainProblem} Information is used only as the family provided it.`,
    urgency: {
      ...plan.urgency,
      message: isUk ? "Перевірку терміновості виконано. За нової загрози життю або безпеці телефонуйте 112." : "Urgency screening is complete. If a new threat to life or safety appears, call 112.",
    },
    missingInformation: plan.missingInformation.map((question) => question.id === "missing-status"
      ? { ...question, prompt: isUk ? "Який документ підтверджує поточний статус проживання?" : "Which document confirms the current residence status?", reason: isUk ? "Статус може змінювати медичний і соціальний маршрут." : "Status can change healthcare and social-service pathways." }
      : { ...question, prompt: isUk ? "Чи є підтвердження права на державну медичну допомогу?" : "Is there confirmation of entitlement to public healthcare?", reason: isUk ? "Від цього залежить шлях до Tarjeta Sanitaria Individual." : "This affects the route to a Tarjeta Sanitaria Individual." }),
    immediateFocus: translatedActions.slice(0, 3).map((action) => action.title),
    actions: translatedActions,
    documents: plan.documents.map((document) => ({ ...document, ...documents[document.id] })),
    drafts: translatedDrafts,
    safetyNotes: isUk
      ? ["План не є медичним або юридичним висновком і не гарантує статус, виплату чи послугу.", "Не надсилайте номери паспорта, NIE/DNI або медичні ідентифікатори до підтвердження захищеного каналу.", "Перевірте й доповніть усі чернетки перед надсиланням; FORA Navigator нічого не надсилає автоматично.", ...(usedFallback ? ["Демонстраційний режим: GPT-5.6 не використовувався; показано безпечний локальний маршрут."] : [])]
      : ["This plan is not medical or legal advice and does not guarantee a status, benefit or service.", "Do not send passport, NIE/DNI or medical identifier numbers until an official secure channel is confirmed.", "Review and complete every draft before sending it; FORA Navigator never sends anything automatically.", ...(usedFallback ? ["Demo Mode: GPT-5.6 was not used; a safe local pathway is shown."] : [])],
  };
}

export function createFallbackPlan(userCase: UserCase, fallbackReason?: string, locale: AppLocale = userCase.locale): FinalNavigationPlan {
  const needCategories = new Set(userCase.needs.map((need) => need.category));
  const actions: ActionStep[] = [statusAction(userCase), healthAction(userCase)];

  if (needCategories.has("education") || userCase.household.some((member) => member.role === "child")) {
    actions.push(educationAction());
  }
  if (needCategories.has("disability_recognition") || userCase.diagnosticDocuments !== "none") {
    actions.push(disabilityAction());
  }
  actions.push(socialAction(userCase), documentAction());

  const orderedActions = actions.sort((a, b) => a.priority - b.priority);
  const supportDescription = userCase.household
    .filter((member) => member.role !== "caregiver")
    .flatMap((member) => member.supportNeeds)
    .join(", ");

  const plan: FinalNavigationPlan = {
    schemaVersion: "2.0",
    locale: userCase.locale,
    caseSummary: `Семья находится в ${userCase.municipality}, Asturias, и сопровождает человека с потребностями: ${supportDescription || "требуется уточнить"}. Главная задача: ${userCase.mainProblem} Медицинское покрытие, статус проживания и наличие документов учтены только в том виде, как их указала семья.`,
    urgency: userCase.urgency,
    missingInformation: missingInformation(userCase),
    immediateFocus: orderedActions.slice(0, 3).map((action) => action.title),
    actions: orderedActions,
    documents: buildDocuments(userCase),
    drafts: buildDrafts(userCase),
    sources: knowledgeSources(),
    safetyNotes: [
      "План не является медицинским или юридическим заключением и не гарантирует получение статуса, выплаты или услуги.",
      "Не отправляйте номера паспорта, NIE/DNI, медицинские идентификаторы и другие чувствительные данные до подтверждения официального защищённого канала.",
      "Все черновики нужно проверить и дополнить самостоятельно перед отправкой; FORA Navigator ничего не отправляет автоматически.",
      ...(fallbackReason ? [`Демонстрационный режим: ${fallbackReason}`] : []),
    ],
    generatedAt: new Date().toISOString(),
    mode: "demo",
  };

  // Keep the demo fixture subject to exactly the same runtime contract as model output.
  return FinalNavigationPlanSchema.parse(translatePlan(plan, locale, userCase));
}

export const knowledgeDigestForPrompt = administrativeKnowledge.map((entry) => ({
  id: entry.source.id,
  title: entry.source.title,
  url: entry.source.url,
  jurisdiction: entry.source.jurisdiction,
  lastVerifiedDate: entry.source.lastVerifiedDate,
  evidenceClass: entry.evidenceClass,
  claimRu: entry.claimRu,
}));
