/* ── POM Scripted Bot ──────────────────────────────────────────────────────
   100% scripted — no AI, no API, no guessing.

   Users can also type messages; typed input is matched against BOT_KEYWORD_MAP
   to find the most relevant scripted response. No AI inference is performed.

   Public API:
     triggerBot('event_id')          → show scripted message in the fixed card
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
            { id: "open_settings", label: "Ga naar instellingen" },
            { id: "auto_fix", label: "Automatisch corrigeren" }
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
            { id: "go_to_pve", label: "Ga naar PVE" },
            { id: "show_incomplete", label: "Toon ontbrekende stappen" }
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
            { id: "next_step", label: "Volgende stap" },
            { id: "close_bot", label: "Sluiten" }
        ]
    },

    "ambitie_dimensies_niet_bekeken": {
        message: "Ik zie dat je nog niet alle instellingen hebt bekeken, kijk ook eens naar jouw ambities op het vlak van een duurzame school, een veilige school en een digitale school.",
        actions: []
    },

    "besluit_weinig_varianten_alle_gekoppeld": {
        message: "Je hebt momenteel minder dan 3 gebouwvarianten. Voor een goede vergelijking adviseren wij minimaal 3 varianten te maken. Wil je een nieuwe variant aanmaken?",
        actions: [
            { id: "go_to_gebouw_nieuw", label: "Maak nieuwe variant" }
        ]
    },

    "planning_intro": {
        message: "Welkom bij de planning! POM helpt je om in <strong style=\"color:var(--primary)\">7 weken</strong> van start naar uitvraag te gaan. Stel snel meerdere scenario's op en bespreek ze tweewekelijks met alle stakeholders. Zo werk je efficiënt toe naar de volgende stap en krijg je direct inzicht in de haalbaarheid van de businesscase.",
        actions: [
            { id: "close_bot", label: "Aan de slag" }
        ]
    },

    "gebouw_geen_opties": {
        message: "Er zijn geen valide gebouwopties gevonden die binnen de huidige specificaties vallen. Probeer een andere PVE- of gebiedvariant te maken.",
        actions: []
    }

};

// ── 2. Keyword → script mapping (for typed user input) ────────────────────────

const BOT_KEYWORD_MAP = [
    { keywords: ['kavel', 'perceel', 'selecteer', 'kaart'], scriptId: 'gebied_no_kavel' },
    { keywords: ['pve', 'programma van eisen', 'eisen'], scriptId: 'pve_incomplete' },
    { keywords: ['gebouw', 'koppel', 'koppeling', 'variant'], scriptId: 'gebouw_not_linked' },
    { keywords: ['veld', 'leeg', 'verplicht', 'invullen'], scriptId: 'missing_field' },
    { keywords: ['hoog', 'maximum', 'limiet', 'waarde'], scriptId: 'value_too_high' },
    { keywords: ['opgeslagen', 'opslaan', 'klaar', 'volgende'], scriptId: 'save_success' },
];

// Fallback message shown when no keyword matches the user's input
const BOT_NO_MATCH =
    "Daar heb ik geen kant-en-klaar antwoord op. Ga door met het formulier — ik laat het weten als er iets aandacht nodig heeft.";

// Idle message shown on page load and after reset
const BOT_IDLE =
    "Hallo! Ik help u als er iets aandacht nodig heeft. U kunt ook een vraag typen hieronder.";


// ── 3. Inject HTML ────────────────────────────────────────────────────────────

(function injectBotUI() {
    var botHtml = `
    <div id="pom-bot-wrap" aria-live="polite" aria-label="POM Assistent">
      <div id="pom-bot-panel" role="complementary">

        <div id="pom-bot-header">
          <div id="pom-bot-avatar"><img src="public/pommie.png" alt="POM" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/></div>
          <span id="pom-bot-title">POM Assistent</span>
        </div>

        <div id="pom-bot-log"></div>

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

    // On standard pages, the page card is body > div.mx-auto.
    // Wrap all its existing children in #pom-page-content so the bot can be
    // a consistent right-column sibling — always at the same position.
    var specificLocation = document.querySelector('[data-role="bot"]');
    if (!specificLocation) {
        const pageCard = document.querySelector('body > div[class~="mx-auto"]');

        if (pageCard) {
            const contentWrap = document.createElement('div');
            contentWrap.id = 'pom-page-content';
            while (pageCard.firstChild) contentWrap.appendChild(pageCard.firstChild);
            pageCard.appendChild(contentWrap);
        }

        const el = document.createElement('div');
        el.innerHTML = botHtml;

        // Append bot as right-column sibling inside the page card.
        // Falls back to body on special pages (walkthroughs, print, landing).
        //////////////////////////////////////////////////////////////////////////////////////herooooo/////////////////////

        // const target = pageCard || document.body;
        const target = document.body;
        while (el.firstChild) target.appendChild(el.firstChild);

        // Activate the flex layout NOW (after all inline scripts have already run
        // and canvas/map sizes have been measured), then fire resize so any
        // Konva stages, Leaflet maps, or other sized elements re-measure correctly.
        if (pageCard) {
            pageCard.classList.add('pom-no-card');
            // pageCard.classList.add('pom-has-bot');
            window.dispatchEvent(new Event('resize'));
        }
    }
    else {
        specificLocation.innerHTML = botHtml;
    }


    _appendBotMessage(BOT_IDLE);
})();


// ── 4. Reset ──────────────────────────────────────────────────────────────────

// Kept for backward compat — called by action handlers
function closeBot() {
    const log = document.getElementById('pom-bot-log');
    if (log) {
        log.innerHTML = '';
        _appendBotMessage(BOT_IDLE);
    }
}

// No-op — panel is always visible
function toggleBot() { }


// ── 5. triggerBot(eventId) / triggerBotMessage(message, actions) ──────────────

function triggerBotMessage(message, actions) {
    _appendBotMessage(message);
    if (actions && actions.length) _appendActions(actions);
}

function triggerBot(eventId) {
    const script = BOT_SCRIPTS[eventId];
    if (!script) {
        console.warn('[POM Bot] Unknown eventId:', eventId);
        return;
    }
    _appendBotMessage(script.message);
    if (script.actions && script.actions.length) _appendActions(script.actions);
}


// ── 6. sendBotMessage() — handles typed user input ────────────────────────────

function sendBotMessage() {
    const input = document.getElementById('pom-bot-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    _appendUserMessage(text);

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
                    el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            break;

        case 'open_settings':
            closeBot();
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
            console.info('[POM Bot] Action: go_to_gebouw');
            break;

        case 'go_to_gebouw_nieuw':
            closeBot();
            window.location.href = 'gebouw-stap-1-uitgangspunten.html';
            break;

        case 'go_to_pve_nieuw':
            closeBot();
            window.location.href = 'pve-stap-1-invoer.html';
            break;

        case 'go_to_gebied_nieuw':
            closeBot();
            window.location.href = 'gebied-stap-1b-kavels.html';
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
    const el = document.createElement('div');
    el.className = 'pom-bot-msg-bot';
    el.innerHTML = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
}

function _appendUserMessage(text) {
    const log = document.getElementById('pom-bot-log');
    const el = document.createElement('div');
    el.className = 'pom-bot-msg-user';
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
}

function _appendActions(actions) {
    const log = document.getElementById('pom-bot-log');
    const wrap = document.createElement('div');
    wrap.className = 'pom-bot-actions-row';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'pom-bot-action-btn';
        btn.textContent = action.label;
        btn.addEventListener('click', () => handleBotAction(action.id));
        wrap.appendChild(btn);
    });
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
}
