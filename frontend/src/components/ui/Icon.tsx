type IconName = 'search' | 'document' | 'shield' | 'menu' | 'close' | 'arrow' | 'sparkles' | 'camera' | 'mic' | 'flower' | 'venue' | 'calendar' | 'check' | 'pin' | 'music' | 'copy' | 'sliders';
const paths: Record<IconName, string> = {
  search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  document: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h5',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4M18 4h4',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Zm12 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4M8 22h8',
  flower: 'M12 8C6 0 1 7 7 11c-8 1-5 9 2 7-1 8 7 8 7 1 7 4 10-4 3-7 7-5 0-10-4-5-1-7-8-5-6 1M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  venue: 'M3 21h18M5 21V9l7-6 7 6v12M9 21v-7h6v7M3 10l9-8 9 8M10 9h4',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 10h18M8 15h2M14 15h2',
  check: 'm5 12 4 4L19 6', pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
  music: 'M9 18V5l11-2v13M9 8l11-2M9 18c0 4-7 4-7 1 0-3 7-4 7-1ZM20 16c0 4-7 4-7 1 0-3 7-4 7-1Z',
  copy: 'M9 8h10a2 2 0 0 1 2 2v10H9V8ZM5 16H3V3h12v2',
  sliders: 'M4 7h5m4 0h7M4 17h9m4 0h3M9 4v6M17 14v6',
};
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={paths[name]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function categoryIcon(category: string): IconName {
  if (/фото|видео/i.test(category)) return 'camera';
  if (/ведущий/i.test(category)) return 'mic';
  if (/флорист|декоратор|сувенир/i.test(category)) return 'flower';
  if (/зал|отель|ресторан|площадка/i.test(category)) return 'venue';
  return 'music';
}
