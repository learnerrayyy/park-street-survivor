// Park Street Survivor - Developer Tools
// Responsibilities: All debug flags and testing utilities.
// HOW TO USE: Set the flags below, then reload the page.
//             Press '0' in-game to toggle developerMode at runtime.

// ─── DEBUG FLAGS ─────────────────────────────────────────────────────────────

/**
 * Master developer overlay switch.
 * true  → skips loading/splash, shows collision boxes and dev HUD.
 * false → normal game flow.
 */
let developerMode = false;

/**
 * Bypass day-lock checks in the level-select screen.
 * true  → all days are always selectable regardless of progress.
 * false → only unlocked days are selectable.
 */
const DEBUG_UNLOCK_ALL = false;

/**
 * Which scene to jump to immediately on startup (only active when developerMode = true).
 * Options: STATE_ROOM | STATE_DAY_RUN | STATE_MENU | STATE_LEVEL_SELECT
 */
const DEBUG_START_STATE = STATE_DAY_RUN;

/**
 * Player starting position used by setupRoomTestMode().
 */
const DEBUG_PLAYER_X = 940;
const DEBUG_PLAYER_Y = 550;

/**
 * Day ID to load when jumping directly into a run (DEBUG_START_STATE = STATE_DAY_RUN).
 */
const DEBUG_DAY_ID = 1;

// ─── STORY RECAP ─────────────────────────────────────────────────────
/**
 * Developer flag to show the story recap screen.
 */
const DEBUG_STORY_RECAP = true;

/**
 * Developer data for the story recap screen.
 * All x/y values are CENTER coordinates (imageMode CENTER).
 * Adjust using arrow keys (move) + SHIFT+arrow keys (resize) in dev mode.
 */
let storyDebugData = {
    shape: {
        x: 925,    // center X of frame_shape panel
        y: 520,    // center Y
        w: 1620,   // width
        h: 1050,   // height
        alpha: 255
    },
    cloud: {
        x: 895,    // center X of decorative frame_cloud overlay
        y: 545,    // center Y (on top of shape + content)
        w: 1660,   // width
        h: 1065,   // height
        alpha: 255
    },
    textArea: {
        x: 1125,   // center X of clipped story CONTENT region (lines only)
        y: 530,    // center Y
        w: 735,    // width
        h: 490     // height
    },
    titleArea: {
        x: 1125,   // center X of story title (drawn above cloud)
        y: 250,    // center Y — sits above the content, on top of all layers
        w: 700,    // width (for debug box display)
        h: 60      // height (for debug box display)
    }
};

/**
 * Developer flag to show on-screen controls for adjusting the story recap layout in real-time.
 */
let showStoryDebugControls = false;

/**
 * Currently selected layer in story debug mode.
 * 1 = shape (frame_shape), 2 = cloud (frame_cloud), 3 = textArea
 */
let storyDebugActiveLayer = 1;

/**
 * Enters the story recap debug mode, allowing real-time adjustments of the recap layout.
 */
function devGoToStoryRecap() {
    console.log("[DEV] Entering STORY RECAP debug mode");
    gameState.currentState = STATE_PAUSED;
    gameState.previousState = STATE_MENU; // 设置一个安全的 previousState
    showStoryRecap = true;
    storyRecapDay = 1;
    storyScrollOffset = 0;
    pauseIndex = -1;
    showStoryDebugControls = true;
    currentUnlockedDay = 5;  // unlock all days so arrows are navigable in dev mode
    
    console.log("[DEV] Story Debug Controls activated");
    console.log("[DEV] Press 'C' to toggle control panel");
    console.log("[DEV] Use arrow keys + SHIFT to adjust selected layer");
    console.log("[DEV] Press '1' for Shape, '2' for Cloud, '3' for Text Area");
}

// ─── RUNTIME TOGGLE ──────────────────────────────────────────────────────────

/**
 * Flips developerMode on/off at runtime and logs the new state.
 * Bound to the '0' key inside keyPressed() in sketch.js.
 */
function devToggle() {
    developerMode = !developerMode;
    console.log(`[DEV] Developer Mode: ${developerMode ? "ON" : "OFF"}`);
    if (developerMode) {
        console.log("[DEV] Available commands: setupRoomTestMode(), setupRunTestMode()");
    }
}


// ─── SCENE JUMP UTILITIES ────────────────────────────────────────────────────

/**
 * Drops the game directly into the Room scene for layout and interaction testing.
 * Call from the browser console: setupRoomTestMode()
 */
function setupRoomTestMode() {
    console.log("[DEV] Entering ROOM directly");
    gameState.currentState = STATE_ROOM;
    if (player) {
        player.x = DEBUG_PLAYER_X;
        player.y = DEBUG_PLAYER_Y;
    }
    if (roomScene) roomScene.reset();
}

/**
 * Drops the game directly into the Day Run scene for obstacle/gameplay testing.
 * Call from the browser console: setupRunTestMode()
 */
function setupRunTestMode() {
    console.log(`[DEV] Entering DAY_RUN directly (Day ${DEBUG_DAY_ID})`);
    currentDayID = DEBUG_DAY_ID;
    if (player) player.applyLevelStats(DEBUG_DAY_ID);
    if (player) {
        player.x = 500;
        player.y = height / 2;
    }
    obstacleManager = new ObstacleManager();
    if (levelController) levelController.initializeLevel(DEBUG_DAY_ID);
    gameState.currentState = STATE_DAY_RUN;
}

/**
 * Jumps directly to the Win screen for UI/flow testing.
 * Call from the browser console: devGoToWin()
 */
function devGoToWin() {
    console.log("[DEV] Forcing WIN state");
    gameState.setState(STATE_WIN);
}

/**
 * Jumps directly to the Fail screen with a given reason.
 * @param {string} reason "HIT_BUS" | "EXHAUSTED" | "LATE"
 * Call from the browser console: devGoToFail("HIT_BUS")
 */
function devGoToFail(reason = "HIT_BUS") {
    console.log(`[DEV] Forcing FAIL state (${reason})`);
    gameState.failReason = reason;
    gameState.setState(STATE_FAIL);
}

/**
 * Unlocks all days by setting currentUnlockedDay to the maximum.
 * Call from the browser console: devUnlockAllDays()
 */
function devUnlockAllDays() {
    currentUnlockedDay = Object.keys(DAYS_CONFIG).length;
    console.log(`[DEV] All days unlocked (currentUnlockedDay = ${currentUnlockedDay})`);
}

/**
 * Resets player health to full during a run.
 * Call from the browser console: devRefillHealth()
 */
function devRefillHealth() {
    if (player) {
        player.health = player.maxHealth;
        console.log("[DEV] Player health refilled");
    }
}


// ─── STARTUP SKIP ────────────────────────────────────────────────────────────

/**
 * Called at the end of setup() when developerMode is true.
 * Skips loading/splash and jumps to the configured start state.
 */
function devApplyStartupSkip() {
    console.log(`[DEV] Startup skip → ${DEBUG_START_STATE}`);
    gameState.currentState = DEBUG_START_STATE;

    if (DEBUG_STORY_RECAP) {
        setTimeout(() => {
            devGoToStoryRecap();
        }, 100);
        return;
    }

    if (DEBUG_START_STATE === STATE_ROOM) {
        setupRoomTestMode();
    } else if (DEBUG_START_STATE === STATE_DAY_RUN) {
        setupRunTestMode();
    } else if (DEBUG_START_STATE === STATE_INVENTORY) {
        console.log("[DEV] Opening Inventory screen directly");
    }

    if (bgm && !bgm.isPlaying()) {
        bgm.loop();
        bgm.setVolume(masterVolumeBGM);
    }
}
