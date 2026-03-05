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
            _csBox.trigger(line.text, portrait, line.speaker, line.options || null);
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
            text('Click to continue', width - 28 * s, height - 18 * s);
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

// ─── DIALOGUE SCRIPTS ──────────────────────────────────────────────────────────

const CS_PROLOGUE = [
    { speaker: 'NEWSREADER', text: 'BREAKING NEWS' },
    { speaker: 'NEWSREADER', text: 'An unexpected car crash has just taken place, causing a major blockage near Blackfriars Underpass.' },
    { speaker: 'NEWSREADER', text: 'The Metropolitan Police have confirmed that a woman, believed to be in her late 20s, was struck by a car shortly after 18:00 this evening.' },
    { speaker: 'NEWSREADER', text: 'Emergency services have rushed her to hospital in critical condition.' },
    { speaker: 'NEWSREADER', text: 'According to current updates, the circumstances of the accident remain unclear.' },
    { speaker: 'NEWSREADER', text: 'Several witnesses claim the woman may have acted intentionally.' },
    { speaker: 'NEWSREADER', text: 'Exact circumstances are yet to be established…' },
];

const CS_DAY_ROOM = {
    1: [
        { speaker: 'IRIS', text: "8:00 o'clock already?!" },
        { speaker: 'IRIS', text: "That was the best sleep I've had for a long time." },
        { speaker: 'IRIS', text: "My neck does feel a little stiff though…" },
        { speaker: 'IRIS', text: "Never mind, the weather is truly sunny today, can't let such a day go to waste!"},
        { speaker: 'IRIS', text: "Just need to grab some things before I'm off." },
    ],
    2: [
        { speaker: 'IRIS', text: "Hmm, time to get up again..." },
        { speaker: 'IRIS', text: "Wow, and the weather is still bright! Another great day to come!" },
        { speaker: 'IRIS', text: "Perhaps I can even make a quick stop at GAIL's and buy myself an iced matcha!" },
        { speaker: 'IRIS', text: "There is only one problem..." },
        { speaker: 'IRIS', text: "My body still feels so sore, could it really be after climbing that hill?" },
        { speaker: 'IRIS', text: "Never mind, the first day is always the worst... Surely my body will get used to it." },
        { speaker: 'IRIS', text: "Better grab my things and go!" },
    ],
    3: [
        { speaker: 'IRIS', text: "Why do I feel like the alarm sounds even more vague? I barely heard it this morning..." },
        { speaker: 'IRIS', text: "Maybe my tiredness, is really coming through..." },
        { speaker: 'IRIS', text: "Damn… and here we go back to the standard gloomy weather. I only hope it doesn't rain..." },
        { speaker: 'IRIS', text: "Each day seems to be worse than the other, I don't smoke or drink… or even go clubbing, why is my body this weak?" },
        { speaker: 'IRIS', text: "So annoying." },
        { speaker: 'IRIS', text: "Maybe I really should contact my GP someday." },
        { speaker: 'IRIS', text: "Anyway, let's grab some things and go!" },
    ],
    4: [
        { speaker: 'IRIS', text: "What is that sound? It's not my phone..." },
        { speaker: 'IRIS', text: "It sounds like a heart monitor? So strange. It must just be in my head." },
        { speaker: 'IRIS', text: "And the room... It feels so cold." },
        { speaker: 'IRIS', text: "I really wish I don't have to go to Uni. My legs are trembling and I can barely stand." },
        { speaker: 'IRIS', text: "Great! And it's pouring outside... As if life couldn't get any worse." },
        { speaker: 'IRIS', text: "I guess the only good thing right now are my friends, no matter how bad the days seem, they always lift up my spirits..." },
        { speaker: 'IRIS', text: "I truly hope we can stay in touch in the future." },
        { speaker: 'IRIS', text: "Whatever…It's almost the weekend... I can pull through. Let's get going..." },
    ],
    5: [
        { speaker: 'IRIS', text: "UUUUUGGGHHHH......" },
        { speaker: 'IRIS', text: "I couldn't breathe again. That dream…it was so god damn real... What does it all mean!?" },
        { speaker: 'IRIS', text: "I can't take it anymore! With all these things getting worse... I'm scared to think where does this all end?" },
        { speaker: 'IRIS', text: "Does it even end!? Maybe now this is my life, a perpetual loop of suffering." },
        { speaker: 'IRIS', text: "NO... I can't think like this... Just breathe Iris... breathe..." },
        { speaker: 'IRIS', text: "Apart from this sinister malaise... I actually feel fulfilled with my life." },
        { speaker: 'IRIS', text: "Having my friends, studying for my dream career, and being passionate about my goals..." },
        { speaker: 'IRIS', text: "Inevitably it all makes me happy." },
        { speaker: 'IRIS', text: "I will always cherish these years at Uni." },
        { speaker: 'IRIS', text: "Unfortunately it rains again, but I promised Charlotte that I will meet her today..." },
        { speaker: 'IRIS', text: "I guess I have no choice but to get going... One last time." },
    ],
};

/**
 * CS_DAY_NPC: Primary daily dialogue scripts for Days 1-5.
 * Contains branching logic via 'options' and 'nextIndex' for internal jumps.
 */
const CS_DAY_NPC = {
    // --- DAY 1: WIOLA (Intro to OOD & Vitamin Gummies) ---
    1: [
        { speaker: 'WIOLA', text: "Heyy Iris! Long time no see!" },
        { 
            speaker: 'IRIS', 
            text: "......", 
            options: [
                { label: "Wiola... Hi, it's nice to see you!", nextIndex: 2 },
                { label: "Hey girl, it's been ages", nextIndex: 2 }
            ]
        },
        { speaker: 'WIOLA', text: "What have you been up to lately?" },
        { speaker: 'IRIS', text: "....Oh..not...much.." },
        { speaker: 'WIOLA', text: "I see, have you prepared for today's software engineering lecture?" },
        { speaker: 'IRIS', text: "Noo... Actually, I can't really remember last night. I must've just passed out in my sleep." },
        { speaker: 'WIOLA', text: "Haha, no worries." },
        { speaker: 'WIOLA', text: "Luckily, I've overviewed the contents last night, I think it's about Object-Oriented Design." },
        { speaker: 'WIOLA', text: "Just sit with me and I'll talk you through it." },
        { 
            speaker: 'IRIS', 
            text: "She's always so helpful...", 
            options: [
                { label: "Thanks, you've always got my back!", nextIndex: 10 },
                { label: "You're a life saver!", nextIndex: 10 }
            ]
        },
        { speaker: 'IRIS', text: "I'm truly looking forward to it, especially as I can sit down for a while after climbing this dreaded hill." },
        { speaker: 'IRIS', text: "My legs are killing me!" },
        { speaker: 'WIOLA', text: "Hahaha, well at least your daily cardio is out the way. Such a relief that I live close by." },
        { speaker: 'IRIS', text: "JEALOUS!" },
        { speaker: 'WIOLA', text: "hehe... I actually have something that could help. Recently I bought some vitamin gummies. Here, they are quite delicious, and they will give you some energy." },
        { speaker: 'IRIS', text: "Wow thank you, orange flavour, MY FAVOURITE!" },
        { speaker: 'WIOLA', text: "No worries, come on now sleepyhead. We're gonna be late!" }
    ],

    // --- DAY 2: LAYLA (Ji's Chicken & ADHD Tangle Toy) ---
    2: [
        { speaker: 'LAYLA', text: "IRIS! You alright? You look like you just ran a marathon!" },
        { speaker: 'IRIS',  text: "...H..Hi!" },
        { speaker: 'IRIS',  text: "....I....I....I'm still not used to climbing this stupid hill.." },
        { speaker: 'IRIS',  text: "Every day the hill feels like a torture." },
        { speaker: 'LAYLA', text: "HAH! Park Street is not for the weak!" },
        { speaker: 'LAYLA', text: "It's alright, you're here now. We still have 10 minutes left before class." },
        { speaker: 'LAYLA', text: "How come you don't take the bus?" },
        { speaker: 'IRIS',  text: "Ohh....well..I don't really have the money for it. Money is a bit tight these days." },
        { speaker: 'IRIS',  text: "Besides, I guess it's good for my health. So it's not all that bad." },
        { speaker: 'LAYLA', text: "I get it, you want to burn off all the Ji's Chicken you eat!" },
        { speaker: 'IRIS',  text: "Shhhh! Don't mention it!" },
        { speaker: 'LAYLA', text: "Haha, I'm just playing." },
        { 
            speaker: 'IRIS', 
            text: "About the chicken...", 
            options: [
                { label: "I eat fried chicken with no regrets!", nextIndex: 14 },
                { label: "Fried chicken is my life!", nextIndex: 14 }
            ]
        },
        { speaker: 'LAYLA', text: "HAHAHA!" },
        { speaker: 'IRIS',  text: "Anyway... weirdly enough, today I did not see any homeless people on my way. Usually, I always pass them next to TESCO." },
        { speaker: 'LAYLA', text: "Hah, maybe they're sleeping it off after last night's shenanigans." },
        { speaker: 'IRIS',  text: "hahaha, maybe." },
        { speaker: 'LAYLA', text: "Who knows? They run on their own cycle. Anyway, I have a cool gift for you!" },
        { speaker: 'LAYLA', text: "It is a tangle toy! I remember you telling me about your ADHD... it will work well for your focus." },
        { speaker: 'IRIS',  text: "WOW thanks! It looks super cute! And it's purple! My fave!" },
        { speaker: 'LAYLA', text: "No probs, let's go. You can try it out in class." }
    ],

    // --- DAY 3: RAYMOND (Dizziness & Headphone Gift) ---
    3: [
        { speaker: 'IRIS',    text: "HI RAY, so glad to see you!" },
        { speaker: 'RAYMOND', text: "Hey Hey!" },
        { speaker: 'IRIS',    text: "How are you getting on with your courses and study?" },
        { speaker: 'RAYMOND', text: "Oh it's alright, recently I've been travelling a little, so I have some catching up to do." },
        { speaker: 'RAYMOND', text: "But nothing I can't handle.." },
        { 
            speaker: 'IRIS', 
            text: "Travel...", 
            options: [
                { label: "I admire how you balance travel and study!", nextIndex: 6 },
                { label: "Next time let's go together!", nextIndex: 6 }
            ]
        },
        { speaker: 'IRIS',    text: "I also hope to travel this summer... as long as......" },
        { speaker: 'IRIS',    text: "..........." },
        { speaker: 'RAYMOND', text: "HEY!! IRIS!! Are you alright?!!" },
        { speaker: 'IRIS',    text: "........." },
        { speaker: 'RAYMOND', text: "IRIS OMG, WAKE UP!" },
        { speaker: 'IRIS',    text: "Ohh.... I'm... I'm alright.. I just felt a bit dizzy." },
        { speaker: 'RAYMOND', text: "WHAT!? ARE YOU SURE? You looked like you were about to pass out." },
        { speaker: 'IRIS',    text: "No, no, I think I'm just exhausted... this stupid hill always gets me..." },
        { speaker: 'IRIS',    text: "One day, I'll end up on my deathbed because of it… But not today." },
        { speaker: 'RAYMOND', text: "Are you sure you don't want to go back?" },
        { speaker: 'IRIS',    text: "No, no, really it's fine. I'll just have a sip of water." },
        { speaker: 'RAYMOND', text: "So stubborn! I'm not letting you out of my sight, stick close to me." },
        { speaker: 'IRIS',    text: "Ha, ha, ha, funny." },
        { speaker: 'RAYMOND', text: "Okay silly, I have something for you. A small gift during my travels… headphones!" },
        { speaker: 'IRIS',    text: "Omg that's too much! Joking, I can accept them. Show me!" },
        { speaker: 'RAYMOND', text: "Here. Let's go before you faint again…" }
    ],

    // --- DAY 4: YUKI (Internal Bleeding & Flatline) ---
    4: [
        { speaker: 'YUKI', text: "IRIS! Hey, what are you doing sat on the ground? It's totally wet!" },
        { speaker: 'IRIS', text: "Huh?" },
        { speaker: 'IRIS', text: ".....I can't move….. I feel like I have no control over my body." },
        { speaker: 'YUKI', text: "Just try to get up, you're gonna get sick." },
        { 
            speaker: 'IRIS', 
            text: "Help...", 
            options: [
                { label: "UGhhh... yeah.. give me a sec...", nextIndex: 9 },
                { label: "STOP! DON'T TOUCH ME!", nextIndex: 7 }
            ]
        },
        { speaker: 'YUKI', text: "What's wrong with you Iris?! Im just trying to help." },
        { speaker: 'IRIS', text: "YEAH, well I don't need your help!", nextIndex: 9 },
        { speaker: 'YUKI', text: "Alright, tell me what's going on. Your skin is so pale. Shouldn't you see a doctor?" },
        { speaker: 'IRIS', text: "..........Wait.....my..... breath........I....can't-" },
        { speaker: '???',  text: "There is no time! We need to do something! She is bleeding internally! Quick!! Prep the operating theatre!" },
        { speaker: 'YUKI', text: "...IRIS!?... IRIS!!! WHAT THE HELL HAPPENED!?" },
        { speaker: 'IRIS', text: ".....hmm? I don't know... everything just turned black." },
        { speaker: 'YUKI', text: "Iris are you alright!? You passed out! You almost died!" },
        { 
            speaker: 'IRIS', 
            text: "The truth...", 
            options: [
                { label: "I've been having these episodes recently...", nextIndex: 26 },
                { label: "Go away! You won't understand!", nextIndex: 24 }
            ]
        },
        { speaker: 'YUKI', text: "Well, I'm sorry... I'm just trying to be a good friend." },
        { speaker: 'IRIS', text: "You're right. I know. This really isn't me.", nextIndex: 26 },
        { speaker: 'YUKI', text: "Let's go to the GP on the weekend. You even forgot your wellies today! You must be overwhelmed." },
        { speaker: 'IRIS', text: "Wellies? .....Oh yes... I forgot about them." },
        { speaker: 'IRIS', text: "Anyway, I still want to go to the lecture. I can't afford to fail." },
        { speaker: 'YUKI', text: "Alright, follow me then, stay close." }
    ],

    // --- DAY 5: CHARLOTTE (Final Decision) ---
    5: [
        { speaker: '???', text: "Welcome back Iris……you did well" },
        { speaker: '???', text: "Your condition is now stable" },
        { speaker: '???', text: "I have a small surprise for you" },
        { 
            speaker: 'IRIS', 
            text: "The voices...", 
            options: [
                { label: "Continue listening to the unknown voices", nextIndex: 4 },
                { label: "Snap out of it", nextIndex: 7 }
            ]
        },
        { speaker: '???', text: "Looks like you have some guests..." },
        { speaker: '???', text: "Iris! I can't believe I'm seeing you like this.. STOP, she barely made it through, let her rest", nextIndex: 7 },
        { speaker: 'IRIS', text: "Ugh...I'm still having hallucinations....but somehow my body feels...better?" },
        { speaker: 'IRIS', text: "I cannot make any sense of this, looks like it's not a linear thing" },
        { speaker: 'IRIS', text: "My mind is still convoluted, but my limbs feel....light... Like I'm levitating" },
        { speaker: 'CHARLOTTE', text: "Iris! Here you areee! Why are you just standing there?" },
        { speaker: 'IRIS', text: ".....It's hot air balloons! So many of them....." },
        { speaker: '???', text: "It's alright, the dangerous part is now behind us..now we must wait" },
        { speaker: 'IRIS', text: "How peculiar... Suddenly the earth feels so still and quiet. Everything moves as though no longer bound to time..." },
        { speaker: 'CHARLOTTE', text: "Iris what are you saying...?" },
        { speaker: 'IRIS', text: "Don't you feel like it's beautiful? Like a painting... I want to join them..." },
        { speaker: '???', text: "They're all here waiting for you, you just need to rise.." },
        { speaker: 'CHARLOTTE', text: "Iris, you're acting weird…just snap out of it! I dydhe iknwieeb ewhuuid is heewrjdng wi euo.." },
        { speaker: 'IRIS', text: "What did you say?" },
        { speaker: 'CHARLOTTE', text: "I said..weli swhe'll meik it trhogh" },
        { speaker: 'CHARLOTTE', text: "I said I wanted to ask you something..or did you forget?" },
        { speaker: 'IRIS', text: "No No, of course not. What is it" },
        { 
            speaker: 'IRIS', 
            text: "Who to listen to?", 
            options: [
                { label: "Keep listening to the unknown voices", nextIndex: 22 },
                { label: "Listen to Charlotte", nextIndex: 30 }
            ]
        },
        { speaker: '???', text: "It was a brain bleed…luckily the operation went well" },
        { speaker: '???', text: "But we currently have no expectations on how she will progress. It is up to her." },
        { speaker: 'IRIS', text: "Wait......did something happen to me recently..... Something bad?" },
        { speaker: '???', text: "For now, I've said everything I know.....just remember to rest...." },
        { speaker: 'CHARLOTTE', text: "You know what, never mind Iris... Clearly your not sane!" },
        { speaker: 'CHARLOTTE', text: "Just forget about it." },
        { speaker: 'IRIS', text: "No, No please Charlotte I'm sorry, I don't know what's happening to me!" },
        { speaker: 'IRIS', text: "Please just tell me......", nextIndex: 30 },
        { speaker: 'CHARLOTTE', text: "Alright....finee.... We thought to go out this weekend to a new club called 'SZPITAL'." },
        { speaker: 'IRIS', text: "(..SZPITAL? That is not an English word, I wonder what it means...)" },
        { speaker: 'IRIS', text: "But...you guys don't even like clubbing." },
        { speaker: 'CHARLOTTE', text: "So what? Just because we don't like it, doesn't mean we will never do it again" },
        { speaker: 'IRIS', text: "Besides........this air...the rain....feels like it's cleansing me....if I could only go higher....." },
        { speaker: 'CHARLOTTE', text: "Nonsense... It's already decided and we're all going" },
{ 
    speaker: 'CHARLOTTE', 
    text: "Are you coming or not?", 
    options: [
        { 
            label: "No. I can't keep running away from my problems.", 
            cb: () => {
                console.log("Choice: NO selected. Triggering Good Ending Text...");
                startCinematicEnding(TEXT_GOOD_ENDING, () => {
                    console.log("Good Ending Text finished. Switching to Hospital...");
                    startCutscene('hospital', CS_AWAKENING_REALITY, () => {
                        console.log("Hospital scene finished. Going to Credits...");
                        resetCredits();
                        gameState.setState(STATE_CREDITS);
                    });
                });
            }
        },
        { 
            label: "Okay. But I don't know if I have the strength.", 
            cb: () => {
                console.log("Choice: YES selected. Triggering Bad Ending Text...");
                startCinematicEnding(TEXT_BAD_ENDING, () => {
                    resetCredits();
                    gameState.setState(STATE_CREDITS);
                });
            }
        }
    ]
}
    ],
};

const TEXT_BAD_ENDING = [
    "A 28-year-old woman, named Iris,",
    "has been put into a medically induced coma,",
    "after recently sustaining a traumatic brain injury from a car crash.",
    "All her friends surround her by her bed,",
    "in hopes she will open her eyes.",
    "",
    "Suddenly, a piercing flat line sound comes from the heart monitor.",
    "Chaos fills the room as doctors fight to save her life,",
    "sadly…… minutes after……",
    "she passes away."
];

const TEXT_GOOD_ENDING = [
    "Iris is now fully enthralled by the sky.",
    "She bends her knees and gently pushes off the floor.",
    "She levitates and closes her eyes,",
    "as beaming rays of light pierce through the dark clouds.",
    "The rain washes away the last trace of greyness,",
    "restoring the rich colour to the buildings along Park Street.",
    "She lets the sun warm her face...",
    "drifting closer and closer to the hot air balloon parade.",
    "",
    "What a feeling! She wishes she could stay there forever,",
    "but the sun suddenly summons a blinding light,",
    "causing her to squint…"
];

/**
 * CS_AWAKENING_REALITY: The "Good Ending" hospital scene.
 * Triggered after Iris chooses "No" and says her farewells in the dream.
 */
const CS_AWAKENING_REALITY = [
    { speaker: 'CHARLOTTE', text: "...Iris?..." },
    { speaker: 'LAYLA', text: "Omg Iris!" },
    { speaker: 'RAYMOND', text: "She's awake!" },
    { speaker: 'CHARLOTTE', text: "Let me grab the doctor!" },
    { speaker: 'WIOLA', text: "No!... Wait a second. Give her a moment to wake up." },
    { speaker: 'YUKI', text: "I can't believe this is really happening!" },
    { speaker: 'IRIS', text: "...Whh...at?" },
    { speaker: 'CHARLOTTE', text: "Shhhhhhh... let her wake up." },
    { speaker: 'CHARLOTTE', text: "......" },
    { speaker: 'WIOLA', text: "......" },
    { speaker: 'LAYLA', text: "......" },
    { speaker: 'RAYMOND', text: "......" },
    { speaker: 'YUKI', text: "......" },
    { speaker: 'IRIS', text: "...Where?... Where am I?..." },
    { speaker: 'RAYMOND', text: "You're in the hospital, but don't worry, everything is alright." },
    { speaker: 'IRIS', text: "But... a second ago I was... I saw... you all... what?" },
    { speaker: 'LAYLA', text: "We think you were dreaming. Although you were in a coma, your eyes were moving around under your eyelids." },
    { speaker: 'LAYLA', text: "Seems like it was going on forever..." },
    { speaker: 'YUKI', text: "Yeah... that scared me a little." },
    { speaker: 'IRIS', text: "So... all this time... it was all just a bad dream?..." },
    { speaker: 'WIOLA', text: "Girl! You tried to kill yourself! What were you thinking, running under that car? Half of the UK heard about this!" },
    { speaker: 'WIOLA', text: "I swear, if you scare me like this again, you better run!" }, 
    { speaker: 'LAYLA', text: "WIOLA STOP, OMG! Save it for later!" },
    { speaker: 'WIOLA', text: "..." },
    { speaker: 'RAYMOND', text: "We were all so worried about you. When we heard about this, we all rushed in to see you." },
    { speaker: 'IRIS', text: "But... but you guys all live so far... I've only caused trouble..." },
    { speaker: 'CHARLOTTE', text: "Don't say that, Iris. It is not your fault. We know how busy and overworked you've been." },
    { speaker: 'CHARLOTTE', text: "If only we messaged more frequently... This is the least we could do." },
    { speaker: 'YUKI', text: "Well, it was the least we could do... but we did more." },
    { speaker: 'YUKI', text: "In fact, we came up with an idea that we can all start a company together!" },
    { speaker: 'IRIS', text: "What? That is a crazy idea! How will that ever work?" },
    { speaker: 'LAYLA', text: "Don't worry about it. While you were having your baby nap, the five of us talked over all the details." },
    { speaker: 'LAYLA', text: "It is truly not as hard as you think." },
    { speaker: 'RAYMOND', text: "We all have things we don't like about our current jobs... and we realized that there is nothing truly keeping us there..." },
    { speaker: 'IRIS', text: "I... am truly taken away... if only this could work. I've also been thinking... and our years at Uni have actually been the happiest years of my life." },
    { speaker: 'IRIS', text: "I don't want to sweet talk... but you guys truly are like family... I've missed you all ever since." },
    { speaker: 'RAYMOND', text: "So sweet, my teeth hurt..." },
    { speaker: 'IRIS', text: "Shush Ray... I know you love it really..." },
    { speaker: 'IRIS', text: "Only thing I won't miss is climbing Park Street... every day I poured my blood, sweat and tears to reach the top..." },
    { speaker: 'RAYMOND', text: "Hehe." },
    { speaker: 'LAYLA', text: "Hahahaha!" },
    { speaker: 'CHARLOTTE', text: "Hahaha, Iris, you are truly the one and only, Park Street Survivor!" }
];

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
