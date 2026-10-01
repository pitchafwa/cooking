import { render } from 'preact';
import { App } from './App';
import { loadRecipes } from './data';
import { initSync } from './sync';
import './styles.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* offline cache is optional */ }));
}

loadRecipes();
initSync();
render(<App />, document.getElementById('app')!);
