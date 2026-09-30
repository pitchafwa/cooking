import { signal } from '@preact/signals';

/** Tiny hash router so the app works on GitHub Pages without server rewrites. */
const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'recipes';
export const route = signal(read());
window.addEventListener('hashchange', () => {
  route.value = read();
  window.scrollTo(0, 0);
});
export const go = (path: string) => (location.hash = '#/' + encodeURIComponent(path).replace(/%2F/g, '/'));
