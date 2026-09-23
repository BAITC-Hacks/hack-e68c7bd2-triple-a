import { Component } from 'react';
import type { ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="fatal-error" role="alert"><h1>Не удалось открыть страницу</h1><p>В интерфейсе возникла ошибка. Обновите страницу. Если браузер сохранил параметры, они восстановятся после обновления.</p><button className="button button-primary" type="button" onClick={() => window.location.reload()}>Обновить страницу</button></main>;
    return this.props.children;
  }
}
