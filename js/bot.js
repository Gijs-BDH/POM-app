/* ── POM Scripted Bot ──────────────────────────────────────────────────────
   100% scripted — no AI, no API, no guessing.

   Users can also type messages; typed input is matched against BOT_KEYWORD_MAP
   to find the most relevant scripted response. No AI inference is performed.

   Public API:
     triggerBot('event_id')          → open panel + show scripted message
     handleBotAction('action_id')    → run the matching placeholder action
──────────────────────────────────────────────────────────────────────────── */

// ── 1. Scripted responses ─────────────────────────────────────────────────────

const BOT_SCRIPTS = {

  "missing_field": {
    message: "Er is een verplicht veld niet ingevuld. Wil je zien welk veld het is?",
    actions: [
      { id: "highlight_field", label: "Toon het veld" }
    ]
  },

  "value_too_high": {
    message: "Deze waarde ligt boven het toegestane maximum. Je kunt de limiet aanpassen via Instellingen.",
    actions: [
      { id: "open_settings",  label: "Ga naar instellingen" },
      { id: "auto_fix",       label: "Automatisch corrigeren" }
    ]
  },

  "gebied_no_kavel": {
    message: "Er is nog geen kavel geselecteerd. Selecteer eerst een kavel op de kaart voordat je verdergaat.",
    actions: [
      { id: "start_selecteren", label: "Start kavel selectie" }
    ]
  },

  "pve_incomplete": {
    message: "Het Programma van Eisen is nog niet volledig ingevuld. Sommige stappen missen verplichte gegevens.",
    actions: [
      { id: "go_to_pve",        label: "Ga naar PVE" },
      { id: "show_incomplete",  label: "Toon ontbrekende stappen" }
    ]
  },

  "gebouw_not_linked": {
    message: "Deze gebouwvariant is nog niet gekoppeld aan een gebied of PVE. Koppel ze om een haalbaarheidsberekening te maken.",
    actions: [
      { id: "go_to_gebouw", label: "Open gebouwvariant" }
    ]
  },

  "save_success": {
    message: "Gegevens zijn opgeslagen. Wil je doorgaan naar de volgende stap?",
    actions: [
      { id: "next_step",  label: "Volgende stap" },
      { id: "close_bot",  label: "Sluiten" }
    ]
  }

};

// ── 2. Keyword → script mapping (for typed user input) ────────────────────────
//    Keywords are matched case-insensitively against the user's typed message.
//    First match wins. Add entries here to teach the bot new phrases.

const BOT_KEYWORD_MAP = [
  { keywords: ['kavel', 'perceel', 'selecteer', 'kaart'],     scriptId: 'gebied_no_kavel' },
  { keywords: ['pve', 'programma van eisen', 'eisen'],        scriptId: 'pve_incomplete' },
  { keywords: ['gebouw', 'koppel', 'koppeling', 'variant'],   scriptId: 'gebouw_not_linked' },
  { keywords: ['veld', 'leeg', 'verplicht', 'invullen'],      scriptId: 'missing_field' },
  { keywords: ['hoog', 'maximum', 'limiet', 'waarde'],        scriptId: 'value_too_high' },
  { keywords: ['opgeslagen', 'opslaan', 'klaar', 'volgende'], scriptId: 'save_success' },
];

// Fallback message shown when no keyword matches the user's input
const BOT_NO_MATCH =
  "Daar heb ik geen kant-en-klaar antwoord op. Ga door met het formulier — ik laat het weten als er iets aandacht nodig heeft.";

// First message shown when user opens the panel manually
const BOT_IDLE =
  "Hallo! Ik help u als er iets aandacht nodig heeft. U kunt ook een vraag typen hieronder.";


// ── 3. Inject HTML ────────────────────────────────────────────────────────────

(function injectBotUI() {
  const el = document.createElement('div');
  el.innerHTML = `
    <!-- Trigger button (top-right) -->
    <button id="pom-bot-btn" onclick="toggleBot()" title="POM Assistent" aria-label="POM Assistent openen">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span id="pom-bot-badge" class="pom-bot-badge hidden"></span>
    </button>

    <!-- Panel -->
    <div id="pom-bot-wrap" aria-live="polite" aria-label="POM Assistent">
      <div id="pom-bot-panel" role="dialog" aria-modal="false">

        <div id="pom-bot-header">
          <div id="pom-bot-avatar">P</div>
          <span id="pom-bot-title">POM Assistent</span>
          <button id="pom-bot-close" title="Sluiten" onclick="closeBot()">&times;</button>
        </div>

        <!-- Scrollable message log -->
        <div id="pom-bot-log"></div>

        <!-- Input row -->
        <div id="pom-bot-input-row">
          <input id="pom-bot-input" type="text" placeholder="Typ een vraag…"
                 onkeydown="if(event.key==='Enter') sendBotMessage()" autocomplete="off"/>
          <button id="pom-bot-send" onclick="sendBotMessage()" title="Verstuur">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    </div>`;

  while (el.firstChild) document.body.appendChild(el.firstChild);

  // Show idle greeting on first open
  _appendBotMessage(BOT_IDLE);
})();


// ── 4. Open / close ───────────────────────────────────────────────────────────

function toggleBot() {
  const wrap = document.getElementById('pom-bot-wrap');
  if (wrap.classList.contains('pom-bot-visible')) {
    closeBot();
  } else {
    _clearBadge();
    wrap.classList.remove('pom-bot-hidden');
    wrap.classList.add('pom-bot-visible');
    document.getElementById('pom-bot-input').focus();
  }
}

function closeBot() {
  const wrap = document.getElementById('pom-bot-wrap');
  wrap.classList.remove('pom-bot-visible');
  wrap.classList.add('pom-bot-hidden');
}


// ── 5. triggerBot(eventId) ────────────────────────────────────────────────────

function triggerBot(eventId) {
  const script = BOT_SCRIPTS[eventId];
  if (!script) {
    console.warn('[POM Bot] Unknown eventId:', eventId);
    return;
  }
  _appendBotMessage(script.message);
  if (script.actions && script.actions.length) _appendActions(script.actions);
  _showBadge();
  const wrap = document.getElementById('pom-bot-wrap');
  wrap.classList.remove('pom-bot-hidden');
  wrap.classList.add('pom-bot-visible');
}


// ── 6. sendBotMessage() — handles typed user input ────────────────────────────

function sendBotMessage() {
  const input = document.getElementById('pom-bot-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  _appendUserMessage(text);

  // Keyword match (case-insensitive)
  const lower = text.toLowerCase();
  const match = BOT_KEYWORD_MAP.find(entry =>
    entry.keywords.some(k => lower.includes(k))
  );

  if (match) {
    const script = BOT_SCRIPTS[match.scriptId];
    if (script) {
      _appendBotMessage(script.message);
      if (script.actions && script.actions.length) _appendActions(script.actions);
    }
  } else {
    _appendBotMessage(BOT_NO_MATCH);
  }
}


// ── 7. handleBotAction(actionId) ─────────────────────────────────────────────

function handleBotAction(actionId) {
  switch (actionId) {

    case 'highlight_field':
      closeBot();
      document.querySelectorAll('input[required], select[required]').forEach(el => {
        if (!el.value.trim()) {
          el.style.borderColor = '#EF4444';
          el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      break;

    case 'open_settings':
      closeBot();
      // window.location.href = 'instellingen.html';
      console.info('[POM Bot] Action: open_settings');
      break;

    case 'auto_fix':
      closeBot();
      console.info('[POM Bot] Action: auto_fix');
      break;

    case 'start_selecteren':
      closeBot();
      const selecteerBtn = document.getElementById('selecteer-btn');
      if (selecteerBtn) selecteerBtn.click();
      break;

    case 'go_to_pve':
      closeBot();
      // window.location.href = 'pve-stap-1.html';
      console.info('[POM Bot] Action: go_to_pve');
      break;

    case 'show_incomplete':
      closeBot();
      document.querySelectorAll('.nav-btn.inactive').forEach(btn => {
        btn.style.outline = '2px solid #F59E0B';
      });
      break;

    case 'go_to_gebouw':
      closeBot();
      // window.location.href = 'gebouw-overzicht.html';
      console.info('[POM Bot] Action: go_to_gebouw');
      break;

    case 'next_step':
      closeBot();
      const nextBtn = document.querySelector('#volgende-btn, [onclick*="naarStap"], [onclick*="naarVolgende"]');
      if (nextBtn) nextBtn.click();
      break;

    case 'close_bot':
      closeBot();
      break;

    default:
      console.warn('[POM Bot] Unhandled actionId:', actionId);
      closeBot();
  }
}


// ── Internal helpers ──────────────────────────────────────────────────────────

function _appendBotMessage(text) {
  const log = document.getElementById('pom-bot-log');
  const el  = document.createElement('div');
  el.className     = 'pom-bot-msg-bot';
  el.textContent   = text;
  log.appendChild(el);
  log.scrollTop    = log.scrollHeight;
}

function _appendUserMessage(text) {
  const log = document.getElementById('pom-bot-log');
  const el  = document.createElement('div');
  el.className     = 'pom-bot-msg-user';
  el.textContent   = text;
  log.appendChild(el);
  log.scrollTop    = log.scrollHeight;
}

function _appendActions(actions) {
  const log  = document.getElementById('pom-bot-log');
  const wrap = document.createElement('div');
  wrap.className = 'pom-bot-actions-row';
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className   = 'pom-bot-action-btn';
    btn.textContent = action.label;
    btn.addEventListener('click', () => handleBotAction(action.id));
    wrap.appendChild(btn);
  });
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

function _showBadge() {
  document.getElementById('pom-bot-badge')?.classList.remove('hidden');
  document.getElementById('pom-bot-btn')?.classList.add('pom-bot-btn-active');
}

function _clearBadge() {
  document.getElementById('pom-bot-badge')?.classList.add('hidden');
  document.getElementById('pom-bot-btn')?.classList.remove('pom-bot-btn-active');
}
