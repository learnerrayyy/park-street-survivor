// Park Street Survivor - Room Scene
// Responsibilities: Bedroom walkable-area definition, collision resolution, interaction detection, and rendering.

class RoomScene {

    // ─── INITIALISATION ──────────────────────────────────────────────────────

    constructor() {
        // Player spawn point
        this.playerSpawnX = 940;
        this.playerSpawnY = 580;

        // Main walkable rectangle (centre of the bedroom floor)
        this.walkableArea = {
            minX: 925,
            maxX: 1155,
            minY: 470,
            maxY: 720
        };

        // Carpet corridor extending downward to the doorway
        this.carpetArea = {
            minX: 940,
            maxX: 970,
            minY: 715,
            maxY: 770
        };

        // Desk interaction zone
        this.deskX = 1085;
        this.deskY = 430;
        this.deskThreshold = 80;
        this.deskBoxW = 115;
        this.deskBoxH = 50;

        // Door interaction zone
        this.doorX = 955;
        this.doorY = 760;
        this.doorThreshold = 80;
        this.doorBoxW = 60;
        this.doorBoxH = 45;

        // Proximity flags used by the renderer and input handler
        this.isPlayerNearDesk = false;
        this.isPlayerNearDoor = false;

        // Timer for the "missing items" warning prompt (frames)
        this.doorBlockTimer = 0;
        this.doorBlockMessage = "";
        // Dialog / Typewriter state
        this.dialogActive = false;
        this.dialogTimerMax = 120;   // 总时长（帧）2s
        this.dialogTimer = 0;

        this.dialogFullText = "";
        this.dialogWords = [];
        this.dialogWordIndex = 0;
        this.dialogDisplayed = "";

        // typing pacing (frames per word)
        this.wordInterval = 4;
        this.wordTick = 0;

        // sound hook placeholder
        this.typingSfx = null; // 找到音源后赋值，比如 sfxType

        // ── PERFORMANCE: Lazy-cached scale values for background images ──
        // Computed once on first render so we avoid per-frame division.
        this._otherBgScale = null;
        this._roomBgScale = null;
        this._roomTopY = null; // derived from roomBg scale, also cached

        // Back arrow button — returns to level select
        this.backButton = new UIButton(70, 65, 60, 60, "BACK_ARROW", () => {
            triggerTransition(() => {
                gameState.setState(STATE_LEVEL_SELECT);
                if (mainMenu) {
                    mainMenu.menuState = STATE_LEVEL_SELECT;
                    mainMenu.timeWheel.bgAlpha = 0;
                    mainMenu.timeWheel.triggerEntrance();
                }
            });
        });
    }

    /**
     * Resets the scene and moves the player to the spawn point.
     */
    reset() {
        console.log("[RoomScene] Reset - Player spawned at (940, 580)");
        if (typeof player !== 'undefined') {
            player.x = this.playerSpawnX;
            player.y = this.playerSpawnY;
        }
        this.isPlayerNearDesk = false;
        this.isPlayerNearDoor = false;
        this.doorBlockTimer = 0;
        this.doorBlockMessage = "";
        this.dialogActive = false;
        this.dialogTimer = 0;
        this.dialogFullText = "";
        this.dialogWords = [];
        this.dialogWordIndex = 0;
        this.dialogDisplayed = "";
        this.wordTick = 0;
    }

    // ─── COLLISION ───────────────────────────────────────────────────────────

    /**
     * Returns true if the given point falls within any walkable zone.
     */
    isWalkable(x, y) {
        let inMainArea = (
            x >= this.walkableArea.minX && x <= this.walkableArea.maxX &&
            y >= this.walkableArea.minY && y <= this.walkableArea.maxY
        );
        let inCarpetArea = (
            x >= this.carpetArea.minX && x <= this.carpetArea.maxX &&
            y >= this.carpetArea.minY && y <= this.carpetArea.maxY
        );
        return inMainArea || inCarpetArea;
    }

    /**
     * Resolves the player's next position using axis-separated collision checks.
     * Tries full move → X-only → Y-only → no move, in that order.
     */
    getValidPosition(newX, newY, oldX, oldY) {
        let playerRadius = 20;
        if (this.isWalkable(newX, newY, playerRadius)) return { x: newX, y: newY };
        if (this.isWalkable(newX, oldY, playerRadius)) return { x: newX, y: oldY };
        if (this.isWalkable(oldX, newY, playerRadius)) return { x: oldX, y: newY };
        return { x: oldX, y: oldY };
    }

    // ─── INTERACTION LOGIC ───────────────────────────────────────────────────

    /**
     * Updates proximity flags for the desk and door each frame.
     */
    checkInteraction() {
        if (typeof player !== 'undefined') {
            // Use squared distance to avoid sqrt() — compare threshold² instead
            let deskThreshSq = this.deskThreshold * this.deskThreshold;
            let doorThreshSq = this.doorThreshold * this.doorThreshold;
            let dx, dy;

            dx = player.x - this.deskX; dy = player.y - this.deskY;
            this.isPlayerNearDesk = (dx * dx + dy * dy < deskThreshSq);

            dx = player.x - this.doorX; dy = player.y - this.doorY;
            this.isPlayerNearDoor = (dx * dx + dy * dy < doorThreshSq);
        }
    }

    /**
     * Handles interaction key presses:
     *   E near desk  — opens the backpack inventory.
     *   ENTER near door — starts the day run.
     */
    handleKeyPress(keyCode) {
        if (this.isPlayerNearDesk && keyCode === 69) {
            console.log("[RoomScene] Opening backpack");
            // Refresh desk items for the current day before opening
            if (typeof backpackUI !== 'undefined' && backpackUI) {
                backpackUI.initScatteredItems();
            }
            // Advance tutorial hint: desk visited → now prompt to close backpack once items are packed
            if (typeof tutorialHints !== 'undefined' && tutorialHints.roomPhase === 'DESK') {
                tutorialHints.roomPhase = 'CLOSE_BP';
            }
            gameState.currentState = STATE_INVENTORY;
            if (typeof playSFX !== 'undefined' && typeof sfxClick !== 'undefined') {
                playSFX(sfxClick);
            }
        }

        if (this.isPlayerNearDoor && (keyCode === ENTER || keyCode === 13)) {
            // Check required items before leaving
            if (typeof backpackUI !== 'undefined' && backpackUI && !backpackUI.hasRequiredItems()) {
                let missing = backpackUI.getMissingRequiredItems();
                this.triggerDialog("I haven't packed my bag yet.");
                console.log("[RoomScene] Exit blocked — missing: " + missing.join(", "));
                return;
            }
            console.log("[RoomScene] Leaving room");
            if (typeof player !== 'undefined') {
                player.x = GLOBAL_CONFIG.lanes.lane1;
                player.y = PLAYER_RUN_FOOT_Y;  // Player foot anchor for day run
            }
            gameState.currentState = STATE_DAY_RUN;
            if (typeof playSFX !== 'undefined' && typeof sfxClick !== 'undefined') {
                playSFX(sfxClick);
            }
        }
    }

    /**
     * Trigger dialog box 
     */
    triggerDialog(text) {
        this.dialogActive = true;
        this.dialogTimer = this.dialogTimerMax;

        this.dialogFullText = text;
        this.dialogWords = text.trim().split(/\s+/); // 按空格分词
        this.dialogWordIndex = 0;
        this.dialogDisplayed = "";
        this.wordTick = 0;
    }


    // ─── RENDERING ───────────────────────────────────────────────────────────

    /**
     * Main display call: renders background, room image, interaction indicators, and dev tools.
     */
    display() {
        push();

        // 1. Background wallpaper — use cached scale (compute once on first frame)
        if (assets && assets.otherBg) {
            if (this._otherBgScale === null) {
                this._otherBgScale = max(width / assets.otherBg.width, height / assets.otherBg.height);
            }
            let s = this._otherBgScale;
            imageMode(CENTER);
            image(assets.otherBg, width / 2, height / 2, assets.otherBg.width * s, assets.otherBg.height * s);
        } else {
            background(80, 60, 100);
        }

        // Dark overlay — alpha matches all other otherBg screens (see SHARED_BG_OVERLAY_ALPHA)
        noStroke();
        fill(0, 0, 0, SHARED_BG_OVERLAY_ALPHA);
        rectMode(CORNER);
        rect(0, 0, width, height);
        imageMode(CORNER);

        // 2. Room sprite — use cached scale
        if (assets && assets.roomBg) {
            if (this._roomBgScale === null) {
                this._roomBgScale = min(width / assets.roomBg.width, height / assets.roomBg.height) * 0.8;
                this._roomTopY = height / 2 - (assets.roomBg.height * this._roomBgScale) / 2 + 100;
            }
            let s = this._roomBgScale;
            imageMode(CENTER);
            image(assets.roomBg, width / 2, height / 2, assets.roomBg.width * s, assets.roomBg.height * s);
        }

        // 3. Update and draw interaction indicators
        this.checkInteraction();
        this.drawInteractionIndicators();

        // 4. Door-blocked warning prompt
        this.drawDoorBlockedPrompt();
        this.drawTutorialHints();

        // 5. Back button
        this.backButton.isFocused = this.backButton.checkMouse(mouseX, mouseY);
        this.backButton.update();
        this.backButton.display();

        // 6. Developer overlay
        this.drawRoomDevTools();

        pop();
    }

    /**
     * Handles room-specific mouse clicks.
     * @returns {boolean} True if the click was consumed.
     */
    handleMousePressed(mx, my) {
        if (this.backButton.checkMouse(mx, my)) {
            this.backButton.handleClick();
            return true;
        }
        return false;
    }

    /**
     * Draws a pulsing highlight box and prompt label for the nearest interactable object.
     */
    drawInteractionIndicators() {
        if (!this.isPlayerNearDesk && !this.isPlayerNearDoor) return;

        push();

        let target = this.isPlayerNearDesk
            ? { label: "CHECK DESK", key: 'e', x: this.deskX, y: this.deskY, w: this.deskBoxW, h: this.deskBoxH }
            : { label: "LEAVE ROOM", key: 'enter', x: this.doorX, y: this.doorY, w: this.doorBoxW, h: this.doorBoxH };

        // Use cached roomTopY (computed once on first render)
        let roomTopY = (this._roomTopY !== null) ? this._roomTopY : 100;

        let pulse = (sin(frameCount * 0.1) + 1) * 0.5;

        // Pulsing outline box around the interactable object
        noFill();
        stroke(255, 216, 0, 150 + pulse * 105);
        strokeWeight(2);
        rectMode(CENTER);
        rect(target.x, target.y, target.w, target.h, 8);

        // Prompt text centred above the room
        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(22);
        fill(255, 216, 0, 180 + pulse * 75);
        noStroke();
        text(`PRESS [${target.key.toUpperCase()}] TO ${target.label}`, width / 2, roomTopY);

        // Animated key icon above the prompt text
        if (assets.keys && assets.keys[target.key]) {
            let sheet = assets.keys[target.key];
            let frame = floor(frameCount / 15) % 3;
            let sw = sheet.width / 3;
            imageMode(CENTER);
            tint(255, 200 + pulse * 55);
            image(sheet, width / 2, roomTopY - 60, 50, 40, frame * sw, 0, sw, sheet.height);
            noTint();
        }

        pop();
    }

    /**
     * Draws breathing warning icons to guide the player through the tutorial sequence.
     * Phase 'DESK'  — icon near the desk, prompting to open the backpack.
     * Phase 'DOOR'  — icon near the door (Day 1 only), prompting to leave the room.
     */
    drawTutorialHints() {
        if (typeof tutorialHints === 'undefined' || !assets.warningImg) return;
        let phase = tutorialHints.roomPhase;
        if (phase !== 'DESK' && phase !== 'DOOR') return;

        // Use the global drawWarningIcon() which preserves the image's natural
        // aspect ratio and applies the breathing animation — no manual stretching.
        if (phase === 'DESK') {
            drawWarningIcon(this.deskX + 55, this.deskY - 45, 52);
        } else if (phase === 'DOOR') {
            drawWarningIcon(this.doorX + 35, this.doorY - 55, 52);
        }
    }

    /**
     * Developer overlay: crosshair cursor, mouse coordinates, and walkable-area outlines.
     * Only active when developerMode is true.
     */
    drawRoomDevTools() {
        if (!developerMode) return;

        push();
        // Crosshair cursor
        stroke(255, 0, 0, 150);
        line(mouseX, 0, mouseX, height);
        line(0, mouseY, width, mouseY);

        // Mouse coordinates label
        noStroke();
        fill(255, 255, 0);
        textFont(fonts.body);
        textSize(18);
        text(`X: ${floor(mouseX)}, Y: ${floor(mouseY)}`, mouseX + 10, mouseY - 10);

        // Walkable area outlines (auto-updated from constructor data)
        noFill();
        stroke(0, 255, 0);
        strokeWeight(2);
        rectMode(CORNERS);
        rect(this.walkableArea.minX, this.walkableArea.minY, this.walkableArea.maxX, this.walkableArea.maxY);
        rect(this.carpetArea.minX, this.carpetArea.minY, this.carpetArea.maxX, this.carpetArea.maxY);
        pop();
    }

    /**
     * Shows a timed warning when the player tries to leave without required items.
     */
    drawDoorBlockedPrompt() {
        if (!this.dialogActive || this.dialogTimer <= 0) return;

        // countdown
        this.dialogTimer--;

        // ---- Typewriter update (word-by-word) ----
        // 只要还没显示完，就按节奏追加单词
        if (this.dialogWordIndex < this.dialogWords.length) {
            this.wordTick++;
            if (this.wordTick >= this.wordInterval) {
                this.wordTick = 0;

                // append next word
                let w = this.dialogWords[this.dialogWordIndex];
                this.dialogDisplayed += (this.dialogDisplayed ? " " : "") + w;
                this.dialogWordIndex++;

                // typing sfx hook (placeholder)
                // 音源确定后：this.typingSfx = sfxType; 并确保 playSFX 存在
                if (typeof playSFX === "function" && this.typingSfx) {
                    playSFX(this.typingSfx);
                }
            }
        }

        // ---- Simple pop-in animation ----
        let alpha = 230; // 90% black ≈ 230

        // ---- Scale mapping from 1920x1080 design space ----
        const DESIGN_W = 1920;
        const DESIGN_H = 1080;
        // 用统一缩放，避免图片/布局被拉伸
        const s = min(width / DESIGN_W, height / DESIGN_H);

        // ---- Dialog box: fixed 1920x220 in design space -> scaled to canvas ----
        const boxH = 220 * s;
        rectMode(CORNER);
        noStroke();
        fill(56, 39, 96, alpha);
        rect(0, height - boxH, width, boxH); 

        // ---- Portrait: design (30,700) size 380x380 -> scaled ----
        const px = 30 * s;
        const py = 700 * s;
        const pSize = 380 * s;

        imageMode(CORNER);
        if (assets && assets.portraitPlayerNormal) {
            image(assets.portraitPlayerNormal, px, py, pSize, pSize);
        } else {
            fill(255, 255, 255, 40);
            rect(px, py, pSize, pSize, 18 * s);
        }

        // ---- Text: fixed top-left at (496,932) in design space -> scaled ----
        const tx = 496 * s;
        const ty = 932 * s;

        // 文本框宽高也按设计值缩放（右边留 40px，上下留白自己调）
        const tw = (1920 - 496 - 40) * s;
        const th = (220 - 30) * s;

        textFont(fonts.body);
        textSize(48);
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);

        // p5 自动换行：传入 w/h
        text(this.dialogDisplayed, tx, ty, tw, th);

        pop();

        // timer finished -> close
        if (this.dialogTimer <= 0) {
            this.dialogActive = false;
        }
    }

    /**
     * Draws all walkable zones and interaction hotspots with colour-coded overlays.
     * Disabled by default; uncomment the call in display() to activate.
     */
    drawDebugBoundaries() {
        push();

        // Main walkable area (green)
        stroke(0, 255, 0, 150); strokeWeight(2); noFill(); rectMode(CORNERS);
        rect(this.walkableArea.minX, this.walkableArea.minY, this.walkableArea.maxX, this.walkableArea.maxY);
        fill(0, 255, 0); noStroke(); textSize(12);
        text("MAIN AREA", (this.walkableArea.minX + this.walkableArea.maxX) / 2, this.walkableArea.minY - 10);

        // Carpet area (blue)
        stroke(0, 200, 255, 150); strokeWeight(2); noFill();
        rect(this.carpetArea.minX, this.carpetArea.minY, this.carpetArea.maxX, this.carpetArea.maxY);
        fill(0, 200, 255); noStroke();
        text("CARPET", (this.carpetArea.minX + this.carpetArea.maxX) / 2, (this.carpetArea.minY + this.carpetArea.maxY) / 2);

        // Spawn point (magenta)
        fill(255, 0, 255);
        circle(this.playerSpawnX, this.playerSpawnY, 12);
        text("SPAWN", this.playerSpawnX + 15, this.playerSpawnY);

        // Interaction zones
        stroke(255, 215, 0, 150); strokeWeight(2); noFill(); rectMode(CENTER);
        rect(this.deskX, this.deskY, this.deskBoxW, this.deskBoxH);
        stroke(100, 200, 255, 150);
        rect(this.doorX, this.doorY, this.doorBoxW, this.doorBoxH);

        pop();
    }
}