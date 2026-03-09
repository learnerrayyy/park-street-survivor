// Park Street Survivor - Cutscene & Dialogue System
// Responsibilities: VN-style dialogue overlays, story scripts, branching endings.
// Requires: STATE_CUTSCENE from GlobalConfig.js, globalFade / triggerTransition from sketch.js
//           DialogueBox class from DialogueBox.js

// ─── INTERNAL STATE ────────────────────────────────────────────────────────────
let _cs = {
    bg:             'library', // 'news' | 'room' | 'library'
    lines:          [],        // [{ speaker, text }]
    index:          0,
    onComplete:     null,      // callback after last line (when no choices)
    choices:        null,      // [{ label, cb }] or null
    showingChoices: false,
    choiceHover:    -1,
};

const SPEAKER_PORTRAIT_MAP = {
    'IRIS':      'portraitPlayerNormal',
    'WIOLA':     'portraitWiola',
    'LAYLA':     'portraitLayla',
    'RAYMOND':   'portraitRaymond',
    'YUKI':      'portraitYuki',
    'CHARLOTTE': 'portraitCharlotte',
    'NEWSREADER': null
};

// Per-session "already seen" flags — prevents replays on retry
let _roomCutsceneSeen = {};   // { dayID: true }
let _prologueSeen     = false;

// Day-5 ending branch: 'leave' | 'stay' | null
let _day5Ending = null;

// Player choice log: key = "dayID_lineIndex", value = { choiceIdx, label }
let _playerChoices = {};

/** Records which option the player selected at a given dialogue line. */
function _recordPlayerChoice(dayID, lineIndex, choiceIdx, label) {
    _playerChoices[dayID + '_' + lineIndex] = { choiceIdx, label };
}

/** Returns the stored choice for a given day + line, or null. */
function getPlayerChoice(dayID, lineIndex) {
    return _playerChoices[dayID + '_' + lineIndex] || null;
}

// Shared DialogueBox instance used for all cutscene lines
let _csBox           = null;
let _isEndingActive = false;
let _endingLines    = [];
let _lineAlphas     = [];
let _currentLine    = 0;
let _endingTimer    = 0;
let _onEndingDone   = null;
let _csLastSyncIndex = -1;   // tracks last index synced to _csBox to avoid re-triggering

// ─── ITEM RECEIVED NOTICE BOX ───────────────────────────────────────────────
// Uses assets/dialogue/notice_box.png (520×150 px, design space x:1400 y:100).
// Light-purple item frame inside the image: 104×112 px.
// Triggered by an `onShow: { type: 'item_received', name: '...' }` field.
let _itemToast = { active: false, name: '', timer: 0, alpha: 0 };
const _ITEM_TOAST_DURATION = 210; // frames (~3.5 s at 60 fps)
const _ITEM_TOAST_FADE_IN  = 20;
const _ITEM_TOAST_FADE_OUT = 40;

function _showItemToast(name) {
    _itemToast.active = true;
    _itemToast.name   = name;
    _itemToast.timer  = _ITEM_TOAST_DURATION;
    _itemToast.alpha  = 0;
}

/** Maps a display name string to the matching inventory item image. */
function _getItemImage(displayName) {
    if (!displayName || typeof assets === 'undefined') return null;
    const n = String(displayName).toUpperCase();
    if (n.includes('VITAMIN') || n.includes('GUMM'))  return assets.vitaminImg   || null;
    if (n.includes('TANGLE'))                          return assets.tangleImg    || null;
    if (n.includes('HEADPHONE'))                       return assets.headphoneImg || null;
    return null;
}

function _drawItemToast() {
    if (!_itemToast.active) return;
    _itemToast.timer--;
    if (_itemToast.timer <= 0) { _itemToast.active = false; return; }

    // Alpha: fade in → hold → fade out
    const t = _itemToast.timer;
    if (t > _ITEM_TOAST_DURATION - _ITEM_TOAST_FADE_IN) {
        _itemToast.alpha = map(t, _ITEM_TOAST_DURATION, _ITEM_TOAST_DURATION - _ITEM_TOAST_FADE_IN, 0, 255);
    } else if (t < _ITEM_TOAST_FADE_OUT) {
        _itemToast.alpha = map(t, _ITEM_TOAST_FADE_OUT, 0, 255, 0);
    } else {
        _itemToast.alpha = 255;
    }

    const s = min(width / 1920, height / 1080);
    const a = _itemToast.alpha;

    // ── Design-space layout (spec: 520×150 px at x:1400, y:100) ──────────────
    // Item frame (light purple, 104×112) is inset on the left of the notice box.
    const BOX_X  = 1400 * s;
    const BOX_Y  = 100  * s;
    const BOX_W  = 520  * s;
    const BOX_H  = 150  * s;
    // Frame inset: 18 px left margin, vertically centred → top at (150-112)/2=19 px
    const FRM_X  = (1400 + 18) * s;
    const FRM_Y  = (100  + 19) * s;
    const FRM_W  = 104  * s;
    const FRM_H  = 112  * s;
    const FRM_CX = FRM_X + FRM_W * 0.5;
    const FRM_CY = FRM_Y + FRM_H * 0.5;
    // Text area starts right of the frame
    const TXT_X  = FRM_X + FRM_W + 16 * s;
    const TXT_CY = BOX_Y + BOX_H * 0.5;

    push();
    imageMode(CORNER);

    // Notice box background image
    if (typeof assets !== 'undefined' && assets.noticeBox) {
        tint(255, a);
        image(assets.noticeBox, BOX_X, BOX_Y, BOX_W, BOX_H);
        noTint();
    } else {
        // Fallback: plain rect
        noStroke();
        fill(15, 8, 42, a * 0.92);
        rect(BOX_X, BOX_Y, BOX_W, BOX_H, 12 * s);
        noFill();
        stroke(255, 200, 60, a * 0.85);
        strokeWeight(1.8 * s);
        rect(BOX_X, BOX_Y, BOX_W, BOX_H, 12 * s);
    }

    // Item image — centred inside the frame, scaled to fit with padding
    const itemImg = _getItemImage(_itemToast.name);
    if (itemImg) {
        const pad    = 10 * s;
        const maxW   = FRM_W - pad * 2;
        const maxH   = FRM_H - pad * 2;
        const ratio  = min(maxW / itemImg.width, maxH / itemImg.height);
        const iW     = itemImg.width  * ratio;
        const iH     = itemImg.height * ratio;
        imageMode(CENTER);
        tint(255, a);
        image(itemImg, FRM_CX, FRM_CY, iW, iH);
        noTint();
    }

    // "Received" label
    noStroke();
    imageMode(CORNER);
    let fDB = (typeof fonts !== 'undefined') ? (fonts.jersey20 || fonts.dialogueBlue || fonts.body || fonts.title) : null;
    if (fDB) textFont(fDB);
    textSize(20 * s);
    textAlign(LEFT, CENTER);
    fill(180, 165, 220, a);
    text("Received", TXT_X, TXT_CY - 18 * s);

    // Item name in gold
    if (fDB) textFont(fDB);
    textSize(28 * s);
    fill(255, 215, 0, a);
    text("\u300C" + _itemToast.name + "\u300D", TXT_X, TXT_CY + 14 * s);

    pop();
}

// ─── DIALOGUE DATA ALIASES (sourced from assets/data/dialogue_data.js) ────────
const TEXT_BAD_ENDING      = DIALOGUE_DATA.endings.bad;
const TEXT_GOOD_ENDING     = DIALOGUE_DATA.endings.good;
const CS_PROLOGUE          = DIALOGUE_DATA.prologue;
const CS_DAY_ROOM          = DIALOGUE_DATA.day_room;
const CS_AWAKENING_REALITY = DIALOGUE_DATA.awakening_reality;

/**
 * Resolves `action` strings in dialogue options to real callback functions.
 * Must be called before passing NPC lines to startCutscene().
 */
function _hydrate(lines) {
    return lines.map(line => {
        if (!line.options) return line;
        const opts = line.options.map(opt => {
            if (!opt.action) return opt;
            let cb;
            if (opt.action === 'good_ending') {
                cb = () => startCinematicEnding(TEXT_GOOD_ENDING, () => {
                    startCutscene('hospital', CS_AWAKENING_REALITY, () => {
                        if (typeof resetCredits === 'function') resetCredits();
                        gameState.setState(STATE_CREDITS);
                    });
                });
            } else if (opt.action === 'bad_ending') {
                cb = () => startCinematicEnding(TEXT_BAD_ENDING, () => {
                    if (typeof resetCredits === 'function') resetCredits();
                    gameState.setState(STATE_CREDITS);
                });
            }
            return cb ? Object.assign({}, opt, { cb }) : opt;
        });
        return Object.assign({}, line, { options: opts });
    });
}

const CS_DAY_NPC = Object.fromEntries(
    Object.entries(DIALOGUE_DATA.day_npc).map(([k, v]) => [k, _hydrate(v)]));

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Starts a cutscene and switches to STATE_CUTSCENE.
 * Should be called from inside a triggerTransition callback (screen is black).
 *
 * @param {string}   bgType     'news' | 'room' | 'library'
 * @param {Array}    lines      [{ speaker, text }, ...]
 * @param {Function} onComplete Called when all lines are done; must manage its own transition.
 *                              Pass null when using choices instead.
 * @param {Array}    [choices]  [{ label, cb }, ...] shown after the last line, or null
 */
function startCutscene(bgType, lines, onComplete, choices = null) {
    // set global marker so routeBGMByState can detect the specific cutscene
    if (typeof BGM !== 'undefined') BGM.setCutsceneScene(bgType);
    
    _cs.bg             = bgType;
    _cs.lines          = lines;
    _cs.index          = 0;
    _cs.onComplete     = onComplete;
    _cs.choices        = choices;
    _cs.showingChoices = false;
    _cs.choiceHover    = -1;
    _csLastSyncIndex   = -1; 
    if (_csBox) {
        _csBox.reset();
        _csBox.persistent = true;
    }   // force DialogueBox re-trigger on first draw

    _isEndingActive = false;

    // Wire up the tracking callback for inline per-line options
    if (_csBox) {
        _csBox.onOptionSelect = _onInlineOptionSelected;
    }
    gameState.setState(STATE_CUTSCENE);
}

/**
 * Advances to the next line, or ends the cutscene.
 * First press while still typing: skips typewriter to end of current line.
 * Second press (or first when fully revealed): advances index / shows choices / calls onComplete.
 */
function csAdvance() {
    if (typeof globalFade !== 'undefined' && globalFade.isFading) return;

    if (_csBox && _csBox.options && _csBox.isFinishedTyping()) {
        return;  // waiting for player to pick an inline option
    }

    if (_cs.showingChoices) return;

    // First click while still typing — reveal full line, wait for next click
    if (_csBox && !_csBox.isFinishedTyping()) {
        _csBox.skipToEnd();
        return;
    }

    if (_cs.index < _cs.lines.length - 1) {
        _cs.index++;
    } else if (_cs.choices && _cs.choices.length > 0) {
        _cs.showingChoices = true;
    } else if (typeof _cs.onComplete === 'function') {
        // Call onComplete directly — it manages its own triggerTransition.
        // IMPORTANT: do NOT wrap here. A nested triggerTransition is silently
        // blocked because globalFade.isFading is still true at callback time,
        // which would leave the game permanently stuck in STATE_CUTSCENE.
        _cs.onComplete();
    }
}

/** Handles a mouse click on the cutscene screen. */
function csClick(mx, my) {
    if (_isEndingActive) {
        if (_currentLine >= _endingLines.length) {
            _isEndingActive = false;
            if (typeof _onEndingDone === 'function') {
                _onEndingDone();
            } else {
                if (typeof resetCredits === 'function') resetCredits();
                gameState.setState(STATE_CREDITS);
            }
        }
        return;
    }

    if (typeof globalFade !== 'undefined' && globalFade.isFading) return;
    
    if (_cs.showingChoices) {
        _csHandleChoiceClick(mx, my);
    } else {
        csAdvance();
    }
}

/** Updates which choice button is hovered. */
function csMoveHover(mx, my) {
    if (!_cs.showingChoices) { _cs.choiceHover = -1; return; }
    let layout = _csChoiceLayout();
    _cs.choiceHover = -1;
    for (let i = 0; i < _cs.choices.length; i++) {
        const by = layout.startY + i * (layout.btnH + layout.gap);
        if (mx >= layout.startX && mx <= layout.startX + layout.btnW &&
            my >= by              && my <= by + layout.btnH) {
            _cs.choiceHover = i;
            break;
        }
    }
}

// ─── RENDERER ──────────────────────────────────────────────────────────────────

/** Main draw function; called every frame in STATE_CUTSCENE. */
function drawCutsceneScreen() {

    if (_isEndingActive) {
    drawCinematicEnding();
    return;
  }

    let s  = min(width / 1920, height / 1080);
    let cx = width / 2;

    push();
    colorMode(RGB, 255);

    // 1. Render background
    _drawCutsceneBg();

    // 2. Initialise the shared DialogueBox in persistent (manual-advance) mode
    if (!_csBox) {
        _csBox = new DialogueBox();
        _csBox.persistent = true;
        _csBox.onOptionSelect = _onInlineOptionSelected;
    }

    if (_cs.lines.length === 0) { pop(); return; }

    if (!_cs.showingChoices) {
        // Sync box with the current line whenever the index changes
        if (_cs.index !== _csLastSyncIndex) {
            let line = _cs.lines[_cs.index];
            let assetKey = SPEAKER_PORTRAIT_MAP[line.speaker];
            let portrait = (assetKey && assets[assetKey]) ? assets[assetKey] : null;
            _csBox.trigger(line.text, portrait, line.speaker, line.options || null, line.highlight || null);
            _csLastSyncIndex = _cs.index;
            // Fire onShow events (e.g. item received toast)
            if (line.onShow && line.onShow.type === 'item_received') {
                _showItemToast(line.onShow.name);
            }
        }
        _csBox.display();

        // "CLICK TO CONTINUE" is now rendered inside DialogueBox below the arrow indicator.

    } else {
        // Show the last line in the box (still visible), overlay choice buttons
        _csBox.display();
        _drawChoiceButtons(s, cx);
    }

    _drawItemToast();
    pop();
}

// ─── BACKGROUND RENDERER ───────────────────────────────────────────────────────

function _drawCutsceneBg() {
    let img = null;

    if (_cs.bg === 'hospital') {
        img = assets.csHospitalBg;
        if (img) {
            let bgS = max(width / img.width, height / img.height);
            imageMode(CENTER);
            image(img, width / 2, height / 2, img.width * bgS, img.height * bgS);
        } else {
            background(200, 210, 220);
        }

    } else if (_cs.bg === 'black') {
        background(0);

    }else if (_cs.bg === 'room') {
        if (typeof roomScene !== 'undefined' && roomScene) roomScene.display();
        if (typeof player    !== 'undefined' && player)    player.display();
        noStroke(); fill(0, 0, 0, 80); rectMode(CORNER); rect(0, 0, width, height);

    } else if (_cs.bg === 'news') {
        let img = (typeof assets !== 'undefined') ? (assets.csNewsBg || null) : null;
        if (img) {
            let bgS = max(width / img.width, height / img.height);
            imageMode(CENTER);
            image(img, width / 2, height / 2, img.width * bgS, img.height * bgS);
        } else {
            background(10, 8, 22);
        }
        noStroke(); fill(0, 0, 0, 100); rectMode(CORNER); rect(0, 0, width, height);

    } else { // 'library'
        let img = (typeof assets !== 'undefined')
            ? (assets.csLibraryBg || assets.libraryBg || null) : null;
        if (img) {
            let bgS = max(width / img.width, height / img.height);
            imageMode(CENTER);
            image(img, width / 2, height / 2, img.width * bgS, img.height * bgS);
        } else {
            background(14, 11, 24);
        }
        noStroke(); fill(0, 0, 0, 100); rectMode(CORNER); rect(0, 0, width, height);
    }
}

// ─── CHOICE BUTTONS ────────────────────────────────────────────────────────────

function _drawChoiceButtons(s, cx) {
    let fB     = (typeof fonts !== 'undefined' && fonts.body) ? fonts.body : null;
    let layout = _csChoiceLayout();
    const accentW = 6 * s;

    // Dark backdrop behind the choice panel
    push();
    noStroke();
    fill(10, 6, 20, 180);
    rectMode(CORNER);
    rect(layout.startX - 24 * s,
         layout.startY - 20 * s,
         layout.btnW   + 48 * s,
         layout.totalH + 40 * s,
         14 * s);

    // Header label
    if (fB) textFont(fB);
    textSize(20 * s);
    textAlign(CENTER, CENTER);
    fill(160, 140, 110, 200);
    noStroke();
    text('— Choose your response —', cx, layout.startY - 8 * s);
    pop();

    for (let i = 0; i < _cs.choices.length; i++) {
        const by      = layout.startY + i * (layout.btnH + layout.gap);
        const isHover = (i === _cs.choiceHover);

        push();
        rectMode(CORNER);
        fill(isHover ? color(72, 50, 120, 245) : color(30, 18, 60, 230));
        stroke(isHover ? color(220, 185, 90, 255) : color(120, 100, 60, 160));
        strokeWeight(1.5 * s);
        rect(layout.startX, by, layout.btnW, layout.btnH, 8 * s);

        if (isHover) {
            noStroke();
            fill(220, 185, 70, 220);
            rect(layout.startX, by, accentW, layout.btnH, 8 * s, 0, 0, 8 * s);
        }

        noStroke();
        fill(isHover ? color(255, 225, 120) : color(210, 185, 120));
        if (fB) textFont(fB);
        textSize(28 * s);
        textAlign(LEFT, CENTER);
        text(_cs.choices[i].label,
             layout.startX + 28 * s + (isHover ? accentW : 0),
             by + layout.btnH / 2);
        pop();
    }
}

function _csChoiceLayout() {
    let s      = min(width / 1920, height / 1080);
    let cx     = width / 2;
    let btnW   = 820 * s;
    let btnH   = 72 * s;
    let gap    = 16 * s;
    let n      = _cs.choices ? _cs.choices.length : 0;
    let totalH = n * btnH + (n - 1) * gap;
    // Center the block in the space above the dialogue bar (~barY = height - 320*s)
    let barY   = height - 320 * s;
    let panelCY = barY * 0.5;
    return {
        startX: cx - btnW / 2,
        startY: panelCY - totalH / 2,
        btnW, btnH, gap, totalH
    };
}

function _csHandleChoiceClick(mx, my) {
    let layout = _csChoiceLayout();
    for (let i = 0; i < _cs.choices.length; i++) {
        const bx = layout.startX;
        const by = layout.startY + i * (layout.btnH + layout.gap);
        if (mx >= bx && mx <= bx + layout.btnW &&
            my >= by && my <= by + layout.btnH) {
            const choice = _cs.choices[i];
            // Record the choice
            _recordPlayerChoice(
                typeof currentDayID !== 'undefined' ? currentDayID : 0,
                _cs.lines.length - 1,
                i,
                choice.label
            );
            _cs.showingChoices = false;
            _csLastSyncIndex = -1;
            if (typeof choice.cb === 'function') {
                choice.cb();
            }
            return;
        }
    }
}

/**
 * Handles a click on an inline dialogue option (line.options).
 * Records the choice and immediately jumps to the next index or fires the callback.
 */
function _onInlineOptionSelected(opt, choiceIdx) {
    const lineIndex = _cs.index;
    const dayID = typeof currentDayID !== 'undefined' ? currentDayID : 5;

    _recordPlayerChoice(dayID, lineIndex, choiceIdx, opt.label);

    _csBox.options = null;

    if (typeof opt.cb === 'function') {
        opt.cb();
    } else if (opt.nextIndex !== undefined) {
        _cs.index        = opt.nextIndex;
        _csLastSyncIndex = -1;
    }
}

function csJumpToIndex(targetIndex) {
    if (targetIndex !== undefined && targetIndex < _cs.lines.length) {
        _cs.index = targetIndex;
        _csLastSyncIndex = -1;
        console.log(`Jumped to dialogue index: ${targetIndex}`);
    }
}


function handleOptionSelect(nextIndex) {
    if (nextIndex !== undefined) {
        _cs.index = nextIndex;
        _csLastSyncIndex = -1;
        console.log(`[Dialogue] Option selected, jumping to index: ${nextIndex}`);
    }
}

function triggerGoodEnding() {
    startCutscene('hospital', CS_AWAKENING_REALITY, () => {
        const lifeSummary = "Iris is now fully enthralled by the sky. She bends her knees and gently pushes off the floor. She levitates and closes her eyes in response to the beaming rays of light piercing through the dark clouds. The rain washes away the last trace of greyness and restores the rich colour to the buildings along Park Street. She lets the sun warm her face as she drifts closer and closer to the hot air balloon parade. What a feeling! She wishes she could stay there forever, but the sun suddenly summons a blinding light, causing her to squint...";
        startCutscene('black', [{ speaker: '', text: lifeSummary }], () => {
            gameState.setState(STATE_CREDITS); 
        });
    });
}

function triggerBadEnding() {
    const deathText = "“A 28-year-old woman, named Iris, has been put into a medically induced coma... Sadly……minutes after……….she passes away”";
    
    startCutscene('black', [{ speaker: 'SYSTEM', text: deathText }], () => {
        gameState.setState(STATE_CREDITS); 
    });
}

function startCinematicEnding(lines, onDone) {
    _isEndingActive = true;
    _endingLines = lines;
    _lineAlphas = new Array(lines.length).fill(0);
    _currentLine = 0;
    _endingTimer = 0;
    _onEndingDone = (typeof onDone === 'function') ? onDone : null;
    gameState.setState(STATE_CUTSCENE);
}

function drawCinematicEnding() {
    background(0);
    let s = min(width / 1920, height / 1080);
    
    push();
    textAlign(CENTER, CENTER);
    let f = (typeof fonts !== 'undefined') ? (fonts.body || fonts.title) : null;
    if (f) textFont(f);
    textSize(28 * s);

    let lineHeight = 45 * s;
    let startY = height / 2 - (_endingLines.length * lineHeight) / 2;

    for (let i = 0; i < _endingLines.length; i++) {
        if (i === _currentLine) {
            _lineAlphas[i] = min(_lineAlphas[i] + 3, 255);
            if (_lineAlphas[i] >= 255) {
                _endingTimer++;
                if (_endingTimer > 60) { 
                    _currentLine++;
                    _endingTimer = 0;
                }
            }
        } else if (i < _currentLine) {
            _lineAlphas[i] = 255;
        }

        fill(255, _lineAlphas[i]);
        text(_endingLines[i], width / 2, startY + i * lineHeight);
    }

}
