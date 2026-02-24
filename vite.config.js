import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const injectFeedbackPlugin = () => {
  return {
    name: 'inject-feedback',
    transformIndexHtml(html) {
      return html.replace(
        '</body>',
        '<script src="/feedback-loader.js"></script>\n</body>'
      );
    },
    generateBundle() {
      const feedbackDir = path.join(__dirname, 'dist', 'feedback');
      if (!fs.existsSync(feedbackDir)) {
        fs.mkdirSync(feedbackDir, { recursive: true });
      }

      fs.copyFileSync(
        path.join(__dirname, 'feedback', 'feedback-ui.html'),
        path.join(feedbackDir, 'feedback-ui.html')
      );
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectFeedbackPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'nieuw-project-1': resolve(__dirname, 'nieuw-project-1.html'),
        'nieuw-project-2': resolve(__dirname, 'nieuw-project-2.html'),
        'nieuw-project-3': resolve(__dirname, 'nieuw-project-3.html'),
        'project-overzicht': resolve(__dirname, 'project-overzicht.html'),
        'project-instellingen': resolve(__dirname, 'project-instellingen.html'),
        'pve-stap-1': resolve(__dirname, 'pve-stap-1.html'),
        'pve-stap-2': resolve(__dirname, 'pve-stap-2.html'),
        'pve-stap-3': resolve(__dirname, 'pve-stap-3.html'),
        'pve-stap-4': resolve(__dirname, 'pve-stap-4.html'),
        'pve-stap-4-begeleid': resolve(__dirname, 'pve-stap-4-begeleid.html'),
        'pve-stap-4-vlekkenplan': resolve(__dirname, 'pve-stap-4-vlekkenplan.html'),
        'pve-stap-5': resolve(__dirname, 'pve-stap-5.html'),
        'pve-instellingen': resolve(__dirname, 'pve-instellingen.html'),
        'gebied': resolve(__dirname, 'gebied.html'),
        'gebied-stap-2': resolve(__dirname, 'gebied-stap-2.html'),
        'gebied-stap-3': resolve(__dirname, 'gebied-stap-3.html'),
        'gebied-stap-4': resolve(__dirname, 'gebied-stap-4.html'),
        'gebied-stap-5': resolve(__dirname, 'gebied-stap-5.html'),
        'gebied-instellingen': resolve(__dirname, 'gebied-instellingen.html'),
        'gebouw': resolve(__dirname, 'gebouw.html'),
        'gebouw-stap-2': resolve(__dirname, 'gebouw-stap-2.html'),
        'gebouw-stap-3': resolve(__dirname, 'gebouw-stap-3.html'),
        'besluit': resolve(__dirname, 'besluit.html'),
        'walkthrough': resolve(__dirname, 'walkthrough.html'),
      }
    }
  }
})
