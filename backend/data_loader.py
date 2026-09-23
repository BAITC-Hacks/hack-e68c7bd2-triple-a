"""Validated JSONL catalog, cached once. Paths are independent of the working directory."""
from __future__ import annotations

import datetime as dt
import json
import os
import re
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_PATH = BASE_DIR / 'data' / 'hackathon-dataset-anonymized.jsonl'
DEFAULT_SYNTHETIC_PATH = BASE_DIR / 'synthetic_profiles.jsonl'
MIN_DATE, MAX_DATE = '2026-09-23', '2026-12-31'
MAX_SAFE_INT = 9_007_199_254_740_991
REQUIRED_FIELDS = ['id', 'anon_name', 'categories', 'city', 'price_from_kzt',
                   'event_formats', 'languages', 'busy_dates', 'max_hours', 'description']

class DatasetError(Exception):
    """The catalog cannot safely be used to make recommendations."""

def _valid_date(value: Any) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return False
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        return False
    return MIN_DATE <= value <= MAX_DATE

def _validate_record(value: Any, location: str) -> dict[str, Any]:
    def fail(message: str) -> None:
        raise DatasetError(f'{location}: {message}')
    if not isinstance(value, dict):
        fail('профиль должен быть JSON-объектом')
    missing = [key for key in REQUIRED_FIELDS if key not in value]
    if missing:
        fail(f'отсутствуют поля: {", ".join(missing)}')
    rec = dict(value)
    for key in ('id', 'anon_name', 'city'):
        if not isinstance(rec[key], str) or not rec[key].strip():
            fail(f'{key}: ожидается непустая строка')
        rec[key] = rec[key].strip()
    for key in ('categories', 'event_formats', 'languages'):
        if not isinstance(rec[key], list) or not all(isinstance(x, str) and x.strip() for x in rec[key]):
            fail(f'{key}: ожидается список непустых строк')
        if key != 'languages' and not rec[key]:
            fail(f'{key}: список не может быть пустым')
    if type(rec['price_from_kzt']) is not int or not 0 <= rec['price_from_kzt'] <= MAX_SAFE_INT:
        fail('price_from_kzt: ожидается неотрицательное целое число')
    if rec['max_hours'] is not None and (type(rec['max_hours']) is not int or rec['max_hours'] <= 0):
        fail('max_hours: ожидается положительное целое число или null')
    if not isinstance(rec['busy_dates'], list) or not all(_valid_date(x) for x in rec['busy_dates']):
        fail('busy_dates: даты должны быть YYYY-MM-DD в пределах календаря датасета')
    if not isinstance(rec['description'], str):
        fail('description: ожидается строка')
    for key in ('synthetic', 'city_imputed', 'price_imputed'):
        rec.setdefault(key, False)
        if type(rec[key]) is not bool:
            fail(f'{key}: ожидается true или false')
    return rec

def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    records = []
    try:
        with path.open(encoding='utf-8-sig') as stream:
            for line_no, line in enumerate(stream, 1):
                if not line.strip():
                    continue
                try:
                    value = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise DatasetError(f'{path.name}:{line_no}: некорректный JSON') from exc
                records.append(_validate_record(value, f'{path.name}:{line_no}'))
    except (OSError, UnicodeError) as exc:
        raise DatasetError(f'Не удалось прочитать {path.name}') from exc
    return records

def _resolve_path(value: str | Path) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else BASE_DIR / path

def load_catalog(dataset_path: str | Path | None = None, synthetic_path: str | Path | None = None) -> list[dict[str, Any]]:
    dataset = _resolve_path(dataset_path or os.getenv('DATASET_PATH') or DEFAULT_DATASET_PATH)
    synthetic = _resolve_path(synthetic_path or os.getenv('SYNTHETIC_PATH') or DEFAULT_SYNTHETIC_PATH)
    records = _read_jsonl(dataset)
    if not records:
        raise DatasetError('Основной датасет пуст или не найден. Проверьте backend/data/.')
    additional = _read_jsonl(synthetic)
    for rec in additional:
        rec['synthetic'] = True
    combined = records + additional
    seen: set[str] = set()
    for rec in combined:
        if rec['id'] in seen:
            raise DatasetError(f'Дублирующийся id в каталоге: {rec["id"]}')
        seen.add(rec['id'])
    return combined

_catalog_cache: list[dict[str, Any]] | None = None

def get_catalog() -> list[dict[str, Any]]:
    global _catalog_cache
    if _catalog_cache is None:
        _catalog_cache = load_catalog()
    return _catalog_cache

def reload_catalog() -> list[dict[str, Any]]:
    global _catalog_cache
    _catalog_cache = load_catalog()
    return _catalog_cache
