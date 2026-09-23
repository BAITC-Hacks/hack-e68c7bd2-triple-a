import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { searchContractors } from '../services/searchApi';

vi.mock('../services/searchApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../services/searchApi')>(),
  searchContractors: vi.fn(),
}));

const searchMock = vi.mocked(searchContractors);
type SearchResponse = Awaited<ReturnType<typeof searchContractors>>;
type User = ReturnType<typeof userEvent.setup>;

const successResponse = {
  status: 'ok',
  message: 'Подобрали исполнителя под ваши условия.',
  results: [{
    id: 'photographer-1',
    name: 'Айдана Нур',
    category: 'Фотограф',
    city: 'Алматы',
    price_from_kzt: 250000,
    explanation: 'Снимает свадьбы, свободна в выбранную дату и укладывается в бюджет.',
    synthetic: true,
  }],
} satisfies SearchResponse;

const baseRequest = {
  city: 'Алматы',
  event_date: '2026-12-01',
  event_type: 'свадьба',
  category: 'Фотограф',
  budget_kzt: 300000,
  duration_hours: null,
  language: null,
};

async function fillRequired(user: User) {
  await user.selectOptions(screen.getByLabelText('Город'), 'Алматы');
  fireEvent.change(screen.getByLabelText('Дата события'), {
    target: { value: '2026-12-01' },
  });
  await user.selectOptions(screen.getByLabelText('Тип события'), 'свадьба');
  await user.selectOptions(screen.getByLabelText('Кого ищете?'), 'Фотограф');
  await user.type(screen.getByLabelText('Бюджет на подрядчика'), '300000');
}

async function submit(user: User) {
  await user.click(screen.getByRole('button', { name: 'Найти подрядчиков' }));
}

beforeEach(() => {
  searchMock.mockReset();
  searchMock.mockResolvedValue(successResponse);
});

describe('contractor search', () => {
  it('validates the required fields and submits a typed request after they are corrected', async () => {
    const user = userEvent.setup();
    render(<App />);

    await submit(user);

    expect(searchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Город')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Дата события')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Тип события')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Кого ищете?')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Бюджет на подрядчика')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('Город')).toHaveFocus());

    await fillRequired(user);
    await submit(user);

    await screen.findByRole('heading', { name: 'Айдана Нур' });
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toEqual(baseRequest);
    expect(searchMock.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it('processes optional preferences and sends null when they are cleared', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillRequired(user);
    await user.click(screen.getByText('Дополнительные пожелания'));
    expect(screen.getByText('Дополнительные пожелания').closest('details')).toHaveAttribute('open');
    await user.type(screen.getByLabelText('Длительность, ч'), '5');
    await user.selectOptions(screen.getByLabelText('Язык'), 'казахский');
    await submit(user);

    await screen.findByRole('heading', { name: 'Айдана Нур' });
    expect(searchMock.mock.calls[0]?.[0]).toEqual({
      ...baseRequest,
      duration_hours: 5,
      language: 'казахский',
    });

    await user.clear(screen.getByLabelText('Длительность, ч'));
    await user.selectOptions(screen.getByLabelText('Язык'), '');
    await submit(user);

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(2));
    expect(searchMock.mock.calls[1]?.[0]).toEqual(baseRequest);
  });

  it('shows result details and treats text from the service as literal text', async () => {
    const user = userEvent.setup();
    const unsafeText = '<img src=x onerror=alert(1)>';
    searchMock.mockResolvedValue({
      ...successResponse,
      message: '<script>alert("message")</script>',
      results: successResponse.results.map((result) => ({ ...result, explanation: unsafeText })),
    });
    render(<App />);
    await fillRequired(user);
    await submit(user);

    await screen.findByRole('heading', { name: 'Айдана Нур' });
    const card = screen.getByRole('article');
    expect(within(card).getByText('Фотограф · Алматы')).toBeInTheDocument();
    expect(card).toHaveTextContent(/250\s*000\s*₸/);
    expect(within(card).getByText(unsafeText)).toBeInTheDocument();
    expect(within(card).getByText(/синтетический профиль для демо/i)).toBeInTheDocument();
    expect(screen.getByText('<script>alert("message")</script>')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Подходящие подрядчики' }).querySelector('img, script')).toBeNull();
  });

  it('disables the form while loading and ignores a response received after cancellation', async () => {
    const user = userEvent.setup();
    let resolveSearch: ((response: SearchResponse) => void) | undefined;
    searchMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSearch = resolve;
    }));
    render(<App />);
    await fillRequired(user);
    await submit(user);

    expect(screen.getByRole('button', { name: 'Ищем подрядчиков…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeDisabled();
    expect(screen.getByLabelText('Город')).toBeDisabled();
    expect(screen.getByLabelText('Бюджет на подрядчика')).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Подходящие подрядчики' })).toHaveAttribute('aria-busy', 'true');

    await user.click(screen.getByRole('button', { name: 'Отменить поиск' }));

    expect(searchMock.mock.calls[0]?.[1]?.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Найти подрядчиков' })).toBeEnabled();
    expect(screen.getByLabelText('Город')).toBeEnabled();
    await waitFor(() => expect(screen.getByLabelText('Город')).toHaveFocus());
    await act(async () => {
      resolveSearch?.(successResponse);
    });
    expect(screen.queryByRole('heading', { name: 'Айдана Нур' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Не удалось завершить поиск' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Подходящие подрядчики' })).toHaveAttribute('aria-busy', 'false');
  });

  it('retries a failed search using the same request', async () => {
    const user = userEvent.setup();
    searchMock.mockRejectedValueOnce(new Error('Сервис временно недоступен.'));
    render(<App />);
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByText('Сервис временно недоступен.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));

    await screen.findByRole('heading', { name: 'Айдана Нур' });
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(searchMock.mock.calls[1]?.[0]).toEqual(baseRequest);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('recovers from a request timeout and allows the user to retry', async () => {
    const user = userEvent.setup();
    searchMock.mockImplementationOnce(() => new Promise(() => {}));
    render(<App />);
    await fillRequired(user);

    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Найти подрядчиков' }));
      await act(async () => {
        vi.advanceTimersByTime(45000);
      });
      expect(screen.getByText('Поиск занял больше времени, чем ожидалось. Попробуйте ещё раз.')).toBeInTheDocument();
      expect(searchMock.mock.calls[0]?.[1]?.aborted).toBe(true);
      expect(screen.getByRole('button', { name: 'Найти подрядчиков' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }

    await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    await screen.findByRole('heading', { name: 'Айдана Нур' });
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(searchMock.mock.calls[1]?.[0]).toEqual(baseRequest);
  });

  it.each([
    ['no_category', 'Такой категории пока нет'],
    ['no_match', 'Совпадений пока нет'],
  ] as const)('shows the %s empty state and lets the user return to the form', async (status, title) => {
    const user = userEvent.setup();
    searchMock.mockResolvedValue({ status, message: 'Измените условия поиска.', results: [] });
    render(<App />);
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Подходящие подрядчики' })).getByText('Измените условия поиска.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Изменить параметры' }));
    expect(screen.getByLabelText('Город')).toHaveFocus();
  });

  it('restores saved input and resets both the draft and the results', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText('Город'), 'Астана');
    firstRender.unmount();

    const restoredRender = render(<App />);
    expect(screen.getByLabelText('Город')).toHaveValue('Астана');
    expect(screen.getByLabelText('Дата события')).toHaveValue('2026-12-01');
    expect(screen.getByLabelText('Тип события')).toHaveValue('свадьба');
    expect(screen.getByLabelText('Кого ищете?')).toHaveValue('Фотограф');
    expect(screen.getByLabelText('Бюджет на подрядчика')).toHaveValue(300000);
    await submit(user);
    await screen.findByRole('heading', { name: 'Айдана Нур' });
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));

    expect(screen.getByLabelText('Город')).toHaveValue('');
    expect(screen.getByLabelText('Дата события')).toHaveValue('');
    expect(screen.getByLabelText('Тип события')).toHaveValue('');
    expect(screen.getByLabelText('Кого ищете?')).toHaveValue('');
    expect(screen.getByLabelText('Бюджет на подрядчика')).toHaveValue(null);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    restoredRender.unmount();
    render(<App />);
    expect(screen.getByLabelText('Город')).toHaveValue('');
    expect(screen.getByLabelText('Бюджет на подрядчика')).toHaveValue(null);
    expect(screen.getByLabelText('Дата события')).toHaveValue('');
  });

  it('sorts contractors by price and restores recommendation order without another search', async () => {
    const user = userEvent.setup();
    searchMock.mockResolvedValue({
      ...successResponse,
      results: [
        ...successResponse.results,
        { ...successResponse.results[0]!, id: 'photographer-2', name: 'Ерлан Касым', price_from_kzt: 180000 },
      ],
    });
    render(<App />);
    await fillRequired(user);
    await submit(user);
    await screen.findByRole('heading', { name: 'Айдана Нур' });

    const names = () => screen.getAllByRole('article').map(card => within(card).getByRole('heading').textContent);
    const resultStatus = within(screen.getByRole('region', { name: 'Подходящие подрядчики' })).getByRole('status');
    expect(names()).toEqual(['Айдана Нур', 'Ерлан Касым']);
    expect(screen.getByRole('button', { name: 'Рекомендации' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'По цене' }));

    expect(names()).toEqual(['Ерлан Касым', 'Айдана Нур']);
    expect(screen.getByRole('button', { name: 'По цене' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Рекомендации' })).toHaveAttribute('aria-pressed', 'false');
    expect(resultStatus).toHaveTextContent('Сначала варианты с меньшей ценой.');

    await user.click(screen.getByRole('button', { name: 'Рекомендации' }));

    expect(names()).toEqual(['Айдана Нур', 'Ерлан Касым']);
    expect(screen.getByRole('button', { name: 'По цене' })).toHaveAttribute('aria-pressed', 'false');
    expect(resultStatus).toHaveTextContent('Варианты в порядке рекомендаций.');
    expect(searchMock).toHaveBeenCalledTimes(1);
  });
});

describe('navigation', () => {
  it('preserves the selected section at the page bottom and updates it on history hash changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: 'Основная навигация' });
    const searchLink = within(navigation).getByRole('link', { name: 'Подобрать подрядчика' });
    const howLink = within(navigation).getByRole('link', { name: 'Как это работает' });

    await user.click(howLink);
    await waitFor(() => expect(window.location.hash).toBe('#how-it-works'));
    expect(howLink).toHaveAttribute('aria-current', 'location');
    expect(searchLink).not.toHaveAttribute('aria-current');

    await user.click(searchLink);
    await waitFor(() => expect(window.location.hash).toBe('#search'));
    expect(searchLink).toHaveAttribute('aria-current', 'location');

    expect(window.scrollY + window.innerHeight).toBeGreaterThanOrEqual(document.documentElement.scrollHeight);
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(searchLink).toHaveAttribute('aria-current', 'location');
    expect(howLink).not.toHaveAttribute('aria-current');

    act(() => {
      window.history.replaceState(null, '', '#how-it-works');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(howLink).toHaveAttribute('aria-current', 'location');
    expect(searchLink).not.toHaveAttribute('aria-current');
  });

  it('opens and closes the mobile menu with selection and Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const menuButton = screen.getByRole('button', { name: 'Открыть меню' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(screen.getByRole('button', { name: 'Закрыть меню' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('link', { name: 'Как это работает' }));
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    await user.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});
