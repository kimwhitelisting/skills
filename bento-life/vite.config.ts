import { defineConfig } from 'vite';

// base './' so the build also works when wrapped by Capacitor (file:// / app scheme)
export default defineConfig({ base: './' });
