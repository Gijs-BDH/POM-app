import { FeedbackManager } from './feedback-manager.js';

let feedbackManagerInstance = null;

export function initializeFeedback() {
  if (!feedbackManagerInstance) {
    feedbackManagerInstance = new FeedbackManager();
  }
  return feedbackManagerInstance;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeFeedback();
  });
}
