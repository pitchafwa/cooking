import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Relative base + hash routing lets the build work from any GitHub Pages path.
export default defineConfig({ base: './', plugins: [preact()] });
