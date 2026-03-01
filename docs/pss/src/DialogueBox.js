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
        this.wordInterval = 4;
        /** Assign a p5.Sound asset here to play a click on each appended word. */
        this.typingSfx    = null;
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
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    /**
     * Triggers a dialogue line.
     *
     * @param {string}   text          The message to display.
     * @param {p5.Image} [portrait]    Character portrait (null → default player portrait).
     * @param {string}   [speakerName] Name shown in a tag above the bar. Omit or "" to hide.
     */
    trigger(text, portrait, speakerName) {
        this.active        = true;
        this.timer         = this.timerMax;
        this.portraitImg   = portrait || null;
        this.fullText      = text;
        this.words         = text.trim().split(/\s+/);
        this.wordIndex     = 0;
        this.displayedText = "";
        this.wordTick      = 0;
        this.speakerName   = speakerName || "";
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
        const boxH  = 320 * s;
        const barY  = height - boxH;

        push();

        // Background bar
        rectMode(CORNER);
        noStroke();
        fill(56, 39, 96, alpha);
        rect(0, barY, width, boxH);

        // ── Speaker name tag (floats just above bar, aligned to text edge) ────
        if (this.speakerName) {
            const tagPadX = 18 * s;
            const tagH    = 38 * s;
            const tagX    = 496 * s;
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
        const px    = 30 * s;
        const py    = 700 * s;
        const pSize = 380 * s;

        imageMode(CORNER);
        let portrait = this.portraitImg ||
                       (typeof assets !== 'undefined' ? assets.portraitPlayerNormal : null);
        if (portrait) {
            image(portrait, px, py, pSize, pSize);
        } else {
            fill(255, 255, 255, 40);
            noStroke();
            rect(px, py, pSize, pSize, 18 * s);
        }

        // Dialogue text — ty/th are derived from barY so text never overflows the canvas
        const tx = 496 * s;
        const ty = barY + 60 * s;
        const tw = (DESIGN_W - 496 - 40) * s;
        const th = height - ty - 24 * s;

        let fB = (typeof fonts !== 'undefined' && fonts.body) ? fonts.body : null;
        if (fB) textFont(fB);
        textSize(48);
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);
        text(this.displayedText, tx, ty, tw, th);

        pop();

        // Auto-close when timer expires (non-persistent only)
        if (!this.persistent && this.timer <= 0) {
            this.active = false;
        }
    }
}
