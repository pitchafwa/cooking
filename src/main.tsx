import { render } from 'preact';
import { App } from './App';
import { loadRecipes } from './data';
import './styles.css';

loadRecipes();
render(<App />, document.getElementById('app')!);
