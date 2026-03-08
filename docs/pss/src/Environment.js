// Precision 2-2-2 Road System
// Responsibilities: Implementation of exact layout coordinates and smooth scrolling.

class Environment {
    /**
     * CONSTRUCTOR: INITIALIZATION
     * Establishes the spatial layout, coordinate boundaries, and the visual color palette.
     */
    constructor() {
        // Normalized scroll position to prevent floating-point jitter
        this.scrollPos = 0;

        // Background Images
        this.defaultBg = null;      // Default running background
        this.defaultBgCycle = [];   // Optional cycle for varied running backgrounds
        this.defaultBgHeadIndex = 0; // Which tile is currently the lower tile in seamless pair
        this.destinationBg = null;  // Victory zone background

        // [STRICT LAYOUT CONFIGURATION]
        // Symmetry: 500 (Scenery) | 200 (Sidewalk) | 260 (Lane) | 260 (Lane) | 200 (Sidewalk) | 500 (Scenery)
        this.layout = {
            sceneryW: 500,
            sidewalkW: 200,
            laneW: 260,
            roadStart: 700, // Calculated as 500 + 200
            roadEnd: 1220   // Calculated as 700 + (260 * 2)
        };

        // ── PERFORMANCE: Pre-compute constants used every frame ──
        this.bgHeight = 1080; // matches background image height
        this.centerX = 960;  // exact horizontal centre of the 1920px canvas

        // Flat Visual Palette (No Glow for consistent pixel aesthetic)
        this.colors = {
            scenery: color(40, 70, 40),    // Deep Grass Green
            sidewalk: color(160, 160, 165), // Concrete Grey
            road: color(45, 45, 50),       // Asphalt Dark Grey
            marking: color(255)            // Pure White
        };

        // Victory Zone Colors (Different visual appearance)
        this.victoryColors = {
            scenery: color(100, 120, 80),   // Lighter greenish
            sidewalk: color(200, 200, 200), // Lighter grey
            road: color(80, 80, 100),       // Darker blue-ish asphalt
            marking: color(255, 200, 0)     // Gold markings
        };

        // Victory text VFX state
        this.victoryFireworks = [];
        this.victoryFireworkCooldown = 0;
    }

    /**
     * ASSET LOADING: BACKGROUND IMAGES
     * Loads the default running background and victory destination background.
     */
    loadBackgrounds() {
        // These should be preloaded in sketch.js preload()
        // For now, we'll use fallback rendering if images aren't available
        console.log("[Environment] Background assets ready for rendering");
    }

    /**
     * LOGIC: MOVEMENT CALCULATION
     * Synchronizes the background scroll position with the global game speed.
     * Loops every 1080 pixels (one full background height) for seamless scrolling.
     */
    update(speed) {
        // Always update scroll position
        this.scrollPos += speed;

        // Loop the position based on background height (1080px) to maintain seamless continuity
        const bgHeight = 1080;
        const levelPhase = levelController ? levelController.getLevelPhase() : "RUNNING";

        // Only loop the scrollPos if we're still in RUNNING phase
        if (levelPhase === "RUNNING" && this.scrollPos > bgHeight) {
            this.scrollPos -= bgHeight;
            if (this.defaultBgCycle && this.defaultBgCycle.length > 0) {
                const n = this.defaultBgCycle.length;
                // The top tile becomes the next full-screen tile after wrap.
                this.defaultBgHeadIndex = ((this.defaultBgHeadIndex - 1) % n + n) % n;
            }
        }
    }

    /**
     * RENDERING: WORLD DISPLAY
     * Primary render pass that draws background images based on level phase.
     * - RUNNING: Display default background with scrolling
     * - VICTORY_TRANSITION: Transition from default to victory background
     * - VICTORY_ZONE: Display static victory background
     */
    display() {
        // Get current level phase
        const levelPhase = levelController ? levelController.getLevelPhase() : "RUNNING";
        const defaultBg = this.defaultBg;
        const destinationBg = this.destinationBg;

        imageMode(CORNER);

        if (levelPhase === "RUNNING") {
            // RUNNING: Display scrolling default background
            const bgHeight = 1080;
            const scrollY = this.scrollPos % bgHeight;
            const tileShift = Math.floor(this.scrollPos / bgHeight);
            const bgA = this.getDefaultBgByTileIndex(this.defaultBgHeadIndex - tileShift) || defaultBg;
            const bgB = this.getDefaultBgByTileIndex(this.defaultBgHeadIndex - tileShift - 1) || defaultBg;
            if (bgA && bgB) {
                // Seamless scrolling with two tiles (cycle selection does not change scroll math)
                image(bgA, 0, scrollY);
                image(bgB, 0, scrollY - bgHeight);
            } else {
                this.displayFallbackRoad(this.colors);
            }
        }
        else if (levelPhase === "VICTORY_TRANSITION") {
            // VICTORY_TRANSITION: Default continues scrolling, victory enters from top

            const bgHeight = 1080;
            const scrollY = this.scrollPos % bgHeight;
            const tileShift = Math.floor(this.scrollPos / bgHeight);
            const bgA = this.getDefaultBgByTileIndex(this.defaultBgHeadIndex - tileShift) || defaultBg;
            const bgB = this.getDefaultBgByTileIndex(this.defaultBgHeadIndex - tileShift - 1) || defaultBg;

            if (bgA && bgB) {
                // Continue scrolling the default background normally
                image(bgA, 0, scrollY);
                image(bgB, 0, scrollY - bgHeight);
            } else {
                this.displayFallbackRoad(this.colors);
            }

            if (destinationBg) {
                // Victory background enters based on how much we've scrolled since victory
                const scrolledSinceVictory = this.scrollPos - levelController.victoryStartScrollPos;
                const preRoll = Math.max(0, Number(levelController.victoryPreRollDistance) || 0);
                const destinationProgress = scrolledSinceVictory - preRoll;
                const destinationBgHeight = destinationBg.height || 1080;

                // Enter only after current run tile finishes scrolling out.
                if (destinationProgress >= 0) {
                    // Victory background position: enters from bottom as we scroll
                    const victoryEntryY = destinationProgress - destinationBgHeight;

                    // Only display single tile
                    image(destinationBg, 0, victoryEntryY);
                    this.drawVictoryCatchupText(destinationProgress, true);
                }
            }
        }
        else if (levelPhase === "VICTORY_ZONE") {
            // VICTORY_ZONE: Display static victory background at frozen position
            if (destinationBg) {
                // Use the Y position recorded when entering VICTORY_ZONE
                const bgHeight = destinationBg.height || 1080;
                const victoryY = levelController.victoryZoneStartY;

                // Display with potential tile for seamless appearance
                image(destinationBg, 0, victoryY);
                // Draw second tile if needed for full coverage
                if (victoryY < 0) {
                    image(destinationBg, 0, victoryY + bgHeight);
                }
                this.drawVictoryCatchupText(0, false);
            } else {
                this.displayFallbackRoad(this.victoryColors);
            }
        }
        else {
            // FALLBACK: Render colored rectangles if images aren't loaded
            console.warn("[Environment] Background images not loaded, using fallback colors");
            const colors = (levelPhase === "RUNNING") ? this.colors : this.victoryColors;
            this.displayFallbackRoad(colors);
        }
    }

    displayFallbackRoad(colors = this.colors) {
        noStroke();
        rectMode(CORNER);

        fill(colors.scenery);
        rect(0, 0, this.layout.sceneryW, height);
        rect(1420, 0, this.layout.sceneryW, height);

        fill(colors.sidewalk);
        rect(500, 0, this.layout.sidewalkW, height);
        rect(1220, 0, this.layout.sidewalkW, height);

        fill(colors.road);
        rect(this.layout.roadStart, 0, this.layout.laneW * 2, height);

        this.drawCenterLine(colors);
    }

    /**
     * GEOMETRY: CENTER LINE RENDERING
     * Calculates and draws the animated road markings exactly at the canvas center (X=960).
     */
    drawCenterLine(colors = this.colors) {
        push();
        stroke(colors.marking);
        strokeWeight(6);

        let centerX = 960; // Exact center of the 1920px canvas configuration
        let segment = 120; // Represents Dash (60) + Gap (60)

        // Iterate through the Y-axis using the scroll offset to create motion
        for (let y = this.scrollPos - segment; y < height; y += segment) {
            line(centerX, y, centerX, y + 60);
        }
        pop();
    }

    getDefaultBgByTileIndex(tileIndex) {
        if (!this.defaultBgCycle || this.defaultBgCycle.length === 0) return null;
        const n = this.defaultBgCycle.length;
        const idx = ((tileIndex % n) + n) % n;
        return this.defaultBgCycle[idx];
    }

    drawVictoryCatchupText(destinationProgress, isMoving) {
        const message = "you caught up!";
        const startY = height + 120;
        const settleY = 150;
        const transitionDistance = (this.destinationBg && this.destinationBg.height) || 1080;
        const t = isMoving ? constrain(destinationProgress / transitionDistance, 0, 1) : 1;
        const easedT = 1 - pow(1 - t, 2.2);
        const y = lerp(startY, settleY, easedT);

        push();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(120);
        stroke(255, 240, 120, 240);
        strokeWeight(8);
        fill(255, 255, 255, 0);
        text(message, width / 2, y);

        this.updateAndDrawVictoryFireworks(y, isMoving);

        // Dreamy effect: twinkling stars + soft trailing glow.
        const sparkCount = 12;
        for (let i = 0; i < sparkCount; i++) {
            const side = (i % 2 === 0) ? -1 : 1;
            const spreadX = 210 + (i % 6) * 72;
            const wave = sin((frameCount * 0.09) + i * 0.8) * 18;
            const sx = width / 2 + side * spreadX + wave;
            const sy = y + ((i % 3) - 1) * 56 + cos((frameCount * 0.12) + i * 1.2) * 10;
            const twinkle = 0.5 + 0.5 * sin(frameCount * 0.16 + i * 1.7);
            const starAlpha = 110 + 145 * twinkle;
            const starOuter = 8 + twinkle * 5;
            const starInner = starOuter * 0.45;

            // Tail
            noStroke();
            for (let k = 1; k <= 4; k++) {
                fill(255, 235, 170, starAlpha * (0.16 - k * 0.028));
                circle(sx - k * side * 2.0, sy + k * 9, 9 - k * 1.5);
            }

            // Star body
            fill(255, 245, 185, starAlpha);
            this.drawSparkleStar(sx, sy, starOuter, starInner, 5);
        }
        pop();
    }

    drawSparkleStar(cx, cy, outerR, innerR, points) {
        beginShape();
        const step = TWO_PI / points;
        for (let a = -HALF_PI; a < TWO_PI - HALF_PI; a += step) {
            vertex(cx + cos(a) * outerR, cy + sin(a) * outerR);
            vertex(cx + cos(a + step / 2) * innerR, cy + sin(a + step / 2) * innerR);
        }
        endShape(CLOSE);
    }

    updateAndDrawVictoryFireworks(textY, isMoving) {
        if (this.victoryFireworkCooldown > 0) this.victoryFireworkCooldown--;
        const spawnChance = isMoving ? 0.12 : 0.08;
        if (this.victoryFireworkCooldown <= 0 && random() < spawnChance) {
            const cx = width / 2 + random(-480, 480);
            const cy = textY + random(-180, 70);
            this.spawnVictoryFireworkBurst(cx, cy);
            this.victoryFireworkCooldown = Math.floor(random(7, 14));
        }

        for (let i = this.victoryFireworks.length - 1; i >= 0; i--) {
            const p = this.victoryFireworks[i];
            p.px = p.x;
            p.py = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.035;
            p.life--;

            const alpha = 255 * (p.life / p.maxLife);
            stroke(p.r, p.g, p.b, alpha * 0.45);
            strokeWeight(2);
            line(p.px, p.py, p.x, p.y);
            noStroke();
            fill(p.r, p.g, p.b, alpha);
            circle(p.x, p.y, 3.2);

            if (p.life <= 0) this.victoryFireworks.splice(i, 1);
        }
    }

    spawnVictoryFireworkBurst(cx, cy) {
        const count = 22;
        const baseHue = random(0, 1);
        for (let i = 0; i < count; i++) {
            const a = random(TWO_PI);
            const speed = random(1.6, 4.2);
            const c = this.getFireworkColor(baseHue, i);
            this.victoryFireworks.push({
                x: cx,
                y: cy,
                px: cx,
                py: cy,
                vx: cos(a) * speed,
                vy: sin(a) * speed - random(0.2, 0.9),
                life: Math.floor(random(20, 34)),
                maxLife: 34,
                r: c.r,
                g: c.g,
                b: c.b
            });
        }
    }

    getFireworkColor(baseHue, idx) {
        const t = (baseHue + idx * 0.07) % 1;
        const r = 190 + 65 * sin(TWO_PI * (t + 0.00));
        const g = 190 + 65 * sin(TWO_PI * (t + 0.33));
        const b = 190 + 65 * sin(TWO_PI * (t + 0.66));
        return { r: constrain(r, 120, 255), g: constrain(g, 120, 255), b: constrain(b, 120, 255) };
    }
}
