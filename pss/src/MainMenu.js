// Park Street Survivor - Main Menu
// Responsibilities: All menu screen rendering, level selection, settings, and help pages.

class MainMenu {

    // ─── INITIALISATION ──────────────────────────────────────────────────────

    constructor() {
        this.menuState    = STATE_MENU;
        this.helpPage     = 0; // 0: Controls, 1: Character Wiki, 2: Buffs, 3: Hazards
        this.currentIndex = -1;  // no default selection

        this.timeWheel = new TimeWheel(DAYS_CONFIG);
        this.buttons   = [];
        this.setupButtons();

        this.backButton = new UIButton(70, 65, 60, 60, "BACK_ARROW", () => this.handleBackAction());
        this.bgmSlider  = new UISlider(width / 2, height / 2 - 80,  400, 0, 1, masterVolumeBGM, "BGM VOLUME");
        this.sfxSlider  = new UISlider(width / 2, height / 2 + 50, 400, 0, 1, masterVolumeSFX, "SFX VOLUME");

        // Difficulty selector state
        this.difficultyIndex = gameDifficulty;  // 0=EASY, 1=NORMAL, 2=HARD
        this.diffToastText   = "";
        this.diffToastTimer  = 0;

        // Mute state tracking for settings menu
        this.isBGMMuted = false;
        this.isSFXMuted = false;
        this.preMuteBGMVolume = masterVolumeBGM;
        this.preMuteSFXVolume = masterVolumeSFX;
    }

    /**
     * Registers the three main-menu buttons (START, HELP, SETTINGS) and their transitions.
     */
    setupButtons() {
        let centerY = height - 250;
        let spacing = 320;
        this.buttons.push(new UIButton(width / 2 - spacing, centerY, 256, 96, "START", () => {
            triggerTransition(() => {
                this.menuState = STATE_LEVEL_SELECT;
                gameState.currentState = STATE_LEVEL_SELECT;
                this.timeWheel.bgAlpha = 0;
                this.timeWheel.triggerEntrance();
            });
        }));
        this.buttons.push(new UIButton(width / 2, centerY, 256, 96, "HELP", () => {
            triggerTransition(() => {
                this.menuState = STATE_HELP;
                gameState.currentState = STATE_HELP;
            });
        }));
        this.buttons.push(new UIButton(width / 2 + spacing, centerY, 256, 96, "SETTINGS", () => {
            triggerTransition(() => {
                this.menuState = STATE_SETTINGS;
                gameState.currentState = STATE_SETTINGS;
            });
        }));
    }

    // ─── DISPLAY ─────────────────────────────────────────────────────────────

    /**
     * Main display entry point — selects background and delegates to the active sub-screen.
     */
    display() {
        imageMode(CORNER);
        if (this.menuState === STATE_LEVEL_SELECT) {
            // Level select uses its own background drawn by TimeWheel
        } else if (this.menuState === STATE_SETTINGS || this.menuState === STATE_HELP) {
            // Background drawn inside each sub-screen via drawOtherBgWithOverlay()
        } else {
            if (assets.menuBg) image(assets.menuBg, 0, 0, width, height);
            else background(20);
        }

        switch (this.menuState) {
            case STATE_MENU:         this.drawHomeScreen();     break;
            case STATE_LEVEL_SELECT: this.drawSelectScreen();   break;
            case STATE_SETTINGS:     this.drawSettingsScreen(); break;
            case STATE_HELP:         this.drawHelpScreen();     break;
        }

        if (this.menuState !== STATE_MENU) {
            this.backButton.isFocused = this.backButton.checkMouse(mouseX, mouseY);
            this.backButton.update();
            this.backButton.display();
        }
    }

    // ─── SCREEN RENDERERS ────────────────────────────────────────────────────

    /**
     * Renders the home screen: logo and the three main action buttons.
     */
    drawHomeScreen() {
        drawLogoPlaceholder(width / 2, 320);

        let anyHover = false;
        for (let i = 0; i < this.buttons.length; i++) {
            if (!globalFade.isFading && this.buttons[i].checkMouse(mouseX, mouseY)) {
                this.currentIndex = i;
                anyHover = true;
            }
            this.buttons[i].isFocused = (this.currentIndex >= 0 && this.currentIndex === i);
            this.buttons[i].update();
            this.buttons[i].display();
        }
        // Reset selection when mouse isn't hovering any button
        if (!anyHover && !keyIsPressed) {
            this.currentIndex = -1;
        }
    }

    /**
     * Renders the level-select screen via the TimeWheel component.
     */
    drawSelectScreen() {
        this.timeWheel.display();
        push();
        textFont(fonts.body);
        textAlign(CENTER, CENTER);
        fill(255, 150);
        textSize(20);
        text("PRESS ENTER TO START  /  ESC TO BACK", width / 2, height - 80);
        pop();
    }

    /**
     * Renders the settings screen with BGM and SFX volume sliders.
     */
    drawSettingsScreen() {
        drawOtherBgWithOverlay();

        push();
        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        textSize(50);
        stroke(0, 0, 0, 200);
        strokeWeight(6);
        fill(255, 215, 0);
        text("SETTINGS", width / 2, height / 2 - 250);
        noStroke();
        fill(255, 215, 0);
        text("SETTINGS", width / 2, height / 2 - 250);

        // ── Volume sliders (shifted up) ─────────────────────────────────────
        this.bgmSlider.display();
        this.sfxSlider.display();

        // Mute toggle icons with hover zoom effect
        let iconSz = 45;
        let iconXOffset = 240;
        let iconHitR = 28;

        // BGM mute toggle icon
        let bgmIconX = this.bgmSlider.x + iconXOffset;
        let bgmIconY = this.bgmSlider.y;
        let bgmHover = dist(mouseX, mouseY, bgmIconX, bgmIconY) < iconHitR;
        push();
        translate(bgmIconX, bgmIconY);
        if (bgmHover) scale(1.3);
        let bgmIcon = this.isBGMMuted ? assets.musicOff : assets.musicOn;
        if (bgmIcon) { imageMode(CENTER); image(bgmIcon, 0, 0, iconSz, iconSz); }
        pop();

        // SFX mute toggle icon
        let sfxIconX = this.sfxSlider.x + iconXOffset;
        let sfxIconY = this.sfxSlider.y;
        let sfxHover = dist(mouseX, mouseY, sfxIconX, sfxIconY) < iconHitR;
        push();
        translate(sfxIconX, sfxIconY);
        if (sfxHover) scale(1.3);
        let sfxIcon = this.isSFXMuted ? assets.musicOff : assets.musicOn;
        if (sfxIcon) { imageMode(CENTER); image(sfxIcon, 0, 0, iconSz, iconSz); }
        pop();

        masterVolumeBGM = this.bgmSlider.value;
        masterVolumeSFX = this.sfxSlider.value;
        if (bgm) bgm.setVolume(masterVolumeBGM);

        // ── Difficulty selector (label centered, selector row below) ──────
        let diffLabelY = height / 2 + 145;
        let diffRowY   = height / 2 + 230;
        let boxX       = width / 2;
        let boxW       = 330, boxH = 60;
        let arrowGap   = boxW / 2 + 80;

        // Label — centered, larger
        textFont(fonts.body);
        textSize(32);
        textAlign(CENTER, CENTER);
        stroke(0, 0, 0, 200);
        strokeWeight(5);
        fill(255, 215, 0);
        text("DIFFICULTY", boxX, diffLabelY);
        noStroke();
        fill(255, 215, 0);
        text("DIFFICULTY", boxX, diffLabelY);

        // Selector box — purple rounded rectangle (same color as slider bar)
        rectMode(CENTER);
        noStroke();
        fill(160, 90, 255, 180);
        rect(boxX, diffRowY, boxW, boxH, 10);
        noFill();
        stroke(160, 90, 255, 255);
        strokeWeight(2);
        rect(boxX, diffRowY, boxW, boxH, 10);
        noStroke();

        // Current difficulty label — readable size, shifted up
        textFont(fonts.body);
        textSize(26);
        textAlign(CENTER, CENTER);
        stroke(0, 0, 0, 180);
        strokeWeight(5);
        fill(255, 215, 0);
        text(DIFFICULTY_LABELS[this.difficultyIndex], boxX, diffRowY - 5);
        noStroke();
        fill(255, 215, 0);
        text(DIFFICULTY_LABELS[this.difficultyIndex], boxX, diffRowY - 5);

        // Left / Right arrows — use back.png (flipped for right), larger
        let arrowSz = 70;
        let hitR = 36;
        let arrowHoverL = (mouseX > boxX - arrowGap - hitR && mouseX < boxX - arrowGap + hitR &&
                           mouseY > diffRowY - hitR && mouseY < diffRowY + hitR);
        let arrowHoverR = (mouseX > boxX + arrowGap - hitR && mouseX < boxX + arrowGap + hitR &&
                           mouseY > diffRowY - hitR && mouseY < diffRowY + hitR);

        if (assets.backImg) {
            push();
            translate(boxX - arrowGap, diffRowY);
            if (arrowHoverL) scale(1.25);
            imageMode(CENTER);
            image(assets.backImg, 0, 0, arrowSz, arrowSz);
            pop();

            push();
            translate(boxX + arrowGap, diffRowY);
            scale(-1, 1);
            if (arrowHoverR) scale(1.25);
            imageMode(CENTER);
            image(assets.backImg, 0, 0, arrowSz, arrowSz);
            pop();
        }

        // ── Toast message ───────────────────────────────────────────────────
        if (this.diffToastTimer > 0) {
            this.diffToastTimer--;
            let alpha = min(this.diffToastTimer * 4, 255);
            rectMode(CENTER);
            fill(22, 10, 48, alpha * 0.9);
            stroke(255, 160, 60, alpha);
            strokeWeight(2);
            rect(width / 2, diffRowY + 120, 550, 60, 10);
            noStroke();
            fill(255, 200, 80, alpha);
            textFont(fonts.body);
            textSize(25);
            textAlign(CENTER, CENTER);
            text(this.diffToastText, width / 2, diffRowY + 115);
        }

        textFont(fonts.body);
        textSize(20);
        textAlign(CENTER, CENTER);
        stroke(0, 0, 0, 160);
        strokeWeight(3);
        fill(200, 160, 255);
        text("PRESS ESC TO BACK", width / 2, height - 80);
        noStroke();
        fill(200, 160, 255);
        text("PRESS ESC TO BACK", width / 2, height - 80);
        pop();
    }

    /**
     * Renders the four-page help screen:
     *   Page 0 — animated control key cards
     *   Page 1 — character wiki with unlock states
     *   Page 2 — buff item encyclopedia
     *   Page 3 — hazard item encyclopedia
     */
    drawHelpScreen() {
        push();
        drawOtherBgWithOverlay();

        // Header
        textAlign(CENTER, CENTER);
        textFont(fonts.title);
        fill(255, 215, 0);
        textSize(40);
        let titles = ["SYSTEM COMMANDS", "CHARACTER WIKI", "INTEL: BENEFICIAL", "INTEL: HAZARDS"];
        text(titles[this.helpPage], width / 2, 100);

        // Card grid layout config
        let sx = width / 2 - 470, sy = 240, cw = 460, ch = 140, gap = 20;

        // PAGE 0: Animated control key cards
        if (this.helpPage === 0) {
            let controls = [
                { id: 'move_combo', a: "MOVEMENT", d: "WASD or Arrows to navigate." },
                { id: 'enter',      a: "NEXT PAGE", d: "Cycle through system intel." },
                { id: 'space',      a: "PARKOUR",   d: "Interact during the run."    },
                { id: 'e',          a: "INTERACT",  d: "Talk to NPCs or use items."  },
                { id: 'p',          a: "PAUSE",     d: "Freeze time & system menu."  }
            ];

            controls.forEach((c, i) => {
                let x       = sx + (i % 2) * (cw + gap);
                let y       = sy + floor(i / 2) * (ch + gap);
                let isHover = (mouseX > x && mouseX < x + cw && mouseY > y && mouseY < y + ch);

                noStroke();
                fill(isHover ? 255 : 240);
                rect(x, y, cw, ch, 12);

                if (c.id === 'move_combo') {
                    // Cycle through all 8 directional keys in sequence
                    let sequence   = ['w', 'up', 'a', 'left', 's', 'down', 'd', 'right'];
                    let currentIdx = floor(frameCount / 25) % sequence.length;
                    let activeKey  = sequence[currentIdx];
                    let sheet      = assets.keys[activeKey];

                    if (sheet) {
                        let animFrame = floor(frameCount / 10) % 3;
                        let sw = sheet.width / 3;
                        let sh = sheet.height;
                        image(sheet, x + 25, y + 35, 100, 70, animFrame * sw, 0, sw, sh);
                        textAlign(CENTER, CENTER);
                        fill(100);
                        textFont(fonts.body);
                        textSize(12);
                        text(activeKey.toUpperCase(), x + 75, y + 115);
                    }
                } else {
                    // Regular functional keys (ENTER, SPACE, E, P)
                    let sheet = assets.keys[c.id];
                    if (sheet) {
                        let animFrame = floor(frameCount / 15) % 3;
                        let sw = sheet.width / 3, sh = sheet.height;
                        image(sheet, x + 25, y + 35, 100, 70, animFrame * sw, 0, sw, sh);
                    }
                }

                textAlign(LEFT, TOP);
                textFont(fonts.title); fill(20); textSize(20); text(c.a, x + 145, y + 35);
                textFont(fonts.body);  fill(80); textSize(16); text(c.d, x + 145, y + 70, cw - 165);
            });
        }
        // PAGE 1: Character wiki with per-day unlock states
        else if (this.helpPage === 1) {
            let characters = [
                { name: "IRIS",      desc: "UoB student rushing to class.",  imgKey: "player",       unlockDay: 1 },
                { name: "WIOLA",     desc: "Always prepared. Always calm.",  imgKey: "npc_1",        unlockDay: 1 },
                { name: "LAYLA",     desc: "Lived on coffee and questions.", imgKey: "bus_driver",   unlockDay: 2 },
                { name: "YUKI",      desc: "Quiet. Observant.",              imgKey: "npc_promoter", unlockDay: 3 },
                { name: "RAYMOND",   desc: "Steady and practical.",          imgKey: "npc_promoter", unlockDay: 4 },
                { name: "CHARLOTTE", desc: "Thoughtful. Direct.",            imgKey: "npc_promoter", unlockDay: 5 }
            ];

            characters.forEach((char, i) => {
                let x          = sx + (i % 2) * (cw + gap);
                let y          = sy + floor(i / 2) * (ch + gap);
                let isUnlocked = char.unlockDay <= currentUnlockedDay;

                if (isUnlocked) {
                    noStroke(); fill(240); rect(x, y, cw, ch, 12);

                    let charImg = assets.previews[char.imgKey];
                    if (charImg) {
                        imageMode(CENTER);
                        image(charImg, x + 75, y + ch / 2, 100, 100);
                    }

                    textAlign(LEFT, TOP);
                    textFont(fonts.title); fill(20); textSize(18); text(char.name, x + 145, y + 35);
                    textFont(fonts.body);  fill(80); textSize(16); text(char.desc, x + 145, y + 70, cw - 165);
                } else {
                    // Locked state: dark card with a pulsing "LOCKED // DAY N" label
                    fill(30); noStroke(); rect(x, y, cw, ch, 12);
                    textAlign(CENTER, CENTER);
                    textFont(fonts.title);
                    let pulse = sin(frameCount * 0.1) * 30 + 80;
                    fill(pulse); textSize(18);
                    text(`LOCKED // DAY ${char.unlockDay}`, x + cw / 2, y + ch / 2);
                }
            });
        }
        // PAGE 2 & 3: Item encyclopedia (Buffs or Hazards)
        else {
            let type  = (this.helpPage === 2) ? 'BUFF' : 'HAZARD';
            let items = ITEM_WIKI.filter(item => item.type === type);

            items.forEach((item, i) => {
                let x          = sx + (i % 2) * (cw + gap);
                let y          = sy + floor(i / 2) * (ch + gap);
                let isUnlocked = item.unlockDay <= currentUnlockedDay;

                if (isUnlocked) {
                    noStroke(); fill(240); rect(x, y, cw, ch, 12);

                    if (item.imgKey) {
                        let hazardImg;
                        if (Array.isArray(item.imgKey)) {
                            // Cycle through multiple sprites for animated items
                            let animIdx = floor(frameCount / 30) % item.imgKey.length;
                            hazardImg   = assets.previews[item.imgKey[animIdx]];
                        } else {
                            hazardImg = assets.previews[item.imgKey];
                        }

                        if (hazardImg) {
                            imageMode(CENTER);
                            // Proportional scale to fit within a 100×100 preview area
                            let scale = min(100 / hazardImg.width, 100 / hazardImg.height);
                            image(hazardImg, x + 75, y + ch / 2, hazardImg.width * scale, hazardImg.height * scale);
                        }
                    }

                    textAlign(LEFT, TOP);
                    textFont(fonts.title); fill(20); textSize(18); text(item.name, x + 145, y + 40);
                    textFont(fonts.body);  fill(80); textSize(16); text(item.desc, x + 145, y + 75, cw - 165);
                } else {
                    // Locked state: dark card with a pulsing label
                    fill(30); noStroke(); rect(x, y, cw, ch, 12);
                    textAlign(CENTER, CENTER);
                    textFont(fonts.title);
                    let pulse = sin(frameCount * 0.1) * 30 + 80;
                    fill(pulse); textSize(18);
                    text(`LOCKED // DAY ${item.unlockDay}`, x + cw / 2, y + ch / 2);
                }
            });
        }

        noStroke();

        // Footer: left/right arrow buttons for page navigation
        let arrowY = height - 100;
        let arrowSz = 56;
        let arrowLeftX = width / 2 - 200;
        let arrowRightX = width / 2 + 200;

        if (assets.backImg) {
            // Left arrow (only if not first page)
            if (this.helpPage > 0) {
                let leftHover = dist(mouseX, mouseY, arrowLeftX, arrowY) < 35;
                push();
                translate(arrowLeftX, arrowY);
                if (leftHover) scale(1.25);
                imageMode(CENTER);
                image(assets.backImg, 0, 0, arrowSz, arrowSz);
                pop();
            }

            // Right arrow (only if not last page)
            if (this.helpPage < 3) {
                let rightHover = dist(mouseX, mouseY, arrowRightX, arrowY) < 35;
                push();
                translate(arrowRightX, arrowY);
                scale(-1, 1);
                if (rightHover) scale(1.25);
                imageMode(CENTER);
                image(assets.backImg, 0, 0, arrowSz, arrowSz);
                pop();
            }
        }

        // Page indicator
        textAlign(CENTER, CENTER);
        textFont(fonts.body);
        textSize(22);
        stroke(0, 0, 0, 160); strokeWeight(3); fill(255, 215, 0);
        text((this.helpPage + 1) + " / 4", width / 2, arrowY);
        noStroke(); fill(255, 215, 0);
        text((this.helpPage + 1) + " / 4", width / 2, arrowY);

        fill(150); textSize(18);
        text("PRESS [ESC] TO BACK", width / 2, height - 55);
        pop();
    }

    // ─── INPUT HANDLERS ──────────────────────────────────────────────────────

    /**
     * Routes keyboard input to the correct sub-system based on the active menu state.
     */
    handleKeyPress(_key, keyCode) {
        if (globalFade.isFading) return;

        if (this.menuState === STATE_HELP) {
            if ((keyCode === RIGHT_ARROW || keyCode === 68) && this.helpPage < 3) {
                playSFX(sfxSelect); this.helpPage++;
            } else if ((keyCode === LEFT_ARROW || keyCode === 65) && this.helpPage > 0) {
                playSFX(sfxSelect); this.helpPage--;
            }
        }

        if (this.menuState === STATE_MENU) {
            if (keyCode === LEFT_ARROW || keyCode === 65 || keyCode === RIGHT_ARROW || keyCode === 68) {
                playSFX(sfxSelect);
                if (this.currentIndex < 0) {
                    this.currentIndex = 0;  // start from first on first keypress
                } else if (keyCode === LEFT_ARROW || keyCode === 65) {
                    this.currentIndex = (this.currentIndex - 1 + 3) % 3;
                } else {
                    this.currentIndex = (this.currentIndex + 1) % 3;
                }
            } else if ((keyCode === ENTER || keyCode === 13) && this.currentIndex >= 0) {
                playSFX(sfxClick);
                this.buttons[this.currentIndex].handleClick();
            }
        } else if (this.menuState === STATE_SETTINGS) {
            if (keyCode === LEFT_ARROW || keyCode === 65) {
                this.cycleDifficulty(-1);
            } else if (keyCode === RIGHT_ARROW || keyCode === 68) {
                this.cycleDifficulty(1);
            } else if (keyCode === ESCAPE) {
                this.handleBackAction();
            }
        } else if (keyCode === ESCAPE) {
            this.handleBackAction();
        }

        if (this.menuState === STATE_LEVEL_SELECT) {
            this.timeWheel.handleInput(keyCode);

            if (keyCode === ENTER || keyCode === 13) {
                let selectedDay = this.timeWheel.selectedDay;
                // Day 1 first press: unlock visually, don't enter yet
                if (selectedDay === 1 &&
                    typeof tutorialHints !== 'undefined' &&
                    !tutorialHints.day1VisuallyUnlocked) {
                    tutorialHints.day1VisuallyUnlocked = true;
                    playSFX(sfxClick);
                    return;
                }
                if (DEBUG_UNLOCK_ALL || selectedDay <= currentUnlockedDay) {
                    if (typeof tutorialHints !== 'undefined') {
                        tutorialHints.levelSelectShownForDay = selectedDay;
                    }
                    playSFX(sfxClick);
                    triggerTransition(() => { setupRun(selectedDay); });
                }
            }
        }
    }

    /**
     * Routes mouse click events to the relevant button or slider.
     */
    handleClick(mx, my) {
        if (globalFade.isFading) return;
        if (this.menuState === STATE_MENU) {
            for (let btn of this.buttons) if (btn.checkMouse(mx, my)) btn.handleClick();
        } else {
            if (this.backButton.checkMouse(mx, my)) this.backButton.handleClick();
            // Help page arrow clicks
            if (this.menuState === STATE_HELP) {
                let arrowY = height - 100;
                let arrowLeftX = width / 2 - 200;
                let arrowRightX = width / 2 + 200;
                if (this.helpPage > 0 && dist(mx, my, arrowLeftX, arrowY) < 35) {
                    playSFX(sfxSelect); this.helpPage--;
                    return;
                }
                if (this.helpPage < 3 && dist(mx, my, arrowRightX, arrowY) < 35) {
                    playSFX(sfxSelect); this.helpPage++;
                    return;
                }
            }
            if (this.menuState === STATE_SETTINGS) {
                this.bgmSlider.handlePress(mx, my);
                this.sfxSlider.handlePress(mx, my);
                this.handleDifficultyClick(mx, my);

                let iconXOffset = 240;
                let hitR = 25;

                // Check BGM mute toggle click
                if (dist(mx, my, this.bgmSlider.x + iconXOffset, this.bgmSlider.y) < hitR) {
                    this.toggleBGMMute();
                }
                // Check SFX mute toggle click
                if (dist(mx, my, this.sfxSlider.x + iconXOffset, this.sfxSlider.y) < hitR) {
                    this.toggleSFXMute();
                }
            }
            // Level select: click on cloud to start the selected day, or arrows to change day
            if (this.menuState === STATE_LEVEL_SELECT) {
                // Right-side up/down arrows
                let arrowX  = width - 90;
                let centerY = height / 2;
                let arrowGap = 90;
                if (!this.timeWheel.isEntering) {
                    if (this.timeWheel.selectedDay > 1 &&
                        dist(mx, my, arrowX, centerY - arrowGap) < 35) {
                        this.timeWheel.selectedDay--;
                        this.timeWheel.targetIndex--;
                        playSFX(sfxSelect);
                        return;
                    }
                    if (this.timeWheel.selectedDay < 5 &&
                        dist(mx, my, arrowX, centerY + arrowGap) < 35) {
                        this.timeWheel.selectedDay++;
                        this.timeWheel.targetIndex++;
                        playSFX(sfxSelect);
                        return;
                    }
                }
                // Cloud click to start (or to visually unlock Day 1 on first click)
                let cloudX = width * 0.65, cloudY = height * 0.5;
                let cloudW = 700, cloudH = 450;
                if (mx > cloudX - cloudW / 2 && mx < cloudX + cloudW / 2 &&
                    my > cloudY - cloudH / 2 && my < cloudY + cloudH / 2) {
                    let selectedDay = this.timeWheel.selectedDay;
                    // Day 1 first click: unlock visually, don't enter the game yet
                    if (selectedDay === 1 &&
                        typeof tutorialHints !== 'undefined' &&
                        !tutorialHints.day1VisuallyUnlocked) {
                        tutorialHints.day1VisuallyUnlocked = true;
                        playSFX(sfxClick);
                        return;
                    }
                    // Normal entry (Day 1 already unlocked, or Days 2-5)
                    if (DEBUG_UNLOCK_ALL || selectedDay <= currentUnlockedDay) {
                        if (typeof tutorialHints !== 'undefined') {
                            tutorialHints.levelSelectShownForDay = selectedDay;
                        }
                        playSFX(sfxClick);
                        triggerTransition(() => { setupRun(selectedDay); });
                    }
                }
            }
        }
    }

    /**
     * Releases any active slider drag on mouse up.
     */
    handleRelease() {
        if (this.menuState === STATE_SETTINGS) {
            this.bgmSlider.handleRelease();
            this.sfxSlider.handleRelease();
        }
    }

    /**
     * Handles clicks on the difficulty selector buttons.
     */
    handleDifficultyClick(mx, my) {
        let diffRowY = height / 2 + 220;
        let boxX     = width / 2;
        let boxW     = 330;
        let arrowGap = boxW / 2 + 80;
        let hitR     = 36;

        // Left arrow click
        if (dist(mx, my, boxX - arrowGap, diffRowY) < hitR) {
            this.cycleDifficulty(-1);
            return;
        }
        // Right arrow click
        if (dist(mx, my, boxX + arrowGap, diffRowY) < hitR) {
            this.cycleDifficulty(1);
            return;
        }
    }

    /**
     * Cycles difficulty by delta (-1 or +1) and shows toast if locked.
     */
    cycleDifficulty(delta) {
        let next = constrain(this.difficultyIndex + delta, 0, 2);
        if (next === this.difficultyIndex) return;

        if (next === 1) {
            // Normal — always available
            this.difficultyIndex = 1;
            gameDifficulty       = 1;
            playSFX(sfxClick);
        } else {
            // Easy / Hard — not yet available
            this.difficultyIndex = next;
            playSFX(sfxSelect);
            this.diffToastText  = DIFFICULTY_LABELS[next] + " mode is coming soon — stay tuned!";
            this.diffToastTimer = 120;
            // Snap back to normal after showing toast
            this.difficultyIndex = 1;
        }
    }

    /**
     * Navigates back to the previous screen.
     * If accessed from the pause menu, returns to the pause overlay instead of the main menu.
     */
    handleBackAction() {
        if (globalFade.isFading) return;
        playSFX(sfxClick);

        if (typeof pauseFromState !== 'undefined' && pauseFromState !== null) {
            // Return to pause overlay and restore the correct resume target.
            // setState(PAUSED) would overwrite previousState with STATE_HELP,
            // so we manually restore it to the actual gameplay state we came from.
            gameState.setState(STATE_PAUSED);
            gameState.previousState = pauseFromState;
            this.helpPage = 0;
        } else {
            triggerTransition(() => {
                this.menuState         = STATE_MENU;
                gameState.currentState = STATE_MENU;
                this.helpPage          = 0;
            });
        }
    }

    /**
     * Toggles the BGM mute state and updates the slider value accordingly.
     */
    toggleBGMMute() {
        this.isBGMMuted = !this.isBGMMuted;
        if (this.isBGMMuted) {
            this.preMuteBGMVolume = this.bgmSlider.value;
            this.bgmSlider.value = 0;
        } else {
            this.bgmSlider.value = this.preMuteBGMVolume || 0.25;
        }
        playSFX(sfxClick);
    }

    /**
     * Toggles the SFX mute state and updates the slider value accordingly.
     */
    toggleSFXMute() {
        this.isSFXMuted = !this.isSFXMuted;
        if (this.isSFXMuted) {
            this.preMuteSFXVolume = this.sfxSlider.value;
            this.sfxSlider.value = 0;
        } else {
            this.sfxSlider.value = this.preMuteSFXVolume || 0.7;
        }
        playSFX(sfxClick);
    }
}
