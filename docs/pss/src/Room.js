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

        // Reusable dialogue box (typewriter-style bottom bar)
        this.dialogueBox = new DialogueBox();

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
        this.dialogueBox.reset();
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
            // Tutorial gate: door is locked until the backpack phase is fully done
            if (typeof tutorialHints !== 'undefined' &&
                tutorialHints.roomPhase !== 'DOOR' &&
                tutorialHints.roomPhase !== 'DONE') {
                this.triggerDialog("I should finish getting ready first.");
                return;
            }
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
            gameState.setState(STATE_DAY_RUN);
            if (typeof playSFX !== 'undefined' && typeof sfxClick !== 'undefined') {
                playSFX(sfxClick);
            }
        }
    }

    /**
     * Triggers the dialogue box with the given text using the default player portrait.
     * To use a different portrait, call this.dialogueBox.trigger(text, portraitImg) directly.
     * @param {string} text - The message to display.
     */
    triggerDialog(text) {
        this.dialogueBox.trigger(text);
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

        // 3. Interaction indicators, tutorial hints, and UI — hidden during cutscenes
        //    (the room background is reused as a backdrop; the cutscene owns the screen)
        let _inCutscene = (typeof gameState !== 'undefined' &&
                           typeof STATE_CUTSCENE !== 'undefined' &&
                           gameState.currentState === STATE_CUTSCENE);

        if (!_inCutscene) {
            this.checkInteraction();

            // Dismiss the movement tutorial once the player has walked 50px from spawn
            if (typeof tutorialHints !== 'undefined' && tutorialHints.roomPhase === 'MOVE' &&
                typeof player !== 'undefined') {
                let dx = player.x - this.playerSpawnX;
                let dy = player.y - this.playerSpawnY;
                if (dx * dx + dy * dy > 50 * 50) {
                    tutorialHints.roomPhase = 'DESK';
                    tutorialHints.moveTutorialDone = true;
                }
            }

            this.drawInteractionIndicators();

            // 4. Door-blocked dialogue box
            this.dialogueBox.display();
            this.drawTutorialHints();

            // 5. Back button
            this.backButton.isFocused = this.backButton.checkMouse(mouseX, mouseY);
            this.backButton.update();
            this.backButton.display();
        }

        // 6. Developer overlay
        this.drawRoomDevTools();

        pop();
    }

    /**
     * Handles room-specific mouse clicks.
     * @returns {boolean} True if the click was consumed.
     */
    handleMousePressed(mx, my) {
        // ── UI intro: click anywhere (except the pause button) to advance pages ──
        if (typeof tutorialHints !== 'undefined' &&
            tutorialHints.roomPhase === 'UI_INTRO') {
            // Let pause-button clicks pass through
            if (dist(mx, my, width - 65, 65) >= 80) {
                if (typeof playSFX === 'function') playSFX(sfxClick);
                if (tutorialHints.uiIntroStep === 0) {
                    tutorialHints.uiIntroStep = 1;
                } else {
                    tutorialHints.uiTutorialDone = true;
                    tutorialHints.uiIntroStep    = 0;
                    tutorialHints.roomPhase      = tutorialHints.moveTutorialDone ? 'DESK' : 'MOVE';
                }
                return true;
            }
        }

        if (this.backButton.checkMouse(mx, my)) {
            this.backButton.handleClick();
            return true;
        }
        return false;
    }

    /**
     * Draws interaction indicators.
     * Yellow outline box: always visible when the tutorial phase matches (synced with ! icon).
     * Prompt text + key icon: only when the player is close enough to interact.

     */
    drawInteractionIndicators() {
        let phase = (typeof tutorialHints !== 'undefined') ? tutorialHints.roomPhase : 'DONE';

        let showDeskBox = this.isPlayerNearDesk || (phase === 'DESK');
        // Door is only interactive once the tutorial reaches the DOOR or DONE phase
        let doorUnlocked = (phase === 'DOOR' || phase === 'DONE');
        let showDoorBox = doorUnlocked && (this.isPlayerNearDoor || (phase === 'DOOR'));
        if (!showDeskBox && !showDoorBox) return;

        push();

        let roomTopY = (this._roomTopY !== null) ? this._roomTopY : 100;
        let pulse = (sin(frameCount * 0.1) + 1) * 0.5;

        // ── Outline box: tracks the tutorial's current phase target ──
        // Drawn regardless of player proximity so the tutorial goal is always visible.
        let boxTarget;
        if (phase === 'DOOR') {
            boxTarget = { x: this.doorX, y: this.doorY, w: this.doorBoxW, h: this.doorBoxH };
        } else if (showDeskBox) {
            boxTarget = { x: this.deskX, y: this.deskY, w: this.deskBoxW, h: this.deskBoxH };
        } else {
            boxTarget = { x: this.doorX, y: this.doorY, w: this.doorBoxW, h: this.doorBoxH };
        }
        noFill();
        stroke(255, 216, 0, 150 + pulse * 105);
        strokeWeight(2);
        rectMode(CENTER);
        rect(boxTarget.x, boxTarget.y, boxTarget.w, boxTarget.h, 8);

        // ── Proximity prompt: tracks what the player is actually near ──
        // Door takes priority over desk so the correct prompt always shows.
        let promptTarget = null;
        if (doorUnlocked && this.isPlayerNearDoor) {
            promptTarget = { label: "LEAVE ROOM", key: 'enter' };
        } else if (this.isPlayerNearDesk) {
            promptTarget = { label: "CHECK DESK", key: 'e' };
        }

        if (promptTarget) {
            textAlign(CENTER, CENTER);
            textFont(fonts.title);
            textSize(22);
            fill(255, 216, 0, 180 + pulse * 75);
            noStroke();
            text(`PRESS [${promptTarget.key.toUpperCase()}] TO ${promptTarget.label}`, width / 2, roomTopY);

            if (assets.keys && assets.keys[promptTarget.key]) {
                let sheet = assets.keys[promptTarget.key];
                let frame = floor(frameCount / 15) % 3;
                let sw    = sheet.width / 3;
                imageMode(CENTER);
                tint(255, 200 + pulse * 55);
                image(sheet, width / 2, roomTopY - 60, 50, 40, frame * sw, 0, sw, sheet.height);
                noTint();
            }
        }

        pop();
    }

    /**
     * Draws the warning icon alongside the interactable object.
     * Always visible when the tutorial phase matches — not proximity-gated.
     * Pulses at the same frequency as the yellow outline box so they flash in sync.
     */
    drawTutorialHints() {
        if (typeof tutorialHints === 'undefined') return;
        let phase = tutorialHints.roomPhase;

        if (phase === 'UI_INTRO') {
            this.drawUIIntroTutorial();
            return;
        }

        if (phase === 'MOVE') {
            this.drawMoveTutorial();
            return;
        }

        if (!assets.warningImg) return;
        if (phase !== 'DESK' && phase !== 'DOOR') return;

        // Same pulse as the yellow box in drawInteractionIndicators()
        let pulse   = (sin(frameCount * 0.1) + 1) * 0.5;
        let breathe = 0.85 + pulse * 0.15;
        let size    = 52;
        let img     = assets.warningImg;
        let renderW = size * (img.width / img.height) * breathe;
        let renderH = size * breathe;

        push();
        imageMode(CENTER);
        if (phase === 'DESK') {
            image(img, this.deskX + 55, this.deskY - 45, renderW, renderH);
        } else {
            image(img, this.doorX + 35, this.doorY - 55, renderW, renderH);
        }
        pop();
    }

    /**
     * Draws the UI intro tutorial overlay (phase 'UI_INTRO').
     * Phase chain: UI_INTRO → MOVE → DESK → CLOSE_BP → DOOR → DONE
     *
     * Renders:
     *  • Pulsing glow rings + pointing arrow toward the pause button (top-right)
     *  • Bottom bar with player portrait, step-message text, step dots, and SPACE prompt
     *
     * Player movement is blocked externally (sketch.js draw loop) while this phase is active.
     * Advance by pressing SPACE/ENTER or clicking anywhere (except the back button).
     */
    drawUIIntroTutorial() {
        if (typeof tutorialHints === 'undefined') return;

        let step = tutorialHints.uiIntroStep;

        // ── Breathing yellow outline frame around the pause button ──
        push();
        let bx     = width - 65;
        let by     = 65;
        let breathe = sin(frameCount * 0.05);
        let frameS  = 105 + breathe * 8;
        noFill();
        stroke(255, 215, 0, 130 + breathe * 70);
        strokeWeight(4);
        rectMode(CENTER);
        rect(bx, by, frameS, frameS, 10);
        pop();

        // ── VN-style tutorial panel (橙光 visual novel format) ──
        const DESIGN_W = 1920;
        const DESIGN_H = 1080;
        const s = min(width / DESIGN_W, height / DESIGN_H);

        const panelW = 1440 * s;
        const panelH = 280  * s;
        const panelX = width  / 2;
        const panelY = height - (panelH / 2) - (30 * s);

        push();
        rectMode(CENTER);

        // Panel shadow
        noStroke();
        fill(0, 0, 0, 80);
        rect(panelX + 4 * s, panelY + 6 * s, panelW, panelH, 18 * s);

        // Panel background
        fill(18, 8, 42, 220);
        rect(panelX, panelY, panelW, panelH, 18 * s);

        // Gold outer border
        noFill();
        stroke(255, 200, 60, 180);
        strokeWeight(2.5);
        rect(panelX, panelY, panelW, panelH, 18 * s);

        // Inner border (decorative inset)
        stroke(255, 200, 60, 60);
        strokeWeight(1);
        rect(panelX, panelY, panelW - 14 * s, panelH - 14 * s, 13 * s);

        // ── Page indicator (1/2 · 2/2) ──
        if (typeof fonts !== 'undefined' && fonts.body) textFont(fonts.body);
        textSize(22 * s);
        textAlign(RIGHT, TOP);
        noStroke();
        fill(255, 200, 80, 170);
        text((step + 1) + " / 2",
            panelX + panelW / 2 - 26 * s,
            panelY - panelH / 2 + 16 * s);

        // ── Main text (line-by-line to guarantee text stays inside the panel) ──
        textSize(28 * s);
        fill(235, 230, 255);
        noStroke();
        textAlign(LEFT, TOP);

        const MSGS = [
            [
                "There's a PAUSE button in the top-right corner of the screen.",
                "Click it — or press [P] on your keyboard — anytime during gameplay."
            ],
            [
                "From the pause menu you can access:",
                "HELP — Controls guide, character wiki & item list",
                "SETTINGS — BGM and sound effects volume",
                "STORY — Day recap and narrative journal",
                "EXIT — Return to the main menu"
            ]
        ];

        const lineH = 42 * s;
        let tx = panelX - panelW / 2 + 50 * s;
        let ty = panelY - panelH / 2 + 30 * s;
        let maxY = panelY + panelH / 2 - 30 * s;   // keep above the hint text
        let lines = MSGS[step];
        for (let i = 0; i < lines.length; i++) {
            let lineY = ty + i * lineH;
            if (lineY + lineH > maxY) break;        // safety: stop before overflow
            text(lines[i], tx, lineY);
        }

        // ── "Click to continue" indicator ──
        let pulse = (sin(frameCount * 0.1) + 1) * 0.5;
        textSize(21 * s);
        fill(255, 215, 0, 130 + pulse * 125);
        textAlign(RIGHT, BOTTOM);
        let hint = (step === 0) ? "click anywhere to continue" : "click anywhere to start";
        text(hint,
            panelX + panelW / 2 - 26 * s,
            panelY + panelH / 2 - 14 * s);

        pop();
    }

    /**
     * Draws the bottom-bar movement key guide shown on Day 1 (first entry only).
     * Dismissed automatically when the player moves 50 px from spawn.
     */
    drawMoveTutorial() {
        const DESIGN_W = 1920;
        const DESIGN_H = 1080;
        const s = min(width / DESIGN_W, height / DESIGN_H);

        const panelW = 1440 * s;
        const panelH = 280  * s;
        const panelX = width  / 2;
        const panelY = height - (panelH / 2) - (30 * s);

        let pulse    = (sin(frameCount * 0.08) + 1) * 0.5;
        let keyAlpha = 180 + pulse * 75;

        push();
        rectMode(CENTER);

        // Panel shadow
        noStroke();
        fill(0, 0, 0, 80);
        rect(panelX + 4 * s, panelY + 6 * s, panelW, panelH, 18 * s);

        // Panel background
        fill(18, 8, 42, 220);
        rect(panelX, panelY, panelW, panelH, 18 * s);

        // Gold outer border
        noFill();
        stroke(255, 200, 60, 180);
        strokeWeight(2.5);
        rect(panelX, panelY, panelW, panelH, 18 * s);

        // Inner border (decorative inset)
        stroke(255, 200, 60, 60);
        strokeWeight(1);
        rect(panelX, panelY, panelW - 14 * s, panelH - 14 * s, 13 * s);

        // ── Keys rendered at their natural aspect ratio ──
        let targetH = 75 * s;

        let drawKey = (sheet, x, y) => {
            if (!sheet) return;
            let frame   = floor(frameCount / 20) % 3;
            let sw      = sheet.width / 3;
            let sh      = sheet.height;
            let renderH = targetH;
            let renderW = (sw / sh) * renderH;
            imageMode(CENTER);
            tint(255, keyAlpha);
            image(sheet, x, y, renderW, renderH, frame * sw, 0, sw, sh);
            noTint();
        };

        let refSheet   = assets.keys.w;
        let keyRenderW = refSheet ? (refSheet.width / 3 / refSheet.height) * targetH : targetH * 1.1;
        let colGap = keyRenderW + 12 * s;
        let rowOff = targetH + 12 * s;

        let keyCY   = panelY + 14 * s;
        let topRowY = keyCY - rowOff / 2;
        let botRowY = keyCY + rowOff / 2;

        // ── WASD group (left of panel centre) ──
        let wasdX = panelX - 380 * s;
        drawKey(assets.keys.w, wasdX,           topRowY);
        drawKey(assets.keys.a, wasdX - colGap,  botRowY);
        drawKey(assets.keys.s, wasdX,           botRowY);
        drawKey(assets.keys.d, wasdX + colGap,  botRowY);

        // ── Arrow keys group (right of panel centre) ──
        let arrX = panelX + 380 * s;
        drawKey(assets.keys.up,    arrX,           topRowY);
        drawKey(assets.keys.left,  arrX - colGap,  botRowY);
        drawKey(assets.keys.down,  arrX,           botRowY);
        drawKey(assets.keys.right, arrX + colGap,  botRowY);

        // ── Labels ──
        textAlign(CENTER, CENTER);
        textFont(fonts.body);

        let labelY = panelY - panelH / 2 + 36 * s;
        textSize(28 * s);
        stroke(0, 0, 0, 160);
        strokeWeight(4);
        fill(255, 220, 80, keyAlpha);
        text("USE WASD OR ARROW KEYS TO MOVE", panelX, labelY);
        noStroke();
        fill(255, 220, 80, keyAlpha);
        text("USE WASD OR ARROW KEYS TO MOVE", panelX, labelY);

        textSize(20 * s);
        fill(200, 175, 255, keyAlpha * 0.75);
        text("MOVE TO DISMISS", panelX, panelY + panelH / 2 - 20 * s);

        pop();
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