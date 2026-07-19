import type { SourceReference } from "@/lib/schemas";

export type KnowledgeEntry = {
  id: string;
  category:
    | "healthcare"
    | "disability_recognition"
    | "education"
    | "social"
    | "documents"
    | "migration_status"
    | "emergency";
  evidenceClass: "verified_fact" | "fora_guidance" | "model_inference" | "specialist_question";
  claimRu: string;
  source: SourceReference;
};

export const asturiasKnowledge: KnowledgeEntry[] = [
  {
    id: "health-tsi",
    category: "healthcare",
    evidenceClass: "verified_fact",
    claimRu:
      "Tarjeta Sanitaria Individual запрашивается через центр здоровья по месту проживания; применимый путь зависит от подтверждённого права на государственное медицинское обслуживание.",
    source: {
      id: "src-health-tsi",
      title: "Obtención de la Tarjeta Sanitaria Individual — Astursalud",
      url: "https://www.astursalud.es/noticias/-/noticias/obtencion-de-la-tarjeta-sanitaria-individu-3",
      sourceType: "official",
      jurisdiction: "Asturias",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "health-foreign-residents",
    category: "healthcare",
    evidenceClass: "verified_fact",
    claimRu:
      "Для иностранных граждан, не зарегистрированных и не авторизованных как резиденты Испании, в Asturias существует отдельная процедура подтверждения доступа к медицинской помощи; условия нужно сверять с административной службой центра здоровья.",
    source: {
      id: "src-health-foreign",
      title: "Asistencia sanitaria a personas extranjeras no registradas — Astursalud",
      url: "https://www.astursalud.es/noticias/-/noticias/asistencia-sanitaria-a-ciudadanos-extranjeros-no-registrados-ni-autorizados-como-residentes-en-espa-c3-91a",
      sourceType: "official",
      jurisdiction: "Asturias",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "disability-recognition",
    category: "disability_recognition",
    evidenceClass: "verified_fact",
    claimRu:
      "Процедура CERT0001T01 предназначена для первичного reconocimiento del grado de discapacidad в Asturias; официальный перечень включает заявление и медицинские/психологические отчёты, а подача возможна очно или электронно.",
    source: {
      id: "src-disability",
      title: "CERT0001T01 — Reconocimiento del grado de discapacidad",
      url: "https://miprincipado.asturias.es/ast/-/dboid-6269000005728890007573",
      sourceType: "official",
      jurisdiction: "Asturias",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "school-admission",
    category: "education",
    evidenceClass: "verified_fact",
    claimRu:
      "Educastur публикует текущую процедуру приёма в Infantil, Primaria, ESO и Bachillerato; для ученика с NEE школа и комиссия escolarización определяют применимый маршрут и оценку поддержки.",
    source: {
      id: "src-school",
      title: "Procedimiento de admisión de alumnado 2026–2027 — Educastur",
      url: "https://www.educastur.es/-/procedimiento-de-admision-de-alumnado-2026-2027",
      sourceType: "official",
      jurisdiction: "Asturias",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "social-services",
    category: "social",
    evidenceClass: "verified_fact",
    claimRu:
      "В электронном каталоге Ayuntamiento de Oviedo есть разделы социальных услуг и регистрационные каналы; конкретный центр первичной помощи нужно уточнить по месту проживания.",
    source: {
      id: "src-social",
      title: "Catálogo de trámites — Ayuntamiento de Oviedo",
      url: "https://portal.oviedo.es/sede/catalogoTramites.do?ent_id=1&idioma=11&pes_cod=2",
      sourceType: "official",
      jurisdiction: "Oviedo",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "foreign-documents",
    category: "documents",
    evidenceClass: "verified_fact",
    claimRu:
      "Требование апостиля, легализации или официального перевода зависит от страны выдачи, вида документа, международных исключений и конкретной процедуры; его нельзя считать универсальным.",
    source: {
      id: "src-legalisation",
      title: "Legalización diplomática y traducción — Ministerio de Asuntos Exteriores",
      url: "https://exteriores.gob.es/es/ServiciosAlCiudadano/Paginas/Legalizacion-y-apostilla.aspx",
      sourceType: "official",
      jurisdiction: "Spain",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "international-protection",
    category: "migration_status",
    evidenceClass: "verified_fact",
    claimRu:
      "Заявитель на международную защиту, признанный беженец и получатель субсидиарной защиты — разные подтверждённые статусы; применимый маршрут нужно определять по действующему документу человека.",
    source: {
      id: "src-international-protection",
      title: "Protección Internacional — Ministerio del Interior",
      url: "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/oficina-de-asilo-y-refugio/",
      sourceType: "official",
      jurisdiction: "Spain",
      lastVerifiedDate: "2026-07-19",
      nextReviewDate: "2026-08-19",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "temporary-protection-ukraine",
    category: "migration_status",
    evidenceClass: "verified_fact",
    claimRu:
      "Временная защита для перемещённых из Украины предоставляет отдельный маршрут к разрешению на проживание и работу, медицине и образованию и не равна статусу беженца.",
    source: {
      id: "src-temporary-protection",
      title: "Protección temporal — Ucrania Urgente",
      url: "https://www.inclusion.gob.es/web/ucrania-urgente/proteccion-temporal1",
      sourceType: "official",
      jurisdiction: "Spain",
      lastVerifiedDate: "2026-07-19",
      nextReviewDate: "2026-08-19",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
  {
    id: "emergency-112",
    category: "emergency",
    evidenceClass: "verified_fact",
    claimRu: "112 — бесплатный единый номер экстренной помощи в Европейском союзе.",
    source: {
      id: "src-emergency",
      title: "112 — единый номер экстренной помощи ЕС",
      url: "https://digital-strategy.ec.europa.eu/es/policies/112",
      sourceType: "official",
      jurisdiction: "Spain",
      lastVerifiedDate: "2026-07-18",
      nextReviewDate: "2026-08-18",
      verificationMethod: "manual_official_page",
      contentOwner: "official_authority",
    },
  },
];

export const administrativeKnowledge = asturiasKnowledge.filter((entry) => entry.category !== "emergency");

export function knowledgeSources(): SourceReference[] {
  return administrativeKnowledge.map((entry) => entry.source);
}
