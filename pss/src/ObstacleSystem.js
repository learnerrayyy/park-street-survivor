// Hazard & Entity Management
// Responsibilities: Management of obstacle spawning, lifecycle, and collision detection logic.

class ObstacleManager {
    /**
     * CONSTRUCTOR: INITIALIZATION
     * Sets up the container for active hazards and initializes the spawning clock.
     */
    constructor() {
        // Container for all active obstacle instances currently in world-space
        this.obstacles = [];

        // Internal timer to regulate spawn frequency based on global difficulty
        this.spawnTimer = 0;

        this.currentLevelConfig = null;

        this.lastSpawnTime = 0;

        this.spriteCache = {};

        this.buffGuaranteeFrames = 0;
        this.buffGuaranteeTimer = 0;
        this.buffMinIntervalFrames = 0;
        this.buffCooldownFrames = 0;

        this.promoterInteraction = {
            active: false,
            spacePressCount: 0,
            spacePressRequired: 10,
            overlaySpritePath: null,
            projectile: null
        };
        this.promoterCooldownFramesRemaining = 0;
    }


    setLevelConfig(difficultyConfig) {
        this.currentLevelConfig = difficultyConfig;
        console.log("[ObstacleManager] Level config set:", difficultyConfig.description);
        const guaranteeSec = (difficultyConfig.spawnConfig && difficultyConfig.spawnConfig.buffGuaranteeIntervalSec) || 0;
        this.buffGuaranteeFrames = Math.max(0, this.secondsToFrames(guaranteeSec));
        this.buffGuaranteeTimer = this.buffGuaranteeFrames;
        const buffMinSec = (difficultyConfig.spawnConfig && difficultyConfig.spawnConfig.buffMinIntervalSec) || 0;
        this.buffMinIntervalFrames = Math.max(0, this.secondsToFrames(buffMinSec));
        this.buffCooldownFrames = 0;
    }


    getVariantForObstacle(obstacleType) {
        if (!this.currentLevelConfig || !this.currentLevelConfig.variants) {
            return null;
        }

        const variantConfig = this.currentLevelConfig.variants[obstacleType];
        if (!variantConfig || !variantConfig.variantPool) {
            return null;
        }

        const pool = variantConfig.variantPool;
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex];
    }

    selectRandomObstacle(forceBuff = false) {
        if (!this.currentLevelConfig || !this.currentLevelConfig.availableObstacles) {
            console.log("[DEBUG] selectRandomObstacle: no config or no availableObstacles");
            return null;
        }

        const available = this.currentLevelConfig.availableObstacles;
        console.log(`[DEBUG] selectRandomObstacle: available=${JSON.stringify(available)}`);


        const buffObstacles = ["COFFEE", "EMPTY_SCOOTER"];
        const buffInAvailable = available.filter(o => buffObstacles.includes(o));
        const hasActiveBuffOnScreen = this.obstacles.some(o => o.config && o.config.type === "BUFF");
        if (forceBuff) {
            if (buffInAvailable.length === 0 || hasActiveBuffOnScreen) return null;
            return this.pickWeightedObstacle(buffInAvailable);
        }

        const isBuff = !hasActiveBuffOnScreen &&
            this.buffCooldownFrames <= 0 &&
            (Math.random() < this.currentLevelConfig.spawnConfig.buffSpawnRatio);
        console.log(`[DEBUG] isBuff=${isBuff}, buffSpawnRatio=${this.currentLevelConfig.spawnConfig.buffSpawnRatio}`);

        if (isBuff) {

            if (buffInAvailable.length > 0) {
                return this.pickWeightedObstacle(buffInAvailable);
            }
        }


        let hazardsInAvailable = available.filter(o => !buffObstacles.includes(o));
        if (this.promoterCooldownFramesRemaining > 0) {
            hazardsInAvailable = hazardsInAvailable.filter(o => o !== "LARGE_CAR");
        }
        console.log(`[DEBUG] hazardsInAvailable=${JSON.stringify(hazardsInAvailable)}`);

        if (hazardsInAvailable.length > 0) {
            const selected = this.pickWeightedObstacle(hazardsInAvailable);
            console.log(`[DEBUG] selected hazard: ${selected}`);
            return selected;
        }

        const fallback = this.pickWeightedObstacle(available);
        console.log(`[DEBUG] fallback selection: ${fallback}`);
        return fallback;
    }

    pickWeightedObstacle(candidates) {
        if (!candidates || candidates.length === 0) return null;
        const weights = (this.currentLevelConfig && this.currentLevelConfig.obstacleWeights) || {};

        const normalized = candidates.map(type => {
            const raw = Number(weights[type] ?? 1.0);
            return { type, weight: Number.isFinite(raw) ? Math.max(0, raw) : 0 };
        });

        let totalWeight = 0;
        for (const item of normalized) totalWeight += item.weight;
        if (totalWeight <= 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        let r = Math.random() * totalWeight;
        for (const item of normalized) {
            r -= item.weight;
            if (r <= 0) return item.type;
        }
        return normalized[normalized.length - 1].type;
    }


    selectRandomLane() {
        const lanes = [1, 2, 3, 4];
        return lanes[Math.floor(Math.random() * lanes.length)];
    }

    selectRandomAllowedLane(config) {
        const allowed = (config && config.allowedLanes && config.allowedLanes.length > 0)
            ? config.allowedLanes
            : [1, 2, 3, 4];
        return allowed[Math.floor(Math.random() * allowed.length)];
    }


    spawnObstacle(forceBuff = false) {
        if (!this.currentLevelConfig) {
            console.log("[DEBUG] spawnObstacle: no currentLevelConfig");
            return;
        }

        const obstacleType = this.selectRandomObstacle(forceBuff);
        console.log(`[DEBUG] selectRandomObstacle returned: ${obstacleType}`);
        if (!obstacleType) {
            console.log("[DEBUG] spawnObstacle: obstacleType is null");
            return;
        }

        const config = OBSTACLE_CONFIG[obstacleType];
        if (!config) {
            console.warn(`[ObstacleManager] Unknown obstacle type: ${obstacleType}`);
            return;
        }


        const lane = this.selectRandomAllowedLane(config);


        const variantId = this.getVariantForObstacle(obstacleType);
        const variant = config.variants && config.variants.length > 0
            ? config.variants[Math.floor(Math.random() * config.variants.length)]
            : config.variants?.[0];

        const obstacle = {
            type: obstacleType,
            baseType: config.baseType,
            lane: lane,
            x: GLOBAL_CONFIG.lanes[`lane${lane}`],
            y: -config.size.height,
            width: config.size.width,
            height: config.size.height,
            speed: config.speed.min + Math.random() * (config.speed.max - config.speed.min),
            damage: config.damage,
            effect: config.effect,
            variant: variant,
            spritePath: (variant && variant.sprite) ? variant.sprite : config.sprite,
            config: config,
            variantId: variantId
        };

        if (obstacleType === "HOMELESS") {
            obstacle.dialogue = this.getHomelessDialogueText(config);
        }

        if (obstacleType === "SCOOTER_RIDER") {
            const intervalCfg = config.laneChangeInterval || { min: 0.5, max: 1.0 };
            obstacle.targetLane = lane;
            obstacle.laneChangeTimer = this.secondsToFrames(this.randomRange(intervalCfg.min, intervalCfg.max));
            obstacle.laneMoveFramesTotal = 0;
            obstacle.laneMoveFramesRemaining = 0;
            obstacle.laneMoveStartX = obstacle.x;
            obstacle.laneMoveTargetX = obstacle.x;
        }

        this.obstacles.push(obstacle);
        if (config.type === "BUFF" && this.buffGuaranteeFrames > 0) {
            this.buffGuaranteeTimer = this.buffGuaranteeFrames;
        }
        if (config.type === "BUFF" && this.buffMinIntervalFrames > 0) {
            this.buffCooldownFrames = this.buffMinIntervalFrames;
        }
        console.log(`[ObstacleManager] Spawned ${obstacleType} at lane ${lane}`);
    }

    /**

     */
    update(scrollSpeed, player) {
        // [Logic Disabled] No obstacles will spawn or translate on the Y-axis.
        // Reuse the existing array instead of allocating a new one every frame.
        this.obstacles.length = 0;
    }

    display() {
        for (let obs of this.obstacles) {
            push();


            if (obs.spritePath) {
                const img = this.getSpriteImage(obs.spritePath);
                if (img) {
                    imageMode(CENTER);
                    image(img, obs.x, obs.y, obs.width, obs.height);
                }
            }

            if (obs.type === "HOMELESS" && obs.dialogue) {
                this.displayHomelessDialogueBubble(obs);
            }

            pop();
        }

    }

    getHomelessDialogueText(config) {
        const dayID = Number((typeof currentDayID !== "undefined" && currentDayID) ? currentDayID : 1);
        if (config && config.dialoguesByDay && config.dialoguesByDay[dayID]) {
            return config.dialoguesByDay[dayID];
        }
        if (config && config.defaultDialogue) return config.defaultDialogue;
        return "";
    }

    displayHomelessDialogueBubble(obs) {
        const textContent = String(obs.dialogue || "").trim();
        if (!textContent) return;

        const bubble = this.getHomelessBubbleMetrics(obs, textContent);

        textAlign(LEFT, TOP);
        textStyle(BOLD);
        textSize(bubble.textSize);

        noStroke();
        fill(245, 245, 255, 240);
        rect(bubble.x, bubble.y, bubble.w, bubble.h, 10);

        // Fixed-size v1 bubble; future pass can map size to Y-depth.
        const anchorX = constrain(obs.x + bubble.offsetX, bubble.x + 22, bubble.x + bubble.w - 22);
        const tailBaseY = bubble.y + bubble.h;
        triangle(
            anchorX - 10, tailBaseY,
            anchorX + 10, tailBaseY,
            anchorX, tailBaseY + bubble.tailHeight
        );

        fill(25, 25, 35);
        for (let i = 0; i < bubble.lines.length; i++) {
            const tx = bubble.x + bubble.textPaddingX;
            const ty = bubble.y + bubble.textPaddingY + i * bubble.lineHeight;
            // Draw twice with tiny offset to strengthen pixel-font weight.
            text(bubble.lines[i], tx, ty);
            text(bubble.lines[i], tx + 0.8, ty);
        }
    }

    getHomelessBubbleMetrics(obs, textContent) {
        const cfg = (obs && obs.config) || {};
        const bubbleOffsetX = Number(cfg.bubbleOffsetX || 0);
        const bubbleTextSize = Math.max(10, Number(cfg.bubbleTextSize || 14));
        const roadCenterX = (GLOBAL_CONFIG.lanes.lane2 + GLOBAL_CONFIG.lanes.lane3) / 2;
        const towardRoadDir = obs.x <= roadCenterX ? 1 : -1;
        const directionalOffsetX = bubbleOffsetX * towardRoadDir;

        const maxBubbleWidth = 420;
        const textPaddingX = 14;
        const textPaddingY = 12;
        const lineHeight = Math.round(bubbleTextSize * 1.35);
        const tailHeight = 12;
        const bubbleGap = 14;

        textAlign(LEFT, TOP);
        textStyle(BOLD);
        textSize(bubbleTextSize);
        const textMaxWidth = maxBubbleWidth - textPaddingX * 2;
        const lines = this.wrapTextToWidth(textContent, textMaxWidth);

        const bubbleW = maxBubbleWidth;
        const bubbleH = textPaddingY * 2 + lines.length * lineHeight;
        const headY = obs.y - obs.height / 2;
        const bubbleBottomY = headY - bubbleGap;
        let bubbleY = bubbleBottomY - bubbleH;
        let bubbleX = (obs.x + directionalOffsetX) - bubbleW / 2;
        bubbleX = constrain(bubbleX, 12, width - bubbleW - 12);
        bubbleY = max(106, bubbleY);

        return {
            x: bubbleX,
            y: bubbleY,
            w: bubbleW,
            h: bubbleH,
            lines: lines,
            lineHeight: lineHeight,
            textPaddingX: textPaddingX,
            textPaddingY: textPaddingY,
            tailHeight: tailHeight,
            textSize: bubbleTextSize,
            offsetX: directionalOffsetX
        };
    }

    wrapTextToWidth(content, maxWidth) {
        if (!content) return [];
        const words = content.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];

        const lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const next = words[i];
            const candidate = `${currentLine} ${next}`;
            if (textWidth(candidate) <= maxWidth) {
                currentLine = candidate;
            } else {
                lines.push(currentLine);
                currentLine = next;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    checkCollision(player, obs) {

        const playerLeft = player.x - player.hitboxW / 2;
        const playerRight = player.x + player.hitboxW / 2;
        const playerTop = player.y - 20;
        const playerBottom = player.y + 20;

        const obsLeft = obs.x - obs.width / 2;
        const obsRight = obs.x + obs.width / 2;
        const obsTop = obs.y - obs.height / 2;
        const obsBottom = obs.y + obs.height / 2;

        const hitObstacleBody = !(playerRight < obsLeft ||
            playerLeft > obsRight ||
            playerBottom < obsTop ||
            playerTop > obsBottom);
        if (hitObstacleBody) return true;

        if (obs.type === "HOMELESS" && obs.dialogue) {
            const bubble = this.getHomelessBubbleMetrics(obs, obs.dialogue);
            const bubbleLeft = bubble.x;
            const bubbleRight = bubble.x + bubble.w;
            const bubbleTop = bubble.y;
            const bubbleBottom = bubble.y + bubble.h;

            const hitBubble = !(playerRight < bubbleLeft ||
                playerLeft > bubbleRight ||
                playerBottom < bubbleTop ||
                playerTop > bubbleBottom);
            if (hitBubble) return true;
        }

        return false;
    }


    handleCollision(player, obs) {
        const config = obs.config;


        if (config.damage > 0) {
            player.takeDamage(config.damage, obs.type);
        }

        if (config.effect === "stun" && typeof player.applyScooterRiderHit === "function") {
            player.applyScooterRiderHit(config.stunDuration || 0.5, config.laneDelayDuration || 1.0);
            // TODO: camera shake trigger hook.
        }

        if (config.effect === "speedBoostAndInvincible" && typeof player.applyEmptyScooterBuff === "function") {
            player.applyEmptyScooterBuff(
                config.speedBoostDuration || 5.0,
                config.invincibleDuration || 7.0,
                config.speedMultiplier || 1.2
            );
        }

        if (config.effect === "heal" && typeof player.applyCoffeeBuff === "function") {
            player.applyCoffeeBuff(
                config.healAmount || 0,
                config.overflowEffect || "",
                config.hpLockDuration || 3.0
            );
        }

        if (config.effect === "forcedLaneSwitch" && typeof player.applyHomelessForcedLaneSwitch === "function") {
            player.applyHomelessForcedLaneSwitch(obs.lane);
        }

        if (config.effect === "leaflet") {
            this.startPromoterInteraction(obs);
        }
    }

    startPromoterInteraction(obs) {
        const config = (obs && obs.config) || OBSTACLE_CONFIG.PROMOTER;
        this.promoterInteraction.active = true;
        this.promoterInteraction.spacePressCount = 0;
        this.promoterInteraction.spacePressRequired = config.spacePressRequired || 10;
        const flyers = Array.isArray(config.leafletSprites) ? config.leafletSprites : [];
        if (flyers.length > 0) {
            const randomFlyer = flyers[Math.floor(Math.random() * flyers.length)];
            this.promoterInteraction.overlaySpritePath = randomFlyer;
        } else {
            this.promoterInteraction.overlaySpritePath = null;
        }
        this.promoterInteraction.projectile = null;
        this.promoterCooldownFramesRemaining = this.secondsToFrames(config.interactionCooldown || 5.0);
    }

    handlePromoterSpacePress(player) {
        if (!this.promoterInteraction.active) return false;

        this.promoterInteraction.spacePressCount++;
        if (this.promoterInteraction.spacePressCount >= this.promoterInteraction.spacePressRequired) {
            this.firePromoterPaperBall(player);
            this.promoterInteraction.active = false;
            this.promoterInteraction.spacePressCount = 0;
        }
        return true;
    }

    firePromoterPaperBall(player) {
        const playerLane = this.getPlayerCurrentLane(player);
        this.clearNearestObstacleInLane(playerLane, player ? player.y : PLAYER_RUN_FOOT_Y);

        this.promoterInteraction.projectile = {
            x: player ? player.x : GLOBAL_CONFIG.lanes.lane1,
            y: player ? (player.y - 36) : (PLAYER_RUN_FOOT_Y - 36),
            speed: 22,
            ttl: 42
        };
    }

    updatePromoterProjectile(scrollSpeed) {
        const p = this.promoterInteraction.projectile;
        if (!p) return;

        p.y -= p.speed;
        p.y += scrollSpeed * 0.35;
        p.ttl--;

        if (p.ttl <= 0 || p.y < -40) {
            this.promoterInteraction.projectile = null;
        }
    }

    displayPromoterProjectile() {
        const p = this.promoterInteraction.projectile;
        if (!p) return;

        push();
        textAlign(CENTER, CENTER);
        textSize(34);
        text("🔵", p.x, p.y);
        pop();
    }

    displayPromoterOverlay() {
        if (!this.promoterInteraction.active) return;

        push();
        const overlayPath = this.promoterInteraction.overlaySpritePath;
        const overlayImg = overlayPath ? this.getSpriteImage(overlayPath) : null;

        imageMode(CORNER);
        if (overlayImg) {
            const overlayW = 810;
            const overlayH = 970.;
            const overlayX = (width - overlayW) / 2;
            const overlayY = (height - overlayH) / 2;
            image(overlayImg, overlayX, overlayY, overlayW, overlayH);
        } else {
            noStroke();
            fill(20, 40, 80, 235);
            rect(0, 0, width, height);
        }

        const remain = max(0, this.promoterInteraction.spacePressRequired - this.promoterInteraction.spacePressCount);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(28);
        textStyle(BOLD);
        text(`PRESS SPACE x${remain}`, width / 2, height - 110);
        pop();
    }

    getSpriteImage(spritePath) {
        let img = this.spriteCache[spritePath];
        if (!img && assets && assets.previews) {
            const fileNameKey = spritePath.split('/').pop().replace('.png', '').toLowerCase();
            img = assets.previews[fileNameKey];
        }
        if (!img) {
            img = loadImage(spritePath);
            this.spriteCache[spritePath] = img;
        }
        return img;
    }

    getPlayerCurrentLane(player) {
        if (!player) return 1;
        const laneFromIndex = (typeof player.currentLaneIndex === "number")
            ? player.currentLaneIndex + 1
            : null;
        if (laneFromIndex && laneFromIndex >= 1 && laneFromIndex <= 4) return laneFromIndex;

        let nearestLane = 1;
        let nearestDist = Number.POSITIVE_INFINITY;
        for (let lane = 1; lane <= 4; lane++) {
            const laneX = GLOBAL_CONFIG.lanes[`lane${lane}`];
            const d = Math.abs(player.x - laneX);
            if (d < nearestDist) {
                nearestDist = d;
                nearestLane = lane;
            }
        }
        return nearestLane;
    }

    clearNearestObstacleInLane(lane, playerY) {
        if (!lane) return;

        let targetIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (!obs || obs.lane !== lane) continue;
            if (obs.type === "PROMOTER") continue;

            const forwardDistance = (playerY || PLAYER_RUN_FOOT_Y) - obs.y;
            if (forwardDistance < 0) continue;
            if (forwardDistance < bestDistance) {
                bestDistance = forwardDistance;
                targetIndex = i;
            }
        }

        if (targetIndex >= 0) this.obstacles.splice(targetIndex, 1);
    }

    updateDynamicLaneBehavior(obs) {
        if (!obs || obs.type !== "SCOOTER_RIDER") return;

        const cfg = obs.config || {};
        const laneCount = 4;
        const intervalCfg = cfg.laneChangeInterval || { min: 0.5, max: 1.0 };
        const durationCfg = cfg.laneChangeDuration || { min: 0.18, max: 0.28 };

        // Linear lane switch in progress
        if ((obs.laneMoveFramesRemaining || 0) > 0) {
            const movedFrames = obs.laneMoveFramesTotal - obs.laneMoveFramesRemaining + 1;
            const t = constrain(movedFrames / obs.laneMoveFramesTotal, 0, 1);
            obs.x = lerp(obs.laneMoveStartX, obs.laneMoveTargetX, t);
            obs.laneMoveFramesRemaining--;

            if (obs.laneMoveFramesRemaining <= 0) {
                obs.x = obs.laneMoveTargetX;
                obs.lane = obs.targetLane;
                obs.laneChangeTimer = this.secondsToFrames(this.randomRange(intervalCfg.min, intervalCfg.max));
            }
            return;
        }

        // Waiting between lane changes
        obs.laneChangeTimer = (obs.laneChangeTimer || 0) - 1;
        if (obs.laneChangeTimer <= 0) {
            const step = Math.random() < 0.5 ? -1 : 1;
            let nextLane = (obs.targetLane || obs.lane || 1) + step;
            if (nextLane < 1 || nextLane > laneCount) nextLane = (obs.targetLane || obs.lane || 1) - step;
            nextLane = constrain(nextLane, 1, laneCount);

            obs.targetLane = nextLane;
            obs.laneMoveStartX = obs.x;
            obs.laneMoveTargetX = GLOBAL_CONFIG.lanes[`lane${nextLane}`];
            obs.laneMoveFramesTotal = this.secondsToFrames(this.randomRange(durationCfg.min, durationCfg.max));
            obs.laneMoveFramesRemaining = obs.laneMoveFramesTotal;
        }
    }

    secondsToFrames(seconds) {
        return Math.max(1, Math.floor(seconds * 60));
    }

    randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * VICTORY PHASE: STOP SPAWNING
     * Called when victory phase is triggered.
     * Prevents new obstacles from spawning during victory zone.
     */
    stopSpawning() {
        console.log("[ObstacleManager] Spawning stopped - Victory phase active");
        this.obstacles.length = 0;
    }

    renderPromoterEffects() {
        this.displayPromoterProjectile();
        this.displayPromoterOverlay();
    }
}
