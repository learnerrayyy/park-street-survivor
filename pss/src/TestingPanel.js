// Park Street Survivor - Developer Tools (merged from DevTools.js)
// Responsibilities: All debug flags, testing utilities, and obstacle tuning panel.
// HOW TO USE: Set the flags below, then reload the page.
//             Press '0' in-game to toggle developerMode at runtime.
//             Press ` or F2 to open the TestingPanel overlay.

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
const DEBUG_UNLOCK_ALL = developerMode;  // auto-unlocks all days when dev mode is on

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
const DEBUG_STORY_RECAP = false;

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
 * @param {number} dayOverride Optional day ID override.
 * Call from the browser console: setupRunTestMode() or setupRunTestMode(4)
 */
function setupRunTestMode(dayOverride) {
    const dayID = Number.isFinite(Number(dayOverride)) ? Number(dayOverride) : DEBUG_DAY_ID;
    console.log(`[DEV] Entering DAY_RUN directly (Day ${dayID})`);
    currentDayID = dayID;
    if (player) player.applyLevelStats(dayID);
    if (player) {
        player.x = GLOBAL_CONFIG.lanes.lane1;
        player.y = PLAYER_RUN_FOOT_Y;
    }
    if (obstacleManager) obstacleManager = new ObstacleManager();
    if (levelController) levelController.initializeLevel(dayID);
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

// ─────────────────────────────────────────────────────────────────────────────
// Obstacle Debug Panel
// Responsibilities: Runtime tuning UI for per-day obstacle enablement and level parameters.

class TestingPanel {
    constructor() {
        this.visible = false;
        this.selectedDay = 1;
        this.hasOpened = false;

        this.editTarget = null;
        this.inputBuffer = "";

        this.rowHitboxes = [];
        this.dayButtons = [];
        this.devButtons = [];
        this.dayParamHitboxes = [];
        this.homelessParamHitboxes = [];

        const preferredObstacleOrder = [
            "LARGE_CAR",
            "SMALL_CAR",
            "SCOOTER_RIDER",
            "HOMELESS",
            "PROMOTER",
            "SMALL_BUSINESS",
            "FANTASY_COFFEE",
            "COFFEE",
            "EMPTY_SCOOTER"
        ];
        this.obstacleOrder = preferredObstacleOrder.filter(k => !!OBSTACLE_CONFIG[k]);
        for (const key of Object.keys(OBSTACLE_CONFIG)) {
            if (!this.obstacleOrder.includes(key)) this.obstacleOrder.push(key);
        }
        this.dayOrder = Object.keys(DIFFICULTY_PROGRESSION).map(Number).sort((a, b) => a - b);
        this.baseDayMap = this.buildBaseDayMap();

        this.dayParamDefs = [
            { key: "description", label: "Description", valueType: "text" },
            { key: "totalDistance", label: "Length(totalDistance)", valueType: "int", min: 1 },
            { key: "realTimeLimit", label: "realTimeLimit", valueType: "int", min: 1 },
            { key: "obstacleSpawnInterval", label: "obstacleSpawnInterval", valueType: "int", min: 0 },
            { key: "baseScrollSpeed", label: "baseScrollSpeed", valueType: "number", min: 0 },
            { key: "basePlayerSpeed", label: "basePlayerSpeed", valueType: "number", min: 0 },
            { key: "healthDecay", label: "healthDecay", valueType: "number", min: 0 },
            { key: "type", label: "type", valueType: "text" }
        ];
        this.homelessParamDefs = [
            { key: "bubbleOffsetX", label: "bubbleOffsetX", valueType: "number" },
            { key: "bubbleTextSize", label: "bubbleTextSize", valueType: "number", min: 10 }
        ];

        this.initializeDifficultyDebugFields();
        this.initializeHomelessDebugFields();
    }

    buildBaseDayMap() {
        const map = {};
        for (const obstacleType of this.obstacleOrder) map[obstacleType] = [];

        for (const [dayKey, cfg] of Object.entries(DIFFICULTY_PROGRESSION)) {
            const day = Number(dayKey);
            const available = cfg.availableObstacles || [];
            for (const obstacleType of available) {
                if (map[obstacleType]) map[obstacleType].push(day);
            }
        }
        return map;
    }

    initializeDifficultyDebugFields() {
        for (const dayKey of Object.keys(DIFFICULTY_PROGRESSION)) {
            const cfg = DIFFICULTY_PROGRESSION[dayKey];
            if (!Array.isArray(cfg.availableObstacles)) cfg.availableObstacles = [];
            if (!cfg.obstacleWeights) cfg.obstacleWeights = {};

            for (const obstacleType of this.obstacleOrder) {
                if (cfg.obstacleWeights[obstacleType] === undefined) {
                    cfg.obstacleWeights[obstacleType] = 1.0;
                }
            }
        }
    }

    initializeHomelessDebugFields() {
        if (!OBSTACLE_CONFIG.HOMELESS) return;
        if (OBSTACLE_CONFIG.HOMELESS.bubbleOffsetX === undefined) OBSTACLE_CONFIG.HOMELESS.bubbleOffsetX = 0;
        if (OBSTACLE_CONFIG.HOMELESS.bubbleTextSize === undefined) OBSTACLE_CONFIG.HOMELESS.bubbleTextSize = 14;
    }

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            if (!this.hasOpened) {
                this.selectedDay = currentDayID || this.selectedDay || 1;
                this.hasOpened = true;
            }
            this.cancelEditing();
        }
    }

    isVisible() {
        return this.visible;
    }

    getCurrentDifficultyConfig() {
        return DIFFICULTY_PROGRESSION[this.selectedDay] || null;
    }

    getCurrentDayConfig() {
        return DAYS_CONFIG[this.selectedDay] || null;
    }

    isObstacleEnabled(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return false;
        return (cfg.availableObstacles || []).includes(obstacleType);
    }

    toggleObstacle(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return;

        const available = cfg.availableObstacles || [];
        const idx = available.indexOf(obstacleType);
        if (idx >= 0) {
            available.splice(idx, 1);
            if (this.isEditingWeight(obstacleType)) this.cancelEditing();
        } else {
            available.push(obstacleType);
            available.sort((a, b) => this.obstacleOrder.indexOf(a) - this.obstacleOrder.indexOf(b));
        }

        this.applyLiveConfigIfActiveDay();
    }

    isEditingWeight(obstacleType) {
        return this.editTarget && this.editTarget.kind === "weight" && this.editTarget.obstacleType === obstacleType;
    }

    isEditingDayParam(paramKey) {
        return this.editTarget && this.editTarget.kind === "dayParam" && this.editTarget.paramKey === paramKey;
    }

    isEditingHomelessParam(paramKey) {
        return this.editTarget && this.editTarget.kind === "homelessParam" && this.editTarget.paramKey === paramKey;
    }

    beginWeightEdit(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg || !this.isObstacleEnabled(obstacleType)) return;
        const w = cfg.obstacleWeights[obstacleType];
        this.editTarget = { kind: "weight", obstacleType };
        this.inputBuffer = Number.isFinite(Number(w)) ? String(w) : "1";
    }

    beginDayParamEdit(paramKey) {
        const cfg = this.getCurrentDayConfig();
        if (!cfg) return;
        this.editTarget = { kind: "dayParam", paramKey };
        this.inputBuffer = String(cfg[paramKey] ?? "");
    }

    beginHomelessParamEdit(paramKey) {
        const cfg = OBSTACLE_CONFIG.HOMELESS;
        if (!cfg) return;
        this.editTarget = { kind: "homelessParam", paramKey };
        this.inputBuffer = String(cfg[paramKey] ?? "");
    }

    cancelEditing() {
        this.editTarget = null;
        this.inputBuffer = "";
    }

    commitEdit() {
        if (!this.editTarget) return;

        if (this.editTarget.kind === "weight") {
            const cfg = this.getCurrentDifficultyConfig();
            if (cfg) {
                const parsed = parseFloat(this.inputBuffer);
                cfg.obstacleWeights[this.editTarget.obstacleType] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1.0;
            }
        }

        if (this.editTarget.kind === "dayParam") {
            const cfg = this.getCurrentDayConfig();
            const def = this.dayParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (cfg && def) {
                if (def.valueType === "text") {
                    const textVal = String(this.inputBuffer || "").trim();
                    cfg[def.key] = textVal.length > 0 ? textVal : String(cfg[def.key] ?? "");
                } else {
                    let num = parseFloat(this.inputBuffer);
                    if (!Number.isFinite(num)) num = Number(cfg[def.key] ?? 0);
                    if (def.valueType === "int") num = Math.round(num);
                    if (typeof def.min === "number") num = Math.max(def.min, num);
                    cfg[def.key] = num;
                }
                this.applyLiveConfigIfActiveDay();
            }
        }

        if (this.editTarget.kind === "homelessParam") {
            const cfg = OBSTACLE_CONFIG.HOMELESS;
            const def = this.homelessParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (cfg && def) {
                let num = parseFloat(this.inputBuffer);
                if (!Number.isFinite(num)) num = Number(cfg[def.key] ?? 0);
                if (typeof def.min === "number") num = Math.max(def.min, num);
                cfg[def.key] = num;
            }
        }

        this.cancelEditing();
    }

    applyLiveConfigIfActiveDay() {
        if (!levelController) return;
        const activeDay = Number(levelController.currentDayID || currentDayID || 0);
        if (activeDay !== Number(this.selectedDay)) return;

        if (typeof levelController.applyDifficultyParameters === "function") {
            levelController.applyDifficultyParameters(activeDay);
        }

        if (obstacleManager && levelController.proceduralLevel &&
            typeof levelController.proceduralLevel.getDifficultyConfig === "function") {
            obstacleManager.setLevelConfig(levelController.proceduralLevel.getDifficultyConfig());
        }
    }

    handleKeyPressed(k, kCode) {
        if (!this.visible) return false;

        if (kCode === ESCAPE) {
            this.commitEdit();
            this.visible = false;
            return true;
        }

        if (kCode === LEFT_ARROW) {
            this.commitEdit();
            this.selectedDay = max(this.dayOrder[0] || 1, this.selectedDay - 1);
            return true;
        }
        if (kCode === RIGHT_ARROW) {
            this.commitEdit();
            this.selectedDay = min(this.dayOrder[this.dayOrder.length - 1] || 1, this.selectedDay + 1);
            return true;
        }

        if (!this.editTarget) return true;

        if (kCode === ENTER || kCode === RETURN || kCode === TAB) {
            this.commitEdit();
            return true;
        }
        if (kCode === BACKSPACE) {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
            return true;
        }

        if (this.editTarget.kind === "dayParam") {
            const def = this.dayParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (def && def.valueType === "text") {
                if (k && k.length === 1) {
                    this.inputBuffer += k;
                    return true;
                }
                return true;
            }
        }

        const isDigit = /^[0-9]$/.test(k);
        if (isDigit) {
            this.inputBuffer += k;
            return true;
        }
        if (k === "." && !this.inputBuffer.includes(".")) {
            this.inputBuffer += ".";
            return true;
        }
        if (k === "-" && this.inputBuffer.length === 0) {
            this.inputBuffer = "-";
            return true;
        }

        return true;
    }

    handleMousePressed(mx, my) {
        if (!this.visible) return false;

        for (const btn of this.dayButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                this.commitEdit();
                this.selectedDay = btn.day;
                return true;
            }
        }

        for (const box of this.dayParamHitboxes) {
            if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                this.commitEdit();
                this.beginDayParamEdit(box.key);
                return true;
            }
        }

        for (const box of this.homelessParamHitboxes) {
            if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                this.commitEdit();
                this.beginHomelessParamEdit(box.key);
                return true;
            }
        }

        for (const row of this.rowHitboxes) {
            const inWeight = mx >= row.weightX && mx <= row.weightX + row.weightW &&
                my >= row.y && my <= row.y + row.h;
            if (inWeight) {
                this.commitEdit();
                this.beginWeightEdit(row.type);
                return true;
            }

            const inToggle = mx >= row.toggleX && mx <= row.toggleX + row.toggleW &&
                my >= row.y && my <= row.y + row.h;
            if (inToggle) {
                this.commitEdit();
                this.toggleObstacle(row.type);
                return true;
            }
        }

        for (const btn of this.devButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                this.commitEdit();
                this.executeDevAction(btn.id);
                return true;
            }
        }

        this.commitEdit();
        return true;
    }

    executeDevAction(actionId) {
        if (actionId === "restart_current") {
            const day = Number((levelController && levelController.currentDayID) || currentDayID || this.selectedDay || 1);
            if (typeof setupRunTestMode === "function") setupRunTestMode(day);
            return;
        }

        if (actionId === "run_selected_day") {
            if (typeof setupRunTestMode === "function") setupRunTestMode(this.selectedDay);
            return;
        }

        if (actionId === "goto_room") {
            if (typeof setupRoomTestMode === "function") setupRoomTestMode();
            return;
        }

        if (actionId === "refill") {
            if (typeof devRefillHealth === "function") devRefillHealth();
            return;
        }

        if (actionId === "toggle_dev") {
            if (typeof devToggle === "function") devToggle();
            return;
        }

        if (actionId === "win") {
            if (typeof devGoToWin === "function") devGoToWin();
            return;
        }

        if (actionId === "fail_hit_bus") {
            if (typeof devGoToFail === "function") devGoToFail("HIT_BUS");
            return;
        }

        if (actionId === "fail_late") {
            if (typeof devGoToFail === "function") devGoToFail("LATE");
            return;
        }

        if (actionId === "story_recap") {
            if (typeof devGoToStoryRecap === "function") devGoToStoryRecap();
            this.visible = false;
            return;
        }
    }

    draw() {
        if (!this.visible) return;

        const panelX = 100;
        const panelY = 60;
        const panelW = width - 200;
        const panelH = height - 120;

        push();
        noStroke();
        fill(255, 170);
        rect(0, 0, width, height);

        stroke(0);
        strokeWeight(2);
        fill(255, 252);
        rect(panelX, panelY, panelW, panelH, 14);
        noStroke();

        fill(0);
        textAlign(LEFT, CENTER);
        textStyle(BOLD);
        textSize(34);
        text("OBSTACLE TUNER", panelX + 24, panelY + 34);
        textStyle(BOLD);
        textSize(20);
        text("` / F2: Close  |  Click cells to edit  |  Enter: commit", panelX + 24, panelY + 62);

        this.drawDaySelector(panelX + 24, panelY + 80);
        this.drawDayParams(panelX + 24, panelY + 126, panelW - 48, 164);
        this.drawHomelessBubbleParams(panelX + 24, panelY + 296, panelW - 48, 82);
        this.drawObstacleTable(panelX + 24, panelY + 386, panelW - 48, panelH - 508);
        this.drawDevActions(panelX + 24, panelY + panelH - 108, panelW - 48, 84);
        pop();
    }

    drawDaySelector(x, y) {
        this.dayButtons = [];
        const buttonW = 122;
        const buttonH = 34;
        const gap = 10;

        for (let i = 0; i < this.dayOrder.length; i++) {
            const day = this.dayOrder[i];
            const bx = x + i * (buttonW + gap);
            const selected = day === this.selectedDay;

            stroke(0);
            strokeWeight(1.5);
            fill(selected ? 0 : 245);
            rect(bx, y, buttonW, buttonH, 7);
            noStroke();
            fill(selected ? 255 : 0);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(24);
            text(`DAY ${day}`, bx + buttonW / 2, y + buttonH / 2 + 1);

            this.dayButtons.push({ day, x: bx, y, w: buttonW, h: buttonH });
        }
    }

    drawDayParams(x, y, w, h) {
        const cfg = this.getCurrentDayConfig();
        if (!cfg) return;

        this.dayParamHitboxes = [];

        stroke(0, 150);
        strokeWeight(1);
        fill(245);
        rect(x, y, w, h, 8);
        noStroke();
        fill(0);
        textStyle(BOLD);
        textSize(23);
        textAlign(LEFT, CENTER);
        text("Day Config (DAYS_CONFIG)", x + 12, y + 16);

        const innerX = x + 10;
        const innerY = y + 30;
        const colGap = 12;
        const colW = floor((w - 20 - colGap) / 2);
        const rowH = 30;

        for (let i = 0; i < this.dayParamDefs.length; i++) {
            const def = this.dayParamDefs[i];
            const col = i % 2;
            const row = floor(i / 2);
            const cellX = innerX + col * (colW + colGap);
            const cellY = innerY + row * rowH;

            fill(0);
            textStyle(BOLD);
            textSize(20);
            textAlign(LEFT, CENTER);
            text(def.label, cellX, cellY + rowH / 2);

            const valueBoxW = 186;
            const valueX = cellX + colW - valueBoxW;
            const isEditing = this.isEditingDayParam(def.key);
            stroke(0, 160);
            strokeWeight(1);
            fill(isEditing ? 255 : 238);
            rect(valueX, cellY + 4, valueBoxW, rowH - 8, 5);

            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(20);
            const rawVal = cfg[def.key];
            const valueText = isEditing ? `${this.inputBuffer}_` : String(rawVal);
            text(valueText, valueX + valueBoxW / 2, cellY + rowH / 2 + 1);

            this.dayParamHitboxes.push({ key: def.key, x: valueX, y: cellY + 4, w: valueBoxW, h: rowH - 8 });
        }
    }

    drawHomelessBubbleParams(x, y, w, h) {
        const cfg = OBSTACLE_CONFIG.HOMELESS;
        if (!cfg) return;

        this.homelessParamHitboxes = [];

        stroke(0, 150);
        strokeWeight(1);
        fill(245);
        rect(x, y, w, h, 8);
        noStroke();
        fill(0);
        textStyle(BOLD);
        textSize(21);
        textAlign(LEFT, CENTER);
        text("Homeless Bubble", x + 12, y + 16);

        const startX = x + 12;
        const startY = y + 40;
        const gap = 18;
        const cellW = floor((w - 24 - gap) / 2);
        const labelY = startY + 14;

        for (let i = 0; i < this.homelessParamDefs.length; i++) {
            const def = this.homelessParamDefs[i];
            const cellX = startX + i * (cellW + gap);

            fill(0);
            textStyle(BOLD);
            textSize(18);
            textAlign(LEFT, CENTER);
            text(def.label, cellX, labelY);

            const valueW = 180;
            const valueX = cellX + cellW - valueW;
            const isEditing = this.isEditingHomelessParam(def.key);
            stroke(0, 160);
            strokeWeight(1);
            fill(isEditing ? 255 : 238);
            rect(valueX, startY, valueW, 28, 5);

            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(18);
            const valueText = isEditing ? `${this.inputBuffer}_` : String(cfg[def.key]);
            text(valueText, valueX + valueW / 2, startY + 14);

            this.homelessParamHitboxes.push({ key: def.key, x: valueX, y: startY, w: valueW, h: 28 });
        }
    }

    drawObstacleTable(x, y, w, h) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return;

        this.rowHitboxes = [];

        const rowH = 38;
        const headerH = 30;
        const colTypeX = x + 10;
        const colCatX = x + 240;
        const colDamageX = x + 382;
        const colEffectX = x + 500;
        const colDayX = x + 760;
        const colWeightX = x + w - 170;
        const weightW = 140;

        stroke(0, 150);
        strokeWeight(1);
        fill(242);
        rect(x, y, w, headerH, 8);
        noStroke();
        fill(0);
        textStyle(BOLD);
        textSize(21);
        textAlign(LEFT, CENTER);
        text("Obstacle", colTypeX, y + headerH / 2 + 1);
        text("Category", colCatX, y + headerH / 2 + 1);
        text("Damage", colDamageX, y + headerH / 2 + 1);
        text("Effect", colEffectX, y + headerH / 2 + 1);
        text("Default Days", colDayX, y + headerH / 2 + 1);
        text("Weight", colWeightX + 8, y + headerH / 2 + 1);

        const maxRows = floor((h - headerH) / rowH);
        const rowsToDraw = min(this.obstacleOrder.length, maxRows);

        for (let i = 0; i < rowsToDraw; i++) {
            const obstacleType = this.obstacleOrder[i];
            const obCfg = OBSTACLE_CONFIG[obstacleType] || {};
            const rowY = y + headerH + i * rowH;
            const enabled = this.isObstacleEnabled(obstacleType);
            const baseDays = (this.baseDayMap[obstacleType] || []).join(", ");

            stroke(0, enabled ? 130 : 70);
            strokeWeight(1);
            fill(enabled ? 255 : 235);
            rect(x, rowY, w, rowH - 2, 6);

            noStroke();
            fill(enabled ? 0 : 110);
            textStyle(BOLD);
            textSize(20);
            textAlign(LEFT, CENTER);
            text(obstacleType, colTypeX, rowY + rowH / 2);
            text(obCfg.type || "-", colCatX, rowY + rowH / 2);
            text(String(obCfg.damage ?? "-"), colDamageX, rowY + rowH / 2);
            text(obCfg.effect || "-", colEffectX, rowY + rowH / 2);
            text(baseDays || "-", colDayX, rowY + rowH / 2);

            stroke(0, enabled ? 160 : 80);
            strokeWeight(1);
            fill(enabled ? 255 : 240);
            rect(colWeightX, rowY + 5, weightW, rowH - 12, 5);
            noStroke();
            fill(enabled ? 0 : 120);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(20);
            const isEditing = this.isEditingWeight(obstacleType);
            const weightText = enabled
                ? (isEditing ? `${this.inputBuffer || ""}_` : String((cfg.obstacleWeights || {})[obstacleType] ?? 1))
                : "--";
            if (enabled && isEditing) fill(0);
            text(weightText, colWeightX + weightW / 2, rowY + rowH / 2);

            this.rowHitboxes.push({
                type: obstacleType,
                y: rowY,
                h: rowH - 2,
                toggleX: x,
                toggleW: w,
                weightX: colWeightX,
                weightW: weightW
            });
        }
    }

    drawDevActions(x, y, w, h) {
        this.devButtons = [];

        stroke(0, 150);
        strokeWeight(1);
        fill(245);
        rect(x, y, w, h, 8);
        noStroke();
        fill(0);
        textAlign(LEFT, CENTER);
        textStyle(BOLD);
        textSize(22);
        text("Dev Actions", x + 12, y + 14);

        const buttons = [
            { id: "restart_current", label: "Restart Current" },
            { id: "run_selected_day", label: `Run Day ${this.selectedDay}` },
            { id: "goto_room", label: "Go Room" },
            { id: "refill", label: "Refill HP" },
            { id: "toggle_dev", label: developerMode ? "Dev ON" : "Dev OFF" },
            { id: "win", label: "Force Win" },
            { id: "fail_hit_bus", label: "Fail HIT_BUS" },
            { id: "fail_late", label: "Fail LATE" },
            { id: "story_recap", label: "Story Recap" }
        ];

        const btnGap = 8;
        const btnW = floor((w - 16 - (buttons.length - 1) * btnGap) / buttons.length);
        const btnH = 38;
        const startX = x + 8;
        const btnY = y + 28;

        for (let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            const bx = startX + i * (btnW + btnGap);

            stroke(0);
            strokeWeight(1.2);
            fill(255);
            rect(bx, btnY, btnW, btnH, 6);
            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(19);
            text(b.label, bx + btnW / 2, btnY + btnH / 2 + 1);

            this.devButtons.push({ id: b.id, x: bx, y: btnY, w: btnW, h: btnH });
        }
    }
}
