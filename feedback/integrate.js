export function integrateFeedbackSystem() {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = '/feedback/init-feedback.js';
  document.head.appendChild(script);
}

if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', integrateFeedbackSystem);
} else if (typeof window !== 'undefined') {
  integrateFeedbackSystem();
}
