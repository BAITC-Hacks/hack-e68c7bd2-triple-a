import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InfoDialog } from '../components/ui/InfoDialog';

describe('information dialogs', () => {
  it('opens from its trigger, labels the dialog, and closes with the close button', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<InfoDialog trigger="Подрядчикам" title="Работа с Shabyt" onOpen={onOpen}><p>Информация о каталоге.</p></InfoDialog>);
    const trigger = screen.getByRole('button', { name: 'Подрядчикам' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Работа с Shabyt' });
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('Информация о каталоге.')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Закрыть окно' })).toHaveFocus();
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole('button', { name: 'Закрыть окно' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps content clicks open and closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<InfoDialog trigger="О сервисе" title="О Shabyt"><p>Подбор исполнителей для события.</p></InfoDialog>);
    const trigger = screen.getByRole('button', { name: 'О сервисе' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'О Shabyt' });

    await user.click(within(dialog).getByText('Подбор исполнителей для события.'));
    expect(dialog).toHaveAttribute('open');

    fireEvent.click(dialog);

    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
  });

  it('handles the native Escape cancellation event and can be reopened', async () => {
    const user = userEvent.setup();
    render(<InfoDialog trigger="Помощь" title="Помощь с поиском"><p>Заполните параметры события.</p></InfoDialog>);
    const trigger = screen.getByRole('button', { name: 'Помощь' });
    await user.click(trigger);

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Помощь с поиском' })).toHaveAttribute('open');
  });

  it('synchronizes state after the browser closes the dialog', async () => {
    const user = userEvent.setup();
    render(<InfoDialog trigger="Условия" title="Условия сервиса"><p>Цена указана от.</p></InfoDialog>);
    const trigger = screen.getByRole('button', { name: 'Условия' });
    await user.click(trigger);
    const dialog = screen.getByRole<HTMLDialogElement>('dialog');

    act(() => dialog.close());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });
});
