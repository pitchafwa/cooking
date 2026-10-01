import { render } from 'preact';
import { App } from './App';
import { loadRecipes } from './data';
import { initSync } from './sync';
import './styles.css';

loadRecipes();
initSync();
render(<App />, document.getElementById('app')!);
