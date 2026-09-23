"""
generate_explanation(profile, match_reasons) -> str

Интерфейс для UX/UI-промпта. Контракт:

  profile: dict — полная запись подрядчика (см. data_loader), плюс поле
           "ranking_breakdown" (price_score, language_match, keyword_hits).
  match_reasons: dict — контекст запроса и почему карточка ранжирована так:
           {
             "city": str, "event_type": str, "category": str,
             "budget_kzt": int, "event_date": str,
             "price_score": float, "language_match": bool,
             "keyword_hits": list[str],
           }

  Возвращает: str — 1-2 предложения на русском, БЕЗ шаблонных фраз
  ("отличный выбор для вашего мероприятия" и т.п.), опирающихся на
  конкретные факты профиля (цена/дата/формат/язык/описание), а не общие слова.

Реализация ниже — рабочий вызов OpenAI (chat.completions), а не заглушка:
если команда UX/UI пришлёт свой промпт — вставьте его в SYSTEM_PROMPT.
Если OPENAI_API_KEY не задан или вызов упал — используется offline-фолбэк
(вариативный, на основе тех же фактов), чтобы демо не падало без интернета.
"""

from __future__ import annotations

import os
import random
from typing import Any

# --------------------------------------------------------------------------
# ЗАМЕНИ этот промпт на финальный от UX/UI, если он появится.
# --------------------------------------------------------------------------
SYSTEM_PROMPT = """\
Ты пишешь короткое объяснение (1-2 предложения, на русском), почему конкретный
подрядчик попал в подборку под запрос клиента на event-площадке в Казахстане.

Правила:
- Опирайся ТОЛЬКО на факты, переданные тебе (профиль + причины ранжирования).
- Никогда не пиши общие фразы вроде "отличный выбор для вашего мероприятия",
  "идеально подойдёт", "не упустите возможность" и т.п.
- Упоминай максимум 2-3 конкретных факта: например разницу цены и бюджета,
  свободна ли дата, совпадение языка, формат мероприятия, деталь из описания.
- Если для профиля указано synthetic: true — ничего не выдумывай сверх данных
  и не притворяйся, что это реальные отзывы/кейсы.
- Не используй имя подрядчика в первом слове предложения избыточно, пиши по-деловому.
- 1-2 предложения, без списков, без эмодзи.
"""


def _build_user_message(profile: dict[str, Any], match_reasons: dict[str, Any]) -> str:
    return (
        f"Профиль подрядчика:\n"
        f"- Категория: {', '.join(profile.get('categories', []))}\n"
        f"- Город: {profile.get('city')}\n"
        f"- Цена от: {profile.get('price_from_kzt')} тг\n"
        f"- Форматы: {', '.join(profile.get('event_formats', []))}\n"
        f"- Языки: {', '.join(profile.get('languages', []))}\n"
        f"- Описание: {profile.get('description', '')[:600]}\n"
        f"- synthetic: {profile.get('synthetic', False)}\n\n"
        f"Запрос клиента:\n"
        f"- Город: {match_reasons.get('city')}\n"
        f"- Дата: {match_reasons.get('event_date')}\n"
        f"- Формат: {match_reasons.get('event_type')}\n"
        f"- Бюджет: {match_reasons.get('budget_kzt')} тг\n\n"
        f"Причины ранжирования:\n"
        f"- price_score (1.0 = цена почти равна бюджету): {match_reasons.get('price_score')}\n"
        f"- совпадение языка: {match_reasons.get('language_match')}\n"
        f"- совпавшие ключевые слова из описания: {match_reasons.get('keyword_hits')}\n"
    )


def _offline_fallback(profile: dict[str, Any], match_reasons: dict[str, Any]) -> str:
    """Используется, если нет OPENAI_API_KEY или API недоступен. Не общие фразы —
    собирает предложение из конкретных фактов, поэтому карточки не взаимозаменяемы."""
    facts = []

    budget = match_reasons.get("budget_kzt")
    price = profile.get("price_from_kzt")
    if budget and price is not None:
        diff = budget - price
        if diff <= 0:
            facts.append(f"цена {price} тг совпадает с бюджетом")
        else:
            pct = round(diff / budget * 100)
            facts.append(f"цена {price} тг — на {pct}% ниже бюджета в {budget} тг")

    event_date = match_reasons.get("event_date")
    if event_date:
        facts.append(f"дата {event_date} свободна по календарю")

    if match_reasons.get("language_match"):
        facts.append("работает на нужном языке")

    hits = match_reasons.get("keyword_hits") or []
    if hits:
        facts.append(f"в описании есть совпадения по запросу: {', '.join(hits[:3])}")

    if profile.get("synthetic"):
        facts.append("это демонстрационный (synthetic) профиль")

    if not facts:
        facts.append("подходит по всем базовым условиям запроса (город, категория, формат)")

    random.seed(profile.get("id", ""))  # детерминированная фраза для одного и того же id
    templates = [
        "{name}: {f0}, {f1}." if len(facts) > 1 else "{name}: {f0}.",
        "{f0}, {f1} — {name}." if len(facts) > 1 else "{f0} — {name}.",
    ]
    template = templates[hash(profile.get("id", "")) % len(templates)]
    return template.format(
        name=profile.get("anon_name", "Подрядчик"),
        f0=facts[0],
        f1=facts[1] if len(facts) > 1 else "",
    ).replace(", .", ".")


def generate_explanation(profile: dict[str, Any], match_reasons: dict[str, Any]) -> str:
    """
    Основная точка входа. Пробует OpenAI, при любой ошибке — offline fallback,
    чтобы /search никогда не падал из-за внешнего API.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _offline_fallback(profile, match_reasons)

    try:
        from openai import OpenAI  # локальный импорт, чтобы модуль работал и без пакета openai

        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_EXPLAIN_MODEL", "gpt-4o-mini")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_message(profile, match_reasons)},
            ],
            temperature=0.4,
            max_tokens=150,
        )
        text = (response.choices[0].message.content or "").strip()
        return text or _offline_fallback(profile, match_reasons)
    except Exception:
        # Сеть/квота/что угодно — демо не должно падать посреди презентации.
        return _offline_fallback(profile, match_reasons)
