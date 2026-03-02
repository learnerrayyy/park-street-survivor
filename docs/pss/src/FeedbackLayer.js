// Gameplay Feedback Layer
// Responsibilities: centralize hit/buff feedback hooks (SFX + screen-space VFX).

// Color tuning entry point: tweak these values to reskin all feedback quickly.
const FEEDBACK_THEME = {
    hitVignette: [255, 70, 70],
    lowHealthVignette: [255, 72, 72],
    buffRipple: [100, 245, 235],
    buffSpeedLine: [120, 255, 245],
    uiHealthFlash: [170, 255, 235],
    smallBusinessRipple: [255, 180, 85],
    smallBusinessBadge: [255, 230, 150],
    smallBusinessExclamation: [45, 28, 10]
};

class FeedbackLayer {
    constructor() {
        this.theme = FEEDBACK_THEME;

        this.hitFlashFrames = 0;
        this.buffFlashFrames = 0;
        this.smallBusinessFlashFrames = 0;
        this.healthBarFlashFrames = 0;
        this.smallBusinessBadgeFrames = 0;

        this.hitFlashMax = 12;
        this.buffFlashMax = 54;
        this.smallBusinessFlashMax = 60;
        this.healthBarFlashMax = 18;
        this.smallBusinessBadgeMax = 18; // 0.3s at 60 FPS

        this.hitStopFrames = 0; // 0.08s freeze target
        this.cameraShakeFrames = 0;
        this.cameraShakeAmplitude = 0;

        this.buffRipples = [];
        this.buffSpeedLines = [];
        this.smallBusinessRipples = [];
        this.smallBusinessBadgeX = width / 2;
        this.smallBusinessBadgeY = height / 2;

        // --- SFX Mapping Table ---
        this.sfxMap = {

            collision_generic: (payload) => {
                const baseType = payload.type;

                if (baseType === "SMALL_CAR" && typeof sfxHitSmallCar !== "undefined" && sfxHitSmallCar) {
                    playSFX(sfxHitSmallCar, {
                        id: 'collision_small_car',
                        cooldownMs: 140,
                        monophonic: true
                    });
                    return;
                }

                // LARGE_CAR or unknown: use BigCar as generic fallback
                if (typeof sfxHitBigCar !== "undefined" && sfxHitBigCar) {
                    playSFX(sfxHitBigCar, {
                        id: 'collision_big_car',
                        cooldownMs: 160,
                        monophonic: true
                    });
                    return;
                }
            },

            pickup_buff: (payload) => {
                const baseType = payload.type;

                if (baseType === "COFFEE" && typeof sfxPickupCoffee !== "undefined" && sfxPickupCoffee) {
                    playSFX(sfxPickupCoffee, {
                        id: 'pickup_coffee',
                        cooldownMs: 120,
                        monophonic: true
                    });
                    return;
                }
                if (baseType === "EMPTY_SCOOTER" && typeof sfxPickupScooter !== "undefined" && sfxPickupScooter) {
                    playSFX(sfxPickupScooter, {
                        id: 'pickup_scooter',
                        cooldownMs: 120,
                        monophonic: true
                    });
                    return;
                }
            },

            collision_small_business: (payload) => {
                if (typeof sfxSmallBusiness !== "undefined" && sfxSmallBusiness) {
                    playSFX(sfxSmallBusiness, {
                        id: 'collision_small_business',
                        cooldownMs: 200,
                        monophonic: true
                    });
                }
            }
        };
    }

    onCollision(type, context = {}) {
        this.hitFlashFrames = max(this.hitFlashFrames, this.hitFlashMax);
        this.cameraShakeFrames = max(this.cameraShakeFrames, floor(random(6, 11)));
        this.cameraShakeAmplitude = max(this.cameraShakeAmplitude, 10);
        this.hitStopFrames = max(this.hitStopFrames, floor(0.08 * 60));
        this.requestSFX("collision_generic", { type, ...context });
    }

    onBuffPickup(type, context = {}) {
        const px = Number(context.playerX ?? width / 2);
        const py = Number(context.playerY ?? height * 0.66);
        this.buffFlashFrames = max(this.buffFlashFrames, this.buffFlashMax);
        this.healthBarFlashFrames = this.healthBarFlashMax;


        for (let i = 0; i < 3; i++) {
            this.buffRipples.push({
                x: px,
                y: py,
                r: 24 + i * 20,
                growth: 14,
                life: 22 - i * 4,
                maxLife: 29 - i * 4
            });
        }

        for (let i = 0; i < 14; i++) {
            this.buffSpeedLines.push({
                x: px + random(-120, 120),
                y: py + random(-60, 80),
                vx: random(-0.8, 0.8),
                vy: random(-5.2, -2.4),
                len: random(20, 44),
                life: floor(random(12, 20)),
                maxLife: 20
            });
        }
        this.requestSFX("pickup_buff", { type, ...context });
    }

    onSmallBusinessCollision(type, context = {}) {
        const px = Number(context.playerX ?? width / 2);
        const py = Number(context.playerY ?? height * 0.66);

        this.smallBusinessFlashFrames = max(this.smallBusinessFlashFrames, this.smallBusinessFlashMax);
        this.smallBusinessBadgeFrames = this.smallBusinessBadgeMax;
        this.smallBusinessBadgeX = px;
        this.smallBusinessBadgeY = py - 84;

        this.smallBusinessRipples.push({
            x: px,
            y: py,
            r: 30,
            growth: 10,
            life: 22,
            maxLife: 22
        });

        this.requestSFX("collision_small_business", { type, ...context });
    }

    requestSFX(eventName, payload = {}) {
        // Only play SFX during day run (or paused mid-run)
        if (gameState.currentState !== STATE_DAY_RUN &&
            !(gameState.currentState === STATE_PAUSED &&
                gameState.previousState === STATE_DAY_RUN)) {
            return;
        }

        const handler = this.sfxMap[eventName];
        if (handler) {
            handler(payload);
        }
    }

    isHitStopActive() {
        return this.hitStopFrames > 0;
    }

    getCameraOffset() {
        if (this.cameraShakeFrames <= 0) return { x: 0, y: 0 };
        const t = this.cameraShakeFrames / 10;
        const amp = this.cameraShakeAmplitude * t;
        return {
            x: random(-amp, amp),
            y: random(-amp * 0.65, amp * 0.65)
        };
    }

    update() {
        if (this.hitFlashFrames > 0) this.hitFlashFrames--;
        if (this.buffFlashFrames > 0) this.buffFlashFrames--;
        if (this.smallBusinessFlashFrames > 0) this.smallBusinessFlashFrames--;
        if (this.healthBarFlashFrames > 0) this.healthBarFlashFrames--;
        if (this.smallBusinessBadgeFrames > 0) this.smallBusinessBadgeFrames--;
        if (this.hitStopFrames > 0) this.hitStopFrames--;
        if (this.cameraShakeFrames > 0) this.cameraShakeFrames--;

        for (let i = this.buffRipples.length - 1; i >= 0; i--) {
            const r = this.buffRipples[i];
            r.r += r.growth;
            r.life--;
            if (r.life <= 0) this.buffRipples.splice(i, 1);
        }

        for (let i = this.smallBusinessRipples.length - 1; i >= 0; i--) {
            const r = this.smallBusinessRipples[i];
            r.r += r.growth;
            r.life--;
            if (r.life <= 0) this.smallBusinessRipples.splice(i, 1);
        }

        for (let i = this.buffSpeedLines.length - 1; i >= 0; i--) {
            const ln = this.buffSpeedLines[i];
            ln.x += ln.vx;
            ln.y += ln.vy;
            ln.life--;
            if (ln.life <= 0) this.buffSpeedLines.splice(i, 1);
        }
    }

    display() {
        if (gameState.currentState !== STATE_DAY_RUN &&
            !(gameState.currentState === STATE_PAUSED && gameState.previousState === STATE_DAY_RUN)) {
            return;
        }

        push();
        noStroke();

        this.drawHitVignette();
        this.drawBuffFeedback();
        this.drawSmallBusinessFeedback();
        this.drawHealthBarFlash();

        pop();
    }

    drawHitVignette() {
        this.drawLowHealthVignette();
        if (this.hitFlashFrames <= 0) return;
        const t = this.hitFlashFrames / this.hitFlashMax;
        const c = this.theme.hitVignette;

        for (let i = 0; i < 9; i++) {
            const pad = i * 18;
            const a = (44 - i * 4) * t;
            noFill();
            stroke(c[0], c[1], c[2], a);
            strokeWeight(20);
            rect(pad, pad, width - pad * 2, height - pad * 2, 18);
        }
    }

    drawLowHealthVignette() {
        if (typeof player === "undefined" || !player || !player.maxHealth) return;
        const hpRatio = constrain(player.health / player.maxHealth, 0, 1);
        if (hpRatio >= 0.3) return;

        const dangerT = constrain((0.3 - hpRatio) / 0.3, 0, 1);
        const pulse = 0.58 + 0.42 * sin(frameCount * 0.26);
        const c = this.theme.lowHealthVignette || this.theme.hitVignette;

        for (let i = 0; i < 10; i++) {
            const pad = i * 17;
            const a = (24 + (28 - i * 1.7)) * dangerT * pulse;
            noFill();
            stroke(c[0], c[1], c[2], a);
            strokeWeight(24);
            rect(pad, pad, width - pad * 2, height - pad * 2, 20);
        }
    }

    drawBuffFeedback() {
        const rippleColor = this.theme.buffRipple;
        for (const r of this.buffRipples) {
            const t = r.life / r.maxLife;
            noFill();
            stroke(rippleColor[0], rippleColor[1], rippleColor[2], 200 * t);
            strokeWeight(6 * t + 1.5);
            circle(r.x, r.y, r.r * 2);
        }

        const lineColor = this.theme.buffSpeedLine;
        for (const ln of this.buffSpeedLines) {
            const t = ln.life / ln.maxLife;
            const ex = ln.x - ln.vx * ln.len * 0.12;
            const ey = ln.y - ln.vy * ln.len * 0.12;
            stroke(lineColor[0], lineColor[1], lineColor[2], 190 * t);
            strokeWeight(2.6);
            line(ln.x, ln.y, ex, ey);
        }
    }

    drawSmallBusinessFeedback() {
        const rippleColor = this.theme.smallBusinessRipple;
        for (const r of this.smallBusinessRipples) {
            const t = r.life / r.maxLife;
            noFill();
            stroke(rippleColor[0], rippleColor[1], rippleColor[2], 210 * t);
            strokeWeight(5 * t + 1.5);
            circle(r.x, r.y, r.r * 2);
        }

        if (this.smallBusinessBadgeFrames > 0) {
            const t = this.smallBusinessBadgeFrames / this.smallBusinessBadgeMax;
            const wave = sin(frameCount * 0.45) * 8;
            const bx = this.smallBusinessBadgeX;
            const by = this.smallBusinessBadgeY + wave;
            const badgeColor = this.theme.smallBusinessBadge;
            const textColor = this.theme.smallBusinessExclamation;

            fill(badgeColor[0], badgeColor[1], badgeColor[2], 235 * t + 20);
            stroke(40, 20, 0, 180 * t + 40);
            strokeWeight(3);
            ellipse(bx, by, 34, 34);
            noStroke();
            fill(textColor[0], textColor[1], textColor[2], 255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(28);
            text("!", bx, by + 1);
        }
    }

    drawHealthBarFlash() {
        if (this.healthBarFlashFrames <= 0) return;
        const t = this.healthBarFlashFrames / this.healthBarFlashMax;
        const c = this.theme.uiHealthFlash;
        noFill();
        stroke(c[0], c[1], c[2], 220 * t);
        strokeWeight(6);
        rect(161, 61, 408, 58, 8);
    }
}
