(() => {
  const loadFeedbackSystem = () => {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'feedback-system';

    fetch('/feedback/feedback-ui.html')
      .then(response => response.text())
      .then(html => {
        uiContainer.innerHTML = html;
        document.body.appendChild(uiContainer);

        const managerScript = document.createElement('script');
        managerScript.type = 'module';
        managerScript.textContent = `
          class FeedbackManager {
            constructor() {
              this.apiUrl = '${window.location.origin.includes('localhost') ? 'http://localhost:54321' : 'https://jmrczihxwwdglvilwdnw.supabase.co'}/functions/v1/feedback';
              this.apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmN6aWh4d3dkZ2x2aWx3ZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTAzNDMsImV4cCI6MjA4NzUyNjM0M30.t_NU5jU0vM2XfTcWDblqPGMpD_TlUEK7cKYRpD33tGA';
              this.feedbackList = [];
              this.activeFilters = new Set(['waiting', 'active']);
              this.searchQuery = '';

              this.attachEventListeners();
              this.loadFeedbackList();
            }

            attachEventListeners() {
              document.addEventListener('click', (e) => {
                if (e.target.id === 'give-feedback-btn' || e.target.closest('#give-feedback-btn')) {
                  this.openGiveFeedbackPopup();
                } else if (e.target.id === 'check-feedback-btn' || e.target.closest('#check-feedback-btn')) {
                  this.openCheckFeedbackPopup();
                } else if (e.target.id === 'close-give-feedback' || e.target.closest('#close-give-feedback') || e.target.id === 'cancel-feedback-btn') {
                  this.closeGiveFeedbackPopup();
                } else if (e.target.id === 'close-check-feedback' || e.target.closest('#close-check-feedback')) {
                  this.closeCheckFeedbackPopup();
                } else if (e.target.id === 'give-feedback-popup') {
                  this.closeGiveFeedbackPopup();
                } else if (e.target.id === 'check-feedback-popup') {
                  this.closeCheckFeedbackPopup();
                } else if (e.target.id === 'feedback-error-modal') {
                  this.closeErrorModal();
                } else if (e.target.id === 'submit-feedback-btn') {
                  this.submitFeedback();
                } else if (e.target.classList.contains('filter-btn')) {
                  this.toggleFilter(e.target.dataset.filter);
                } else if (e.target.id === 'mark-all-done-btn') {
                  this.markAllDone();
                } else if (e.target.id === 'close-error-modal') {
                  this.closeErrorModal();
                } else if (e.target.closest('.feedback-item')) {
                  const item = e.target.closest('.feedback-item');
                  if (e.target.classList.contains('state-select')) {
                    this.updateFeedbackState(item.dataset.id, e.target.value);
                  } else {
                    this.toggleFeedbackItem(item);
                  }
                }
              });

              document.addEventListener('input', (e) => {
                if (e.target.id === 'feedback-search') {
                  this.searchQuery = e.target.value.toLowerCase();
                  this.renderFeedbackList();
                }
              });
            }

            async openGiveFeedbackPopup() {
              const popup = document.getElementById('give-feedback-popup');
              const pageInput = document.getElementById('feedback-page');

              const pageName = this.getCurrentPageName();
              pageInput.value = pageName;

              document.getElementById('feedback-title').value = '';
              document.getElementById('feedback-description').value = '';

              popup.classList.remove('hidden');
            }

            closeGiveFeedbackPopup() {
              const popup = document.getElementById('give-feedback-popup');
              popup.classList.add('hidden');
            }

            async openCheckFeedbackPopup() {
              const popup = document.getElementById('check-feedback-popup');
              popup.classList.remove('hidden');
              await this.loadFeedbackList();
            }

            closeCheckFeedbackPopup() {
              const popup = document.getElementById('check-feedback-popup');
              popup.classList.add('hidden');
            }

            getCurrentPageName() {
              const path = window.location.pathname;
              const segments = path.split('/').filter(s => s);
              const filename = segments[segments.length - 1] || 'index.html';
              return filename.replace('.html', '').replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
            }

            async submitFeedback() {
              const title = document.getElementById('feedback-title').value.trim();
              const description = document.getElementById('feedback-description').value.trim();
              const page = document.getElementById('feedback-page').value;

              if (!title) {
                this.showError('Please enter a title');
                return;
              }

              if (!description) {
                this.showError('Please enter a description');
                return;
              }

              const submitBtn = document.getElementById('submit-feedback-btn');
              submitBtn.disabled = true;
              submitBtn.textContent = 'Submitting...';

              try {
                const response = await fetch(this.apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${this.apiKey}\`,
                    'apikey': this.apiKey
                  },
                  body: JSON.stringify({
                    page,
                    title,
                    description,
                    image: ''
                  })
                });

                if (!response.ok) {
                  throw new Error('Failed to submit feedback');
                }

                this.closeGiveFeedbackPopup();
                this.loadFeedbackList();
              } catch (error) {
                console.error('Submit failed:', error);
                this.showError('Failed to submit feedback. Please try again.');
              } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Feedback';
              }
            }

            async loadFeedbackList() {
              try {
                const response = await fetch(this.apiUrl, {
                  method: 'GET',
                  headers: {
                    'Authorization': \`Bearer \${this.apiKey}\`,
                    'apikey': this.apiKey
                  }
                });

                if (!response.ok) {
                  throw new Error('Failed to load feedback');
                }

                this.feedbackList = await response.json();
                this.renderFeedbackList();
                this.updateBadge();
              } catch (error) {
                console.error('Load failed:', error);
                this.showError('Failed to load feedback list.');
              }
            }

            renderFeedbackList() {
              const container = document.getElementById('feedback-list');
              if (!container) return;

              const filtered = this.feedbackList.filter(item => {
                const matchesFilter = this.activeFilters.has(item.state);
                const matchesSearch = !this.searchQuery ||
                  item.title.toLowerCase().includes(this.searchQuery) ||
                  item.description.toLowerCase().includes(this.searchQuery);
                return matchesFilter && matchesSearch;
              });

              if (filtered.length === 0) {
                container.innerHTML = \`
                  <div class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p>No feedback items found</p>
                  </div>
                \`;
                return;
              }

              container.innerHTML = filtered.map(item => this.renderFeedbackItem(item)).join('');
            }

            renderFeedbackItem(item) {
              const stateColors = {
                waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                active: 'bg-blue-100 text-blue-800 border-blue-300',
                done: 'bg-green-100 text-green-800 border-green-300'
              };

              const date = new Date(item.created_at).toLocaleDateString();

              return \`
                <div class="feedback-item border border-gray-300 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer" data-id="\${item.id}">
                  <div class="p-4 bg-white flex items-center justify-between">
                    <div class="flex-1">
                      <h3 class="font-semibold text-gray-800 text-lg">\${this.escapeHtml(item.title)}</h3>
                      <p class="text-sm text-gray-500 mt-1">\${item.page} • \${date}</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="px-3 py-1 rounded-full text-xs font-medium border \${stateColors[item.state]}">
                        \${item.state.charAt(0).toUpperCase() + item.state.slice(1)}
                      </span>
                      <svg class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="feedback-details hidden p-4 bg-gray-50 border-t border-gray-200">
                    <div class="mb-4">
                      <h4 class="font-medium text-gray-700 mb-2">Description</h4>
                      <p class="text-gray-600">\${this.escapeHtml(item.description)}</p>
                    </div>
                    <div>
                      <label class="block font-medium text-gray-700 mb-2">Change State</label>
                      <select class="state-select px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" onclick="event.stopPropagation()">
                        <option value="waiting" \${item.state === 'waiting' ? 'selected' : ''}>Waiting</option>
                        <option value="active" \${item.state === 'active' ? 'selected' : ''}>Active</option>
                        <option value="done" \${item.state === 'done' ? 'selected' : ''}>Done</option>
                      </select>
                    </div>
                  </div>
                </div>
              \`;
            }

            toggleFeedbackItem(itemElement) {
              const details = itemElement.querySelector('.feedback-details');
              const arrow = itemElement.querySelector('svg:last-child');

              details.classList.toggle('hidden');
              arrow.classList.toggle('rotate-180');
            }

            toggleFilter(filter) {
              const btn = document.querySelector(\`[data-filter="\${filter}"]\`);

              if (this.activeFilters.has(filter)) {
                this.activeFilters.delete(filter);
                btn.classList.remove('bg-yellow-100', 'text-yellow-800', 'border-yellow-300', 'bg-blue-100', 'text-blue-800', 'border-blue-300', 'bg-green-100', 'text-green-800', 'border-green-300');
                btn.classList.add('bg-gray-200', 'text-gray-500', 'border-gray-300', 'opacity-50');
              } else {
                this.activeFilters.add(filter);
                btn.classList.remove('bg-gray-200', 'text-gray-500', 'border-gray-300', 'opacity-50');

                if (filter === 'waiting') {
                  btn.classList.add('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
                } else if (filter === 'active') {
                  btn.classList.add('bg-blue-100', 'text-blue-800', 'border-blue-300');
                } else if (filter === 'done') {
                  btn.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
                }
              }

              this.renderFeedbackList();
            }

            async updateFeedbackState(id, newState) {
              try {
                const response = await fetch(\`\${this.apiUrl}/\${id}\`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${this.apiKey}\`,
                    'apikey': this.apiKey
                  },
                  body: JSON.stringify({ state: newState })
                });

                if (!response.ok) {
                  throw new Error('Failed to update state');
                }

                await this.loadFeedbackList();
              } catch (error) {
                console.error('Update failed:', error);
                this.showError('Failed to update feedback state.');
              }
            }

            async markAllDone() {
              if (!confirm('Mark all non-done feedback as done?')) {
                return;
              }

              try {
                const response = await fetch(\`\${this.apiUrl}/mark-all-done\`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': \`Bearer \${this.apiKey}\`,
                    'apikey': this.apiKey
                  }
                });

                if (!response.ok) {
                  throw new Error('Failed to mark all done');
                }

                await this.loadFeedbackList();
              } catch (error) {
                console.error('Mark all done failed:', error);
                this.showError('Failed to mark all as done.');
              }
            }

            updateBadge() {
              const badge = document.getElementById('feedback-badge');
              if (!badge) return;

              const count = this.feedbackList.filter(item => item.state !== 'done').length;

              if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
              } else {
                badge.classList.add('hidden');
              }
            }

            showError(message) {
              const modal = document.getElementById('feedback-error-modal');
              const messageEl = document.getElementById('feedback-error-message');

              if (modal && messageEl) {
                messageEl.textContent = message;
                modal.classList.remove('hidden');
              } else {
                alert(message);
              }
            }

            closeErrorModal() {
              const modal = document.getElementById('feedback-error-modal');
              if (modal) {
                modal.classList.add('hidden');
              }
            }

            escapeHtml(text) {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            }
          }

          new FeedbackManager();
        `;
        document.body.appendChild(managerScript);
      })
      .catch(error => {
        console.error('Failed to load feedback system:', error);
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeedbackSystem);
  } else {
    loadFeedbackSystem();
  }
})();
