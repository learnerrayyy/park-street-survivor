// Park Street Survivor - Dialogue Box
// Responsibilities: Reusable typewriter-style dialogue overlay.
// Renders a bottom-screen bar with a character portrait and word-by-word text reveal.
// Any scene or system can trigger a line by calling trigger(text, portrait, speakerName).

class DialogueBox {

    // ─── INITIALISATION ──────────────────────────────────────────────────────

    constructor() {
        /** Display duration in frames (120 = 2 s at 60 fps). */
        this.timerMax     = 120;
        /** Frames between each appended word (lower = faster typing). */
        this.wordInterval = 8;
        /** Assign a p5.Sound asset here to play a click on each appended word. */
        this.typingSfx    = (typeof sfxDialogue !== 'undefined') ? sfxDialogue : null;
        /**
         * When true the box stays visible indefinitely — timer is ignored.
         * Use this for cutscene/VN dialogue that the player advances manually.
         */
        this.persistent   = false;

        this.reset();
    }

    /**
     * Resets all per-line state to inactive.
     * Call this whenever the owning scene reinitialises (e.g. RoomScene.reset()).
     * Note: does NOT reset `persistent` — that is a configuration flag.
     */
    reset() {
        this.active        = false;
        this.timer         = 0;
        this.portraitImg   = null;
        this.fullText      = "";
        this.words         = [];
        this.wordIndex     = 0;
        this.displayedText = "";
        this.wordTick      = 0;
        this.speakerName   = "";
        this.options       = null;
        /** Optional callback: (opt, index) => void — intercepts option clicks for echo/tracking. */
        this.onOptionSelect = null;
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    /**
     * Triggers a dialogue line.
     *
     * @param {string}   text          The message to display.
     * @param {p5.Image} [portrait]    Character portrait (null → default player portrait).
     * @param {string}   [speakerName] Name shown in a tag above the bar. Omit or "" to hide.
     */
    trigger(text, portrait, speakerName, options = null) {
        this.active        = true;
        this.timer         = this.timerMax;
        this.portraitImg   = portrait || null;
        this.fullText      = text;
        this.words         = text.trim().split(/\s+/);
        this.wordIndex     = 0;
        this.displayedText = "";
        this.wordTick      = 0;
        this.speakerName   = speakerName || "";
        this.options = options;
    }

    /**
     * Returns true while the dialogue bar is visible on screen.
     */
    isActive() {
        return this.active && (this.persistent || this.timer > 0);
    }

    /**
     * Returns true once the typewriter has finished revealing all words.
     */
    isFinishedTyping() {
        return this.wordIndex >= this.words.length;
    }

    /**
     * Instantly reveals the complete text, skipping the typewriter animation.
     */
    skipToEnd() {
        this.displayedText = this.fullText;
        this.wordIndex     = this.words.length;
    }

    // ─── RENDERING ───────────────────────────────────────────────────────────

    /**
     * Updates the typewriter animation and renders the dialogue bar for one frame.
     * Must be called once per frame from the owning scene's display() method.
     */
    display() {
        if (!this.active) return;

        // Timer-based auto-dismiss (skipped entirely in persistent mode)
        if (!this.persistent) {
            if (this.timer <= 0) return;
            this.timer--;
        }

        // ── Typewriter: append one word per interval ──────────────────────────
        if (this.wordIndex < this.words.length) {
            this.wordTick++;
            if (this.wordTick >= this.wordInterval) {
                this.wordTick = 0;
                let w = this.words[this.wordIndex];
                this.displayedText += (this.displayedText ? " " : "") + w;
                this.wordIndex++;
                if (typeof playSFX === "function" && this.typingSfx) {
                    playSFX(this.typingSfx);
                }
            }
        }

        // ── Layout: scale from 1920×1080 design space to current canvas ───────
        const DESIGN_W = 1920;
        const DESIGN_H = 1080;
        const s = min(width / DESIGN_W, height / DESIGN_H);

        const alpha = 230;
        const boxH  = 340 * s;
        const barY  = height - boxH;

        push();

        const tx = this.portraitImg ? (496 * s) : (80 * s); 
        const tw = (width - tx - 60 * s);
        const ty = barY + 60 * s;
        const th = height - ty - 24 * s;

        // Background bar
        rectMode(CORNER);
        noStroke();
        fill(56, 39, 96, alpha);
        rect(0, barY, width, boxH);

        // ── Speaker name tag (floats just above bar, aligned to text edge) ────
        if (this.speakerName) {
            const tagPadX = 18 * s;
            const tagH    = 38 * s;
            const tagX    = tx;
            const tagY    = barY - tagH - 2 * s;

            // Measure name width before drawing so the tag auto-sizes
            let fT = (typeof fonts !== 'undefined') ? (fonts.title || fonts.body) : null;
            if (fT) textFont(fT);
            textSize(20 * s);
            const tagW = max(140 * s, textWidth(this.speakerName) + tagPadX * 2);

            fill(56, 39, 96, 240);
            stroke(200, 170, 100); strokeWeight(1.5 * s);
            rectMode(CORNER);
            rect(tagX, tagY, tagW, tagH, 7 * s);
            noStroke();
            fill(220, 190, 110);
            textAlign(LEFT, CENTER);
            text(this.speakerName, tagX + tagPadX, tagY + tagH / 2);
        }

        // Character portrait

        imageMode(CORNER);
        if (this.portraitImg) {
            const px    = 30 * s;
            const py    = barY - 60 * s;
            const pSize = 380 * s;
            imageMode(CORNER);
            image(this.portraitImg, px, py, pSize, pSize);
        }

        // Dialogue text — ty/th are derived from barY so text never overflows the canvas

        let fB = (typeof fonts !== 'undefined' && fonts.body) ? fonts.body : null;
        if (fB) textFont(fB);
        textSize(52 * s);
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);
        text(this.displayedText, tx, ty, tw, th);

        // ─── VN-STYLE CENTERED CHOICE PANEL ─────────────────────────────────
        if (this.options && this.isFinishedTyping()) {
            const n      = this.options.length;
            const optH   = 84 * s;
            const optGap = 26 * s;
            const optW   = 820 * s;
            const totalH = n * optH + (n - 1) * optGap;
            // Center the block in the upper portion of screen (above the dialogue bar)
            const panelCY  = barY * 0.5;
            const startY   = panelCY - totalH / 2;
            const optX     = width / 2 - optW / 2;
            const optPadX  = 28 * s;
            const accentW  = 6 * s;

            let fB = (typeof fonts !== 'undefined') ? fonts.body : null;

            this.options.forEach((opt, idx) => {
                const btnY   = startY + idx * (optH + optGap);
                const isHover = (mouseX > optX && mouseX < optX + optW &&
                                 mouseY > btnY  && mouseY < btnY  + optH);

                push();
                rectMode(CORNER);

                // Background — match dialogue bar color
                fill(isHover ? color(72, 50, 120, 245) : color(56, 39, 96, 230));
                stroke(isHover ? color(220, 185, 90, 255) : color(180, 148, 72, 160));
                strokeWeight(1.5 * s);
                rect(optX, btnY, optW, optH, 8 * s);

                // Gold accent bar on hover
                if (isHover) {
                    noStroke();
                    fill(220, 185, 70, 220);
                    rect(optX, btnY, accentW, optH, 8 * s, 0, 0, 8 * s);
                    cursor(HAND);
                }

                // Option text
                noStroke();
                fill(isHover ? color(255, 225, 120) : color(220, 200, 155));
                if (fB) textFont(fB);
                textSize(32 * s);
                textAlign(LEFT, CENTER);
                text(opt.label, optX + optPadX + (isHover ? accentW : 0), btnY + optH / 2);
                pop();

                // Click detection
                if (isHover && mouseIsPressed) {
                    mouseIsPressed = false;  // prevent click-through
                    if (typeof this.onOptionSelect === 'function') {
                    this.onOptionSelect(opt, idx);
                } else {
                    if (typeof opt.cb === 'function') {
                        opt.cb();
                    } else if (opt.nextIndex !== undefined) {
                        if (typeof handleOptionSelect === 'function') handleOptionSelect(opt.nextIndex);
                    }
                }
                }
            });
        }

        pop();

        // Auto-close when timer expires (non-persistent only)
        if (!this.persistent && this.timer <= 0) {
            this.active = false;
        }
    }
}
