import { createApp } from 'vue';
import App from './App.vue';
import './assets/style.css';
import { i18n, loadLocale } from './i18n';
import { usePreferences } from './composables/usePreferences';
import { useTheme } from './composables/useTheme';
import { createVueErrorHandler, installErrorReporters } from './utils/errorLogReporter';

installErrorReporters();

async function bootstrap() {
  const { prefs } = usePreferences();
  const { initTheme } = useTheme();

  await loadLocale(prefs.value.locale);
  await initTheme();

  const app = createApp(App);
  app.config.errorHandler = createVueErrorHandler();
  app.use(i18n).mount('#app');
}

void bootstrap();
