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

// Per-session "already seen" flags — prevents replays on retry
let _roomCutsceneSeen = {};   // { dayID: true }
let _prologueSeen     = false;

// Day-5 ending branch: 'leave' | 'stay' | null
let _day5Ending = null;

// Shared DialogueBox instance used for all cutscene lines
let _csBox           = null;
let _csLastSyncIndex = -1;   // tracks last index synced to _csBox to avoid re-triggering

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
    _cs.bg             = bgType;
    _cs.lines          = lines;
    _cs.index          = 0;
    _cs.onComplete     = onComplete;
    _cs.choices        = choices;
    _cs.showingChoices = false;
    _cs.choiceHover    = -1;
    _csLastSyncIndex   = -1;   // force DialogueBox re-trigger on first draw
    gameState.setState(STATE_CUTSCENE);
}

/**
 * Advances to the next line, or ends the cutscene.
 * First press while still typing: skips typewriter to end of current line.
 * Second press (or first when fully revealed): advances index / shows choices / calls onComplete.
 */
function csAdvance() {
    if (typeof globalFade !== 'undefined' && globalFade.isFading) return;
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
        let bx = layout.startX + i * (layout.btnW + layout.gap);
        if (mx >= bx && mx <= bx + layout.btnW &&
            my >= layout.btnY - layout.btnH / 2 &&
            my <= layout.btnY + layout.btnH / 2) {
            _cs.choiceHover = i;
            break;
        }
    }
}

// ─── RENDERER ──────────────────────────────────────────────────────────────────

/** Main draw function; called every frame in STATE_CUTSCENE. */
function drawCutsceneScreen() {
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
    }

    if (_cs.lines.length === 0) { pop(); return; }

    if (!_cs.showingChoices) {
        // Sync box with the current line whenever the index changes
        if (_cs.index !== _csLastSyncIndex) {
            let line = _cs.lines[_cs.index];
            _csBox.trigger(line.text, null, line.speaker);
            _csLastSyncIndex = _cs.index;
        }
        _csBox.display();

        // "Click to continue" prompt — visible once typing finishes.
        // Hidden on the last line when choices are about to appear.
        let isLastWithChoices = (
            _cs.index === _cs.lines.length - 1 &&
            _cs.choices && _cs.choices.length > 0
        );
        if (_csBox.isFinishedTyping() && !isLastWithChoices) {
            let fB = (typeof fonts !== 'undefined' && fonts.body) ? fonts.body : null;
            if (fB) textFont(fB);
            textSize(16 * s);
            textAlign(RIGHT, BOTTOM);
            noStroke();
            fill(160, 148, 115, 160 + sin(frameCount * 0.1) * 55);
            text('\u25b6  Click to continue', width - 28 * s, height - 18 * s);
        }

    } else {
        // Show the last line in the box (still visible), overlay choice buttons
        _csBox.display();
        _drawChoiceButtons(s, cx);
    }

    pop();
}

// ─── BACKGROUND RENDERER ───────────────────────────────────────────────────────

function _drawCutsceneBg() {
    if (_cs.bg === 'room') {
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

    for (let i = 0; i < _cs.choices.length; i++) {
        let bx      = layout.startX + i * (layout.btnW + layout.gap);
        let isHover = (i === _cs.choiceHover);

        fill(isHover ? color(200, 170, 80, 210) : color(18, 18, 32, 210));
        stroke(200, 170, 100, isHover ? 255 : 155);
        strokeWeight(2 * s);
        rectMode(CORNER);
        rect(bx, layout.btnY - layout.btnH / 2, layout.btnW, layout.btnH, 10 * s);

        noStroke();
        fill(isHover ? color(18, 18, 18) : color(220, 190, 110));
        if (fB) textFont(fB);
        textSize(25 * s);
        textAlign(CENTER, CENTER);
        text(_cs.choices[i].label, bx + layout.btnW / 2, layout.btnY);
    }
}

function _csChoiceLayout() {
    let s      = min(width / 1920, height / 1080);
    let cx     = width / 2;
    let boxH   = 220 * s;   // matches DialogueBox bar height
    let btnW   = 290 * s;
    let btnH   = 60 * s;
    let gap    = 44 * s;
    let n      = _cs.choices ? _cs.choices.length : 0;
    let totalW = n * btnW + (n - 1) * gap;
    return {
        startX: cx - totalW / 2,
        btnY:   height - boxH / 2,   // vertically centred in the bar
        btnW, btnH, gap
    };
}

function _csHandleChoiceClick(mx, my) {
    let layout = _csChoiceLayout();
    for (let i = 0; i < _cs.choices.length; i++) {
        let bx = layout.startX + i * (layout.btnW + layout.gap);
        if (mx >= bx && mx <= bx + layout.btnW &&
            my >= layout.btnY - layout.btnH / 2 &&
            my <= layout.btnY + layout.btnH / 2) {
            if (typeof _cs.choices[i].cb === 'function') _cs.choices[i].cb();
            return;
        }
    }
}

// ─── DIALOGUE SCRIPTS ──────────────────────────────────────────────────────────

const CS_PROLOGUE = [
    { speaker: 'NEWSREADER', text: 'Good evening. Bristol City Council tonight released its annual student wellbeing report, showing a sharp rise in anxiety and burnout among postgraduate students.' },
    { speaker: 'NEWSREADER', text: 'University of Bristol researchers note that the pressure to perform — submit, succeed, repeat — has left many students feeling invisible to the institutions meant to support them.' },
    { speaker: 'NEWSREADER', text: 'One student, known only as Iris, became the subject of a widely shared thread. Her story begins on a Monday morning, at the bottom of Park Street.' },
    { speaker: 'NEWSREADER', text: 'This is five days in her shoes.' },
];

const CS_DAY_ROOM = {
    1: [
        { speaker: 'IRIS', text: 'Day one. Just... breathe. Five days to pull this together.' },
        { speaker: 'IRIS', text: 'The supervisor meeting is Friday. If I can get a draft in by then, I might actually be okay.' },
        { speaker: 'IRIS', text: "Right. Check the desk. Pack everything. Don't forget the student card." },
    ],
    2: [
        { speaker: 'IRIS', text: "The feedback email came at 2 a.m. 'Lacks rigour. Revisit the theoretical framework.' Four words that unravelled six weeks of work." },
        { speaker: 'IRIS', text: "I stared at them for an hour before I fell asleep at the desk." },
        { speaker: 'IRIS', text: "Today has to be better. Pack up and go." },
    ],
    3: [
        { speaker: 'IRIS', text: "Halfway. That's the word I keep telling myself. Halfway there." },
        { speaker: 'IRIS', text: "I dreamed about running again last night. Same street, same hill, same feeling that I'd never reach the top." },
        { speaker: 'IRIS', text: "Real or not — I have to keep moving. Desk. Bag. Door." },
    ],
    4: [
        { speaker: 'IRIS', text: "I almost didn't get up this morning. Just lay there, counting cracks in the ceiling." },
        { speaker: 'IRIS', text: "My supervisor said yesterday's two pages were 'a step forward'. I think she was being kind." },
        { speaker: 'IRIS', text: "One more day after this. One more. I'm still here." },
    ],
    5: [
        { speaker: 'IRIS', text: "Five days. I made it to day five." },
        { speaker: 'IRIS', text: "Whatever happens today — whatever the outcome of that meeting — I think I'll survive it." },
        { speaker: 'IRIS', text: "Or maybe I already have. Maybe that's what all of this was." },
    ],
};

const CS_DAY_NPC = {
    1: [
        { speaker: 'WIOLA',     text: "Iris! I saw you sprinting up Park Street. The buses nearly got you twice." },
        { speaker: 'IRIS',      text: "I had three minutes. It felt like three seconds." },
        { speaker: 'WIOLA',     text: "I know that feeling. Last year I ran that hill every day, convinced the panic would stay behind me if I kept moving." },
        { speaker: 'WIOLA',     text: "It doesn't work that way, by the way. But you do get faster. You're going to be okay, you know." },
    ],
    2: [
        { speaker: 'LAYLA',     text: "Hey. You look like you haven't slept properly in a week." },
        { speaker: 'IRIS',      text: "Closer to four days, honestly." },
        { speaker: 'LAYLA',     text: "When everything feels like static, I find one song and put it on repeat. My brain stops fighting and finds a rhythm." },
        { speaker: 'LAYLA',     text: "You'll find yours. It might just take a little longer than you'd like." },
    ],
    3: [
        { speaker: 'RAYMOND',   text: "You know where the word 'deadline' comes from? A line drawn around a prison yard. Cross it and the guards were authorised to shoot." },
        { speaker: 'IRIS',      text: "That is... not helpful, Raymond." },
        { speaker: 'RAYMOND',   text: "The point is — you're not a prisoner. A deadline is just a line someone drew. And you drew most of it yourself." },
        { speaker: 'RAYMOND',   text: "Which means you have more power over it than you think." },
    ],
    4: [
        { speaker: 'YUKI',      text: "Iris." },
        { speaker: 'IRIS',      text: "..." },
        { speaker: 'YUKI',      text: "I failed my first year. Had to retake it in secret. My parents didn't know until I'd already passed the resit." },
        { speaker: 'YUKI',      text: "Whatever happens this week — you are not the sum of one submission. You are so much more than that." },
    ],
    5: [
        { speaker: 'CHARLOTTE', text: "Every day this week I've watched you run that hill like something was chasing you." },
        { speaker: 'IRIS',      text: "Maybe something was." },
        { speaker: 'CHARLOTTE', text: "Or maybe you were running toward something. There's a difference." },
        { speaker: 'CHARLOTTE', text: "You've made it here, Iris. But what comes next? Do you step back into the world outside... or stay a little longer where it's safe?" },
    ],
};

const CS_DAY5_LEAVE = [
    { speaker: 'IRIS',      text: "I need to go back. The real me is still sitting at that desk, and she needs to face what comes next." },
    { speaker: 'CHARLOTTE', text: "Then go. You know the way out." },
    { speaker: 'IRIS',      text: "Thank you. All of you. For running alongside me when I didn't know you were there." },
    { speaker: 'IRIS',      text: "I'm ready." },
];

const CS_DAY5_STAY = [
    { speaker: 'IRIS',      text: "I choose to stay. Just a little longer. The real world will still be there." },
    { speaker: 'CHARLOTTE', text: "Then rest. You've earned every second of this." },
    { speaker: 'IRIS',      text: "Maybe this is what peace feels like. Maybe I'll find my way back — on my own terms, when I'm ready." },
];
