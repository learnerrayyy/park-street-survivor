// Park Street Survivor - Main Application Controller
// Responsibilities: Global state management, hardware input routing, and game loop orchestration.

// ─── GLOBAL SYSTEM INSTANCES ─────────────────────────────────────────────────
let gameState, mainMenu, roomScene, inventory, env, player, obstacleManager, levelController;
let backpackUI;
let endScreenManager;
let testingPanel;

// ─── GAME PROGRESS STATE ─────────────────────────────────────────────────────
let currentUnlockedDay = 1;
let currentDayID = 1;

// ─── ASSET REGISTRY ──────────────────────────────────────────────────────────
let assets = {
    menuBg: null,
    otherBg: null,
    warningImg: null,
    keys: {},
    selectClouds: [],
    selectBg: {
        unlock: null,
        lock: null
    },
    previews: [],
    playerAnim: {
        north: [],
        south: [],
        west:  [],
        east:  []
    }
};
let fonts = {};
let bgm, sfxSelect, sfxClick;

// ─── AUDIO VOLUME CONTROLS ───────────────────────────────────────────────────
let masterVolumeBGM = 0.25;
let masterVolumeSFX = 0.7;

// ─── DIFFICULTY SETTING ──────────────────────────────────────────────────────
// 0 = EASY (locked), 1 = NORMAL (default), 2 = HARD (locked)
let gameDifficulty = 1;
const DIFFICULTY_LABELS = ["EASY", "NORMAL", "HARD"];

// ─── GLOBAL BACKGROUND WITH OVERLAY ──────────────────────────────────────────
/**
 * Shared dark-overlay alpha for every screen that renders otherBg.
 * Change this ONE value to adjust the darkness uniformly across
 * settings, help, pause, story, and the room wallpaper.
 */
const SHARED_BG_OVERLAY_ALPHA = 100;

/**
 * Draws the standard otherBg background with a unified dark overlay.
 * Uses cover-scale (imageMode CENTER, max-scale) so the image fills the
 * canvas without stretching — identical to the room scene wallpaper.
 * Used in settings, help, pause, and story screens for consistent look.
 */
function drawOtherBgWithOverlay() {
    push();
    if (assets && assets.otherBg) {
        let s = max(width / assets.otherBg.width, height / assets.otherBg.height);
        imageMode(CENTER);
        image(assets.otherBg, width / 2, height / 2, assets.otherBg.width * s, assets.otherBg.height * s);
    } else {
        background(20);
    }
    noStroke();
    fill(0, 0, 0, SHARED_BG_OVERLAY_ALPHA);
    rectMode(CORNER);
    rect(0, 0, width, height);
    imageMode(CORNER);
    pop();
}

// ─── TUTORIAL WARNING ICON ────────────────────────────────────────────────────
/**
 * Draws a pulsing warning icon at (x, y) with a breathing scale animation.
 * @param {number} x      Center X
 * @param {number} y      Center Y
 * @param {number} size   Base diameter in pixels
 */
function drawWarningIcon(x, y, size) {
    if (!assets.warningImg) return;

    let originalW = assets.warningImg.width;
    let originalH = assets.warningImg.height;
    let aspectRatio = originalW / originalH;

    let breathe = 0.85 + sin(frameCount * 0.08) * 0.15;
    let renderH = size * breathe;
    let renderW = (size * aspectRatio) * breathe;

    push();
    imageMode(CENTER);
    image(assets.warningImg, x, y, renderW, renderH);
    pop();
}

// ─── GLOBAL FADE TRANSITION CONTROLLER ───────────────────────────────────────
// Drives a 0.3s fade-in / fade-out overlay across all scene transitions.
let globalFade = {
    alpha: 0,
    speed: 255 / (0.3 * 60),
    isFading: false,
    dir: 1,
    callback: null
};

// ─── PAUSE MENU STATE ─────────────────────────────────────────────────────────
let pauseIndex = -1;  // -1 = no selection (nothing highlighted by default)
let pauseFromState = null;

// Pause options vary by context (room vs day-run)
function getPauseOptions() {
    if (gameState && gameState.previousState === STATE_DAY_RUN) {
        return ["RESTART","SETTINGS", "STORY", "HELP", "EXIT"];
    }
    return ["SETTINGS", "STORY", "HELP", "EXIT"];
}

// Restart sub-menu state
let showRestartChoice = false;
let restartChoiceIndex = 0;
const RESTART_OPTIONS = ["BACK TO ROOM", "RESTART RUN"];

// Pause button breathing scale (smooth lerp)
let pauseBtnScale = 1.0;

// Story recap state
let showStoryRecap = false;
let storyRecapDay = 1;
let storyScrollOffset = 0;  // scroll offset within current day's text

// ─── STORY RECAP CONTENT ──────────────────────────────────────────────────────
/**
 * Story summary text for each day's recap panel.
 * Each entry has a title (shown above the cloud) and lines[] (scrollable body text).
 */
const STORY_RECAPS = {
    1: {
        title: "Day 1 — Monday",
        lines: [
            "First day of term.",
            "The alarm went off at 8:15.",
            "",
            "You threw on your hoodie, grabbed your",
            "laptop, and sprinted out the door.",
            "",
            "Park Street looked deceptively calm.",
            "Then the buses came.",
            "",
            "You wove between parked scooters,",
            "ducked past a leaflet-handing promoter,",
            "and somehow made it to the Arts Complex",
            "with two minutes to spare.",
            "",
            "You rewarded yourself with a coffee.",
            "It helped. A little."
        ]
    },
    2: {
        title: "Day 2 — Tuesday",
        lines: [
            "Seminar at 9:00.",
            "You left at 8:48.",
            "",
            "The hill felt steeper than yesterday.",
            "A scooter nearly clipped your shoulder.",
            "",
            "You spotted an empty scooter by the kerb",
            "and hopped on for a short burst —",
            "probably not legal, definitely worth it.",
            "",
            "You arrived breathless but present.",
            "The lecturer hadn't even started yet.",
            "",
            "Small victories."
        ]
    },
    3: {
        title: "Day 3 — Wednesday",
        lines: [
            "Midweek. The city felt busier.",
            "",
            "A street vendor was handing out flyers",
            "right in the middle of the pavement.",
            "You pressed SPACE ten times and",
            "launched a paper ball to clear the path.",
            "",
            "A homeless man stepped out unexpectedly",
            "and bumped you into the wrong lane.",
            "You recovered. Barely.",
            "",
            "The coffee from Tuesday was wearing off.",
            "You found another one on the kerb.",
            "",
            "Somehow, you kept moving."
        ]
    },
    4: {
        title: "Day 4 — Thursday",
        lines: [
            "It was raining.",
            "",
            "Your rain boots kept your feet dry",
            "through three separate puddles.",
            "Your headphones blocked out the noise",
            "of two separate promoters.",
            "",
            "The large car came out of nowhere.",
            "You felt it before you saw it.",
            "",
            "You stumbled. Lost momentum.",
            "But you kept running.",
            "",
            "The library was in sight.",
            "It always felt further in the rain."
        ]
    },
    5: {
        title: "Day 5 — Friday",
        lines: [
            "Final submission day.",
            "",
            "Your laptop was heavy in the bag.",
            "Your Student ID was clipped to your jacket.",
            "Everything you needed was with you.",
            "",
            "The street threw everything at you.",
            "Buses. Scooters. Promoters. Rain.",
            "",
            "You used every skill you'd picked up",
            "across the week.",
            "",
            "And then — the Arts Complex doors.",
            "Open. Waiting.",
            "",
            "You made it.",
            "You actually made it."
        ]
    }
};

// ─── TUTORIAL HINT SYSTEM ─────────────────────────────────────────────────────
/**
 * Tracks which tutorial hints are active.
 *   dayVisuallyUnlocked    — object {dayID: bool}; each day starts gray until player clicks once.
 *                            on that click the background turns color and the warning disappears,
 *                            but the game does NOT start yet (a second click is required).
 *   levelSelectShownForDay — last day whose cloud was clicked to ENTER the game;
 *                            hint icon shows on days above this value.
 *   dayVisuallyUnlocked    — object {dayID: bool}; each day starts gray until player clicks once.
 *   levelSelectShownForDay — last day whose cloud was clicked to ENTER the game.
 *   roomPhase              — 'DESK' | 'CLOSE_BP' | 'DOOR' | 'DONE'
 */
let tutorialHints = {
    dayVisuallyUnlocked: {},   // { 1: true/false, 2: true/false, … } per-day first-click unlock
    levelSelectShownForDay: 0,
    roomPhase: 'DESK'
};

// ─── SPLASH LOGO ANIMATION STATE ─────────────────────────────────────────────
let titleDrop = { y: -200, vy: 0, landed: false, shake: 0 };

// ─── ITEM ENCYCLOPEDIA ───────────────────────────────────────────────────────
const ITEM_WIKI = [
    // BUFFS (Help Page 2)
    { name: 'COFFEE',      desc: 'INSTANT ENERGY +20', unlockDay: 1, imgKey: 'coffee',                      type: 'BUFF'   },
    { name: 'MOTORCYCLE',  desc: 'INSTANT ENERGY +20', unlockDay: 1, imgKey: 'motorcycle',                  type: 'BUFF'   },
    { name: 'HOT COFFEE',  desc: 'INSTANT ENERGY +20', unlockDay: 2, imgKey: 'coffee',                      type: 'BUFF'   },
    { name: 'HOT COFFEE',  desc: 'INSTANT ENERGY +20', unlockDay: 3, imgKey: 'coffee',                      type: 'BUFF'   },
    { name: 'HOT COFFEE',  desc: 'INSTANT ENERGY +20', unlockDay: 4, imgKey: 'coffee',                      type: 'BUFF'   },
    { name: 'HOT COFFEE',  desc: 'INSTANT ENERGY +20', unlockDay: 5, imgKey: 'coffee',                      type: 'BUFF'   },

    // HAZARDS (Help Page 3)
    { name: 'HEAVY TRAFFIC',  desc: 'Immediately fail upon collision.',           unlockDay: 1, imgKey: ['ambulance', 'bus'],       type: 'HAZARD' },
    { name: 'LIGHT TRAFFIC',  desc: 'Causes player to lose health.',              unlockDay: 1, imgKey: ['car_brown', 'car_red'],   type: 'HAZARD' },
    { name: 'HOMELESS',       desc: 'Forces immediate lane change.',              unlockDay: 1, imgKey: 'homeless',                type: 'HAZARD' },
    { name: 'PROMOTER',       desc: 'A flyer that blocks the Iris\'s view.',      unlockDay: 1, imgKey: 'promoter',                type: 'HAZARD' },
    { name: 'SCOOTER RIDER',  desc: 'Causes temporary stun.',                     unlockDay: 1, imgKey: 'scooter_rider',           type: 'HAZARD' },
    { name: 'PADDLE',         desc: '...',                                        unlockDay: 4, imgKey: 'scooter_rider',           type: 'HAZARD' }
];

// ─── ASSET LOADING TRACKER ───────────────────────────────────────────────────
let isLoaded = false;
let loadProgress = 0;
let smoothProgress = 0;
let assetsLoadedCount = 0;
const totalAssetsToLoad = 37;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: ASSET LOADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Increments the loaded-asset counter and updates the progress ratio.
 */
function itemLoaded() {
    assetsLoadedCount++;
    loadProgress = assetsLoadedCount / totalAssetsToLoad;
}

/**
 * p5.js lifecycle hook: loads all assets before setup() runs.
 * Each callback calls itemLoaded() to track real-time progress.
 */
function preload() {
    // Visual assets
    assets.menuBg      = loadImage('assets/cbg.png', itemLoaded);
    assets.otherBg     = loadImage('assets/other_bg.png', itemLoaded);
    assets.libraryBg   = loadImage('assets/background/library.jpg', itemLoaded);
    assets.bbg         = loadImage('assets/bbg.png', itemLoaded);
    assets.roomBg      = loadImage('assets/room.png', itemLoaded);
    assets.inventoryBg    = loadImage('assets/inventory/table.png', itemLoaded);
    assets.backpackImg    = loadImage('assets/inventory/backpack.png', itemLoaded);
    assets.studentCardImg = loadImage('assets/inventory/student_card.png', itemLoaded);
    assets.computerImg    = loadImage('assets/inventory/computer.png', itemLoaded);
    assets.vitaminImg     = loadImage('assets/inventory/vitamin.png', itemLoaded);
    assets.tangleImg      = loadImage('assets/inventory/tangle.png', itemLoaded);
    assets.headphoneImg   = loadImage('assets/inventory/headphone.png', itemLoaded);
    assets.rainbootImg    = loadImage('assets/inventory/rainboot.png', itemLoaded);

    assets.selectBg.unlock = loadImage('assets/select_background/day_unlock.jpg', itemLoaded);
    assets.selectBg.lock   = loadImage('assets/select_background/day_lock.jpg', itemLoaded);

    // Story recap assets
    assets.storyShape = loadImage('assets/story/frame_shape.png', itemLoaded);
    assets.storyCloud = loadImage('assets/story/frame_cloud.png', itemLoaded);


    for (let i = 1; i <= 5; i++) {
        assets.selectClouds.push(loadImage(`assets/select_cloud/Cloud-${i}.png`, itemLoaded));
    }

    // Typography
    fonts.title = loadFont('assets/fonts/PressStart2P-Regular.ttf', itemLoaded);
    fonts.time  = loadFont('assets/fonts/VT323-Regular.ttf', itemLoaded);
    fonts.body  = loadFont('assets/fonts/DotGothic16-Regular.ttf', itemLoaded);
    fonts.logo  = loadFont('assets/fonts/title_1.otf', itemLoaded);

    // Audio
    soundFormats('mp3', 'wav');
    bgm       = loadSound('assets/audio/music/MainTheme.mp3', itemLoaded);
    sfxSelect = loadSound('assets/audio/effects/Select.wav', itemLoaded);
    sfxClick  = loadSound('assets/audio/effects/Click.wav', itemLoaded);

    // Control key sprites
    assets.keys.w     = loadImage('assets/control_keys/W.png', itemLoaded);
    assets.keys.a     = loadImage('assets/control_keys/A.png', itemLoaded);
    assets.keys.s     = loadImage('assets/control_keys/S.png', itemLoaded);
    assets.keys.d     = loadImage('assets/control_keys/D.png', itemLoaded);
    assets.keys.up    = loadImage('assets/control_keys/ARROWUP.png', itemLoaded);
    assets.keys.down  = loadImage('assets/control_keys/ARROWDOWN.png', itemLoaded);
    assets.keys.left  = loadImage('assets/control_keys/ARROWLEFT.png', itemLoaded);
    assets.keys.right = loadImage('assets/control_keys/ARROWRIGHT.png', itemLoaded);
    assets.keys.enter = loadImage('assets/control_keys/ENTER.png', itemLoaded);
    assets.keys.space = loadImage('assets/control_keys/SPACE.png', itemLoaded);
    assets.keys.e     = loadImage('assets/control_keys/E.png', itemLoaded);
    assets.keys.p     = loadImage('assets/control_keys/P.png', itemLoaded);

    // Logo frames
    assets.logoImgs = [
        loadImage('assets/logo/logo_1.png', itemLoaded),
        loadImage('assets/logo/logo_2.png', itemLoaded),
        loadImage('assets/logo/logo_3.png', itemLoaded),
        loadImage('assets/logo/logo_4.png', itemLoaded),
        loadImage('assets/logo/logo_5.png', itemLoaded)
    ];

    assets.uobLogo = loadImage('assets/logo/uob_logo.png', itemLoaded);

    // UI button sprites
    assets.btnImg   = loadImage('assets/buttons/button.png', itemLoaded);
    assets.backImg  = loadImage('assets/buttons/back.png', itemLoaded);
    assets.pauseImg = loadImage('assets/buttons/pause.png', itemLoaded);

    // Entity preview sprites (no progress tracking — non-critical)
    if (!assets.previews) assets.previews = {};
    assets.previews['player']        = loadImage('assets/characters/wiki/Iris.png');
    assets.previews['npc_1']         = loadImage('assets/characters/wiki/Wiola.png');
    assets.previews['ambulance']     = loadImage('assets/obstacles/ambulance.png');
    assets.previews['bus']           = loadImage('assets/obstacles/bus.png');
    assets.previews['car_brown']     = loadImage('assets/obstacles/car_brown.png');
    assets.previews['car_red']       = loadImage('assets/obstacles/car_red.png');
    assets.previews['homeless']      = loadImage('assets/obstacles/homeless.png');
    assets.previews['promoter']      = loadImage('assets/obstacles/promoter.png');
    assets.previews['scooter_rider'] = loadImage('assets/obstacles/scooter_rider.png');
    assets.previews['coffee']        = loadImage('assets/power_up/coffee.png');
    assets.previews['motorcycle']    = loadImage('assets/power_up/motorcycle.png');

    // Player directional animation spritesheets
    assets.playerAnim = {};
    const dirs = ['north', 'south', 'west', 'east'];
    dirs.forEach(d => {
        assets.playerAnim[d] = { walk: [], idle: null };
        assets.playerAnim[d].idle = loadImage(`assets/characters/spritesheet/${d}.png`);
        loadImage(`assets/characters/spritesheet/spritesheet_${d}.png`, (img) => {
            let fw = img.width / 5;
            let fh = img.height;
            for (let i = 0; i < 5; i++) {
                assets.playerAnim[d].walk.push(img.get(i * fw, 0, fw, fh));
            }
        });
    });

    // Sound effects & Background music mute buttons
    assets.musicOn    = loadImage('assets/buttons/music_on.png', itemLoaded);
    assets.musicOff   = loadImage('assets/buttons/music_off.png', itemLoaded);
    assets.warningImg = loadImage('assets/buttons/warning.png', itemLoaded);
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: ENGINE LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * p5.js lifecycle hook: initialises the canvas and all system modules.
 */
function setup() {
    let cvs = createCanvas(GLOBAL_CONFIG.resolutionW, GLOBAL_CONFIG.resolutionH);
    cvs.parent('canvas-container');
    noSmooth();

    gameState       = new GameState();
    mainMenu        = new MainMenu();
    roomScene       = new RoomScene();
    inventory       = new InventorySystem();
    env             = new Environment();
    player          = new Player();
    obstacleManager = new ObstacleManager();
    backpackUI      = new BackpackVisual(inventory, roomScene);
    levelController  = new LevelController();
    endScreenManager = new EndScreenManager();
    testingPanel     = new TestingPanel();

    textFont(fonts.body);
    gameState.currentState = STATE_LOADING;

    if (developerMode) devApplyStartupSkip();
}

/**
 * p5.js lifecycle hook: main render loop — routes to the active scene each frame.
 */
function draw() {
    background(30);

    try {
        switch (gameState.currentState) {
            case STATE_LOADING:
                drawLoadingScreen();
                break;

            case STATE_SPLASH:
                drawSplashScreen();
                break;

            case STATE_MENU:
            case STATE_LEVEL_SELECT:
            case STATE_SETTINGS:
            case STATE_HELP:
                if (mainMenu) {
                    mainMenu.menuState = gameState.currentState;
                    mainMenu.display();
                }
                break;

            case STATE_ROOM:
                if (roomScene) roomScene.display();
                if (player) {
                    player.update();
                    player.display();
                }
                drawPauseButton();
                break;

            case STATE_INVENTORY:
                if (backpackUI) backpackUI.display();
                break;

            case STATE_DAY_RUN:
                runGameLoop();
                drawPauseButton();
                break;

            case STATE_PAUSED:
                if (gameState.previousState === STATE_ROOM) {
                    if (roomScene) roomScene.display();
                    if (player) player.display();
                } else if (gameState.previousState === STATE_DAY_RUN) {
                    if (env) env.display();
                    if (obstacleManager) obstacleManager.display();
                    if (player) player.display();
                }
                renderPauseOverlay();
                break;

            case STATE_FAIL:
                // Draw frozen gameplay behind the overlay
                if (env) env.display();
                if (obstacleManager) obstacleManager.display();
                if (player) player.display();
                if (endScreenManager) {
                    if (!endScreenManager._activeScreen) {
                        endScreenManager.activateFail(gameState.failReason || "EXHAUSTED");
                    }
                    endScreenManager.display();
                }
                break;

            case STATE_WIN:
                if (endScreenManager) {
                    if (!endScreenManager._activeScreen) {
                        // Unlock next day immediately so its warning icon appears on level select
                        if (currentDayID < 5) {
                            currentUnlockedDay = Math.max(currentUnlockedDay, currentDayID + 1);
                        }
                        endScreenManager.activateSuccess();
                    }
                    endScreenManager.display();
                }
                break;
        }
    } catch (e) {
        console.error("[Core Systems] Runtime Exception:", e);
    }

    renderGlobalFade();

    // TestingPanel always draws on top of everything (dev overlay)
    if (testingPanel) testingPanel.draw();
}

/**
 * Updates all game-world systems for a single frame during the run state.
 */
function runGameLoop() {
    if (levelController) { levelController.update(); }
    if (env)             { env.update(GLOBAL_CONFIG.scrollSpeed); env.display(); }
    if (obstacleManager) { obstacleManager.update(GLOBAL_CONFIG.scrollSpeed, player, levelController ? levelController.levelPhase : "RUNNING"); obstacleManager.display(); }
    if (player)          { player.update(); player.display(); }
    if (levelController) { levelController.display(); }

    // Win condition: settlement point reached
    if (levelController && levelController.checkSettlementPoint()) {
        console.log("[runGameLoop] STATE_WIN triggered!");
        gameState.setState(STATE_WIN);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: AUDIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plays a sound effect at the global SFX volume level.
 */
function playSFX(sound) {
    if (sound) {
        sound.setVolume(masterVolumeSFX);
        sound.play();
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Starts a fade-to-black transition. Calls onBlackout at peak opacity,
 * then fades back in. Ignored if a transition is already running.
 */
function triggerTransition(onBlackout) {
    if (globalFade.isFading) return;
    globalFade.isFading = true;
    globalFade.dir      = 1;
    globalFade.alpha    = 0;
    globalFade.callback = onBlackout;
}

/**
 * Renders the full-screen fade overlay each frame.
 * Advances the alpha, fires the midpoint callback, and resets state on completion.
 */
function renderGlobalFade() {
    if (!globalFade.isFading && globalFade.alpha <= 0) return;

    globalFade.alpha += globalFade.speed * globalFade.dir;

    if (globalFade.dir === 1 && globalFade.alpha >= 255) {
        globalFade.alpha = 255;
        if (globalFade.callback) globalFade.callback();
        globalFade.dir = -1;
    }
    if (globalFade.dir === -1 && globalFade.alpha <= 0) {
        globalFade.alpha    = 0;
        globalFade.isFading = false;
        globalFade.callback = null;
    }

    push();
    noStroke();
    fill(0, globalFade.alpha);
    rect(0, 0, width, height);
    pop();
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: INPUT HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatches keyboard events to the appropriate scene or system handler.
 */
function keyPressed() {
    if (globalFade.isFading) return;
    let state = gameState.currentState;

    // Toggle developer mode
    if (key === '0') devToggle();

    // Toggle TestingPanel with backtick (`) or F2
    if (key === '`' || keyCode === 113) {
        if (testingPanel) testingPanel.toggle();
        return;
    }

    // If TestingPanel is open, route all keys to it and block everything else
    if (testingPanel && testingPanel.isVisible()) {
        testingPanel.handleKeyPressed(key, keyCode);
        return;
    }

    // Dev shortcuts: 8 = instant WIN, 9 = instant FAIL
    if (developerMode) {
        if (key === '8') { devGoToWin();  return; }
        if (key === '9') { devGoToFail("EXHAUSTED"); return; }
    }

    // Pause / unpause — available in most gameplay states (but NOT while already paused)
    if ((key === 'p' || key === 'P' || keyCode === ESCAPE) && state !== STATE_PAUSED) {
        if (state !== STATE_MENU && state !== STATE_LEVEL_SELECT &&
            state !== STATE_SETTINGS && state !== STATE_HELP &&
            state !== STATE_SPLASH && state !== STATE_INVENTORY &&
            state !== STATE_FAIL && state !== STATE_WIN) {
            playSFX(sfxClick);
            togglePause();
            pauseIndex = -1;
            showRestartChoice = false;
            showStoryRecap = false;
            return;
        }
    }

    // Pause menu navigation
    if (state === STATE_PAUSED) {
        if (showStoryRecap) {
            // ── Dev adjust mode: intercept arrow keys for layer positioning ──
            if (showStoryDebugControls) {
                // Layer selection: 1=shape, 2=cloud, 3=content, 4=title
                if (key === '1') { storyDebugActiveLayer = 1; return; }
                if (key === '2') { storyDebugActiveLayer = 2; return; }
                if (key === '3') { storyDebugActiveLayer = 3; return; }
                if (key === '4') { storyDebugActiveLayer = 4; return; }
                if (key === 'p' || key === 'P') { printStoryDebugData(); return; }

                let layerKey = storyDebugActiveLayer === 1 ? 'shape'
                             : storyDebugActiveLayer === 2 ? 'cloud'
                             : storyDebugActiveLayer === 3 ? 'textArea'
                             : 'titleArea';
                let target = storyDebugData[layerKey];
                let resize = keyIsDown(SHIFT);

                if (keyCode === UP_ARROW) {
                    resize ? target.h -= 5 : target.y -= 5;
                    printStoryDebugData(); return;
                }
                if (keyCode === DOWN_ARROW) {
                    resize ? target.h += 5 : target.y += 5;
                    printStoryDebugData(); return;
                }
                if (keyCode === LEFT_ARROW) {
                    resize ? target.w -= 5 : target.x -= 5;
                    printStoryDebugData(); return;
                }
                if (keyCode === RIGHT_ARROW) {
                    resize ? target.w += 5 : target.x += 5;
                    printStoryDebugData(); return;
                }
            }

            // Story recap: UP/DOWN or W/S scroll content within the day
            if (keyCode === UP_ARROW || keyCode === 87) {
                if (storyScrollOffset <= 0 && storyRecapDay > 1) {
                    // Auto-retreat to previous day
                    storyRecapDay--;
                    let prevRecap = STORY_RECAPS[storyRecapDay];
                    storyScrollOffset = max(0, prevRecap.lines.length - 10);
                } else {
                    storyScrollOffset = max(0, storyScrollOffset - 1);
                }
                if (typeof playSFX === 'function') playSFX(sfxSelect);
            } else if (keyCode === DOWN_ARROW || keyCode === 83) {
                let recap = STORY_RECAPS[storyRecapDay];
                if (recap) {
                    let maxScroll = max(0, recap.lines.length - 10);
                    if (storyScrollOffset >= maxScroll) {
                        // Auto-advance to next day
                        let nextDay = storyRecapDay + 1;
                        if (nextDay <= 5) {
                            storyRecapDay = nextDay;
                            storyScrollOffset = 0;
                        }
                    } else {
                        storyScrollOffset = min(maxScroll, storyScrollOffset + 1);
                    }
                }
                if (typeof playSFX === 'function') playSFX(sfxSelect);
            } else if (keyCode === LEFT_ARROW || keyCode === 65) {
                // Change to previous day
                if (storyRecapDay > 1) {
                    storyRecapDay--;
                    storyScrollOffset = 0;
                    if (typeof playSFX === 'function') playSFX(sfxSelect);
                }
            } else if (keyCode === RIGHT_ARROW || keyCode === 68) {
                // Change to next day
                let nextDay = storyRecapDay + 1;
                let isNextUnlocked = (nextDay <= currentUnlockedDay) || (typeof DEBUG_UNLOCK_ALL !== 'undefined' && DEBUG_UNLOCK_ALL);
                if (nextDay <= 5 && isNextUnlocked) {
                    storyRecapDay = nextDay;
                    storyScrollOffset = 0;
                    if (typeof playSFX === 'function') playSFX(sfxSelect);
                }
            } else if (keyCode === ESCAPE) {
                showStoryRecap = false;
                pauseIndex = -1;
            }
            return;
        } else if (showRestartChoice) {
            // Restart sub-menu navigation
            if (keyCode === UP_ARROW || keyCode === 87 || keyCode === DOWN_ARROW || keyCode === 83) {
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                if (restartChoiceIndex < 0) {
                    restartChoiceIndex = 0;
                } else {
                    restartChoiceIndex = (restartChoiceIndex + 1) % RESTART_OPTIONS.length;
                }
            } else if ((keyCode === ENTER || keyCode === 13) && restartChoiceIndex >= 0) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                handleRestartChoice();
            } else if (keyCode === ESCAPE) {
                showRestartChoice = false;
                pauseIndex = -1;
            }
        } else {
            let options = getPauseOptions();
            if (keyCode === UP_ARROW || keyCode === 87 || keyCode === DOWN_ARROW || keyCode === 83) {
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                
                if (pauseIndex < 0) {
                    if (keyCode === UP_ARROW || keyCode === 87) {
                        pauseIndex = options.length - 1;
                    } else {
                        pauseIndex = 0;
                    }
                } else if (keyCode === UP_ARROW || keyCode === 87) {
                    pauseIndex = (pauseIndex - 1 + options.length) % options.length;
                } else {
                    pauseIndex = (pauseIndex + 1) % options.length;
                }
            } else if ((keyCode === ENTER || keyCode === 13) && pauseIndex >= 0) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                handlePauseSelection();
            } else if (keyCode === ESCAPE) {
                // Back arrow behavior: resume from pause
                togglePause();
                pauseFromState = null;
                showStoryRecap = false;
            }
        }
        return;
    }

    // Menu navigation
    if (state === STATE_MENU || state === STATE_LEVEL_SELECT ||
        state === STATE_SETTINGS || state === STATE_HELP) {
        if (mainMenu) mainMenu.handleKeyPress(key, keyCode);
    }
    // Room navigation + inventory toggle (E key handled inside roomScene — desk-proximity gated)
    else if (state === STATE_ROOM) {
        if (roomScene) roomScene.handleKeyPress(keyCode);
    }
    // End screen navigation (fail / win)
    else if (state === STATE_FAIL || state === STATE_WIN) {
        if (endScreenManager) endScreenManager.handleKeyPress(keyCode);
    }

    // Close inventory with ESC — advance tutorial hint from CLOSE_BP
    if (gameState.currentState === STATE_INVENTORY && keyCode === ESCAPE) {
        if (tutorialHints.roomPhase === 'CLOSE_BP') {
            tutorialHints.roomPhase = (currentDayID === 1) ? 'DOOR' : 'DONE';
        }
        gameState.currentState = STATE_ROOM;
        return false;
    }
}

/**
 * Executes the selected option in the pause menu.
 */
function handlePauseSelection() {
    let options = getPauseOptions();
    let selected = options[pauseIndex];

    if (selected === "RESUME") {
        togglePause();
    } else if (selected === "STORY") {
        showStoryRecap = true;
        storyRecapDay = 1;
        storyScrollOffset = 0;
    } else if (selected === "SETTINGS") {
        pauseFromState = gameState.previousState;
        if (typeof playSFX === 'function') playSFX(sfxClick);
        mainMenu.diffToastTimer = 0;   // clear any stale difficulty toast
        gameState.currentState = STATE_SETTINGS;
        mainMenu.menuState     = STATE_SETTINGS;
    } else if (selected === "HELP") {
        pauseFromState         = gameState.previousState;
        if (typeof playSFX === 'function') playSFX(sfxClick);
        gameState.currentState = STATE_HELP;
        mainMenu.menuState     = STATE_HELP;
        mainMenu.helpPage      = 0;
    } else if (selected === "QUIT TO MENU") {
        triggerTransition(() => {
            gameState.setState(STATE_MENU);
            mainMenu.menuState = STATE_MENU;
            pauseFromState     = null;
            if (typeof showRestartChoice !== 'undefined') showRestartChoice = false;
            if (typeof showStoryRecap !== 'undefined') showStoryRecap = false;
        });
    } else if (selected === "RESTART") {
        if (typeof showRestartChoice !== 'undefined') {
            showRestartChoice   = true;
            restartChoiceIndex  = -1;
        } else {
            triggerTransition(() => {
                gameState.resetFlags();
                setupRun(currentDayID);
            });
        }
    } else if (selected === "EXIT") {
        triggerTransition(() => {
            gameState.setState(STATE_MENU);
            mainMenu.menuState = STATE_MENU;
            pauseFromState     = null;
            showRestartChoice  = false;
            showStoryRecap     = false;
        });
    }
}

function handleRestartChoice() {
    if (RESTART_OPTIONS[restartChoiceIndex] === "BACK TO ROOM") {
        triggerTransition(() => {
            showRestartChoice = false;
            gameState.setState(STATE_ROOM);
            if (roomScene) roomScene.reset();
            pauseFromState = null;
        });
    } else if (RESTART_OPTIONS[restartChoiceIndex] === "RESTART RUN") {
        triggerTransition(() => {
            showRestartChoice = false;
            player.applyLevelStats(currentDayID);
            player.x = 500;
            player.y = height / 2;
            obstacleManager = new ObstacleManager();
            levelController.initializeLevel(currentDayID);
            if (endScreenManager) endScreenManager._activeScreen = null;
            gameState.setState(STATE_DAY_RUN);
            pauseFromState = null;
        });
    }
}

/**
 * Dispatches mouse press events; also unlocks the Web Audio context on first click.
 */
function mousePressed() {
    if (globalFade.isFading) return;

    // TestingPanel intercepts all clicks when visible
    if (testingPanel && testingPanel.isVisible()) {
        testingPanel.handleMousePressed(mouseX, mouseY);
        return;
    }

    let state = gameState.currentState;

    // Splash screen: unlock audio and transition to main menu
    if (state === STATE_SPLASH) {
        if (getAudioContext().state !== 'running') getAudioContext().resume();
        playSFX(sfxClick);
        if (bgm && !bgm.isPlaying()) {
            bgm.setVolume(masterVolumeBGM);
            bgm.loop();
        }
        triggerTransition(() => gameState.setState(STATE_MENU));
        return;
    }

    if (state === STATE_PAUSED) {
        if (assets.backImg) {
            let bx = 70, by = 65;
            if (dist(mouseX, mouseY, bx, by) < 40) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                
                if (typeof showStoryRecap !== 'undefined' && showStoryRecap) {
                    showStoryRecap = false;
                    pauseIndex = -1;
                } else if (typeof showRestartChoice !== 'undefined' && showRestartChoice) {
                    showRestartChoice = false;
                    pauseIndex = -1;
                } else {
                    togglePause();
                }
                return;
            }
        }
        
        if (typeof showRestartChoice !== 'undefined' && showRestartChoice) {
            if (typeof restartChoiceIndex !== 'undefined' && restartChoiceIndex >= 0) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                handleRestartChoice();
            }
        } else if (showStoryRecap) {
            // Story recap: day sidebar clicks (anchor matches render at width * 0.16)
            let sidebarAnchorX = width * 0.16;
            let sidebarBaseY   = height * 0.45;
            for (let i = 0; i < 5; i++) {
                let diff  = i - (storyRecapDay - 1);
                let cardY = sidebarBaseY + diff * 130;
                if (mouseX > sidebarAnchorX - 120 && mouseX < sidebarAnchorX + 120 &&
                    mouseY > cardY - 40           && mouseY < cardY + 40) {
                    let day        = i + 1;
                        storyRecapDay     = day;
                        storyScrollOffset = 0;
                        if (typeof playSFX === 'function') playSFX(sfxSelect);
                    return;
                }
            }
            // Story recap: up/down arrow clicks — same coords as render (arrowX=width-90, gap=90)
            let arrowX  = width - 90;
            let centerY = height / 2;
            let arrowGap = 90;
            if (dist(mouseX, mouseY, arrowX, centerY - arrowGap) < 35) {
                if (storyRecapDay > 1) {
                    storyRecapDay--;
                    storyScrollOffset = 0;
                    if (typeof playSFX === 'function') playSFX(sfxSelect);
                }
                return;
            }
            if (dist(mouseX, mouseY, arrowX, centerY + arrowGap) < 35) {
                let nextDay        = storyRecapDay + 1;
                if (nextDay <= 5) {
                    storyRecapDay     = nextDay;
                    storyScrollOffset = 0;
                    if (typeof playSFX === 'function') playSFX(sfxSelect);
                }
                return;
            }
        } else {
            if (pauseIndex >= 0) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                handlePauseSelection();
            }
        }
        return;
    }

    if (state === STATE_MENU || state === STATE_LEVEL_SELECT ||
        state === STATE_SETTINGS || state === STATE_HELP) {
        if (mainMenu) mainMenu.handleClick(mouseX, mouseY);
    } else if (state === STATE_ROOM) {
        // Room back arrow click
        if (roomScene && roomScene.backButton.checkMouse(mouseX, mouseY)) {
            roomScene.backButton.handleClick();
            return;
        }
        // Pause button hit-test
        let pbx = width - 70, pby = 65;
        if (dist(mouseX, mouseY, pbx, pby) < 60) {
            playSFX(sfxClick);
            togglePause();
            pauseIndex = -1;
            showRestartChoice = false;
            showStoryRecap = false;
        }
    } else if (state === STATE_DAY_RUN) {
        // Pause button hit-test
        let pbx = width - 70, pby = 65;
        if (dist(mouseX, mouseY, pbx, pby) < 60) {
            playSFX(sfxClick);
            togglePause();
            pauseIndex = -1;
            showRestartChoice = false;
            showStoryRecap = false;
        }
    } else if (state === STATE_FAIL || state === STATE_WIN) {
        if (endScreenManager) endScreenManager.handleClick(mouseX, mouseY);
    }

    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMousePressed(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse release events to the active UI systems.
 */
function mouseReleased() {
    if (mainMenu) mainMenu.handleRelease();
    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMouseReleased(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse drag events to the active UI systems.
 */
function mouseDragged() {
    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMouseDragged(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse move events to the active UI systems.
 */
function mouseWheel(event) {
    if (gameState.currentState === STATE_PAUSED && showStoryRecap) {
        let recap = STORY_RECAPS[storyRecapDay];
        if (!recap) return false;
        let maxScroll = max(0, recap.lines.length - 10);
        if (event.delta > 0) {
            // Scroll down
            storyScrollOffset = min(maxScroll, storyScrollOffset + 2);
        } else {
            // Scroll up
            storyScrollOffset = max(0, storyScrollOffset - 2);
        }
        return false; // prevent page scroll
    }
}

function mouseMoved() {
    if (gameState.currentState === STATE_FAIL || gameState.currentState === STATE_WIN) {
        if (endScreenManager) endScreenManager.handleMouseMove(mouseX, mouseY);
    }
    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMouseMoved(mouseX, mouseY);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggles between the paused state and the previous active state.
 */
function togglePause() {
    if (gameState.currentState === STATE_PAUSED) gameState.setState(gameState.previousState);
    else gameState.setState(STATE_PAUSED);
}

/**
 * Initialises and starts a new run for the given day ID.
 */
function setupRun(dayID) {
    currentDayID = dayID;
    player.applyLevelStats(dayID);
    player.x = 500;
    player.y = height / 2;
    roomScene.reset();
    obstacleManager = new ObstacleManager();
    levelController.initializeLevel(dayID);
    tutorialHints.roomPhase = 'DESK';
    if (backpackUI) backpackUI.resetForNewDay();
    if (endScreenManager) endScreenManager._activeScreen = null;
    gameState.setState(STATE_ROOM);
}

/**
 * [Role: Core Systems Developer]
 * LEVEL BOOTSTRAP: Starts a specific day directly into the RUN state, skipping the room.
 */
function setupRunDirectly(dayID) {
    currentDayID = dayID;
    player.applyLevelStats(dayID);

    // Set position matching the "Exit Door" logic in RoomScene
    player.x = width / 2;
    player.y = height - 200;

    obstacleManager = new ObstacleManager();
    levelController.initializeLevel(dayID);
    if (backpackUI) backpackUI.resetForNewDay();
    if (endScreenManager) endScreenManager._activeScreen = null;
    gameState.setState(STATE_DAY_RUN);
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: UI RENDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the loading bar and UoB logo while assets stream in.
 * Transitions to STATE_SPLASH once the bar reaches 100%.
 */
function drawLoadingScreen() {
    background(10, 10, 15);
    let cx = width / 2;
    let cy = height / 2;

    if (assets.uobLogo) {
        push();
        imageMode(CENTER);
        let wave       = sin(frameCount * 0.05);
        let imgScale   = 1.0 + wave * 0.05;
        let alphaValue = 180 + wave * 75;
        tint(255, alphaValue);
        image(assets.uobLogo, cx, cy - 80, 120 * imgScale, 120 * imgScale);
        pop();
    }

    // Smooth the raw load ratio for a cleaner animation
    if (smoothProgress < loadProgress) {
        smoothProgress += 0.010;
    }
    smoothProgress = constrain(smoothProgress, 0, 1.0);

    drawLoadingProgressBar(cx, cy + 80, smoothProgress);

    if (smoothProgress >= 1.0) {
        setTimeout(() => {
            if (gameState.currentState === STATE_LOADING) {
                gameState.setState(STATE_SPLASH);
            }
        }, 150);
    }
}

/**
 * Draws a segmented pixel-art progress bar at the given position.
 * @param {number} x        Centre X of the bar.
 * @param {number} y        Centre Y of the bar.
 * @param {number} progress Normalised fill ratio [0, 1].
 */
function drawLoadingProgressBar(x, y, progress) {
    let totalSegments = 10;
    let gap    = 8;
    let blockW = 24;
    let blockH = 16;
    let totalW = (blockW * totalSegments) + (gap * (totalSegments - 1));

    push();
    textAlign(CENTER, TOP);
    textFont(fonts.time);
    textSize(18);
    fill(255, 216, 0, 180);
    text("[ " + floor(progress * 100) + "% COMPLETE ]", x, y + 25);

    rectMode(CORNER);
    for (let i = 0; i < totalSegments; i++) {
        let bx        = (x - totalW / 2) + i * (blockW + gap);
        let by        = y - blockH / 2;
        let threshold = (i + 1) / totalSegments;

        if (progress >= threshold) {
            // Filled segment
            fill(255, 216, 0, 230);
            noStroke();
            rect(bx, by, blockW, blockH);
            // Pixel highlight strip
            fill(255, 255, 255, 100);
            rect(bx, by, blockW, 2);
        } else {
            // Empty segment
            fill(255, 216, 0, 30);
            noStroke();
            rect(bx, by, blockW, blockH);
            stroke(255, 216, 0, 50);
            strokeWeight(1);
            noFill();
            rect(bx, by, blockW, blockH);
        }
    }
    pop();
}

/**
 * Renders the splash screen: background, darkening overlay, logo, and prompts.
 */
function drawSplashScreen() {
    push();
    imageMode(CORNER);
    if (assets.menuBg) image(assets.menuBg, 0, 0, width, height);
    else background(20);

    rectMode(CORNER);
    fill(0, 0, 0, 160);
    rect(0, 0, width, height);

    drawLogoPlaceholder(width / 2, 320);
    drawInteractionPrompts();
    pop();
}

/**
 * Renders the animated game logo with a physics-based drop-in and cloud layers.
 * @param {number} x Target centre X.
 * @param {number} y Target centre Y.
 */
function drawLogoPlaceholder(x, y) {
    let isSplash = (gameState.currentState === STATE_SPLASH);
    let t        = frameCount * 0.02;
    let targetY  = isSplash ? (y + 160) : (y + 10);

    // Drop-in physics (gravity 1.2 → 3.0 for a snappier drop)
    if (!titleDrop.landed) {
        titleDrop.vy += 2.0;
        titleDrop.y  += titleDrop.vy;
        if (titleDrop.y >= y + 160) {
            titleDrop.y      = y + 160;
            titleDrop.landed = true;
            titleDrop.shake  = 6;
        }
    } else {
        titleDrop.y = lerp(titleDrop.y, targetY, 0.15);
    }
    titleDrop.shake *= 0.7;

    // Full-screen logo background
    if (isSplash && assets.logoImgs && assets.logoImgs[4]) {
        push();
        imageMode(CENTER);
        image(assets.logoImgs[4], width / 2, height / 2, width * 1.02, height * 1.02);
        pop();
    }

    // Rear cloud layer
    if (isSplash && assets.selectClouds) {
        push();
        imageMode(CENTER);
        tint(255, 255, 255, 200);
        image(assets.selectClouds[1], width * 0.1,  height * 0.9  + cos(t) * 10,  800, 480);
        image(assets.selectClouds[2], width * 0.1,  height * 0.2  + sin(t) * 10,  700, 420);
        image(assets.selectClouds[4], width * 1.0,  height * 0.09 + sin(t) * 10,  700, 420);
        pop();
    }

    // "PARK STREET" title — only apply random shake while it's perceptible (>= 0.5px)
    push();
    let shakeX = (titleDrop.shake >= 0.5) ? random(-titleDrop.shake, titleDrop.shake) : 0;
    translate(x + shakeX, titleDrop.y);
    drawSplitTitle("PARK STREET", 300, -130, 25);
    pop();

    // Mid cloud layer (between title lines)
    if (isSplash && assets.selectClouds) {
        push();
        imageMode(CENTER);
        noTint();
        image(assets.selectClouds[0], x - 240, y + 250 + sin(t * 1.2) * 8, 500, 300);
        pop();
    }

    // "SURVIVOR" subtitle — reuse the same shake offset computed above
    push();
    translate(x + shakeX, titleDrop.y);
    drawSplitTitle("SURVIVOR", 200, 80, 20);
    pop();

    // Front cloud layer
    if (isSplash && assets.selectClouds) {
        push();
        imageMode(CENTER);
        noTint();
        image(assets.selectClouds[2], width * 0.88, y + 230 + sin(t) * 10, 600, 360);
        pop();
    }
}

/**
 * Renders a single title string with a gold fill, purple stroke, and drop shadow.
 * @param {string} txt     Text to render.
 * @param {number} size    Font size.
 * @param {number} yOff    Y offset from current translation origin.
 * @param {number} sWeight Stroke weight.
 */
function drawSplitTitle(txt, size, yOff, sWeight) {
    textAlign(CENTER, CENTER);
    textFont(fonts.logo);
    textSize(size);
    drawingContext.lineJoin = 'round';
    // Drop shadow
    noStroke();
    fill(40, 15, 60, 150);
    text(txt, 7, yOff + 7);
    // Main text with purple outline
    strokeWeight(sWeight);
    stroke(110, 60, 150);
    fill(255, 216, 0);
    text(txt, 0, yOff);
}

/**
 * Renders the "CLICK TO START" pulse prompt and the audio warning on the splash screen.
 */
function drawInteractionPrompts() {
    push();
    textAlign(CENTER, CENTER);
    textFont(fonts.time);
    let pulse = sin(frameCount * 0.1) * 50;
    fill(255, 180 + pulse);
    textSize(60);
    text("CLICK TO START", width / 2, height - 280);

    fill(255, 255);
    textSize(40);
    text("PLEASE USE HEADPHONES & LOWER VOLUME. AUDIO INITIALIZES ON CLICK.", width / 2, height - 190);
    pop();
}

/**
 * Renders the circular pause button in the top-right corner of the screen.
 */
function drawPauseButton() {
    push();
    let sz = 120;
    let bx = width - 70;
    let by = 65;
    let isHover = dist(mouseX, mouseY, bx, by) < sz / 2;

    // Smooth breathing scale: hover targets 1.15, otherwise gentle pulse
    let breathe = 1.0 + sin(frameCount * 0.06) * 0.03;
    let targetScale = isHover ? 1.15 : breathe;
    pauseBtnScale = lerp(pauseBtnScale, targetScale, 0.12);

    imageMode(CENTER);
    translate(bx, by);
    scale(pauseBtnScale);
    if (assets.pauseImg) {
        image(assets.pauseImg, 0, 0, sz, sz);
    }
    pop();
}

/**
 * Renders the pause menu overlay with background, title, and selectable options.
 */
function renderPauseOverlay() {
    push();
    drawOtherBgWithOverlay();

    // Back arrow (top-left) — replaces RESUME, click to go back
    if (assets.backImg) {
        let bx = 70, by = 65;
        let isBackHover = dist(mouseX, mouseY, bx, by) < 40;
        push();
        translate(bx, by);
        if (isBackHover) scale(1.15);
        imageMode(CENTER);
        image(assets.backImg, 0, 0, 120, 120);
        pop();
    }

    if (showStoryRecap) {
        // ── Story Recap page ──
        renderStoryRecap();
    } else if (showRestartChoice) {
        // ── Restart sub-menu ──
        let titleY = height / 2 - 280;
        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(48);
        stroke(0, 0, 0, 180); strokeWeight(6); fill(255, 215, 0);
        text("RESTART?", width / 2, titleY);
        noStroke(); fill(255, 215, 0);
        text("RESTART?", width / 2, titleY);

        let optW = 280, optH = 80;  
        let spacing = 95;
        let totalH = (RESTART_OPTIONS.length - 1) * spacing;
        let startY = (height / 2) - (totalH / 2) + 20;

        let anyRestartHover = false;
        for (let i = 0; i < RESTART_OPTIONS.length; i++) {
            let ox = width / 2;
            let oy = startY + i * spacing;
            
            let isHover = (mouseX > ox - optW / 2 && mouseX < ox + optW / 2 &&
                           mouseY > oy - optH / 2 && mouseY < oy + optH / 2);
            if (isHover) { restartChoiceIndex = i; anyRestartHover = true; }
            let isSelected = (i === restartChoiceIndex) && restartChoiceIndex >= 0;

            push();
            translate(ox, oy);
            if (isSelected) scale(1.15);
            imageMode(CENTER);
            if (assets.btnImg) image(assets.btnImg, 0, 0, optW * 2, optH * 2);

            textFont(fonts.body); textSize(24); textAlign(CENTER, CENTER);
            stroke(0, 0, 0, 180); strokeWeight(5); fill(255, 215, 0);
            text(RESTART_OPTIONS[i], 0, -6);
            noStroke(); fill(255, 215, 0);
            text(RESTART_OPTIONS[i], 0, -6);
            pop();
        }
        if (!anyRestartHover && !keyIsPressed) restartChoiceIndex = -1;
        
    } else {
        // ── Normal pause menu ──
        let options = getPauseOptions();

        let titleY = height / 2 - 320;
        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(60);
        stroke(0, 0, 0, 180); strokeWeight(6); fill(255, 215, 0);
        text("PAUSED", width / 2, titleY);
        noStroke(); fill(255, 215, 0);
        text("PAUSED", width / 2, titleY);

        let optW = 280, optH = 80;  
        let spacing = 95;
        let totalH = (options.length - 1) * spacing;
        let startY = (height / 2) - (totalH / 2) + 30;

        let anyPauseHover = false;
        for (let i = 0; i < options.length; i++) {
            let ox = width / 2;
            let oy = startY + i * spacing;
            
            let isHover = (mouseX > ox - optW / 2 && mouseX < ox + optW / 2 &&
                           mouseY > oy - optH / 2 && mouseY < oy + optH / 2);
            if (isHover) { pauseIndex = i; anyPauseHover = true; }
            let isSelected = (i === pauseIndex) && pauseIndex >= 0;

            push();
            translate(ox, oy);
            if (isSelected) scale(1.15);
            imageMode(CENTER);
            if (assets.btnImg) image(assets.btnImg, 0, 0, optW * 2, optH * 2);

            textFont(fonts.body); textSize(24); textAlign(CENTER, CENTER);
            stroke(0, 0, 0, 180); strokeWeight(5); fill(255, 215, 0);
            text(options[i], 0, -6);
            noStroke(); fill(255, 215, 0);
            text(options[i], 0, -6);
            pop();
        }
        if (!anyPauseHover && !keyIsPressed) pauseIndex = -1;
    }
    pop();
}

/**
 * Renders the story recap sub-page inside the pause overlay.
 *
 * Layer order (bottom → top):
 *   L1  other_bg + overlay      — drawn by renderPauseOverlay() before this call
 *   L2a Left sidebar (day cards)
 *   L2b frame_shape.png         — full-canvas decorative background panel
 *   L3  Story CONTENT text      — clipped to textArea, sandwiched before cloud
 *   L4  frame_cloud.png         — full-canvas decorative overlay (covers content edges)
 *   L5  Title text              — always on top of everything
 *   L5  Up/Down arrows          — always on top, fully clickable
 */
function renderStoryRecap() {
    let dayNames = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    let isUnlocked = (storyRecapDay < currentUnlockedDay) ||
                     (typeof DEBUG_UNLOCK_ALL !== 'undefined' && DEBUG_UNLOCK_ALL);
    let recap = STORY_RECAPS[storyRecapDay];

    // ── L2a: Left sidebar — skewed day cards (moved right slightly) ──
    let sidebarX     = width * 0.16;   // was 0.12 — shifted right
    let sidebarBaseY = height * 0.45;
    let cardSpacing  = 130;

    push();
    translate(sidebarX, sidebarBaseY);
    for (let i = 0; i < 5; i++) {
        let day  = i + 1;
        let diff = i - (storyRecapDay - 1);
        let distFromCenter = abs(diff);
        let cardY = diff * cardSpacing;
        let cardX = distFromCenter * 30;

        let dayUnlocked = (day <= currentUnlockedDay) ||
                          (typeof DEBUG_UNLOCK_ALL !== 'undefined' && DEBUG_UNLOCK_ALL);
        let isSelected = (day === storyRecapDay);
        let alpha = map(distFromCenter, 0, 2, 255, 50);
        let s     = map(distFromCenter, 0, 1, 1.15, 0.8);

        push();
        translate(cardX, cardY);
        rotate(radians(-12));
        scale(constrain(s, 0.5, 1.4));

        noStroke();
        fill(dayUnlocked
            ? (isSelected ? [255, 20, 147, alpha] : [70, 20, 90, alpha * 0.6])
            : [30, 30, 45, alpha * 0.7]);

        beginShape();
        vertex(-110, -32); vertex(130, -44);
        vertex(110,   32); vertex(-130,  44);
        endShape(CLOSE);

        textAlign(LEFT, CENTER);
        textFont(fonts.title); textSize(40);
        fill(isSelected ? color(255, 215, 0, alpha) : color(255, alpha));
        text(day.toString().padStart(2, '0'), -90, 4);

        textFont(fonts.body); textSize(18);
        if (dayUnlocked) {
            fill(isSelected ? color(255, 215, 0, alpha) : color(255, 215, 0, alpha * 0.8));
            text(dayNames[i], -10, 8);
        } else {
            fill(180, 60, 60, alpha); textSize(14);
            text("LOCKED", -10, 8);
        }

        // Warning icon on any day that is unlocked but not yet visually unlocked (first click pending)
        let showRecapHint = day <= currentUnlockedDay &&
                            !tutorialHints.dayVisuallyUnlocked[day] &&
                            assets.warningImg;
        if (showRecapHint) {
            drawWarningIcon(100, -38, 50);
        }

        pop();
    }
    pop();

    // ── L2b: frame_shape.png ──
    if (assets.storyShape) {
        push();
        imageMode(CENTER);
        image(assets.storyShape,
              storyDebugData.shape.x, storyDebugData.shape.y,
              storyDebugData.shape.w, storyDebugData.shape.h);
        drawingContext.filter = 'none';
        pop();
    }

    // ── L3: Story CONTENT lines — clipped to textArea, sandwiched before cloud ──
    let textX = storyDebugData.textArea.x;
    let textY = storyDebugData.textArea.y;
    let textW = storyDebugData.textArea.w;
    let textH = storyDebugData.textArea.h;

    if (recap && isUnlocked) {
        push();
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(textX - textW / 2, textY - textH / 2, textW, textH);
        drawingContext.clip();

        // Content lines only (title is drawn separately above the cloud)
        textFont(fonts.body); textSize(25); textAlign(CENTER, CENTER);
        let lineH      = 32;
        let contentTop = textY - textH / 2 + 24;   // start near top of clip box
        let maxScroll  = max(0, recap.lines.length - 10);
        storyScrollOffset = constrain(storyScrollOffset, 0, maxScroll);

        for (let j = 0; j < recap.lines.length; j++) {
            let ly = contentTop + (j - storyScrollOffset) * lineH;
            if (ly < textY - textH / 2 || ly > textY + textH / 2) continue;
            let lineText = recap.lines[j];
            if (lineText === "") continue;

            let edgeFade = 255;
            let topEdge  = textY - textH / 2 + 30;
            let botEdge  = textY + textH / 2 - 28;
            if (ly < topEdge) edgeFade = map(ly, textY - textH / 2, topEdge, 0, 255);
            if (ly > botEdge) edgeFade = map(ly, botEdge, textY + textH / 2, 255, 0);
            edgeFade = constrain(edgeFade, 0, 255);

            stroke(0, 0, 0, edgeFade * 0.6); strokeWeight(3); fill(255, 240, 220, edgeFade);
            text(lineText, textX, ly);
            noStroke(); fill(255, 240, 220, edgeFade);
            text(lineText, textX, ly);
        }

        drawingContext.restore();
        pop();

        // Scroll bar below text area
        if (maxScroll > 0) {
            let barW = 200, barH = 6;
            noStroke();
            fill(255, 255, 255, 40);
            rect(textX - barW / 2, textY + textH / 2 + 18, barW, barH, 3);
            fill(255, 215, 0, 150);
            rect(textX - barW / 2, textY + textH / 2 + 18,
                 map(storyScrollOffset, 0, maxScroll, 20, barW), barH, 3);
        }
    } else {
        push();

        textAlign(CENTER, CENTER);
        textFont(fonts.title);

        textSize(45);
        stroke(0, 0, 0, 180);
        strokeWeight(6);
        fill(255, 215, 0);
        text("LOCKED", textX, textY);

        noStroke();
        fill(255, 215, 0);
        text("LOCKED", textX, textY);

        textFont(fonts.body);
        textSize(20);
        fill(200);
        text("COMPLETE TODAY TO REVEAL", textX, textY + 40);
        pop();
    }

    // ── L4: frame_cloud.png — sits on top of content, under title ──
    if (assets.storyCloud) {
        push();
        imageMode(CENTER);
        tint(255, storyDebugData.cloud.alpha);
        image(assets.storyCloud,
              storyDebugData.cloud.x, storyDebugData.cloud.y,
              storyDebugData.cloud.w, storyDebugData.cloud.h);
        noTint();
        pop();
    }

    // ── L5: Title — drawn ABOVE the cloud ──
    if (recap && isUnlocked) {
        push();
        textFont(fonts.title); textSize(35); textAlign(CENTER, CENTER);
        stroke(0, 0, 0, 200); strokeWeight(6); fill(255, 105, 180);
        text(recap.title, storyDebugData.titleArea.x, storyDebugData.titleArea.y);
        noStroke(); fill(255, 105, 180);
        text(recap.title, storyDebugData.titleArea.x, storyDebugData.titleArea.y);
        pop();
    }

    // ── L5: Up/Down arrows + day indicator — identical to level-select arrows ──
    let arrowX   = width - 90;
    let centerY  = height / 2;
    let arrowSz  = 60;
    let arrowGap = 90;

    if (assets.backImg) {
        // Up arrow (previous day)
        let canGoUp  = storyRecapDay > 1;
        let upHover  = canGoUp && dist(mouseX, mouseY, arrowX, centerY - arrowGap) < 35;
        push();
        translate(arrowX, centerY - arrowGap);
        rotate(HALF_PI);
        if (!canGoUp) tint(255, 60);
        if (upHover)  scale(1.25);
        imageMode(CENTER);
        image(assets.backImg, 0, 0, arrowSz, arrowSz);
        noTint();
        pop();

        // Day indicator between arrows
        push();
        textFont(fonts.title); textSize(20); textAlign(CENTER, CENTER);
        stroke(0, 0, 0, 150); strokeWeight(3); fill(255, 215, 0);
        text("DAY " + storyRecapDay, arrowX, centerY);
        noStroke(); fill(255, 215, 0);
        text("DAY " + storyRecapDay, arrowX, centerY);
        pop();

        // Down arrow (next day)
        let nextDay   = storyRecapDay + 1;
        let canGoDown = nextDay <= 5;
        let downHover = canGoDown && dist(mouseX, mouseY, arrowX, centerY + arrowGap) < 35;

        push();
        translate(arrowX, centerY + arrowGap);
        rotate(-HALF_PI);
        if (!canGoDown) tint(255, 60);
        if (downHover)  scale(1.25);
        imageMode(CENTER);
        image(assets.backImg, 0, 0, arrowSz, arrowSz);
        noTint();
        pop();
    }

    // ── DEV MODE: bounding boxes + controls hint ──
    if (showStoryDebugControls) {
        drawStoryDebugOverlay();
    }
}

/**
 * Draws bounding-box overlays for each story layer during dev adjust mode.
 * Layers: [1] Shape  [2] Cloud  [3] TextArea  [4] TitleArea
 */
function drawStoryDebugOverlay() {
    push();
    let layers = [
        { key: 'shape',     label: 'SHAPE',      color: [255, 80,  80 ] },
        { key: 'cloud',     label: 'CLOUD',      color: [80,  200, 255] },
        { key: 'textArea',  label: 'CONTENT',    color: [80,  255, 80 ] },
        { key: 'titleArea', label: 'TITLE',      color: [255, 200, 0  ] }
    ];

    for (let l = 0; l < layers.length; l++) {
        let layerIdx = l + 1;
        let d   = storyDebugData[layers[l].key];
        let col = layers[l].color;
        let active = (layerIdx === storyDebugActiveLayer);

        stroke(col[0], col[1], col[2], active ? 255 : 100);
        strokeWeight(active ? 3 : 1);
        noFill();
        rectMode(CENTER);
        rect(d.x, d.y, d.w, d.h);

        noStroke();
        fill(col[0], col[1], col[2], active ? 230 : 130);
        textFont(fonts.body); textSize(15); textAlign(LEFT, BOTTOM);
        text(`[${layerIdx}] ${layers[l].label}: (${d.x}, ${d.y})  ${d.w}×${d.h}`,
             d.x - d.w / 2 + 4, d.y - d.h / 2 - 4);
    }

    // Controls hint bar
    fill(0, 0, 0, 170);
    noStroke(); rectMode(CORNER);
    rect(0, height - 50, width, 50);
    fill(255, 255, 0, 220);
    textFont(fonts.body); textSize(17); textAlign(CENTER, CENTER);
    text("DEV  [1] Shape  [2] Cloud  [3] Content  [4] Title  |  Arrows: Move  |  Shift+Arrows: Resize  |  P: print",
         width / 2, height - 25);
    pop();
}

/**
 * Prints current storyDebugData to the browser console.
 */
function printStoryDebugData() {
    console.log("[DEV] Current storyDebugData:");
    console.log(JSON.stringify(storyDebugData, null, 2));
}
