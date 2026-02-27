// Park Street Survivor - Dialogue Box
// Responsibilities: Reusable typewriter-style dialogue overlay.
// Renders a bottom-screen bar with a character portrait and word-by-word text reveal.
// Any scene or system can trigger a line by calling trigger(text, portrait).

class DialogueBox {

    // ─── INITIALISATION ──────────────────────────────────────────────────────

    constructor() {
        /** Display duration in frames (120 = 2 s at 60 fps). */
        this.timerMax     = 120;
        /** Frames between each appended word (lower = faster typing). */
        this.wordInterval = 4;
        /** Assign a p5.Sound asset here to play a click on each appended word. */
        this.typingSfx    = null;

        this.reset();
    }

    /**
     * Resets all dialogue state to inactive.
     * Call this whenever the owning scene reinitialises (e.g. RoomScene.reset()).
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
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────

    /**
     * Triggers a dialogue line.
     *
     * @param {string}   text       The message to display.
     * @param {p5.Image} [portrait] Character portrait image.
     *                              Omit (or pass null) to use the default player portrait.
     *
     * Example — player speaks:
     *   dialogueBox.trigger("I haven't packed my bag yet.");
     *
     * Example — NPC speaks:
     *   dialogueBox.trigger("Hey! You dropped your student card!", npcPortraitImg);
     */
    trigger(text, portrait) {
        this.active        = true;
        this.timer         = this.timerMax;
        this.portraitImg   = portrait || null;   // null → player portrait resolved at render time
        this.fullText      = text;
        this.words         = text.trim().split(/\s+/);
        this.wordIndex     = 0;
        this.displayedText = "";
        this.wordTick      = 0;
    }

    /**
     * Returns true while the dialogue bar is visible on screen.
     */
    isActive() {
        return this.active && this.timer > 0;
    }

    // ─── RENDERING ───────────────────────────────────────────────────────────

    /**
     * Updates the typewriter animation and renders the dialogue bar for one frame.
     * Must be called once per frame from the owning scene's display() method.
     */
    display() {
        if (!this.active || this.timer <= 0) return;

        this.timer--;

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
        const boxH  = 220 * s;

        push();

        // Background bar
        rectMode(CORNER);
        noStroke();
        fill(56, 39, 96, alpha);
        rect(0, height - boxH, width, boxH);

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

        // Dialogue text
        const tx = 496 * s;
        const ty = 932 * s;
        const tw = (DESIGN_W - 496 - 40) * s;
        const th = (220 - 30) * s;

        if (typeof fonts !== 'undefined' && fonts.body) textFont(fonts.body);
        textSize(48);
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);
        text(this.displayedText, tx, ty, tw, th);

        pop();

        // Auto-close when timer expires
        if (this.timer <= 0) {
            this.active = false;
        }
    }
}
