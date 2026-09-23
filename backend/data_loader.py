"""
Загрузка датасета подрядчиков.

Загружает основной jsonl-датасет и (опционально) файл synthetic_profiles.jsonl
с рукописными профилями для редких категорий. Всё держим в памяти —
объём (66 + пара синтетических) не требует БД.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).parent
DEFAULT_DATASET_PATH = BASE_DIR / "data" / "hackathon-dataset-anonymized.jsonl"
DEFAULT_SYNTHETIC_PATH = BASE_DIR / "synthetic_profiles.jsonl"

REQUIRED_FIELDS = ["id", "anon_name", "categories", "city", "price_from_kzt", "event_formats"]


class DatasetError(Exception):
    """Ошибка загрузки или валидации датасета."""


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    records = []
    with open(path, encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                raise DatasetError(f"{path.name}:{line_no} — некорректный JSON: {e}") from e
            missing = [k for k in REQUIRED_FIELDS if k not in rec]
            if missing:
                raise DatasetError(f"{path.name}:{line_no} — отсутствуют поля {missing}")
            rec.setdefault("categories", [])
            rec.setdefault("event_formats", [])
            rec.setdefault("languages", [])
            rec.setdefault("busy_dates", [])
            rec.setdefault("max_hours", None)
            rec.setdefault("synthetic", False)
            rec.setdefault("description", "")
            records.append(rec)
    return records


def load_catalog(
    dataset_path: str | Path | None = None,
    synthetic_path: str | Path | None = None,
) -> list[dict[str, Any]]:
    """
    Загружает основной каталог + synthetic-профили (если файл есть).
    Пути можно переопределить через env DATASET_PATH / SYNTHETIC_PATH,
    или передать явно (удобно для тестов).
    """
    dataset_path = Path(dataset_path or os.getenv("DATASET_PATH", DEFAULT_DATASET_PATH))
    synthetic_path = Path(synthetic_path or os.getenv("SYNTHETIC_PATH", DEFAULT_SYNTHETIC_PATH))

    main_records = _read_jsonl(dataset_path)
    if not main_records:
        raise DatasetError(
            f"Основной датасет пуст или не найден: {dataset_path}. "
            f"Положи hackathon-dataset-anonymized.jsonl в backend/data/."
        )

    synthetic_records = _read_jsonl(synthetic_path)
    for rec in synthetic_records:
        rec["synthetic"] = True  # подстраховка, даже если флаг забыли проставить в файле

    seen_ids = {r["id"] for r in main_records}
    for rec in synthetic_records:
        if rec["id"] in seen_ids:
            raise DatasetError(f"Дублирующийся id в synthetic_profiles.jsonl: {rec['id']}")
        seen_ids.add(rec["id"])

    return main_records + synthetic_records


# Загружается один раз при импорте модуля (использовать в main.py при старте FastAPI)
_catalog_cache: list[dict[str, Any]] | None = None


def get_catalog() -> list[dict[str, Any]]:
    global _catalog_cache
    if _catalog_cache is None:
        _catalog_cache = load_catalog()
    return _catalog_cache


def reload_catalog() -> list[dict[str, Any]]:
    """Принудительно перечитать файлы с диска (полезно для теста/демо)."""
    global _catalog_cache
    _catalog_cache = load_catalog()
    return _catalog_cache
