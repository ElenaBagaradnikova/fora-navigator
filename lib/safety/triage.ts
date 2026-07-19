import type { UrgencyAssessment, UserCase } from "@/lib/schemas";
import { localize, type AppLocale } from "@/lib/i18n";

const emergencyPatterns = [
  /не\s*дыш/i,
  /потер[яи]л[аи]?\s+сознани/i,
  /сильн(?:ое|ая)\s+кровотеч/i,
  /угроз[аы]\s+(?:жизни|убийств)/i,
  /самоубий|суицид|покончить\s+с\s+собой/i,
  /насили[ея].*(?:сейчас|прямо|сегодня)/i,
  /жизненно\s+важн.*лекарств.*(?:нет|законч)/i,
  /негде\s+ночевать|на\s+улице\s+сегодня/i,
  /no\s+respira|p[eé]rdida\s+de\s+conocimiento|emergencia\s+m[eé]dica/i,
  /не\s*диха|втратив.*свідом|загроз[аи]\s+житт|самогуб|суїцид/i,
  /not\s+breathing|lost\s+consciousness|unconscious|threat\s+to\s+life|suicid/i,
  /violence.*(?:now|today)|homeless.*(?:today|tonight)|no\s+essential\s+medication/i,
];

const urgentPatterns = [
  /лекарств.*(?:меньше|остал).*(?:день|сут)/i,
  /срочно.*врач/i,
  /сегодня.*выселя/i,
  /нет\s+еды/i,
  /ухудша(?:ется|ется быстро)/i,
  /термінов.*лікар|немає\s+їжі|швидко\s+погіршу/i,
  /urgent.*doctor|no\s+food|getting\s+worse\s+quickly/i,
];

const illegalPatterns = [
  /поддел(?:ать|ка|ывать).*(?:документ|справк|подпис)/i,
  /купить.*(?:справк|инвалидност|сертификат)/i,
  /дать\s+взятк|заплатить\s+чиновник/i,
  /скрыть.*(?:статус|доход|документ)/i,
  /соврать|обмануть.*(?:орган|служб|школ|врач)/i,
  /falsificar|sobornar|documentos\s+falsos/i,
  /підробити|підробк.*документ|дати\s+хабар|приховати.*статус/i,
  /forge.*document|fake.*document|bribe|hide.*status/i,
];

const guaranteePatterns = [
  /гарантир(?:уй|овать|ован).*(?:выплат|пособ|статус|инвалидност)/i,
  /100\s*%.*(?:выплат|пособ|статус)/i,
  /точно\s+(?:дадут|получим).*(?:выплат|пособ|статус)/i,
  /гарантуй.*(?:виплат|статус|інвалідн)|100\s*%.*(?:виплат|статус)/i,
  /guarantee.*(?:benefit|status|disability)|100\s*%.*(?:benefit|status)/i,
];

export function assessUrgency(text: string, selectedLevel?: UrgencyAssessment["level"], locale: AppLocale = "ru"): UrgencyAssessment {
  const messages = localize(locale, {
    ru: { emergencySignal: "Обнаружен возможный признак чрезвычайной ситуации", emergency: "Остановите заполнение и обратитесь в экстренную службу. В Испании и ЕС звонок 112 бесплатный.", urgentSignal: "Ситуация может требовать помощи в ближайшее время", urgent: "Сначала проверьте безопасность и доступ к необходимой помощи; административные шаги идут после этого.", standard: "Признаков чрезвычайной ситуации в ответах не обнаружено." },
    uk: { emergencySignal: "Виявлено можливу ознаку надзвичайної ситуації", emergency: "Зупиніть заповнення й зверніться до екстреної служби. В Іспанії та ЄС дзвінок 112 безкоштовний.", urgentSignal: "Ситуація може потребувати допомоги найближчим часом", urgent: "Спочатку перевірте безпеку й доступ до необхідної допомоги; адміністративні кроки йдуть після цього.", standard: "Ознак надзвичайної ситуації у відповідях не виявлено." },
    en: { emergencySignal: "A possible emergency signal was detected", emergency: "Stop the questionnaire and contact emergency services. Calls to 112 are free in Spain and the EU.", urgentSignal: "The situation may need help soon", urgent: "Check safety and access to essential help first; administrative steps come afterwards.", standard: "No emergency signal was detected in the answers." },
  });
  const emergencySignal = emergencyPatterns.find((pattern) => pattern.test(text));
  if (emergencySignal || selectedLevel === "emergency") {
    return {
      level: "emergency",
      signals: [messages.emergencySignal],
      stopNormalFlow: true,
      message: messages.emergency,
    };
  }

  const urgentSignal = urgentPatterns.find((pattern) => pattern.test(text));
  if (urgentSignal || selectedLevel === "urgent") {
    return {
      level: "urgent",
      signals: [messages.urgentSignal],
      stopNormalFlow: false,
      message: messages.urgent,
    };
  }

  return {
    level: "standard",
    signals: [],
    stopNormalFlow: false,
    message: messages.standard,
  };
}

export function assessRequestSafety(text: string) {
  return {
    illegalRequest: illegalPatterns.some((pattern) => pattern.test(text)),
    guaranteeRequest: guaranteePatterns.some((pattern) => pattern.test(text)),
  };
}

export function getCaseWarnings(userCase: UserCase): string[] {
  const warnings: string[] = [];
  const text = `${userCase.narrative} ${userCase.mainProblem}`.toLowerCase();
  const copy = localize(userCase.locale, {
    ru: { registration: "В описании сказано, что регистрации нет, но в ответах отмечено, что empadronamiento есть.", healthcare: "В описании сказано, что медицинского покрытия нет, но в ответах выбрано «есть».", status: "Статус проживания или защиты не определён. План не должен предполагать конкретное право на услугу.", documents: "Диагностических документов нет — некоторые процедуры потребуют сначала получить медицинские отчёты.", language: "Для контактов с учреждениями может понадобиться языковая поддержка." },
    uk: { registration: "В описі сказано, що реєстрації немає, але у відповідях зазначено, що empadronamiento є.", healthcare: "В описі сказано, що медичного покриття немає, але у відповідях вибрано «є».", status: "Статус проживання або захисту не визначено. План не має припускати конкретне право на послугу.", documents: "Діагностичних документів немає — для деяких процедур спочатку знадобляться медичні звіти.", language: "Для контактів з установами може знадобитися мовна підтримка." },
    en: { registration: "The description says there is no registration, but the answers mark empadronamiento as available.", healthcare: "The description says there is no healthcare coverage, but the answers mark it as available.", status: "The residence or protection status is unknown. The plan must not assume entitlement to a service.", documents: "There are no diagnostic records, so some procedures may first require medical reports.", language: "Language support may be needed when contacting institutions." },
  });

  if (/нет\s+(?:регистрац|пропис|empadron)/i.test(text) && userCase.registeredAtAddress === "yes") {
    warnings.push(copy.registration);
  }

  if (/нет\s+(?:страхов|медицинск.*покрыт)/i.test(text) && userCase.healthcareCoverage === "yes") {
    warnings.push(copy.healthcare);
  }

  if (userCase.immigrationStatus === "unknown") {
    warnings.push(copy.status);
  }

  if (userCase.diagnosticDocuments === "none") {
    warnings.push(copy.documents);
  }

  if (userCase.spanishLevel === "none") {
    warnings.push(copy.language);
  }

  return warnings;
}
