"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, PhoneCall, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { localize } from "@/lib/i18n";

export default function EmergencyPage() {
  const { locale } = useLocale();
  const copy = localize(locale, {
    ru: { badge: "Срочная помощь", title: "Сейчас важнее безопасность, не документы", intro: "Если есть угроза жизни, насилие, бездомность сегодня или нет жизненно необходимых лекарств — не продолжайте административный маршрут.", call: "Позвонить бесплатно", steps: ["Скажите, что произошло", "Назовите место, где вы находитесь", "Не кладите трубку до указания оператора"], caveat: "FORA Navigator не оценивает тяжесть медицинского состояния. Оператор 112 направит запрос в подходящую экстренную службу.", official: "Официальная информация ЕС о 112", back: "Вернуться только если угрозы нет" },
    uk: { badge: "Термінова допомога", title: "Зараз безпека важливіша за документи", intro: "Якщо є загроза життю, насильство, бездомність сьогодні або немає життєво важливих ліків — не продовжуйте адміністративний маршрут.", call: "Зателефонувати безкоштовно", steps: ["Скажіть, що сталося", "Назвіть місце, де ви перебуваєте", "Не кладіть слухавку до вказівки оператора"], caveat: "FORA Navigator не оцінює тяжкість медичного стану. Оператор 112 спрямує виклик до відповідної екстреної служби.", official: "Офіційна інформація ЄС про 112", back: "Повернутися лише якщо загрози немає" },
    en: { badge: "Urgent help", title: "Safety matters more than documents right now", intro: "If life is at risk, there is violence or homelessness today, or essential medication is unavailable, do not continue the administrative pathway.", call: "Call free of charge", steps: ["Say what happened", "Give your current location", "Stay on the line until the operator tells you to end the call"], caveat: "FORA Navigator does not assess the severity of a medical condition. The 112 operator will route the call to the appropriate emergency service.", official: "Official EU information about 112", back: "Return only if there is no threat" },
  });
  return (
    <>
      <SiteHeader minimal />
      <main className="page-shell py-8 sm:py-14">
        <section className="mx-auto max-w-3xl border-2 border-[var(--danger)] bg-[var(--danger-soft)] p-6 shadow-[0_12px_0_#b95850] sm:p-10">
          <div className="flex items-center gap-3 font-extrabold uppercase tracking-[0.12em] text-[var(--danger)]"><ShieldAlert className="h-6 w-6" /> {copy.badge}</div>
          <h1 className="display-font mt-5 text-4xl leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#5c2723]">{copy.intro}</p>
          <a href="tel:112" className="mt-8 flex min-h-24 items-center justify-between gap-5 bg-[var(--danger)] px-6 py-5 text-white no-underline sm:px-8">
            <span><span className="block text-sm font-bold uppercase tracking-[0.1em]">{copy.call}</span><strong className="display-font mt-1 block text-5xl">112</strong></span>
            <PhoneCall className="h-10 w-10" />
          </a>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {copy.steps.map((text, index) => <div key={text} className="border-t border-[#c6817a] pt-4"><strong className="text-2xl text-[var(--danger)]">{index + 1}</strong><p className="mt-1 text-sm leading-6">{text}</p></div>)}
          </div>
          <p className="mt-8 text-sm leading-6 text-[#6b3935]">{copy.caveat}</p>
          <a href="https://digital-strategy.ec.europa.eu/es/policies/112" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline">{copy.official} <ExternalLink className="h-4 w-4" /></a>
        </section>
        <div className="mx-auto mt-8 max-w-3xl"><Link href="/review" className="button-quiet"><ArrowLeft className="h-5 w-5" /> {copy.back}</Link></div>
      </main>
    </>
  );
}
