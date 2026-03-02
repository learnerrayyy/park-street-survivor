// Park Street Survivor - Main Application Controller
// Responsibilities: Global state management, hardware input routing, and game loop orchestration.

// ─── GLOBAL SYSTEM INSTANCES ─────────────────────────────────────────────────
let gameState, mainMenu, roomScene, inventory, env, player, obstacleManager, levelController;
let backpackUI;
let endScreenManager;
let testingPanel;
let feedbackLayer;
let tutorialDialogue;   // global dialogue box for tutorial page explanations

// ─── GAME PROGRESS STATE ─────────────────────────────────────────────────────
let currentUnlockedDay = 1;
let currentDayID = 1;

// ─── ASSET REGISTRY ──────────────────────────────────────────────────────────
let assets = {
    menuBg: null,
    otherBg: null,
    warningImg: null,
    bbg: null,
    libraryBg: null,
    csNewsBg:   null,   // assets/dialogue/news.png  — prologue cutscene bg
    csLibraryBg: null, // assets/dialogue/library.png — NPC cutscene + success screen bg
    dialogBox:  null,  // assets/obstacles/dialog_box.png — homeless speech bubble
    irisSuccess: [],
    celebrateSheet: null,
    storyShape: null,
    storyCloud: null,
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
        west: [],
        east: []
    }
};
let fonts = {};
let bgm, sfxSelect, sfxClick, sfxScold;
let sfxDialogue, sfxHitBigCar, sfxHitSmallCar, sfxPickupCoffee, sfxPickupScooter;

// ─── AUDIO VOLUME CONTROLS ───────────────────────────────────────────────────
let masterVolumeBGM = 0.25;
let masterVolumeSFX = 0.7;

// ─── DIFFICULTY SETTING ──────────────────────────────────────────────────────
// 0 = EASY (locked), 1 = NORMAL (default), 2 = HARD (locked)
let gameDifficulty = 1;
const DIFFICULTY_LABELS = ["EASY", "NORMAL", "HARD"];

// ─── WIN-CUTSCENE GUARD ───────────────────────────────────────────────────────
// Prevents checkSettlementPoint() from triggering the NPC cutscene more than once.
let _winCutscenePending = false;

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
    roomPhase: 'DESK',
    moveTutorialDone: false,   // true once the player has dismissed the WASD/arrow-key hint
    uiTutorialDone: false,     // true once the pause/help/settings/story intro is complete
    uiIntroStep: 0             // current step within UI intro (0 = pause, 1 = help, 2 = settings, 3 = story)
};

// ─── SPLASH LOGO ANIMATION STATE ─────────────────────────────────────────────
let titleDrop = { y: -200, vy: 0, landed: false, shake: 0 };

// ─── ITEM ENCYCLOPEDIA ───────────────────────────────────────────────────────
const ITEM_WIKI = [
    // BUFFS (Help Page 2)
    { name: 'COFFEE', desc: 'INSTANT ENERGY +20', unlockDay: 1, imgKey: 'coffee', type: 'BUFF' },
    { name: 'MOTORCYCLE', desc: 'INSTANT ENERGY +20', unlockDay: 1, imgKey: 'motorcycle', type: 'BUFF' },
    { name: 'HOT COFFEE', desc: 'INSTANT ENERGY +20', unlockDay: 2, imgKey: 'coffee', type: 'BUFF' },
    { name: 'HOT COFFEE', desc: 'INSTANT ENERGY +20', unlockDay: 3, imgKey: 'coffee', type: 'BUFF' },
    { name: 'HOT COFFEE', desc: 'INSTANT ENERGY +20', unlockDay: 4, imgKey: 'coffee', type: 'BUFF' },
    { name: 'HOT COFFEE', desc: 'INSTANT ENERGY +20', unlockDay: 5, imgKey: 'coffee', type: 'BUFF' },

    // HAZARDS (Help Page 3)
    { name: 'HEAVY TRAFFIC', desc: 'DANGER: INSTANT FAIL', unlockDay: 1, imgKey: ['ambulance', 'bus'], type: 'HAZARD' },
    { name: 'LIGHT TRAFFIC', desc: 'SPACE OBSTACLE: BLOCKS PATH.', unlockDay: 1, imgKey: ['car_brown', 'car_red'], type: 'HAZARD' },
    { name: 'HOMELESS', desc: 'TRIPS PLAYER: SLOW DOWN', unlockDay: 1, imgKey: 'homeless', type: 'HAZARD' },
    { name: 'PROMOTER', desc: 'TRIPS PLAYER: SLOW DOWN', unlockDay: 1, imgKey: 'promoter', type: 'HAZARD' },
    { name: 'SCOOTER RIDER', desc: 'TRIPS PLAYER: SLOW DOWN', unlockDay: 1, imgKey: 'scooter_rider', type: 'HAZARD' },
    { name: 'PADDLE', desc: 'TRIPS PLAYER: SLOW DOWN', unlockDay: 4, imgKey: 'scooter_rider', type: 'HAZARD' }
];

// ─── ASSET LOADING TRACKER ───────────────────────────────────────────────────
let isLoaded = false;
let loadProgress = 0;
let smoothProgress = 0;
let assetsLoadedCount = 0;
const totalAssetsToLoad = 56;


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
    assets.menuBg = loadImage('assets/background/cbg.png', itemLoaded);
    assets.otherBg = loadImage('assets/background/other_bg.png', itemLoaded);
    assets.roomBg = loadImage('assets/background/room.png', itemLoaded);
    assets.inventoryBg = loadImage('assets/inventory/table.png', itemLoaded);
    assets.backpackImg = loadImage('assets/inventory/backpack.png', itemLoaded);
    assets.studentCardImg = loadImage('assets/inventory/student_card.png', itemLoaded);
    assets.computerImg    = loadImage('assets/inventory/computer.png', itemLoaded);
    assets.portraitPlayerNormal = loadImage('assets/characters/portrait/main.png', itemLoaded);
    assets.vitaminImg     = loadImage('assets/inventory/vitamin.png', itemLoaded);
    assets.tangleImg      = loadImage('assets/inventory/tangle.png', itemLoaded);
    assets.headphoneImg   = loadImage('assets/inventory/headphone.png', itemLoaded);
    assets.rainbootImg    = loadImage('assets/inventory/rainboot.png', itemLoaded);

    assets.bbg         = loadImage('assets/background/bbg.png', itemLoaded);
    assets.libraryBg   = loadImage('assets/background/library.jpg', itemLoaded);
    assets.csNewsBg    = loadImage('assets/dialogue/news.png',              itemLoaded);
    assets.csLibraryBg = loadImage('assets/dialogue/library.png',           itemLoaded);
    assets.dialogBox   = loadImage('assets/obstacles/dialog_box.png',       itemLoaded);

    loadImage('assets/end_screen/spritesheet_celebrate.png', (img) => {
        let fW = img.width / 5;
        let fH = img.height;
        for (let i = 0; i < 5; i++) {
            assets.irisSuccess.push(img.get(i * fW, 0, fW, fH));
        }
    });

    assets.storyShape  = loadImage('assets/story/frame_shape.png', itemLoaded);
    assets.storyCloud  = loadImage('assets/story/frame_cloud.png', itemLoaded);

    assets.selectBg.unlock = loadImage('assets/select_background/day_unlock.jpg', itemLoaded);
    assets.selectBg.lock = loadImage('assets/select_background/day_lock.jpg', itemLoaded);

    for (let i = 1; i <= 5; i++) {
        assets.selectClouds.push(loadImage(`assets/select_cloud/Cloud-${i}.png`, itemLoaded));
    }

    // Typography
    fonts.title = loadFont('assets/fonts/PressStart2P-Regular.ttf', itemLoaded);
    fonts.time = loadFont('assets/fonts/VT323-Regular.ttf', itemLoaded);
    fonts.body = loadFont('assets/fonts/DotGothic16-Regular.ttf', itemLoaded);
    fonts.logo = loadFont('assets/fonts/title_1.otf', itemLoaded);

    // Audio
    soundFormats('mp3', 'wav');
    bgm = loadSound('assets/audio/music/MainTheme.wav', itemLoaded);
    sfxSelect = loadSound('assets/audio/effects/Select.wav', itemLoaded);
    sfxClick = loadSound('assets/audio/effects/Click.wav', itemLoaded);
    sfxDialogue      = loadSound('assets/audio/effects/DIalogue.mp3',   itemLoaded);
    sfxHitBigCar     = loadSound('assets/audio/effects/HitBigCar.mp3',  itemLoaded);
    sfxHitSmallCar   = loadSound('assets/audio/effects/HitSmallCar.mp3', itemLoaded);
    sfxPickupCoffee  = loadSound('assets/audio/effects/CoffeeDrink.wav', itemLoaded);
    sfxPickupScooter = loadSound('assets/audio/effects/ScooterPick.wav', itemLoaded);
    // sfxScold = loadSound('assets/audio/effects/Scold.wav', itemLoaded); // TODO: add asset later

    // Control key sprites
    assets.keys.w = loadImage('assets/control_keys/W.png', itemLoaded);
    assets.keys.a = loadImage('assets/control_keys/A.png', itemLoaded);
    assets.keys.s = loadImage('assets/control_keys/S.png', itemLoaded);
    assets.keys.d = loadImage('assets/control_keys/D.png', itemLoaded);
    assets.keys.up = loadImage('assets/control_keys/ARROWUP.png', itemLoaded);
    assets.keys.down = loadImage('assets/control_keys/ARROWDOWN.png', itemLoaded);
    assets.keys.left = loadImage('assets/control_keys/ARROWLEFT.png', itemLoaded);
    assets.keys.right = loadImage('assets/control_keys/ARROWRIGHT.png', itemLoaded);
    assets.keys.enter = loadImage('assets/control_keys/ENTER.png', itemLoaded);
    assets.keys.space = loadImage('assets/control_keys/SPACE.png', itemLoaded);
    assets.keys.e = loadImage('assets/control_keys/E.png', itemLoaded);
    assets.keys.p = loadImage('assets/control_keys/P.png', itemLoaded);

    // Logo frames
    assets.logoImgs = [
        loadImage('assets/logo/logo_1.png', itemLoaded),
        loadImage('assets/logo/logo_2.png', itemLoaded),
        loadImage('assets/logo/logo_3.png', itemLoaded),
        loadImage('assets/logo/logo_4.png', itemLoaded),
        loadImage('assets/logo/logo_5.png', itemLoaded)
    ];

    assets.uobLogo = loadImage('assets/logo/uob_logo.png', itemLoaded);
    assets.warningImg = loadImage('assets/buttons/warning.png', itemLoaded);
    assets.btnImg = loadImage('assets/buttons/button.png', itemLoaded);
    assets.backImg = loadImage('assets/buttons/back.png', itemLoaded);
    assets.pauseImg = loadImage('assets/buttons/pause.png', itemLoaded);
    assets.musicOn  = loadImage('assets/buttons/music_on.png',  itemLoaded);
    assets.musicOff = loadImage('assets/buttons/music_off.png', itemLoaded);

    // Entity preview sprites (no progress tracking — non-critical)
    if (!assets.previews) assets.previews = {};
    assets.previews['player'] = loadImage('assets/characters/wiki/Iris.png');
    assets.previews['npc_1'] = loadImage('assets/characters/wiki/Wiola.png');
    assets.previews['ambulance'] = loadImage('assets/obstacles/obstacle_ambulance.png');
    assets.previews['bus'] = loadImage('assets/obstacles/obstacle_bus.png');
    assets.previews['car_brown'] = loadImage('assets/obstacles/obstacle_car_brown.png');
    assets.previews['car_red'] = loadImage('assets/obstacles/obstacle_car_red.png');
    assets.previews['homeless'] = loadImage('assets/obstacles/obstacle_homeless.png');
    assets.previews['promoter'] = loadImage('assets/obstacles/obstacle_promoter.png');
    assets.previews['scooter_rider'] = loadImage('assets/obstacles/obstacle_scooter.png');
    assets.previews['coffee'] = loadImage('assets/power_up/powerup_coffee.png');
    assets.previews['motorcycle'] = loadImage('assets/power_up/powerup_motorcycle.png');
    assets.previews['empty_scooter'] = loadImage('assets/power_up/powerup_scooter.png');
    assets.previews['powerup_scooter'] = assets.previews['empty_scooter'];

    // Player directional frame animation (uses authored frame PNGs directly)
    assets.playerAnim = {};
    const dirs = ['north', 'south', 'west', 'east'];
    const frameFilesByDir = {
        north: ['frame_1.png', 'frame_2.png', 'frame_3.png', 'frame_4.png', 'frame_5.png'],
        south: ['frame_1.png', 'frame_2.png', 'frame_3.png', 'frame_4.png', 'frame_5.png'],
        west: ['frame_001.png', 'frame_002.png', 'frame_003.png', 'frame_004.png', 'frame_005.png'],
        east: ['frame_001.png', 'frame_002.png', 'frame_003.png', 'frame_004.png', 'frame_005.png']
    };

    dirs.forEach(d => {
        assets.playerAnim[d] = { walk: [], idle: null };

        if (d === 'north') {
            // Back-running animation uses the dedicated run spritesheet.
            loadImage('assets/characters/sprite_frames/sprite_sheets/spritesheet_run.png', (img) => {
                const fw = img.height;
                const fh = img.height;
                const totalFrames = max(1, floor(img.width / fw));
                for (let i = 0; i < totalFrames; i++) {
                    assets.playerAnim[d].walk.push(img.get(i * fw, 0, fw, fh));
                }
            });
        } else {
            frameFilesByDir[d].forEach((fileName) => {
                const path = `assets/characters/sprite_frames/${d}/${fileName}`;
                const frameImg = loadImage(path);
                assets.playerAnim[d].walk.push(frameImg);
            });
        }

        // Keep dedicated idle if present; fallback to first run frame.
        assets.playerAnim[d].idle = loadImage(
            `assets/characters/spritesheet/${d}.png`,
            () => { },
            () => { assets.playerAnim[d].idle = assets.playerAnim[d].walk[0]; }
        );
    });
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

    gameState = new GameState();
    mainMenu = new MainMenu();
    roomScene = new RoomScene();
    inventory = new InventorySystem();
    env = new Environment();
    player = new Player();
    obstacleManager = new ObstacleManager();
    backpackUI = new BackpackVisual(inventory, roomScene);
    levelController = new LevelController();
    endScreenManager = new EndScreenManager();
    testingPanel = new TestingPanel();
    feedbackLayer = new FeedbackLayer();
    tutorialDialogue = new DialogueBox();
    tutorialDialogue.timerMax = 300;   // 5 s — long enough to read tutorial page explanations

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

            case STATE_CUTSCENE:
                drawCutsceneScreen();
                break;

            case STATE_WARNING:
                drawWarningScreen();
                break;

            case STATE_CREDITS:
                drawCreditsScreen();
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
                    // Auto-colorize once the entrance animation finishes — keeps visible gray period
                    if (gameState.currentState === STATE_LEVEL_SELECT &&
                        typeof tutorialHints !== 'undefined' && mainMenu.timeWheel &&
                        !mainMenu.timeWheel.isEntering) {
                        let sel = mainMenu.timeWheel.selectedDay;
                        if (sel <= currentUnlockedDay) {
                            tutorialHints.dayVisuallyUnlocked[sel] = true;
                        }
                    }
                    mainMenu.display();
                }
                // Show tutorial page explanation overlay on SETTINGS and HELP pages
                if (tutorialDialogue) tutorialDialogue.display();
                break;

            case STATE_ROOM:
                if (roomScene) roomScene.display();
                if (player) {
                    // Block movement while the UI intro tutorial is showing
                    if (typeof tutorialHints === 'undefined' || tutorialHints.roomPhase !== 'UI_INTRO') {
                        player.update();
                    }
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
                    if (obstacleManager && typeof obstacleManager.renderPromoterEffects === 'function') {
                        obstacleManager.renderPromoterEffects();
                    }
                }
                renderPauseOverlay();
                // Show tutorial dialogue on top of pause overlay (e.g. STORY explanation)
                if (tutorialDialogue) tutorialDialogue.display();
                break;

            case STATE_FAIL:
                // Draw frozen gameplay behind the overlay.
                // If env is null (e.g. jumped here via dev shortcut), render a static
                // fallback so the screen is never just a blank dark rectangle.
                if (env) {
                    env.display();
                    if (obstacleManager) obstacleManager.display();
                    if (player) player.display();
                } else {
                    // Fallback: fill with the shared other-screen background
                    if (assets.otherBg) {
                        let s = max(width / assets.otherBg.width, height / assets.otherBg.height);
                        imageMode(CENTER);
                        image(assets.otherBg, width / 2, height / 2,
                              assets.otherBg.width * s, assets.otherBg.height * s);
                    }
                }
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

    if (feedbackLayer) {
        feedbackLayer.update();
        feedbackLayer.display();
    }

    renderGlobalFade();

    // TestingPanel always draws on top of everything (dev overlay)
    if (testingPanel) testingPanel.draw();
}

/**
 * Updates all game-world systems for a single frame during the run state.
 */
function runGameLoop() {
    const levelPhase = levelController ? levelController.getLevelPhase() : "RUNNING";
    const freezeGameplay = feedbackLayer && typeof feedbackLayer.isHitStopActive === "function"
        ? feedbackLayer.isHitStopActive()
        : false;

    if (!freezeGameplay) {
        if (levelController) { levelController.update(); }
        if (env) { env.update(GLOBAL_CONFIG.scrollSpeed); }
        if (obstacleManager) { obstacleManager.update(GLOBAL_CONFIG.scrollSpeed, player, levelPhase); }
        if (player) { player.update(); }
    }

    let cameraOffset = { x: 0, y: 0 };
    if (feedbackLayer && typeof feedbackLayer.getCameraOffset === "function") {
        cameraOffset = feedbackLayer.getCameraOffset();
    }

    push();
    translate(cameraOffset.x, cameraOffset.y);
    if (env) env.display();
    if (obstacleManager) obstacleManager.display();
    if (player) player.display();
    if (obstacleManager && typeof obstacleManager.renderPromoterEffects === 'function') {
        obstacleManager.renderPromoterEffects();
    }
    pop();

    if (levelController) { levelController.display(); }

    // Win condition: settlement point reached → NPC cutscene then win
    if (!freezeGameplay && levelController && levelController.checkSettlementPoint()) {
        if (!_winCutscenePending) {
            _winCutscenePending = true;
            let day = currentDayID;
            console.log(`[runGameLoop] Settlement → NPC cutscene Day ${day}`);

            if (day === 5) {
                // Day 5: Charlotte dialogue → player choice → credits
                let day5Choices = [
                    { label: "Don't Stay", cb: () => {
                        triggerTransition(() => startCutscene('library', CS_DAY5_LEAVE, () => {
                            triggerTransition(() => {
                                _day5Ending = 'leave';
                                resetCredits();
                                gameState.setState(STATE_CREDITS);
                            });
                        }));
                    }},
                    { label: "Stay", cb: () => {
                        triggerTransition(() => {
                            _day5Ending = 'stay';
                            resetCredits();
                            gameState.setState(STATE_CREDITS);
                        });
                    }}
                ];
                triggerTransition(() => startCutscene('library', CS_DAY_NPC[5], null, day5Choices));

            } else {
                // Days 1–4: NPC dialogue → success end screen
                triggerTransition(() => startCutscene('library', CS_DAY_NPC[day], () => {
                    triggerTransition(() => gameState.setState(STATE_WIN));
                }));
            }
        }
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
    globalFade.dir = 1;
    globalFade.alpha = 0;
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
        globalFade.alpha = 0;
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
    // Testing panel hotkey is always available, even during transitions/end screens.
    if ((keyCode === 113 || keyCode === 192 || key === 'F2' || key === '`' || key === '~') && testingPanel) {
        testingPanel.toggle();
        return false;
    }

    if (globalFade.isFading) return;
    let state = gameState.currentState;

    // Cutscene: Enter/Space advances dialogue
    if (state === STATE_CUTSCENE) {
        if (keyCode === ENTER || keyCode === 13 || key === ' ') csAdvance();
        return;
    }

    // Credits screen: any key skips scroll/pause → poem, or exits poem → menu
    if (state === STATE_CREDITS) {
        if (_creditPhase === 'poem' && _creditPoemAlpha >= 255) {
            if (_day5Ending === 'stay') {
                _day5Ending = null;
                triggerTransition(() => startCutscene('library', CS_DAY5_STAY, () => {
                    triggerTransition(() => { gameState.resetFlags(); gameState.setState(STATE_MENU); });
                }));
            } else {
                triggerTransition(() => { gameState.resetFlags(); gameState.setState(STATE_MENU); });
            }
        } else if (_creditPhase !== 'poem') {
            _creditPhase = 'poem'; _creditPoemAlpha = 0;
        }
        return;
    }

    // Toggle developer mode
    if (key === '0') devToggle();

    // Toggle TestingPanel with backtick (`) or F2
    if (key === '`' || keyCode === 113) {
        if (testingPanel) testingPanel.toggle();
        return;
    }

    // If TestingPanel is open, route all keys to it and block everything else
    if (testingPanel && testingPanel.isVisible()) {
        if (testingPanel.handleKeyPressed(key, keyCode)) return false;
    }

    // Lock all input while the level-select entrance animation plays
    if (state === STATE_LEVEL_SELECT &&
        mainMenu && mainMenu.timeWheel && mainMenu.timeWheel.isEntering) return;

    // Dev shortcuts: 8 = instant WIN, 9 = instant FAIL
    if (developerMode) {
        if (key === '8') { devGoToWin();  return; }
        if (key === '9') { devGoToFail("EXHAUSTED"); return; }
    }

    // Pause / unpause — available in most gameplay states
    if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
        if (state !== STATE_MENU && state !== STATE_LEVEL_SELECT &&
            state !== STATE_SETTINGS && state !== STATE_HELP &&
            state !== STATE_SPLASH && state !== STATE_INVENTORY &&
            state !== STATE_WARNING &&
            state !== STATE_CREDITS &&
            state !== STATE_CUTSCENE) {
            playSFX(sfxClick);
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
            // story recap arrow keys / ESC handled in story recap section
            if (keyCode === UP_ARROW || keyCode === 87) {
                if (storyScrollOffset <= 0 && storyRecapDay > 1) {
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
                    if (storyScrollOffset >= maxScroll && storyRecapDay + 1 <= 5) {
                        storyRecapDay++;
                        storyScrollOffset = 0;
                    } else {
                        storyScrollOffset = min(maxScroll, storyScrollOffset + 1);
                    }
                }
                if (typeof playSFX === 'function') playSFX(sfxSelect);
            } else if (keyCode === ESCAPE) {
                showStoryRecap = false;
                pauseIndex = -1;
            }
            return;
        } else if (showRestartChoice) {
            if (keyCode === UP_ARROW || keyCode === 87 || keyCode === DOWN_ARROW || keyCode === 83) {
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                restartChoiceIndex = (restartChoiceIndex < 0) ? 0 : (restartChoiceIndex + 1) % RESTART_OPTIONS.length;
            } else if ((keyCode === ENTER || keyCode === 13) && restartChoiceIndex >= 0) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                handleRestartChoice();
            } else if (keyCode === ESCAPE) {
                showRestartChoice = false;
                pauseIndex = -1;
            }
            return;
        } else {
            let options = getPauseOptions();
            if (keyCode === UP_ARROW || keyCode === 87 || keyCode === DOWN_ARROW || keyCode === 83) {
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                if (pauseIndex < 0) {
                    pauseIndex = (keyCode === UP_ARROW || keyCode === 87) ? options.length - 1 : 0;
                } else if (keyCode === UP_ARROW || keyCode === 87) {
                    pauseIndex = (pauseIndex - 1 + options.length) % options.length;
                } else {
                    pauseIndex = (pauseIndex + 1) % options.length;
                }
            } else if ((keyCode === ENTER || keyCode === 13) && pauseIndex >= 0) {
                playSFX(sfxClick);
                handlePauseSelection();
            } else if (keyCode === ESCAPE) {
                togglePause();
                pauseFromState = null;
                showStoryRecap = false;
            }
        }
        return;
    }

    // Promoter leaflet interaction: SPACE is consumed by obstacle system while active.
    if (state === STATE_DAY_RUN && obstacleManager &&
        typeof obstacleManager.handlePromoterSpacePress === 'function' &&
        (keyCode === 32 || key === ' ')) {
        if (obstacleManager.handlePromoterSpacePress(player)) return false;
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
    // Retry from end screen
    else if (state === STATE_FAIL || state === STATE_WIN) {
        if (endScreenManager) endScreenManager.handleKeyPress(keyCode);
        else if (keyCode === ENTER || keyCode === 13) {
            playSFX(sfxClick);
            setupRun(currentDayID);
        }
    }

    // Close inventory with ESC
    if (gameState.currentState === STATE_INVENTORY && keyCode === ESCAPE) {
        if (tutorialHints.roomPhase === 'CLOSE_BP') {
            if (backpackUI && backpackUI.hasRequiredItems()) {
                tutorialHints.roomPhase = (currentDayID === 1) ? 'DOOR' : 'DONE';
            } else {
                // Required items not yet packed — keep desk hint active
                tutorialHints.roomPhase = 'DESK';
            }
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
        pauseFromState = null;
    } else if (selected === "STORY") {
        // Tutorial first-pause: mark done then open story
        if (typeof tutorialHints !== 'undefined' &&
            tutorialHints.roomPhase === 'UI_INTRO' && tutorialHints.uiIntroStep === 1) {
            tutorialHints.uiTutorialDone = true;
            tutorialHints.uiIntroStep    = 0;
            tutorialHints.roomPhase      = tutorialHints.moveTutorialDone ? 'DESK' : 'MOVE';
        }
        showStoryRecap = true;
        storyRecapDay = 1;
        storyScrollOffset = 0;
    } else if (selected === "SETTINGS") {
        // Tutorial first-pause: mark done then open settings
        if (typeof tutorialHints !== 'undefined' &&
            tutorialHints.roomPhase === 'UI_INTRO' && tutorialHints.uiIntroStep === 1) {
            tutorialHints.uiTutorialDone = true;
            tutorialHints.uiIntroStep    = 0;
            tutorialHints.roomPhase      = tutorialHints.moveTutorialDone ? 'DESK' : 'MOVE';
        }
        pauseFromState = gameState.previousState;
        if (typeof playSFX === 'function') playSFX(sfxClick);
        mainMenu.diffToastTimer = 0;
        gameState.currentState = STATE_SETTINGS;
        mainMenu.menuState     = STATE_SETTINGS;
    } else if (selected === "HELP") {
        // Tutorial first-pause: mark done then open help
        if (typeof tutorialHints !== 'undefined' &&
            tutorialHints.roomPhase === 'UI_INTRO' && tutorialHints.uiIntroStep === 1) {
            tutorialHints.uiTutorialDone = true;
            tutorialHints.uiIntroStep    = 0;
            tutorialHints.roomPhase      = tutorialHints.moveTutorialDone ? 'DESK' : 'MOVE';
        }
        pauseFromState = gameState.previousState;
        if (typeof playSFX === 'function') playSFX(sfxClick);
        gameState.currentState = STATE_HELP;
        mainMenu.menuState     = STATE_HELP;
        mainMenu.helpPage      = 0;
    } else if (selected === "EXPLORE ON MY OWN") {
        // Tutorial first-pause: player skips guidance, mark done and resume
        if (typeof tutorialHints !== 'undefined') {
            tutorialHints.uiTutorialDone = true;
            tutorialHints.uiIntroStep    = 0;
            tutorialHints.roomPhase      = tutorialHints.moveTutorialDone ? 'DESK' : 'MOVE';
        }
        togglePause();
        pauseFromState = null;
    } else if (selected === "RESTART") {
        showRestartChoice  = true;
        restartChoiceIndex = -1;
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
            player.x = GLOBAL_CONFIG.lanes.lane1;
            player.y = PLAYER_RUN_FOOT_Y;
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
    if (globalFade.isFading || !gameState) return;

    // Dev corner-drag: intercept before everything else
    if (developerMode && gameState.currentState === STATE_MENU && mainMenu) {
        for (let btn of mainMenu.buttons) {
            let corner = btn.checkResizeCorner(mouseX, mouseY);
            if (corner) {
                devResizeState = {
                    startMX: mouseX, startMY: mouseY,
                    startW: devMenuBtnW, startH: devMenuBtnH,
                    signX: corner.signX, signY: corner.signY
                };
                return false;
            }
        }
    }

    // TestingPanel intercepts all clicks when visible
    if (testingPanel && testingPanel.isVisible()) {
        if (testingPanel.handleMousePressed(mouseX, mouseY)) return false;
    }

    // Lock all input while the level-select entrance animation plays
    if (gameState.currentState === STATE_LEVEL_SELECT &&
        mainMenu && mainMenu.timeWheel && mainMenu.timeWheel.isEntering) return;

    let state = gameState.currentState;

    // Cutscene: click advances or selects choice
    if (state === STATE_CUTSCENE) {
        csClick(mouseX, mouseY);
        return;
    }

    // Credits screen: click skips scroll/pause → poem, or exits poem → menu
    if (state === STATE_CREDITS) {
        if (_creditPhase === 'poem' && _creditPoemAlpha >= 255) {
            if (_day5Ending === 'stay') {
                _day5Ending = null;
                triggerTransition(() => startCutscene('library', CS_DAY5_STAY, () => {
                    triggerTransition(() => { gameState.resetFlags(); gameState.setState(STATE_MENU); });
                }));
            } else {
                triggerTransition(() => { gameState.resetFlags(); gameState.setState(STATE_MENU); });
            }
        } else if (_creditPhase !== 'poem') {
            _creditPhase = 'poem'; _creditPoemAlpha = 0;
        }
        return;
    }

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
        // Back arrow (top-left) — resume
        if (assets.backImg && dist(mouseX, mouseY, 70, 65) < 40) {
            if (typeof playSFX === 'function') playSFX(sfxClick);
            if (showStoryRecap) {
                showStoryRecap = false;
                pauseIndex = -1;
            } else if (showRestartChoice) {
                showRestartChoice = false;
                pauseIndex = -1;
            } else {
                togglePause();
            }
            return;
        }
        if (showRestartChoice && restartChoiceIndex >= 0) {
            if (typeof playSFX === 'function') playSFX(sfxClick);
            handleRestartChoice();
        } else if (showStoryRecap) {
            // Right-side up/down arrow clicks
            let arrowX   = width - 90;
            let centerY  = height / 2;
            let arrowGap = 90;
            if (storyRecapDay >= 1 && dist(mouseX, mouseY, arrowX, centerY - arrowGap) < 35) {
                storyRecapDay--;
                storyScrollOffset = 0;
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                return;
            }
            if (storyRecapDay <= 5 && dist(mouseX, mouseY, arrowX, centerY + arrowGap) < 35) {
                storyRecapDay++;
                storyScrollOffset = 0;
                if (typeof playSFX === 'function') playSFX(sfxSelect);
                return;
            }
            // story recap sidebar clicks
            let sidebarX = width * 0.16;
            let sidebarBaseY = height * 0.45;
            for (let i = 0; i < 5; i++) {
                let diff = i - (storyRecapDay - 1);
                let cardY = sidebarBaseY + diff * 130;
                if (mouseX > sidebarX - 120 && mouseX < sidebarX + 120 &&
                    mouseY > cardY - 40 && mouseY < cardY + 40) {
                    storyRecapDay = i + 1;
                    storyScrollOffset = 0;
                    if (typeof playSFX === 'function') playSFX(sfxSelect);
                    return;
                }
            }
        } else if (pauseIndex >= 0) {
            if (typeof playSFX === 'function') playSFX(sfxClick);
            handlePauseSelection();
        }
        return;
    }

    if (state === STATE_MENU || state === STATE_LEVEL_SELECT ||
        state === STATE_SETTINGS || state === STATE_HELP) {
        if (mainMenu) mainMenu.handleClick(mouseX, mouseY);
    } else if (state === STATE_FAIL || state === STATE_WIN) {
        if (endScreenManager) endScreenManager.handleClick(mouseX, mouseY);
    } else if (state === STATE_ROOM || state === STATE_DAY_RUN) {
        if (state === STATE_ROOM && roomScene && roomScene.handleMousePressed(mouseX, mouseY)) {
            return false;
        }
        // Pause button hit-test
        if (dist(mouseX, mouseY, width - 95, 65) < 80) {
            playSFX(sfxClick);
            togglePause();
            pauseIndex = -1;
            showRestartChoice = false;
            showStoryRecap = false;
        }
    }

    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMousePressed(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse release events to the active UI systems.
 */
function mouseReleased() {
    if (!gameState) return;
    if (devResizeState) { devResizeState = null; return; }
    if (mainMenu) mainMenu.handleRelease();
    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMouseReleased(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse drag events to the active UI systems.
 */
function mouseDragged() {
    if (!gameState) return;
    // Dev corner-drag resize
    if (devResizeState) {
        let dx = mouseX - devResizeState.startMX;
        let dy = mouseY - devResizeState.startMY;
        devMenuBtnW = Math.max(40, Math.round(devResizeState.startW + 2 * devResizeState.signX * dx));
        devMenuBtnH = Math.max(10, Math.round(devResizeState.startH + 2 * devResizeState.signY * dy));
        return;
    }
    if (gameState.currentState === STATE_INVENTORY) {
        if (backpackUI) backpackUI.handleMouseDragged(mouseX, mouseY);
    }
}

/**
 * Dispatches mouse move events to the active UI systems.
 */
function mouseMoved() {
    if (!gameState) return;
    if (gameState.currentState === STATE_CUTSCENE) {
        csMoveHover(mouseX, mouseY);
    }
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
    if (gameState.currentState === STATE_PAUSED) {
        gameState.setState(gameState.previousState);
    } else {
        gameState.setState(STATE_PAUSED);
    }
}

/**
 * Initialises and starts a new run for the given day ID.
 */
function setupRun(dayID) {
    currentDayID = dayID;
    _winCutscenePending = false;  // reset so the NPC cutscene can fire this run

    player.applyLevelStats(dayID);
    player.x = GLOBAL_CONFIG.lanes.lane1;
    player.y = PLAYER_RUN_FOOT_Y;
    roomScene.reset();
    obstacleManager = new ObstacleManager();
    levelController.initializeLevel(dayID);

    if (typeof tutorialHints !== 'undefined') {
        if (dayID === 1 && !tutorialHints.uiTutorialDone) {
            tutorialHints.roomPhase  = 'UI_INTRO';
            tutorialHints.uiIntroStep = 0;
        } else if (dayID === 1 && !tutorialHints.moveTutorialDone) {
            tutorialHints.roomPhase = 'MOVE';
        } else {
            tutorialHints.roomPhase = 'DESK';
        }
    }
    if (backpackUI) backpackUI.resetForNewDay();
    if (endScreenManager) endScreenManager._activeScreen = null;

    // Room cutscene — only on first visit per day per session
    if (typeof CS_DAY_ROOM !== 'undefined' && CS_DAY_ROOM[dayID] &&
        !_roomCutsceneSeen[dayID]) {
        _roomCutsceneSeen[dayID] = true;
        // Place player at room starting position so bg looks correct
        if (player) { player.x = 940; player.y = 550; }
        startCutscene('room', CS_DAY_ROOM[dayID], () => {
            // For Day 2+, skip to DESK phase (no movement tutorial needed again)
            if (dayID > 1 && typeof tutorialHints !== 'undefined') {
                tutorialHints.roomPhase = 'DESK';
            }
            gameState.setState(STATE_ROOM);
        });
    } else {
        gameState.setState(STATE_ROOM);
    }
}

/**
 * Starts a run directly on the street, skipping the room scene.
 */
function setupRunDirectly(dayID) {
    currentDayID = dayID;
    player.applyLevelStats(dayID);

    // Set position at lane 1 matching standard run spawn
    player.x = GLOBAL_CONFIG.lanes.lane1;
    player.y = PLAYER_RUN_FOOT_Y;

    obstacleManager = new ObstacleManager();
    levelController.initializeLevel(dayID);
    if (typeof tutorialHints !== 'undefined') tutorialHints.roomPhase = 'DONE';
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
        let wave = sin(frameCount * 0.05);
        let imgScale = 1.0 + wave * 0.05;
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
                gameState.setState(STATE_WARNING);
            }
        }, 800);
    }
}

// ─── WARNING / SPLASH TRANSITION ─────────────────────────────────────────────
let _splashFadeAlpha = 0;   // black overlay fading out on splash entry [0..255]
let _warnFrame = 0;         // counts up each draw call while in STATE_WARNING
const _WARN_FADE_IN  = 90;  // frames for fade-in  (~1.5 s)
const _WARN_HOLD     = 540; // frames to hold at full opacity  (~9 s)
const _WARN_FADE_OUT = 90;  // frames for fade-out (~1.5 s)
const _WARN_TOTAL    = _WARN_FADE_IN + _WARN_HOLD + _WARN_FADE_OUT; // 600 ≈ 10 s

/**
 * Full-screen mental-health content warning.
 * Auto-advances to STATE_SPLASH after ~10 seconds; no player interaction needed.
 */
function drawWarningScreen() {
    _warnFrame++;

    // Compute master opacity [0..255]
    let alpha;
    if (_warnFrame <= _WARN_FADE_IN) {
        alpha = map(_warnFrame, 0, _WARN_FADE_IN, 0, 255);
    } else if (_warnFrame <= _WARN_FADE_IN + _WARN_HOLD) {
        alpha = 255;
    } else {
        alpha = map(_warnFrame, _WARN_FADE_IN + _WARN_HOLD, _WARN_TOTAL, 255, 0);
    }
    alpha = constrain(alpha, 0, 255);

    // Advance to splash once animation completes
    if (_warnFrame > _WARN_TOTAL) {
        _warnFrame = 0;
        _splashFadeAlpha = 255;             // splash will fade in from black
        titleDrop.y = -200; titleDrop.vy = 0; titleDrop.landed = false; titleDrop.shake = 0;
        gameState.setState(STATE_SPLASH);
        return;
    }

    let s = min(width / 1920, height / 1080);
    let cx = width / 2;
    let cy = height / 2;

    // ── Background ────────────────────────────────────────────────────────────
    push();
    colorMode(RGB, 255);
    background(0);

    // Faded background image (otherBg) for atmosphere
    if (assets && assets.otherBg) {
        let bgS = max(width / assets.otherBg.width, height / assets.otherBg.height);
        imageMode(CENTER);
        tint(255, alpha * 0.3);
        image(assets.otherBg, cx, cy, assets.otherBg.width * bgS, assets.otherBg.height * bgS);
        noTint();
        imageMode(CORNER);
    }

    // Dark overlay
    fill(0, 0, 0, alpha * 0.80);
    noStroke();
    rectMode(CORNER);
    rect(0, 0, width, height);

    // ── Panel ─────────────────────────────────────────────────────────────────
    let panelW = 1200 * s;
    let panelH = 640 * s;
    let panelX = cx;
    let panelY = cy;

    // Shadow
    fill(0, 0, 0, alpha * 0.5);
    noStroke();
    rectMode(CENTER);
    rect(panelX + 10 * s, panelY + 10 * s, panelW, panelH, 22 * s);

    // Panel body
    fill(14, 14, 22, alpha * 0.95);
    stroke(200, 170, 100, alpha);
    strokeWeight(2.5 * s);
    rect(panelX, panelY, panelW, panelH, 22 * s);

    // Inner border
    stroke(200, 170, 100, alpha * 0.35);
    strokeWeight(1 * s);
    rect(panelX, panelY, panelW - 24 * s, panelH - 24 * s, 16 * s);
    noStroke();

    // ── Title ─────────────────────────────────────────────────────────────────
    let titleY = panelY - panelH / 2 + 80 * s;
    textFont(fonts.title || fonts.body);
    textSize(52 * s);
    textAlign(CENTER, CENTER);
    fill(220, 190, 110, alpha);
    text("A Quiet Note to You", panelX, titleY);

    // Divider line
    stroke(200, 170, 100, alpha * 0.45);
    strokeWeight(1.5 * s);
    let divY = titleY + 44 * s;
    line(panelX - panelW / 2 + 60 * s, divY, panelX + panelW / 2 - 60 * s, divY);
    noStroke();

    // ── Body text (centred, warm) ──────────────────────────────────────────────
    textFont(fonts.body);
    textAlign(CENTER, TOP);
    let bodyLines = [
    { txt: "Please note: This experience explores stress, burnout,", size: 28, col: [230, 220, 205] },
    { txt: "and the psychological impact of self-doubt.", size: 28, col: [230, 220, 205] },
    { txt: "", size: 28, col: [230, 220, 205] },
    
    { txt: "If you find these themes distressing, we encourage you", size: 28, col: [230, 220, 205] },
    { txt: "to prioritise your well-being while playing.", size: 28, col: [230, 220, 205] },
    { txt: "Support is available if the climb feels too steep.", size: 28, col: [230, 220, 205] },
    { txt: "", size: 24, col: [230, 220, 205] },

    { txt: "— Resources for Support —", size: 24, col: [210, 185, 120] },
    { txt: "Bristol Nightline | 01179 266 266 (Nightly, Term-time)", size: 26, col: [210, 185, 120] },
    { txt: "Samaritans | 116 123 (Free, 24/7 Support)", size: 26, col: [210, 185, 120] },
    { txt: "Shout Crisis | Text 'SHOUT' to 85258", size: 26, col: [210, 185, 120] },
    ];

    let ty = divY + 32 * s;
    for (let i = 0; i < bodyLines.length; i++) {
        let entry = bodyLines[i];
        // Compute cumulative y by summing previous line heights
        let prevH = 0;
        for (let j = 0; j < i; j++) {
            prevH += (bodyLines[j].size + 10) * s;
        }
        textSize(entry.size * s);
        fill(entry.col[0], entry.col[1], entry.col[2], alpha);
        text(entry.txt, panelX, ty + prevH);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    textFont(fonts.body);
    textSize(21 * s);
    textAlign(CENTER, CENTER);
    fill(160, 150, 130, alpha * 0.65);
    text("This screen will continue automatically.", panelX, panelY + panelH / 2 - 35 * s);

    pop();
}

// ─── CREDITS SCREEN ───────────────────────────────────────────────────────────
let _creditPhase     = 'scroll'; // 'scroll' | 'pause' | 'poem'
let _creditScrollY   = 0;
let _creditPauseF    = 0;
let _creditPoemAlpha = 0;

const _CREDIT_SCROLL_SPEED = 2.0; // design-space px per frame (~30 s total scroll)

// Raw credit data — sizes in 1920×1080 design-space pixels
const _CREDIT_DATA = [
    { type: 'space',    h: 120 },
    { type: 'header',   h: 80,  text: '\u2014 PARK STREET SURVIVOR \u2014' },
    { type: 'sub',      h: 50,  text: 'A University of Bristol Group Project' },
    { type: 'space',    h: 70 },
    { type: 'divider',  h: 40 },
    { type: 'space',    h: 55 },
    { type: 'section',  h: 58,  text: 'THE TEAM' },
    { type: 'space',    h: 45 },
    { type: 'name',     h: 50,  text: 'Charlotte Yu' },
    { type: 'role',     h: 36,  text: 'Core Mechanism & Systems Architect' },
    { type: 'desc',     h: 32,  text: 'System Integration  \xb7  State Machine Logic  \xb7  Physics Pipeline' },
    { type: 'space',    h: 44 },
    { type: 'name',     h: 50,  text: 'Kangrui Wang' },
    { type: 'role',     h: 36,  text: 'Level Designer' },
    { type: 'desc',     h: 32,  text: 'Level Geometry  \xb7  Environmental Storytelling  \xb7  Obstacle Choreography' },
    { type: 'space',    h: 44 },
    { type: 'name',     h: 50,  text: 'Layla Pei' },
    { type: 'role',     h: 36,  text: 'UI/UX & Audio Designer' },
    { type: 'desc',     h: 32,  text: 'Interface Ergonomics  \xb7  Interaction Flows  \xb7  Soundscape Design' },
    { type: 'space',    h: 44 },
    { type: 'name',     h: 50,  text: 'Lucca Zhou' },
    { type: 'role',     h: 36,  text: 'Aesthetic Designer' },
    { type: 'desc',     h: 32,  text: 'Visual Style Guide  \xb7  Pixel Asset Creation  \xb7  Colour Palette' },
    { type: 'space',    h: 44 },
    { type: 'name',     h: 50,  text: 'Keyu Zhou' },
    { type: 'role',     h: 36,  text: 'Script Designer' },
    { type: 'desc',     h: 32,  text: 'Narrative Scripting  \xb7  Dialogue Design  \xb7  Emotional Arc' },
    { type: 'space',    h: 75 },
    { type: 'divider',  h: 40 },
    { type: 'space',    h: 55 },
    { type: 'section',  h: 58,  text: 'SOUNDS & MUSIC' },
    { type: 'space',    h: 40 },
    { type: 'label',    h: 40,  text: 'Original Soundscapes' },
    { type: 'desc',     h: 32,  text: '\u201cPark Street Echoes\u201d  \xb7  Original Composition  \xb7  (Placeholder)' },
    { type: 'desc',     h: 32,  text: '\u201cFeathers in the Rain\u201d  \xb7  Original Composition  \xb7  (Placeholder)' },
    { type: 'space',    h: 55 },
    { type: 'section',  h: 58,  text: 'VISUAL DESIGN' },
    { type: 'space',    h: 40 },
    { type: 'label',    h: 40,  text: 'Pixel Art & Palettes' },
    { type: 'desc',     h: 32,  text: 'Lucca Zhou  &  Group 7' },
    { type: 'space',    h: 28 },
    { type: 'label',    h: 40,  text: 'Typography' },
    { type: 'desc',     h: 32,  text: 'DotGothic16  \xb7  VT323  (Google Fonts, Open Licence)' },
    { type: 'space',    h: 75 },
    { type: 'divider',  h: 40 },
    { type: 'space',    h: 55 },
    { type: 'section',  h: 58,  text: 'GOVERNANCE' },
    { type: 'space',    h: 40 },
    { type: 'label',    h: 40,  text: 'Academic Programme' },
    { type: 'desc',     h: 32,  text: 'MSc Computer Science  \xb7  Group 7' },
    { type: 'desc',     h: 32,  text: 'University of Bristol  \xb7  Faculty of Engineering' },
    { type: 'space',    h: 28 },
    { type: 'label',    h: 40,  text: 'Technical Traceability' },
    { type: 'desc',     h: 32,  text: 'Agile Development  \xb7  Jira Workflow' },
    { type: 'desc',     h: 32,  text: 'Version Control  \xb7  GitHub' },
    { type: 'space',    h: 160 },
];

/** Resets all credits state; call this before transitioning to STATE_CREDITS. */
function resetCredits() {
    _creditPhase     = 'scroll';
    _creditScrollY   = height;   // block enters from bottom of screen
    _creditPauseF    = 0;
    _creditPoemAlpha = 0;
}

/** Main credits draw dispatcher. */
function drawCreditsScreen() {
    push();
    background(0);

    let s  = min(width / 1920, height / 1080);
    let cx = width / 2;

    if (_creditPhase === 'scroll') {
        _creditScrollY -= _CREDIT_SCROLL_SPEED * s;

        let totalH = 0;
        for (let d of _CREDIT_DATA) totalH += d.h * s;

        let cumH = 0;
        for (let i = 0; i < _CREDIT_DATA.length; i++) {
            let d     = _CREDIT_DATA[i];
            let lineH = d.h * s;
            let lineY = _creditScrollY + cumH;
            if (lineY + lineH > 0 && lineY < height) {
                _renderCreditLine(d, cx, lineY + lineH / 2, s);
            }
            cumH += lineH;
        }
        _drawCreditsFade();

        if (_creditScrollY + totalH < 0) {
            _creditPhase = 'pause';
            _creditPauseF = 0;
        }

    } else if (_creditPhase === 'pause') {
        _creditPauseF++;
        if (_creditPauseF >= 10) {           // ~0.25s black pause before poem
            _creditPhase     = 'poem';
            _creditPoemAlpha = 0;
        }

    } else if (_creditPhase === 'poem') {
        _drawCreditsPoem(s, cx);
    }

    pop();
}

/** Renders a single line entry based on its type. */
function _renderCreditLine(d, cx, midY, s) {
    push();
    textAlign(CENTER, CENTER);
    noStroke();

    switch (d.type) {
        case 'header':
            textFont(fonts.title || fonts.body);
            textSize(50 * s);
            fill(220, 190, 110);
            text(d.text, cx, midY);
            break;
        case 'sub':
            textFont(fonts.body);
            textSize(22 * s);
            fill(165, 150, 115);
            text(d.text, cx, midY);
            break;
        case 'section':
            textFont(fonts.body);
            textSize(28 * s);
            fill(200, 170, 100);
            text(d.text, cx, midY);
            break;
        case 'name':
            textFont(fonts.title || fonts.body);
            textSize(34 * s);
            fill(245, 235, 215);
            text(d.text, cx, midY);
            break;
        case 'role':
            textFont(fonts.body);
            textSize(19 * s);
            fill(165, 195, 220);
            text(d.text, cx, midY);
            break;
        case 'desc':
            textFont(fonts.body);
            textSize(16 * s);
            fill(135, 130, 120);
            text(d.text, cx, midY);
            break;
        case 'label':
            textFont(fonts.body);
            textSize(22 * s);
            fill(195, 180, 140);
            text(d.text, cx, midY);
            break;
        case 'divider':
            stroke(200, 170, 100, 90);
            strokeWeight(1.2 * s);
            line(cx - 380 * s, midY, cx + 380 * s, midY);
            break;
        // 'space': nothing to render
    }
    pop();
}

/** Top & bottom gradient veil so text fades in/out at screen edges. */
function _drawCreditsFade() {
    noStroke();
    let steps = 14;
    let fadeH = 110;
    for (let i = 0; i < steps; i++) {
        let t  = i / (steps - 1);
        let y0 = (i / steps) * fadeH;
        let yH = fadeH / steps + 1;
        fill(0, 0, 0, lerp(230, 0, t));
        rect(0, y0, width, yH);
        fill(0, 0, 0, lerp(0, 230, t));
        rect(0, height - fadeH + y0, width, yH);
    }
}

/** Poem epilogue: fades in centred, waits for player to dismiss. */
function _drawCreditsPoem(s, cx) {
    _creditPoemAlpha = min(255, _creditPoemAlpha + 6);
    let alpha = _creditPoemAlpha;
    let cy    = height / 2;

    push();
    textAlign(CENTER, CENTER);
    noStroke();
    textFont(fonts.body);

    let poem = [
        { text: '\u201cHope is the thing with feathers \u2014', ts: 30 * s, col: [240, 228, 200] },
        { text: 'That perches in the soul \u2014',              ts: 30 * s, col: [240, 228, 200] },
        { text: 'And sings the tune without the words \u2014',  ts: 30 * s, col: [240, 228, 200] },
        { text: 'And never stops \u2014 at all.\u201d',         ts: 30 * s, col: [240, 228, 200] },
        { text: '',                                              ts: 18 * s, col: [0, 0, 0]       },
        { text: '\u2014 Emily Dickinson (1830\u20131886)',       ts: 22 * s, col: [175, 160, 125] },
        { text: '',                                              ts: 22 * s, col: [0, 0, 0]       },
        { text: '',                                              ts: 18 * s, col: [0, 0, 0]       },
        { text: 'THANK YOU FOR SURVIVING THE SLOPE.',           ts: 28 * s, col: [215, 185, 105] },
    ];

    let lineH  = 44 * s;
    let startY = cy - (poem.length * lineH) / 2 + lineH / 2;

    for (let i = 0; i < poem.length; i++) {
        let p = poem[i];
        textSize(p.ts);
        fill(p.col[0], p.col[1], p.col[2], alpha);
        text(p.text, cx, startY + i * lineH);
    }

    // Dismiss hint — only appears once fully faded in
    if (alpha >= 252) {
        textSize(17 * s);
        fill(105, 100, 92, 170);
        text('Press any key to return to the main menu', cx, height - 48 * s);
    }

    pop();
}

/**
 * Draws a segmented pixel-art progress bar at the given position.
 * @param {number} x        Centre X of the bar.
 * @param {number} y        Centre Y of the bar.
 * @param {number} progress Normalised fill ratio [0, 1].
 */
function drawLoadingProgressBar(x, y, progress) {
    let totalSegments = 10;
    let gap = 8;
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
        let bx = (x - totalW / 2) + i * (blockW + gap);
        let by = y - blockH / 2;
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

    // Fade-in overlay: covers splash with a receding black veil on entry
    if (_splashFadeAlpha > 0) {
        noStroke();
        fill(0, 0, 0, _splashFadeAlpha);
        rect(0, 0, width, height);
        _splashFadeAlpha = max(0, _splashFadeAlpha - 4); // ~64 frames = ~1 s
    }

    pop();
}

/**
 * Renders the animated game logo with a physics-based drop-in and cloud layers.
 * @param {number} x Target centre X.
 * @param {number} y Target centre Y.
 */
function drawLogoPlaceholder(x, y) {
    let isSplash = (gameState.currentState === STATE_SPLASH);
    let t = frameCount * 0.02;
    let targetY = isSplash ? (y + 160) : (y + 10);

    // Drop-in physics — wait until the splash fade-in overlay has cleared
    if (_splashFadeAlpha > 0) {
        // Hold position off-screen while fading in; shake decays harmlessly
        titleDrop.shake *= 0.7;
    } else if (!titleDrop.landed) {
        titleDrop.vy += 2.0;
        titleDrop.y += titleDrop.vy;
        if (titleDrop.y >= y + 160) {
            titleDrop.y = y + 160;
            titleDrop.landed = true;
            titleDrop.shake = 6;
        }
        titleDrop.shake *= 0.7;
    } else {
        titleDrop.y = lerp(titleDrop.y, targetY, 0.15);
        titleDrop.shake *= 0.7;
    }

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
        image(assets.selectClouds[1], width * 0.1, height * 0.9 + cos(t) * 10, 800, 480);
        image(assets.selectClouds[2], width * 0.1, height * 0.2 + sin(t) * 10, 700, 420);
        image(assets.selectClouds[4], width * 1.0, height * 0.09 + sin(t) * 10, 700, 420);
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
    let bx = width - 65;
    let by = 65;
    let isHover = dist(mouseX, mouseY, bx, by) < 80;

    if (assets.pauseImg) {
        push();
        translate(bx, by);
        if (isHover) scale(1.15);
        imageMode(CENTER);
        image(assets.pauseImg, 0, 0,);
        pop();
    } else {
        push();
        translate(bx, by);
        if (isHover) scale(1.15);
        noFill();
        stroke(255, 150);
        strokeWeight(3);
        ellipse(0, 0, 80, 80);
        fill(255, 150);
        noStroke();
        rectMode(CENTER);
        rect(-10, 0, 8, 28);
        rect(10, 0, 8, 28);
        pop();
    }
    pop();
}

/**
 * Renders the pause menu overlay with background, title, and selectable options.
 */
function renderPauseOverlay() {
    push();
    drawOtherBgWithOverlay();

    // Back arrow (top-left) — click to resume
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
        renderStoryRecap();
    } else if (showRestartChoice) {
        let btnW = (assets.btnImg ? assets.btnImg.width  : 240) * 1.5;
        let btnH = (assets.btnImg ? assets.btnImg.height : 60)  * 1.5;
        let spacing = 145;
        let totalH = (RESTART_OPTIONS.length - 1) * spacing;
        let startY = (height / 2) - (totalH / 2) + 20;
        let titleY = startY - btnH / 2 - 110;

        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(48);
        stroke(0, 0, 0, 180); strokeWeight(6); fill(255, 215, 0);
        text("RESTART?", width / 2, titleY);
        noStroke(); fill(255, 215, 0);
        text("RESTART?", width / 2, titleY);

        let anyRestartHover = false;
        for (let i = 0; i < RESTART_OPTIONS.length; i++) {
            let ox = width / 2;
            let oy = startY + i * spacing;
            let isHover = (mouseX > ox - btnW / 2 && mouseX < ox + btnW / 2 &&
                           mouseY > oy - btnH / 2 && mouseY < oy + btnH / 2);
            if (isHover) { restartChoiceIndex = i; anyRestartHover = true; }
            let isSelected = (i === restartChoiceIndex) && restartChoiceIndex >= 0;

            push();
            translate(ox, oy);
            if (isSelected) scale(1.15);
            imageMode(CENTER);
            if (assets.btnImg) image(assets.btnImg, 0, 0, btnW, btnH);
            textFont(fonts.body); textSize(36); textAlign(CENTER, CENTER);
            stroke(0, 0, 0, 180); strokeWeight(5); fill(255, 215, 0);
            text(RESTART_OPTIONS[i], 0, -6);
            noStroke(); fill(255, 215, 0);
            text(RESTART_OPTIONS[i], 0, -6);
            pop();
        }
        if (!anyRestartHover && !keyIsPressed) restartChoiceIndex = -1;
    } else {
        let options = getPauseOptions();
        let btnW = (assets.btnImg ? assets.btnImg.width  : 240) * 1.5;
        let btnH = (assets.btnImg ? assets.btnImg.height : 60)  * 1.5;
        let spacing = 145;
        let totalH = (options.length - 1) * spacing;
        let startY = (height / 2) - (totalH / 2) + 30;

        let titleY = startY - btnH / 2 - 110;

        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(60);
        stroke(0, 0, 0, 180); strokeWeight(6); fill(255, 215, 0);
        text("PAUSED", width / 2, titleY);
        noStroke(); fill(255, 215, 0);
        text("PAUSED", width / 2, titleY);

        let anyPauseHover = false;
        for (let i = 0; i < options.length; i++) {
            let ox = width / 2;
            let oy = startY + i * spacing;
            let isHover = (mouseX > ox - btnW / 2 && mouseX < ox + btnW / 2 &&
                           mouseY > oy - btnH / 2 && mouseY < oy + btnH / 2);
            if (isHover) { pauseIndex = i; anyPauseHover = true; }
            let isSelected = (i === pauseIndex) && pauseIndex >= 0;

            push();
            translate(ox, oy);
            if (isSelected) scale(1.15);
            imageMode(CENTER);
            if (assets.btnImg) image(assets.btnImg, 0, 0, btnW, btnH);
            textFont(fonts.body); textSize(36); textAlign(CENTER, CENTER);
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
 * Renders the win or fail end screen with a contextual message and retry prompt.
 */
function drawEndScreen() {
    if (assets.menuBg) image(assets.menuBg, 0, 0, width, height);
    else background(20);

    textAlign(CENTER, CENTER);
    textFont(fonts.title);
    if (gameState.currentState === STATE_WIN) {
        fill(100, 255, 100);
        textSize(80);
        text("SUCCESS", width / 2, height / 2 - 50);
    } else {
        fill(255, 50, 50);
        textSize(80);
        text("FAILED", width / 2, height / 2 - 50);
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
