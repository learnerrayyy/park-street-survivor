// Park Street Survivor - Player Entity & HUD
// Responsibilities: Player physics, survival metrics, animation, and real-time HUD rendering.

class Player {

    // ─── INITIALISATION ──────────────────────────────────────────────────────

    /**
     * Sets default survival metrics and establishes world-space movement constraints.
     */
    constructor() {
        this.resetStatsToDefault();
        this.distanceRun = 0;
        this.playTimeFrames = 0;
        this.carHitCount = 0;

        // Sprite dimensions (flat pixel aesthetic)
        this.width = 160;
        this.height = 160;
        this.hitboxW = 60;

        // Walkable X range: left sidewalk (500) to right sidewalk (1420)
        this.minX = 500 + this.width / 2;
        this.maxX = 1420 - this.width / 2;

        // Fixed run lanes (ordered by lane1..lane4)
        this.runLaneCenters = [
            GLOBAL_CONFIG.lanes.lane1,
            GLOBAL_CONFIG.lanes.lane2,
            GLOBAL_CONFIG.lanes.lane3,
            GLOBAL_CONFIG.lanes.lane4
        ];
        this.currentLaneIndex = 0;
        this.targetLaneIndex = 0;
        this.laneVelocityX = 0;
        this.laneSpringK = 0.22;//Adsorption strength
        this.laneSpringDamping = 0.50;//The smaller the value, the faster it stops.
        this.leftHeld = false;
        this.rightHeld = false;

        // Default spawn position for the day run scene
        this.x = this.runLaneCenters[this.currentLaneIndex];
        this.y = PLAYER_RUN_FOOT_Y;

        // Walking animation state
        this.dir        = 'south';
        this.animFrame  = 0;
        this.isWalking  = false;
        this.animSpeed  = 0.18;
        this.runAnimSpeed = 0.28;

        // Status effects
        this.stunFramesRemaining = 0;
        this.laneDelayFramesRemaining = 0;
        this.speedBoostFramesRemaining = 0;
        this.invincibleFramesRemaining = 0;
        this.hpLockFramesRemaining = 0;
        this.hpLockValue = 0;
        this.activeSpeedMultiplier = 1;
        this.baseRunScrollSpeed = null;
        this.wasSpeedBoostActive = false;

        // ── PERFORMANCE: Clock display cache ──
        this._clockStr     = "08:30:00";
        this._clockRed     = false;
        this._lastClockSec = -1;
    }

    /**
     * Restores the entity to the baseline values defined in PLAYER_DEFAULTS.
     */
    resetStatsToDefault() {
        this.health = PLAYER_DEFAULTS.baseHealth;
        this.maxHealth = PLAYER_DEFAULTS.baseHealth;
        this.healthDecay = PLAYER_DEFAULTS.healthDecay;
        this.baseSpeed = PLAYER_DEFAULTS.baseSpeed;
    }

    /**
     * Resets session-specific tracking (distance and time) for a new level attempt.
     */
    applyLevelStats(dayID) {
        this.resetStatsToDefault();
        this.distanceRun = 0;
        this.playTimeFrames = 0;
        this.carHitCount = 0;
        this.currentLaneIndex = 0;
        this.targetLaneIndex = 0;
        this.laneVelocityX = 0;
        this.x = this.runLaneCenters[this.currentLaneIndex];
        this.stunFramesRemaining = 0;
        this.laneDelayFramesRemaining = 0;
        this.speedBoostFramesRemaining = 0;
        this.invincibleFramesRemaining = 0;
        this.hpLockFramesRemaining = 0;
        this.hpLockValue = 0;
        this.activeSpeedMultiplier = 1;
        this.baseRunScrollSpeed = null;
        this.wasSpeedBoostActive = false;
        // In DAY_RUN, default forward-running view should be back-facing.
        this.dir = 'north';
    }

    // ─── CORE UPDATE ─────────────────────────────────────────────────────────

    /**
     * Primary update loop: routes movement logic and evaluates all survival conditions.
     */
    update() {
        if (gameState.currentState === STATE_ROOM) {
            this.handleRoomMovement();
        } else if (gameState.currentState === STATE_DAY_RUN) {
            // Respect the level phase from LevelController
            const levelPhase = levelController ? levelController.getLevelPhase() : "RUNNING";

            // Player movement and health decay only in RUNNING phase
            if (levelPhase === "RUNNING") {
                this.handleRunMovement();
                this.applyRunScrollSpeed();

                // Track distance
                this.distanceRun += 0.5;

                // Fail condition 1: stamina exhaustion
                if (this.hpLockFramesRemaining > 0) {
                    this.health = this.hpLockValue;
                } else if (this.health > 0) {
                    this.health -= this.healthDecay;
                } else {
                    this.triggerGameOver("EXHAUSTED");
                }
            }
            // In VICTORY_TRANSITION and VICTORY_ZONE: player stops moving

            this.playTimeFrames++;

            // Fail condition 2: time limit exceeded (08:30 → 09:00 = 1800s = 108,000 frames at 60 FPS)
            if (this.playTimeFrames > 108000) {
                this.triggerGameOver("LATE");
            }

            // Win condition: distance goal reached → trigger victory phase
            let targetDist = DAYS_CONFIG[currentDayID].totalDistance;
            if (this.distanceRun >= targetDist && this.health > 0) {
                if (levelController && levelController.getLevelPhase() === "RUNNING") {
                    levelController.triggerVictoryPhase();
                }
            }
        }

        // Day run should always look like forward running; room keeps walk/idle behavior.
        const inRunScene = gameState.currentState === STATE_DAY_RUN;
        const shouldAnimate = inRunScene || this.isWalking;
        const frameSpeed = inRunScene ? this.runAnimSpeed : this.animSpeed;

        if (shouldAnimate) this.animFrame += frameSpeed;
        else this.animFrame = 0;

        // Countdown status effects.
        if (this.stunFramesRemaining > 0) this.stunFramesRemaining--;
        else if (this.laneDelayFramesRemaining > 0) this.laneDelayFramesRemaining--;
        if (this.speedBoostFramesRemaining > 0) this.speedBoostFramesRemaining--;
        if (this.invincibleFramesRemaining > 0) this.invincibleFramesRemaining--;
        if (this.hpLockFramesRemaining > 0) this.hpLockFramesRemaining--;
    }

    // ─── MOVEMENT ────────────────────────────────────────────────────────────

    /**
     * 4-directional movement for the bedroom scene, with collision detection via RoomScene.
     */
    handleRoomMovement() {
        let s = 12; // was 8 — increased for snappier room navigation
        let oldX = this.x;
        let oldY = this.y;
        let moveX = 0;
        let moveY = 0;

        if (keyIsDown(87) || keyIsDown(UP_ARROW)) { moveY -= s; this.dir = 'north'; }
        else if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) { moveY += s; this.dir = 'south'; }
        if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) { moveX -= s; this.dir = 'west'; }
        else if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { moveX += s; this.dir = 'east'; }

        this.isWalking = (moveX !== 0 || moveY !== 0);

        let newX = oldX + moveX;
        let newY = oldY + moveY;

        if (typeof roomScene !== 'undefined' && roomScene.getValidPosition) {
            let validPos = roomScene.getValidPosition(newX, newY, oldX, oldY);
            this.x = validPos.x;
            this.y = validPos.y;
        } else {
            // Fallback: simple screen-boundary clamp
            this.x = constrain(newX, 50, width - 50);
            this.y = constrain(newY, 50, height - 50);
        }
    }

    /**
     * Horizontal-only movement for lane switching during the run scene.
     */
    handleRunMovement() {
        // Stage 1: hard stun (no lane input or movement response)
        if (this.stunFramesRemaining > 0) {
            this.leftHeld = false;
            this.rightHeld = false;
            this.isWalking = true;
            this.dir = 'north';
            return;
        }

        const leftDown = keyIsDown(65) || keyIsDown(LEFT_ARROW);
        const rightDown = keyIsDown(68) || keyIsDown(RIGHT_ARROW);
        const laneChangeLocked = this.laneDelayFramesRemaining > 0;

        // Rising-edge input: one lane change per key press.
        if (!laneChangeLocked && leftDown && !this.leftHeld) {
            this.targetLaneIndex = max(0, this.targetLaneIndex - 1);
            this.dir = 'west';
        }
        if (!laneChangeLocked && rightDown && !this.rightHeld) {
            this.targetLaneIndex = min(this.runLaneCenters.length - 1, this.targetLaneIndex + 1);
            this.dir = 'east';
        }
        this.leftHeld = leftDown;
        this.rightHeld = rightDown;

        // Non-linear magnetic snap to lane center (spring + damping).
        const targetX = this.runLaneCenters[this.targetLaneIndex];
        const distX = targetX - this.x;
        this.laneVelocityX += distX * this.laneSpringK;
        this.laneVelocityX *= this.laneSpringDamping;
        this.x += this.laneVelocityX;

        if (abs(distX) < 0.6 && abs(this.laneVelocityX) < 0.6) {
            this.x = targetX;
            this.laneVelocityX = 0;
            this.currentLaneIndex = this.targetLaneIndex;
        }

        // Keep final position inside playable width.
        this.x = constrain(this.x, this.minX, this.maxX);

        // Return to forward-running (back-facing) pose after lane switching settles.
        if (!leftDown && !rightDown && abs(this.laneVelocityX) <= 0.2 && this.currentLaneIndex === this.targetLaneIndex) {
            this.dir = 'north';
        }

        // Keep this true so run scene continuously plays movement frames.
        this.isWalking = true;
    }

    // ─── RENDERING ───────────────────────────────────────────────────────────

    /**
     * Draws the player sprite (walk cycle or idle) and the HUD during a run.
     */
    display() {
        let animSet = assets.playerAnim[this.dir];

        if (animSet) {
            imageMode(CENTER);
            let imgToDraw;

            const shouldUseWalkFrames = this.isWalking || gameState.currentState === STATE_DAY_RUN;
            if (shouldUseWalkFrames && animSet.walk.length > 0) {
                let index = floor(this.animFrame) % animSet.walk.length;
                imgToDraw = animSet.walk[index];
            } else {
                imgToDraw = animSet.idle;
            }

            if (imgToDraw) {
                let visualPadding = 35;
                let drawY = this.y - (this.height / 2) + visualPadding;
                image(imgToDraw, this.x, drawY, this.width, this.height);

                if (developerMode) {
                    // Red dot marks the active collision point (foot level)
                    fill(255, 0, 0);
                    noStroke();
                    circle(this.x, this.y, 8);
                }
            }
        }

        if (gameState.currentState === STATE_DAY_RUN) {
            this.drawTopBar();
            this.drawSpeedBoostBanner();
        }


    }

    // ─── HUD ─────────────────────────────────────────────────────────────────

    /**
     * Draws the top navigation bar containing the clock, energy bar, and progress bar.
     */
    drawTopBar() {
        push();
        /*fill(56, 39, 96);
        noStroke();
        rect(0, 0, width, 170);*/

        this.drawHealthBar(165, 65);
        this.drawBackpackIcon(98, 85);
        
        const leftMargin = 70;
        const topBarH = 170;
        this.drawProgressBar(leftMargin, topBarH + 100);

        pop();
    }

    /**
     * Translates elapsed frames into a digital clock display starting at 08:30:00.
     */
    drawClock(x, y) {
        // Rebuild the formatted string only when the displayed second changes
        let currentSec = Math.floor(this.playTimeFrames / 60);
        if (currentSec !== this._lastClockSec) {
            this._lastClockSec = currentSec;
            const START = 8.5 * 3600; // 08:30:00 in seconds
            let total = START + currentSec;
            let hh = Math.floor(total / 3600);
            let mm = Math.floor((total % 3600) / 60);
            let ss = Math.floor(total % 60);
            this._clockStr = (hh < 10 ? '0' : '') + hh + ':' +
                             (mm < 10 ? '0' : '') + mm + ':' +
                             (ss < 10 ? '0' : '') + ss;
            this._clockRed = (hh >= 9);
        }

        textAlign(CENTER, CENTER);
        textSize(44);
        textStyle(BOLD);
        fill(this._clockRed ? color(255, 50, 50) : color(255, 215, 0));
        text(this._clockStr, x, y);
        textSize(12);
        fill(150);
        textStyle(NORMAL);
        text("BRISTOL TIME", x, y + 32);
    }

    /**
     * Renders the energy bar with a green fill that depletes as stamina drops.
     */
    drawHealthBar(x, y) {
        textAlign(CENTER, CENTER);
        fill(255);
        textSize(32);
        textStyle(BOLD);
        // Centred above the bar, clear of the backpack icon on the left
        text("ENERGY", x + 200, y - 22);

        fill(50);
        stroke(0);
        strokeWeight(5);
        rect(x, y, 400, 50, 4);

        let pct = constrain(this.health / this.maxHealth, 0, 1);
        fill(0, 255, 100);
        rect(x + 2, y + 2, (400 - 4) * pct, 45, 3);
    }

    /**
     * Backpack HUD: circular base plate + overlay item icon (slightly larger than plate)
     * - plate: white fill + black stroke (static)
     * - icon: backpack.png by default; if buff item carried, show item.icon
     * Returns layout metrics so caller can place the health bar tightly beside it.
     */
    drawBackpackIcon(x, y) {
        // --- layout ---
        const plateD = 136;          // Base plate diameter
        const iconD  = 188;          // Icon slightly larger(visual appeal).

        // --- draw base plate ---
        push();
        ellipseMode(CENTER);
        stroke(0);
        strokeWeight(5);
        fill(255);
        circle(x, y, plateD);

        // --- decide what to show ---
        // 需要把这里的“拿当前携带道具”的逻辑替换成真实的接口/字段
        let heldItem = null;
        if (typeof inventorySystem !== "undefined" && inventorySystem.getHeldItem) {
            heldItem = inventorySystem.getHeldItem();
        } else if (gameState && gameState.heldItem) {
            heldItem = gameState.heldItem;
        }

        // 默认显示基础背包图
        let iconImg = assets.backpackImg;

        // 如果携带了 buff 道具且有图标，则显示该道具图
        // （type/isBuff 字段按实际数据结构改）
       if (heldItem && (heldItem.type === "BUFF" || heldItem.isBuff === true) && heldItem.icon) {
            iconImg = heldItem.icon;
        }

        // --- draw icon (slightly larger than plate) ---
        if (iconImg) {
            push();
            imageMode(CENTER);
            translate(x, y);
            rotate(radians(-20));
            image(iconImg, 0, -8, iconD, iconD);
            pop();
        } else {
            // Placeholder (to avoid blank spaces)
            noStroke();
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(32);
            text("NO ICON", x, y);
        }

        pop();
    }
   
    /**
     * Renders the distance progress bar mapped against the level's total distance target.
     */
    drawProgressBar(x, y) {
        const barWidth = 70;
        const barHeight = 500;
        const padding = 4;

        fill(255);
        stroke(0);
        strokeWeight(5);
        rect(x, y, barWidth, barHeight, padding);

        let total = DAYS_CONFIG[currentDayID].totalDistance;
        let pct   = constrain(this.distanceRun / total, 0, 1);

        fill(255, 212, 104);
        let innerMaxH = barHeight - padding; // Maximum internal height
        let currentH = innerMaxH * pct;      // Current progress height
        rect(x + 2, y + barHeight - 2, barWidth - 4, -currentH, 3);
    }

    drawSpeedBoostBanner() {
        if (this.speedBoostFramesRemaining <= 0) return;

        push();
        textAlign(CENTER, CENTER);
        textSize(48);
        textStyle(BOLD);
        fill(255, 230, 80, 235);
        stroke(30, 30, 30, 160);
        strokeWeight(4);
        text("SPEED UP", width / 2, height * 0.38);
        pop();
    }

    applyRunScrollSpeed() {
        if (this.baseRunScrollSpeed === null) {
            this.baseRunScrollSpeed = GLOBAL_CONFIG.scrollSpeed;
        }

        if (this.speedBoostFramesRemaining > 0) {
            GLOBAL_CONFIG.scrollSpeed = this.baseRunScrollSpeed * this.activeSpeedMultiplier;
            this.wasSpeedBoostActive = true;
        } else if (this.wasSpeedBoostActive) {
            GLOBAL_CONFIG.scrollSpeed = this.baseRunScrollSpeed;
            this.wasSpeedBoostActive = false;
        }
    }

    drawSpeedBoostBanner() {
        if (this.speedBoostFramesRemaining <= 0) return;

        push();
        textAlign(CENTER, CENTER);
        textSize(48);
        textStyle(BOLD);
        fill(255, 230, 80, 235);
        stroke(30, 30, 30, 160);
        strokeWeight(4);
        text("SPEED UP", width / 2, height * 0.38);
        pop();
    }

    applyRunScrollSpeed() {
        if (this.baseRunScrollSpeed === null) {
            this.baseRunScrollSpeed = GLOBAL_CONFIG.scrollSpeed;
        }

        if (this.speedBoostFramesRemaining > 0) {
            GLOBAL_CONFIG.scrollSpeed = this.baseRunScrollSpeed * this.activeSpeedMultiplier;
            this.wasSpeedBoostActive = true;
        } else if (this.wasSpeedBoostActive) {
            GLOBAL_CONFIG.scrollSpeed = this.baseRunScrollSpeed;
            this.wasSpeedBoostActive = false;
        }
    }

    // ─── GAME STATE ──────────────────────────────────────────────────────────

    /**
     * Deducts health from a collision impact; triggers an instant fail on BUS hits.
     */
    takeDamage(damage, type) {
        if (this.isInvincibleActive()) return;
        this.health -= damage;
        if (damage > 0) this.carHitCount++;
        if (type === "BUS") {
            this.triggerGameOver("HIT_BUS");
        }
    }

    /**
     * Applies Scooter Rider crowd-control sequence:
     * 0.5s stun -> 1.0s lane-change delay. Camera shake remains TODO.
     */
    applyScooterRiderHit(stunSeconds, laneDelaySeconds) {
        const fps = 60;
        this.stunFramesRemaining = max(this.stunFramesRemaining, floor(stunSeconds * fps));
        this.laneDelayFramesRemaining = max(this.laneDelayFramesRemaining, floor(laneDelaySeconds * fps));
        this.targetLaneIndex = this.currentLaneIndex;
        this.laneVelocityX = 0;
        // TODO: Camera shake hook point.
    }

    /**
     * Homeless crowd-control:
     * - Hit from L1 homeless -> snap to L3 edge, then bounce to L3 center
     * - Hit from L4 homeless -> snap to L2 edge, then bounce to L2 center
     */
    applyHomelessForcedLaneSwitch(sourceLane) {
        let targetLaneIndex = this.targetLaneIndex;
        if (sourceLane === 1) targetLaneIndex = 2;      // L3 (0-based index)
        else if (sourceLane === 4) targetLaneIndex = 1; // L2
        else {
            // Fallback: toward center side lane.
            targetLaneIndex = (this.currentLaneIndex <= 1) ? 2 : 1;
        }
        this.targetLaneIndex = targetLaneIndex;

        const lane2Center = this.runLaneCenters[1];
        const lane3Center = this.runLaneCenters[2];
        const centerDividerX = (lane2Center + lane3Center) / 2;
        const targetCenterX = this.runLaneCenters[targetLaneIndex];

        // Place player at target-lane edge near the center divider.
        let edgeX = centerDividerX;
        if (targetLaneIndex === 2) edgeX -= 8; // L3 left edge bias
        if (targetLaneIndex === 1) edgeX += 8; // L2 right edge bias

        this.x = constrain(edgeX, this.minX, this.maxX);

        // Elastic feel: strong initial velocity from edge toward lane center.
        const toCenterDir = targetCenterX >= this.x ? 1 : -1;
        this.laneVelocityX = toCenterDir * 30;

        // Small lock so player input doesn't cancel the bounce animation immediately.
        this.laneDelayFramesRemaining = max(this.laneDelayFramesRemaining, floor(0.32 * 60));
        this.leftHeld = false;
        this.rightHeld = false;
    }

    applyEmptyScooterBuff(speedBoostSeconds, invincibleSeconds, speedMultiplier) {
        const fps = 60;
        this.speedBoostFramesRemaining = max(this.speedBoostFramesRemaining, floor(speedBoostSeconds * fps));
        this.invincibleFramesRemaining = max(this.invincibleFramesRemaining, floor(invincibleSeconds * fps));
        this.activeSpeedMultiplier = speedMultiplier || 1.2;
    }

    applyCoffeeBuff(healAmount, overflowEffect, hpLockDurationSec) {
        const prevHealth = this.health;
        this.health = min(this.maxHealth, this.health + (healAmount || 0));

        const hasOverflow = (prevHealth + (healAmount || 0)) > this.maxHealth;
        if (hasOverflow && overflowEffect === "hpLock") {
            const fps = 60;
            this.hpLockFramesRemaining = max(this.hpLockFramesRemaining, floor((hpLockDurationSec || 3.0) * fps));
            this.hpLockValue = this.health;
        }
    }

    isInvincibleActive() {
        return this.invincibleFramesRemaining > 0 || this.hpLockFramesRemaining > 0;
    }

    /**
     * Records the failure reason and transitions to the STATE_FAIL screen.
     */
    triggerGameOver(reason) {
        console.log(`[Player] Game Over Reason: ${reason}`);
        gameState.failReason = reason;
        gameState.setState(STATE_FAIL);
    }
}
