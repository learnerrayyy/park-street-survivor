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

        // 3. Update and draw interaction indicators
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
     * Draws interaction indicators.
     * Yellow outline box: always visible when the tutorial phase matches (synced with ! icon).
     * Prompt text + key icon: only when the player is close enough to interact.

     */
    drawInteractionIndicators() {
        let phase = (typeof tutorialHints !== 'undefined') ? tutorialHints.roomPhase : 'DONE';

        let showDeskBox = this.isPlayerNearDesk || (phase === 'DESK');
        let showDoorBox = this.isPlayerNearDoor || (phase === 'DOOR');
        if (!showDeskBox && !showDoorBox) return;

        push();

        // When the tutorial explicitly targets the door (phase === 'DOOR'), always
        // show the door yellow box — even if the player happens to also be near the desk.
        let target;
        if (phase === 'DOOR') {
            target = { label: "LEAVE ROOM", key: 'enter', x: this.doorX, y: this.doorY, w: this.doorBoxW, h: this.doorBoxH };
        } else if (showDeskBox) {
            target = { label: "CHECK DESK",  key: 'e',     x: this.deskX, y: this.deskY, w: this.deskBoxW, h: this.deskBoxH };
        } else {
            target = { label: "LEAVE ROOM", key: 'enter', x: this.doorX, y: this.doorY, w: this.doorBoxW, h: this.doorBoxH };
        }

        let roomTopY = (this._roomTopY !== null) ? this._roomTopY : 100;
        let pulse = (sin(frameCount * 0.1) + 1) * 0.5;

        // Pulsing outline box — always visible when tutorial phase or proximity active
        noFill();
        stroke(255, 216, 0, 150 + pulse * 105);
        strokeWeight(2);
        rectMode(CENTER);
        rect(target.x, target.y, target.w, target.h, 8);

        // Prompt text + key icon — only when close enough to actually interact
        let playerNear = (showDeskBox && this.isPlayerNearDesk) || (showDoorBox && this.isPlayerNearDoor);
        if (playerNear) {
            textAlign(CENTER, CENTER);
            textFont(fonts.title);
            textSize(22);
            fill(255, 216, 0, 180 + pulse * 75);
            noStroke();
            text(`PRESS [${target.key.toUpperCase()}] TO ${target.label}`, width / 2, roomTopY);

            if (assets.keys && assets.keys[target.key]) {
                let sheet = assets.keys[target.key];
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
     * Draws the bottom-bar movement key guide shown on Day 1 (first entry only).
     * Dismissed automatically when the player moves 50 px from spawn.
     */
    drawMoveTutorial() {
        let barH = 220;
        let barY = height - barH;
        let cy   = height - barH / 2;
        let pulse    = (sin(frameCount * 0.08) + 1) * 0.5;
        let keyAlpha = 180 + pulse * 75;

        push();

        // Dark purple bar
        noStroke();
        fill(25, 12, 50, 230);
        rectMode(CORNER);
        rect(0, barY, width, barH, 20);

        // Subtle top border line
        stroke(130, 80, 200, 120);
        strokeWeight(2);
        line(0, barY, width, barY);
        noStroke();

        // ── Keys rendered at their natural aspect ratio ──
        // targetH: desired display height for every key sprite
        let targetH = 85;

        // Helper: draw one animated key sprite at natural aspect ratio, centred at (x, y)
        let drawKey = (sheet, x, y) => {
            if (!sheet) return;
            let frame   = floor(frameCount / 20) % 3;
            let sw      = sheet.width / 3;          // single-frame pixel width
            let sh      = sheet.height;              // single-frame pixel height
            let renderH = targetH;
            let renderW = (sw / sh) * renderH;       // preserve original proportions
            imageMode(CENTER);
            tint(255, keyAlpha);
            image(sheet, x, y, renderW, renderH, frame * sw, 0, sw, sh);
            noTint();
        };

        // Measure key width from the first available sprite so spacing auto-scales
        let refSheet  = assets.keys.w;
        let keyRenderW = refSheet
            ? (refSheet.width / 3 / refSheet.height) * targetH
            : targetH * 1.1;
        let colGap = keyRenderW + 15;  // horizontal distance between key centres
        let rowOff = targetH + 15;     // vertical distance between the two rows

        let topRowY = cy - rowOff / 2;
        let botRowY = cy + rowOff / 2;

        // ── WASD group (left of canvas centre) ──
        let wasdX = width / 2 - 420;
        drawKey(assets.keys.w, wasdX,           topRowY);
        drawKey(assets.keys.a, wasdX - colGap,  botRowY);
        drawKey(assets.keys.s, wasdX,           botRowY);
        drawKey(assets.keys.d, wasdX + colGap,  botRowY);

        // ── Arrow keys group (right of canvas centre) ──
        let arrX = width / 2 + 420;
        drawKey(assets.keys.up,    arrX,           topRowY);
        drawKey(assets.keys.left,  arrX - colGap,  botRowY);
        drawKey(assets.keys.down,  arrX,           botRowY);
        drawKey(assets.keys.right, arrX + colGap,  botRowY);

        // ── Centre label ──
        textAlign(CENTER, CENTER);
        textFont(fonts.body);
        textSize(32);
        stroke(0, 0, 0, 160);
        strokeWeight(4);
        fill(255, 220, 80, keyAlpha);
        text("USE WASD OR ARROW KEYS TO MOVE", width / 2, cy - 65);
        noStroke();
        fill(255, 220, 80, keyAlpha);
        text("USE WASD OR ARROW KEYS TO MOVE", width / 2, cy - 65);

        textSize(22);
        fill(200, 175, 255, keyAlpha * 0.75);
        text("MOVE TO DISMISS", width / 2, cy + 22);

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