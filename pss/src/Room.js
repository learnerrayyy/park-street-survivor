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
                this.doorBlockMessage = "Pack your " + missing.join(" & ") + " before heading out!";
                this.doorBlockTimer = 180; // show for 3 seconds
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

        // 5. Developer overlay
        this.drawRoomDevTools();

        pop();
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
        if (this.doorBlockTimer <= 0) return;
        this.doorBlockTimer--;

        push();
        let alpha = min(this.doorBlockTimer * 4, 220);

        // Pill-shaped red banner centred at the bottom third of the screen
        let bx = width / 2;
        let by = height - 160;
        let bw = 820;
        let bh = 64;

        rectMode(CENTER);
        noStroke();
        fill(180, 30, 30, alpha);
        rect(bx, by, bw, bh, 12);

        // Warning text
        textAlign(CENTER, CENTER);
        textFont(fonts.body);
        textSize(22);
        fill(255, 240, 100, alpha);
        text(this.doorBlockMessage, bx, by);
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
