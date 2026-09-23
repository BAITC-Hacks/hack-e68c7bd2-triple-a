import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, RefObject } from 'react';
import { CATEGORIES, CITIES, EVENT_TYPES, LANGUAGES, MAX_EVENT_DATE, MIN_EVENT_DATE } from '../../config/search';
import type { FormErrors, SearchFormValues, SearchRequest } from '../../types/search';
import { toSearchRequest, validateSearchForm } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

type SearchFormProps = {
  values: SearchFormValues;
  setField: (name: keyof SearchFormValues, value: string) => void;
  onSubmit: (request: SearchRequest) => void;
  onReset: () => void;
  loading: boolean;
  storageAvailable: boolean;
  formRef: RefObject<HTMLFormElement | null>;
};

export function SearchForm({ values, setField, onSubmit, onReset, loading, storageAvailable, formRef }: SearchFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [optionalOpen, setOptionalOpen] = useState(Boolean(values.duration_hours || values.language));
  const firstErrorFrame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(firstErrorFrame.current), []);

  // A demo/category shortcut changes the draft outside changeField(). Remove
  // outdated errors without showing new errors before the user submits.
  useEffect(() => {
    setErrors(current => {
      const actual = validateSearchForm(values);
      const remaining: FormErrors = {};
      for (const name of Object.keys(current) as (keyof SearchFormValues)[]) {
        if (actual[name]) remaining[name] = actual[name];
      }
      return Object.keys(remaining).length === Object.keys(current).length ? current : remaining;
    });
  }, [values]);

  function changeField(name: keyof SearchFormValues, value: string) {
    setField(name, value);
    setErrors(current => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function inputProps(name: keyof SearchFormValues, id: string, hasHint = false) {
    const describedBy = [hasHint ? `${id}-hint` : '', errors[name] ? `${id}-error` : ''].filter(Boolean).join(' ');
    return {
      id,
      name,
      value: values[name],
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': describedBy || undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => changeField(name, event.currentTarget.value),
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const nextErrors = validateSearchForm(values);
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (firstField) {
      if (nextErrors.duration_hours || nextErrors.language) setOptionalOpen(true);
      cancelAnimationFrame(firstErrorFrame.current);
      firstErrorFrame.current = requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(firstField);
        if (field instanceof HTMLElement) field.focus();
      });
      return;
    }
    onSubmit(toSearchRequest(values));
  }

  function reset() {
    setErrors({});
    setOptionalOpen(false);
    onReset();
    const city = formRef.current?.elements.namedItem('city');
    if (city instanceof HTMLElement) city.focus();
  }

  return (
    <section className="form-card" aria-labelledby="form-title">
      <SectionHeading id="form-title" step="01">Параметры события</SectionHeading>
      <p className="form-intro">Пять деталей — и мы начнём подбор.</p>
      <div className="form-progress" aria-label="Заполнение обязательных параметров"><span>Ваше событие</span><span>{[values.city, values.event_date, values.event_type, values.category, values.budget_kzt].filter(Boolean).length} / 5</span><progress max="5" value={[values.city, values.event_date, values.event_type, values.category, values.budget_kzt].filter(Boolean).length}/></div>
      <form id="search-form" ref={formRef} onSubmit={submit} noValidate>
        <fieldset disabled={loading}>
          <legend className="sr-only">Параметры события</legend>
          <div className="form-grid">
            <Field id="city" label="Город" error={errors.city}>
              <select {...inputProps('city', 'city')} required><option value="" disabled>Выберите город</option>{CITIES.map(city => <option key={city} value={city}>{city}</option>)}</select>
            </Field>
            <Field id="event-date" label="Дата события" error={errors.event_date} hint="23.09 — 31.12.2026">
              <input {...inputProps('event_date', 'event-date', true)} type="date" min={MIN_EVENT_DATE} max={MAX_EVENT_DATE} required />
            </Field>
            <Field id="event-type" label="Тип события" error={errors.event_type} wide>
              <select {...inputProps('event_type', 'event-type')} required><option value="" disabled>Что планируете?</option>{EVENT_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </Field>
            <Field id="category" label="Кого ищете?" error={errors.category} wide>
              <select {...inputProps('category', 'category')} required><option value="" disabled>Выберите категорию</option>{CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select>
            </Field>
            <Field id="budget" label="Бюджет на подрядчика" error={errors.budget_kzt} hint="Максимальная сумма в тенге" wide>
              <div className="money-input"><input {...inputProps('budget_kzt', 'budget', true)} type="number" inputMode="numeric" min="1" max={Number.MAX_SAFE_INTEGER} step="1" placeholder="Например, 300000" required /><span className="currency" aria-hidden="true">₸</span></div>
            </Field>
          </div>
          <details className="optional" open={optionalOpen} onToggle={event => setOptionalOpen(event.currentTarget.open)}>
            <summary><span><span>Дополнительные пожелания</span> <span className="optional-note">необязательно</span></span></summary>
            <div className="form-grid">
              <Field id="duration" label="Длительность, ч" error={errors.duration_hours}>
                <input {...inputProps('duration_hours', 'duration')} type="number" inputMode="numeric" min="1" max={Number.MAX_SAFE_INTEGER} step="1" placeholder="Например, 5" />
              </Field>
              <Field id="language" label="Язык" error={errors.language}>
                <select {...inputProps('language', 'language')}>{LANGUAGES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </Field>
            </div>
          </details>
        </fieldset>
        <div className="form-actions">
          <Button className="search-button" type="submit" disabled={loading}>{loading ? <span className="loading-spinner" aria-hidden="true" /> : <Icon name="search" />}<span>{loading ? 'Ищем подрядчиков…' : 'Найти подрядчиков'}</span></Button>
          <Button variant="quiet" className="reset-button" disabled={loading} onClick={reset}>Сбросить</Button>
        </div>
        <p className="form-footnote">До 3 вариантов. С объяснением каждого выбора.</p>
        {!storageAvailable && <p className="storage-note">Браузер не сохраняет параметры. После закрытия страницы их нужно будет ввести снова.</p>}
      </form>
    </section>
  );
}
