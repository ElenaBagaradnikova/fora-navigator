"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { Progress } from "@/components/progress";
import { NeedCategorySchema, type Need, type UserCase } from "@/lib/schemas";
import { assessUrgency } from "@/lib/safety/triage";
import { loadCase, saveCase } from "@/lib/storage";
import { useLocale } from "@/components/locale-provider";
import { localize, type AppLocale } from "@/lib/i18n";

type Choice = { value: string; label: string; help?: string };

function intakeCopy(locale: AppLocale) {
  return localize(locale, {
    ru: {
      questions: [
        ["Где вы сейчас живёте?", "MVP знает маршруты только для Asturias. Город влияет на муниципальные контакты."],
        ["Сколько лет человеку, которому нужна поддержка?", "Возраст меняет образовательный и взрослый социальный маршрут."],
        ["Какая поддержка нужна?", "Можно выбрать несколько вариантов. Диагноз подтверждать здесь не нужно."],
        ["Какие задачи важны сейчас?", "Выберите только то, что должно войти в план."],
        ["Какой документ сейчас подтверждает статус проживания?", "Это не вопрос о национальности. Выберите то, что написано в действующем документе, или «не знаю»."],
        ["Есть медицинское покрытие в Испании?", "Например, подтверждённое право на государственную медицину или действующая TSI."],
        ["Есть empadronamiento?", "Empadronamiento — муниципальная регистрация по месту проживания."],
        ["Какие медицинские документы есть?", "Не загружайте файлы и не вводите номера документов."],
        ["Как вы говорите по-испански?", "Это влияет на подготовку писем и необходимость языковой поддержки."],
        ["Что нужно решить в первую очередь?", "Одним-двумя предложениями. Не добавляйте имена, адреса и номера документов."],
        ["Насколько ситуация срочная?", "При угрозе жизни или безопасности мы остановим обычный маршрут и покажем экстренную помощь."],
      ],
      otherCity: "Другой город Asturias", verifyContacts: "Контакты нужно будет уточнить", years: ["0–5 лет", "6–11 лет", "12–17 лет", "18–25 лет", "Старше 25 лет"],
      supports: ["аутизм", "интеллектуальная инвалидность", "двигательная поддержка", "образовательная поддержка", "сенсорная поддержка", "другое / требуется уточнить"],
      needs: [["Медицинская помощь", "Получить доступ к первичной медицине"], ["Признание инвалидности", "Начать reconocimiento del grado de discapacidad"], ["Школа и обучение", "Организовать обучение и поддержку"], ["Социальная служба", "Получить первичную социальную консультацию"], ["Документы и перевод", "Подготовить иностранные документы"], ["Языковая помощь", "Подготовить обращения на испанском"]],
      status: [["Гражданство ЕС / ЕЭЗ / Швейцарии", "Право проживания может подтверждаться документами гражданина ЕС"], ["Виза или разрешение на проживание", "Учёба, работа, семья или другой действующий вид на жительство"], ["Подано заявление на международную защиту", "Solicitud de protección internacional / asilo"], ["Предоставлена международная защита", "Статус беженца или субсидиарная защита"], ["Временная защита", "Например, Protección Temporal для перемещённых из Украины"], ["Сейчас нет действующего разрешения", "Это не лишает права на экстренную помощь; маршрут нужно уточнить"], ["Не знаю — помогите определить", "Система не будет угадывать статус"]],
      yes: "Да", no: "Нет", unknown: "Не знаю", tsi: "Есть подтверждение или действующая TSI", registered: "Да, есть empadronamiento", notYet: "Пока нет", originals: "Есть оригиналы", copies: "Есть копии / выписки", noDocs: "Документов нет", check: "Нужно проверить", noSpanish: "Не говорю", basic: "Базовый уровень", conversational: "Могу объясниться", calm: "Можно планировать спокойно", calmHelp: "Нет непосредственной угрозы", urgent: "Нужна помощь в ближайшее время", urgentHelp: "Есть риск ухудшения или потери необходимой поддержки", emergency: "Есть угроза жизни или безопасности", emergencyHelp: "Жизнь, насилие, бездомность сегодня, нет жизненно важных лекарств", loading: "Загружаем сохранённые ответы…", eyebrow: "Только то, что влияет на план", back: "Назад", next: "Дальше", review: "Проверить ответы", placeholderSupport: "требуется уточнить", step: (current: number, total: number) => `Шаг ${current} из ${total}`,
    },
    uk: {
      questions: [
        ["Де ви зараз живете?", "MVP знає маршрути лише для Asturias. Місто впливає на муніципальні контакти."],
        ["Скільки років людині, якій потрібна підтримка?", "Вік змінює освітній і дорослий соціальний маршрут."],
        ["Яка підтримка потрібна?", "Можна вибрати кілька варіантів. Підтверджувати діагноз тут не потрібно."],
        ["Які завдання важливі зараз?", "Виберіть лише те, що має увійти до плану."],
        ["Який документ зараз підтверджує статус проживання?", "Це не питання про національність. Виберіть те, що написано у чинному документі, або «не знаю»."],
        ["Чи є медичне покриття в Іспанії?", "Наприклад, підтверджене право на державну медицину або чинна TSI."],
        ["Чи є empadronamiento?", "Empadronamiento — муніципальна реєстрація за місцем проживання."],
        ["Які медичні документи є?", "Не завантажуйте файли й не вводьте номери документів."],
        ["Як ви розмовляєте іспанською?", "Це впливає на підготовку листів і потребу в мовній підтримці."],
        ["Що потрібно вирішити насамперед?", "Одним-двома реченнями. Не додавайте імена, адреси й номери документів."],
        ["Наскільки ситуація термінова?", "За загрози життю або безпеці ми зупинимо звичайний маршрут і покажемо екстрену допомогу."],
      ],
      otherCity: "Інше місто Asturias", verifyContacts: "Контакти потрібно буде уточнити", years: ["0–5 років", "6–11 років", "12–17 років", "18–25 років", "Старше 25 років"],
      supports: ["аутизм", "інтелектуальна інвалідність", "підтримка мобільності", "освітня підтримка", "сенсорна підтримка", "інше / потрібно уточнити"],
      needs: [["Медична допомога", "Отримати доступ до первинної медицини"], ["Визнання інвалідності", "Почати reconocimiento del grado de discapacidad"], ["Школа й навчання", "Організувати навчання та підтримку"], ["Соціальна служба", "Отримати первинну соціальну консультацію"], ["Документи й переклад", "Підготувати іноземні документи"], ["Мовна допомога", "Підготувати звернення іспанською"]],
      status: [["Громадянство ЄС / ЄЕЗ / Швейцарії", "Право проживання може підтверджуватися документами громадянина ЄС"], ["Віза або дозвіл на проживання", "Навчання, робота, сім'я або інший чинний дозвіл"], ["Подано заяву на міжнародний захист", "Solicitud de protección internacional / asilo"], ["Надано міжнародний захист", "Статус біженця або субсидіарний захист"], ["Тимчасовий захист", "Наприклад, Protección Temporal для переміщених з України"], ["Зараз немає чинного дозволу", "Це не позбавляє права на екстрену допомогу; маршрут треба уточнити"], ["Не знаю — допоможіть визначити", "Система не вгадуватиме статус"]],
      yes: "Так", no: "Ні", unknown: "Не знаю", tsi: "Є підтвердження або чинна TSI", registered: "Так, є empadronamiento", notYet: "Поки немає", originals: "Є оригінали", copies: "Є копії / виписки", noDocs: "Документів немає", check: "Потрібно перевірити", noSpanish: "Не розмовляю", basic: "Базовий рівень", conversational: "Можу пояснитися", calm: "Можна планувати спокійно", calmHelp: "Немає безпосередньої загрози", urgent: "Допомога потрібна найближчим часом", urgentHelp: "Є ризик погіршення або втрати необхідної підтримки", emergency: "Є загроза життю або безпеці", emergencyHelp: "Життя, насильство, бездомність сьогодні, немає життєво важливих ліків", loading: "Завантажуємо збережені відповіді…", eyebrow: "Лише те, що впливає на план", back: "Назад", next: "Далі", review: "Перевірити відповіді", placeholderSupport: "потрібно уточнити", step: (current: number, total: number) => `Крок ${current} із ${total}`,
    },
    en: {
      questions: [
        ["Where do you live now?", "This MVP only knows pathways in Asturias. Your municipality affects local contacts."],
        ["How old is the person who needs support?", "Age changes education and adult social-service pathways."],
        ["What support is needed?", "Choose more than one. You do not need to prove a diagnosis here."],
        ["Which needs matter now?", "Select only what should be included in the plan."],
        ["Which document currently confirms residence status?", "This is not a question about nationality. Choose what the current document says, or select “I don't know”."],
        ["Is healthcare coverage confirmed in Spain?", "For example, confirmed entitlement to public healthcare or an active TSI."],
        ["Is there an empadronamiento?", "Empadronamiento is municipal registration at the place of residence."],
        ["Which medical documents are available?", "Do not upload files or enter identity-document numbers."],
        ["How well do you speak Spanish?", "This affects letter preparation and the need for language support."],
        ["What needs to be solved first?", "Use one or two sentences. Do not include names, addresses or identity numbers."],
        ["How urgent is the situation?", "If life or safety is at risk, we stop the ordinary pathway and show emergency help."],
      ],
      otherCity: "Another municipality in Asturias", verifyContacts: "Contacts will need to be checked", years: ["Age 0–5", "Age 6–11", "Age 12–17", "Age 18–25", "Over 25"],
      supports: ["autism", "intellectual disability", "mobility support", "education support", "sensory support", "other / needs clarification"],
      needs: [["Healthcare", "Access primary healthcare"], ["Disability recognition", "Start reconocimiento del grado de discapacidad"], ["School and education", "Arrange education and support"], ["Social services", "Get an initial social-services consultation"], ["Documents and translation", "Prepare foreign documents"], ["Language support", "Prepare requests in Spanish"]],
      status: [["EU / EEA / Swiss citizen", "Residence rights may be evidenced by EU-citizen documents"], ["Visa or residence permit", "Study, work, family or another current permit"], ["International-protection application filed", "Solicitud de protección internacional / asylum"], ["International protection granted", "Refugee status or subsidiary protection"], ["Temporary protection", "For example, Protección Temporal for people displaced from Ukraine"], ["No current authorisation", "This does not remove the right to emergency help; the pathway needs checking"], ["I don't know — help me identify it", "The system will not guess the status"]],
      yes: "Yes", no: "No", unknown: "I don't know", tsi: "There is confirmation or an active TSI", registered: "Yes, there is an empadronamiento", notYet: "Not yet", originals: "Originals are available", copies: "Copies / extracts are available", noDocs: "No documents", check: "Needs checking", noSpanish: "I don't speak Spanish", basic: "Basic", conversational: "Conversational", calm: "The situation can be planned calmly", calmHelp: "No immediate threat", urgent: "Help is needed soon", urgentHelp: "There is a risk of deterioration or loss of essential support", emergency: "Life or safety is at risk", emergencyHelp: "Life, violence, homelessness today, or no essential medication", loading: "Loading saved answers…", eyebrow: "Only what changes the plan", back: "Back", next: "Next", review: "Review answers", placeholderSupport: "needs clarification", step: (current: number, total: number) => `Step ${current} of ${total}`,
    },
  });
}

function supportedMemberIndex(userCase: UserCase) {
  const index = userCase.household.findIndex((member) => member.role !== "caregiver");
  return index >= 0 ? index : 0;
}

function RadioGrid({ value, choices, onChange }: { value: string; choices: Choice[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(choice.value)}
            className={`min-h-20 border p-4 text-left transition ${selected ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-[inset_5px_0_0_var(--teal)]" : "border-[var(--line)] bg-white hover:border-[var(--teal)]"}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span><strong className="block text-base">{choice.label}</strong>{choice.help && <span className="mt-1 block text-sm text-[var(--muted)]">{choice.help}</span>}</span>
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[#9caea7]"}`}>
                {selected && <Check className="h-4 w-4" />}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiGrid({ values, choices, onToggle }: { values: string[]; choices: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => {
        const selected = values.includes(choice);
        return (
          <button
            key={choice}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(choice)}
            className={`flex min-h-16 items-center justify-between gap-4 border p-4 text-left font-bold transition ${selected ? "border-[var(--teal)] bg-[var(--teal-soft)]" : "border-[var(--line)] bg-white hover:border-[var(--teal)]"}`}
          >
            <span>{choice}</span>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${selected ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[#9caea7]"}`}>
              {selected && <Check className="h-4 w-4" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function IntakeWizard() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = intakeCopy(locale);
  const questions = copy.questions.map(([title, help]) => ({ title, help }));
  const municipalities: Choice[] = [
    { value: "Oviedo", label: "Oviedo" },
    { value: "Gijón", label: "Gijón" },
    { value: "Avilés", label: "Avilés" },
    { value: "Otra localidad de Asturias", label: copy.otherCity, help: copy.verifyContacts },
  ];
  const ageValues = ["0-5", "6-11", "12-17", "18-25", "adult"];
  const ages: Choice[] = ageValues.map((value, index) => ({ value, label: copy.years[index] }));
  const supportOptions = copy.supports;
  const needCategories: Need["category"][] = ["healthcare", "disability_recognition", "education", "social", "documents", "language"];
  const needOptions: Array<{ category: Need["category"]; label: string; detail: string }> = needCategories.map((category, index) => ({
    category,
    label: copy.needs[index][0],
    detail: copy.needs[index][1],
  }));
  const [userCase, setUserCase] = useState<UserCase | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const existing = loadCase();
      if (!existing) {
        router.replace("/");
        return;
      }
      setUserCase({ ...existing, locale });
      const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
      if (Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < questions.length) {
        setStep(requestedStep);
      }
    });
    return () => {
      active = false;
    };
  }, [locale, questions.length, router]);

  useEffect(() => {
    if (userCase) saveCase(userCase);
  }, [userCase]);

  const memberIndex = userCase ? supportedMemberIndex(userCase) : 0;
  const currentSupport = userCase?.household[memberIndex]?.supportNeeds || [];
  const selectedNeeds = useMemo(() => userCase?.needs.map((need) => need.category) || [], [userCase]);

  if (!userCase) {
    return <div className="py-24 text-center text-[var(--muted)]">{copy.loading}</div>;
  }

  const activeCase = userCase;

  function patchCase(patch: Partial<UserCase>) {
    setUserCase((current) => (current ? { ...current, ...patch } : current));
  }

  function patchMember(patch: Partial<UserCase["household"][number]>) {
    setUserCase((current) => {
      if (!current) return current;
      const household = [...current.household];
      const index = supportedMemberIndex(current);
      household[index] = { ...household[index], ...patch };
      return { ...current, household };
    });
  }

  function toggleSupport(value: string) {
    const clean = currentSupport.filter((item) => item !== "требуется уточнить" && item !== "потрібно уточнити" && item !== "needs clarification");
    const next = clean.includes(value) ? clean.filter((item) => item !== value) : [...clean, value];
    patchMember({ supportNeeds: next.length > 0 ? next : [copy.placeholderSupport] });
  }

  function toggleNeed(categoryValue: string) {
    const category = NeedCategorySchema.parse(categoryValue);
    const currentNeeds = activeCase.needs;
    const exists = currentNeeds.some((need) => need.category === category);
    const option = needOptions.find((item) => item.category === category)!;
    const next = exists
      ? currentNeeds.filter((need) => need.category !== category)
      : [...currentNeeds, { category, priority: "high" as const, detail: option.detail }];
    patchCase({ needs: next.length > 0 ? next : currentNeeds });
  }

  function goNext() {
    if (step < questions.length - 1) {
      setStep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const urgency = assessUrgency(`${activeCase.narrative} ${activeCase.mainProblem}`, activeCase.urgency.level, locale);
    const completeCase: UserCase = { ...activeCase, urgency };
    saveCase(completeCase);
    router.push(urgency.stopNormalFlow ? "/emergency" : "/review");
  }

  function goBack() {
    if (step === 0) router.push("/");
    else setStep((value) => value - 1);
  }

  function renderQuestion() {
    switch (step) {
      case 0:
        return <RadioGrid value={activeCase.municipality} choices={municipalities} onChange={(municipality) => patchCase({ municipality })} />;
      case 1:
        return (
          <RadioGrid
            value={activeCase.household[memberIndex].ageRange}
            choices={ages}
            onChange={(ageRange) =>
              patchMember({
                ageRange: ageRange as UserCase["household"][number]["ageRange"],
                role: ageRange === "18-25" || ageRange === "adult" ? "young_adult" : "child",
              })
            }
          />
        );
      case 2:
        return <MultiGrid values={currentSupport} choices={supportOptions} onToggle={toggleSupport} />;
      case 3:
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {needOptions.map((option) => {
              const selected = selectedNeeds.includes(option.category);
              return (
                <button
                  key={option.category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleNeed(option.category)}
                  className={`flex min-h-16 items-center justify-between gap-4 border p-4 text-left font-bold ${selected ? "border-[var(--teal)] bg-[var(--teal-soft)]" : "border-[var(--line)] bg-white hover:border-[var(--teal)]"}`}
                >
                  {option.label}<span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${selected ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[#9caea7]"}`}>{selected && <Check className="h-4 w-4" />}</span>
                </button>
              );
            })}
          </div>
        );
      case 4:
        return <RadioGrid value={activeCase.immigrationStatus} onChange={(value) => patchCase({ immigrationStatus: value as UserCase["immigrationStatus"] })} choices={[
          { value: "eu_eea_swiss", label: copy.status[0][0], help: copy.status[0][1] },
          { value: "residence_or_visa", label: copy.status[1][0], help: copy.status[1][1] },
          { value: "asylum_applicant", label: copy.status[2][0], help: copy.status[2][1] },
          { value: "international_protection", label: copy.status[3][0], help: copy.status[3][1] },
          { value: "temporary_protection", label: copy.status[4][0], help: copy.status[4][1] },
          { value: "no_current_authorization", label: copy.status[5][0], help: copy.status[5][1] },
          { value: "unknown", label: copy.status[6][0], help: copy.status[6][1] },
        ]} />;
      case 5:
        return <RadioGrid value={activeCase.healthcareCoverage} onChange={(value) => patchCase({ healthcareCoverage: value as UserCase["healthcareCoverage"] })} choices={[
          { value: "yes", label: copy.yes, help: copy.tsi },
          { value: "no", label: copy.no },
          { value: "unknown", label: copy.unknown },
        ]} />;
      case 6:
        return <RadioGrid value={activeCase.registeredAtAddress} onChange={(value) => patchCase({ registeredAtAddress: value as UserCase["registeredAtAddress"] })} choices={[
          { value: "yes", label: copy.registered },
          { value: "no", label: copy.notYet },
          { value: "unknown", label: copy.unknown },
        ]} />;
      case 7:
        return <RadioGrid value={activeCase.diagnosticDocuments} onChange={(value) => patchCase({ diagnosticDocuments: value as UserCase["diagnosticDocuments"] })} choices={[
          { value: "originals", label: copy.originals },
          { value: "copies", label: copy.copies },
          { value: "none", label: copy.noDocs },
          { value: "unknown", label: copy.check },
        ]} />;
      case 8:
        return <RadioGrid value={activeCase.spanishLevel} onChange={(value) => patchCase({ spanishLevel: value as UserCase["spanishLevel"] })} choices={[
          { value: "none", label: copy.noSpanish },
          { value: "basic", label: copy.basic },
          { value: "conversational", label: copy.conversational },
        ]} />;
      case 9:
        return (
          <div>
            <textarea className="field min-h-40 resize-y" value={activeCase.mainProblem} onChange={(event) => patchCase({ mainProblem: event.target.value })} maxLength={800} />
            <p className="mt-2 text-right text-sm text-[var(--muted)]">{activeCase.mainProblem.length} / 800</p>
          </div>
        );
      case 10:
        return <RadioGrid value={activeCase.urgency.level} onChange={(level) => patchCase({ urgency: assessUrgency(`${activeCase.narrative} ${activeCase.mainProblem}`, level as UserCase["urgency"]["level"], locale) })} choices={[
          { value: "standard", label: copy.calm, help: copy.calmHelp },
          { value: "urgent", label: copy.urgent, help: copy.urgentHelp },
          { value: "emergency", label: copy.emergency, help: copy.emergencyHelp },
        ]} />;
      default:
        return null;
    }
  }

  const canContinue = step !== 9 || activeCase.mainProblem.trim().length >= 3;

  return (
    <div className="mx-auto max-w-3xl py-8 sm:py-12">
      <Progress current={step + 1} total={questions.length} label={copy.step(step + 1, questions.length)} />
      <section className="mt-8 border-t-4 border-[var(--teal)] bg-[var(--paper-strong)] p-5 shadow-[var(--shadow)] sm:p-9">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="display-font mt-3 text-3xl leading-tight sm:text-4xl">{questions[step].title}</h1>
        <div className="mt-4 flex gap-3 text-sm leading-6 text-[var(--muted)]">
          <Info className="mt-1 h-4 w-4 shrink-0 text-[var(--coral)]" aria-hidden="true" />
          <p>{questions[step].help}</p>
        </div>
        <div className="mt-7">{renderQuestion()}</div>
      </section>

      <div className="mt-7 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button type="button" className="button-quiet" onClick={goBack}><ArrowLeft className="h-5 w-5" /> {copy.back}</button>
        <button type="button" className="button-primary" onClick={goNext} disabled={!canContinue}>
          {step === questions.length - 1 ? copy.review : copy.next} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
