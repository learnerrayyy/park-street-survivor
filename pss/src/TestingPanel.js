// Obstacle Debug Panel
// Responsibilities: Runtime tuning UI for per-day obstacle enablement and level parameters.

class TestingPanel {
    constructor() {
        this.visible = false;
        this.selectedDay = 1;
        this.hasOpened = false;

        this.editTarget = null;
        this.inputBuffer = "";

        this.rowHitboxes = [];
        this.dayButtons = [];
        this.devButtons = [];
        this.dayParamHitboxes = [];
        this.homelessParamHitboxes = [];

        this.obstacleOrder = Object.keys(OBSTACLE_CONFIG);
        this.dayOrder = Object.keys(DIFFICULTY_PROGRESSION).map(Number).sort((a, b) => a - b);
        this.baseDayMap = this.buildBaseDayMap();

        this.dayParamDefs = [
            { key: "description", label: "Description", valueType: "text" },
            { key: "totalDistance", label: "Length(totalDistance)", valueType: "int", min: 1 },
            { key: "realTimeLimit", label: "realTimeLimit", valueType: "int", min: 1 },
            { key: "obstacleSpawnInterval", label: "obstacleSpawnInterval", valueType: "int", min: 0 },
            { key: "baseScrollSpeed", label: "baseScrollSpeed", valueType: "number", min: 0 },
            { key: "basePlayerSpeed", label: "basePlayerSpeed", valueType: "number", min: 0 },
            { key: "healthDecay", label: "healthDecay", valueType: "number", min: 0 },
            { key: "type", label: "type", valueType: "text" }
        ];
        this.homelessParamDefs = [
            { key: "bubbleOffsetX", label: "bubbleOffsetX", valueType: "number" },
            { key: "bubbleTextSize", label: "bubbleTextSize", valueType: "number", min: 10 }
        ];

        this.initializeDifficultyDebugFields();
        this.initializeHomelessDebugFields();
    }

    buildBaseDayMap() {
        const map = {};
        for (const obstacleType of this.obstacleOrder) map[obstacleType] = [];

        for (const [dayKey, cfg] of Object.entries(DIFFICULTY_PROGRESSION)) {
            const day = Number(dayKey);
            const available = cfg.availableObstacles || [];
            for (const obstacleType of available) {
                if (map[obstacleType]) map[obstacleType].push(day);
            }
        }
        return map;
    }

    initializeDifficultyDebugFields() {
        for (const dayKey of Object.keys(DIFFICULTY_PROGRESSION)) {
            const cfg = DIFFICULTY_PROGRESSION[dayKey];
            if (!Array.isArray(cfg.availableObstacles)) cfg.availableObstacles = [];
            if (!cfg.obstacleWeights) cfg.obstacleWeights = {};

            for (const obstacleType of this.obstacleOrder) {
                if (cfg.obstacleWeights[obstacleType] === undefined) {
                    cfg.obstacleWeights[obstacleType] = 1.0;
                }
            }
        }
    }

    initializeHomelessDebugFields() {
        if (!OBSTACLE_CONFIG.HOMELESS) return;
        if (OBSTACLE_CONFIG.HOMELESS.bubbleOffsetX === undefined) OBSTACLE_CONFIG.HOMELESS.bubbleOffsetX = 0;
        if (OBSTACLE_CONFIG.HOMELESS.bubbleTextSize === undefined) OBSTACLE_CONFIG.HOMELESS.bubbleTextSize = 14;
    }

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            if (!this.hasOpened) {
                this.selectedDay = currentDayID || this.selectedDay || 1;
                this.hasOpened = true;
            }
            this.cancelEditing();
        }
    }

    isVisible() {
        return this.visible;
    }

    getCurrentDifficultyConfig() {
        return DIFFICULTY_PROGRESSION[this.selectedDay] || null;
    }

    getCurrentDayConfig() {
        return DAYS_CONFIG[this.selectedDay] || null;
    }

    isObstacleEnabled(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return false;
        return (cfg.availableObstacles || []).includes(obstacleType);
    }

    toggleObstacle(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return;

        const available = cfg.availableObstacles || [];
        const idx = available.indexOf(obstacleType);
        if (idx >= 0) {
            available.splice(idx, 1);
            if (this.isEditingWeight(obstacleType)) this.cancelEditing();
        } else {
            available.push(obstacleType);
            available.sort((a, b) => this.obstacleOrder.indexOf(a) - this.obstacleOrder.indexOf(b));
        }

        this.applyLiveConfigIfActiveDay();
    }

    isEditingWeight(obstacleType) {
        return this.editTarget && this.editTarget.kind === "weight" && this.editTarget.obstacleType === obstacleType;
    }

    isEditingDayParam(paramKey) {
        return this.editTarget && this.editTarget.kind === "dayParam" && this.editTarget.paramKey === paramKey;
    }

    isEditingHomelessParam(paramKey) {
        return this.editTarget && this.editTarget.kind === "homelessParam" && this.editTarget.paramKey === paramKey;
    }

    beginWeightEdit(obstacleType) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg || !this.isObstacleEnabled(obstacleType)) return;
        const w = cfg.obstacleWeights[obstacleType];
        this.editTarget = { kind: "weight", obstacleType };
        this.inputBuffer = Number.isFinite(Number(w)) ? String(w) : "1";
    }

    beginDayParamEdit(paramKey) {
        const cfg = this.getCurrentDayConfig();
        if (!cfg) return;
        this.editTarget = { kind: "dayParam", paramKey };
        this.inputBuffer = String(cfg[paramKey] ?? "");
    }

    beginHomelessParamEdit(paramKey) {
        const cfg = OBSTACLE_CONFIG.HOMELESS;
        if (!cfg) return;
        this.editTarget = { kind: "homelessParam", paramKey };
        this.inputBuffer = String(cfg[paramKey] ?? "");
    }

    cancelEditing() {
        this.editTarget = null;
        this.inputBuffer = "";
    }

    commitEdit() {
        if (!this.editTarget) return;

        if (this.editTarget.kind === "weight") {
            const cfg = this.getCurrentDifficultyConfig();
            if (cfg) {
                const parsed = parseFloat(this.inputBuffer);
                cfg.obstacleWeights[this.editTarget.obstacleType] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1.0;
            }
        }

        if (this.editTarget.kind === "dayParam") {
            const cfg = this.getCurrentDayConfig();
            const def = this.dayParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (cfg && def) {
                if (def.valueType === "text") {
                    const textVal = String(this.inputBuffer || "").trim();
                    cfg[def.key] = textVal.length > 0 ? textVal : String(cfg[def.key] ?? "");
                } else {
                    let num = parseFloat(this.inputBuffer);
                    if (!Number.isFinite(num)) num = Number(cfg[def.key] ?? 0);
                    if (def.valueType === "int") num = Math.round(num);
                    if (typeof def.min === "number") num = Math.max(def.min, num);
                    cfg[def.key] = num;
                }
                this.applyLiveConfigIfActiveDay();
            }
        }

        if (this.editTarget.kind === "homelessParam") {
            const cfg = OBSTACLE_CONFIG.HOMELESS;
            const def = this.homelessParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (cfg && def) {
                let num = parseFloat(this.inputBuffer);
                if (!Number.isFinite(num)) num = Number(cfg[def.key] ?? 0);
                if (typeof def.min === "number") num = Math.max(def.min, num);
                cfg[def.key] = num;
            }
        }

        this.cancelEditing();
    }

    applyLiveConfigIfActiveDay() {
        if (!levelController) return;
        const activeDay = Number(levelController.currentDayID || currentDayID || 0);
        if (activeDay !== Number(this.selectedDay)) return;

        if (typeof levelController.applyDifficultyParameters === "function") {
            levelController.applyDifficultyParameters(activeDay);
        }

        if (obstacleManager && levelController.proceduralLevel &&
            typeof levelController.proceduralLevel.getDifficultyConfig === "function") {
            obstacleManager.setLevelConfig(levelController.proceduralLevel.getDifficultyConfig());
        }
    }

    handleKeyPressed(k, kCode) {
        if (!this.visible) return false;

        if (kCode === ESCAPE) {
            this.commitEdit();
            this.visible = false;
            return true;
        }

        if (kCode === LEFT_ARROW) {
            this.commitEdit();
            this.selectedDay = max(this.dayOrder[0] || 1, this.selectedDay - 1);
            return true;
        }
        if (kCode === RIGHT_ARROW) {
            this.commitEdit();
            this.selectedDay = min(this.dayOrder[this.dayOrder.length - 1] || 1, this.selectedDay + 1);
            return true;
        }

        if (!this.editTarget) return true;

        if (kCode === ENTER || kCode === RETURN || kCode === TAB) {
            this.commitEdit();
            return true;
        }
        if (kCode === BACKSPACE) {
            this.inputBuffer = this.inputBuffer.slice(0, -1);
            return true;
        }

        if (this.editTarget.kind === "dayParam") {
            const def = this.dayParamDefs.find(d => d.key === this.editTarget.paramKey);
            if (def && def.valueType === "text") {
                if (k && k.length === 1) {
                    this.inputBuffer += k;
                    return true;
                }
                return true;
            }
        }

        const isDigit = /^[0-9]$/.test(k);
        if (isDigit) {
            this.inputBuffer += k;
            return true;
        }
        if (k === "." && !this.inputBuffer.includes(".")) {
            this.inputBuffer += ".";
            return true;
        }
        if (k === "-" && this.inputBuffer.length === 0) {
            this.inputBuffer = "-";
            return true;
        }

        return true;
    }

    handleMousePressed(mx, my) {
        if (!this.visible) return false;

        for (const btn of this.dayButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                this.commitEdit();
                this.selectedDay = btn.day;
                return true;
            }
        }

        for (const box of this.dayParamHitboxes) {
            if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                this.commitEdit();
                this.beginDayParamEdit(box.key);
                return true;
            }
        }

        for (const box of this.homelessParamHitboxes) {
            if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                this.commitEdit();
                this.beginHomelessParamEdit(box.key);
                return true;
            }
        }

        for (const row of this.rowHitboxes) {
            const inWeight = mx >= row.weightX && mx <= row.weightX + row.weightW &&
                my >= row.y && my <= row.y + row.h;
            if (inWeight) {
                this.commitEdit();
                this.beginWeightEdit(row.type);
                return true;
            }

            const inToggle = mx >= row.toggleX && mx <= row.toggleX + row.toggleW &&
                my >= row.y && my <= row.y + row.h;
            if (inToggle) {
                this.commitEdit();
                this.toggleObstacle(row.type);
                return true;
            }
        }

        for (const btn of this.devButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                this.commitEdit();
                this.executeDevAction(btn.id);
                return true;
            }
        }

        this.commitEdit();
        return true;
    }

    executeDevAction(actionId) {
        if (actionId === "restart_current") {
            const day = Number((levelController && levelController.currentDayID) || currentDayID || this.selectedDay || 1);
            if (typeof setupRunTestMode === "function") setupRunTestMode(day);
            return;
        }

        if (actionId === "run_selected_day") {
            if (typeof setupRunTestMode === "function") setupRunTestMode(this.selectedDay);
            return;
        }

        if (actionId === "goto_room") {
            if (typeof setupRoomTestMode === "function") setupRoomTestMode();
            return;
        }

        if (actionId === "refill") {
            if (typeof devRefillHealth === "function") devRefillHealth();
            return;
        }

        if (actionId === "toggle_dev") {
            if (typeof devToggle === "function") devToggle();
            return;
        }

        if (actionId === "win") {
            if (typeof devGoToWin === "function") devGoToWin();
            return;
        }

        if (actionId === "fail_hit_bus") {
            if (typeof devGoToFail === "function") devGoToFail("HIT_BUS");
            return;
        }

        if (actionId === "fail_late") {
            if (typeof devGoToFail === "function") devGoToFail("LATE");
            return;
        }
    }

    draw() {
        if (!this.visible) return;

        const panelX = 100;
        const panelY = 60;
        const panelW = width - 200;
        const panelH = height - 120;

        push();
        noStroke();
        fill(0, 180);
        rect(0, 0, width, height);

        fill(24, 28, 40, 242);
        rect(panelX, panelY, panelW, panelH, 14);

        fill(255);
        textAlign(LEFT, CENTER);
        textStyle(BOLD);
        textSize(34);
        text("OBSTACLE TUNER", panelX + 24, panelY + 34);
        textStyle(BOLD);
        textSize(18);
        text("` / F2: Close  |  Click cells to edit  |  Enter: commit", panelX + 24, panelY + 62);

        this.drawDaySelector(panelX + 24, panelY + 80);
        this.drawDayParams(panelX + 24, panelY + 126, panelW - 48, 164);
        this.drawHomelessBubbleParams(panelX + 24, panelY + 296, panelW - 48, 82);
        this.drawObstacleTable(panelX + 24, panelY + 386, panelW - 48, panelH - 508);
        this.drawDevActions(panelX + 24, panelY + panelH - 108, panelW - 48, 84);
        pop();
    }

    drawDaySelector(x, y) {
        this.dayButtons = [];
        const buttonW = 122;
        const buttonH = 34;
        const gap = 10;

        for (let i = 0; i < this.dayOrder.length; i++) {
            const day = this.dayOrder[i];
            const bx = x + i * (buttonW + gap);
            const selected = day === this.selectedDay;

            fill(selected ? color(67, 135, 255) : color(85, 92, 108));
            rect(bx, y, buttonW, buttonH, 7);
            fill(255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(22);
            text(`DAY ${day}`, bx + buttonW / 2, y + buttonH / 2 + 1);

            this.dayButtons.push({ day, x: bx, y, w: buttonW, h: buttonH });
        }
    }

    drawDayParams(x, y, w, h) {
        const cfg = this.getCurrentDayConfig();
        if (!cfg) return;

        this.dayParamHitboxes = [];

        fill(255, 255, 255, 22);
        rect(x, y, w, h, 8);
        fill(220);
        textStyle(BOLD);
        textSize(21);
        textAlign(LEFT, CENTER);
        text("Day Config (DAYS_CONFIG)", x + 12, y + 16);

        const innerX = x + 10;
        const innerY = y + 30;
        const colGap = 12;
        const colW = floor((w - 20 - colGap) / 2);
        const rowH = 30;

        for (let i = 0; i < this.dayParamDefs.length; i++) {
            const def = this.dayParamDefs[i];
            const col = i % 2;
            const row = floor(i / 2);
            const cellX = innerX + col * (colW + colGap);
            const cellY = innerY + row * rowH;

            fill(180);
            textStyle(BOLD);
            textSize(18);
            textAlign(LEFT, CENTER);
            text(def.label, cellX, cellY + rowH / 2);

            const valueBoxW = 186;
            const valueX = cellX + colW - valueBoxW;
            const isEditing = this.isEditingDayParam(def.key);
            fill(isEditing ? color(78, 124, 214, 230) : color(44, 52, 72, 230));
            rect(valueX, cellY + 4, valueBoxW, rowH - 8, 5);

            fill(255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(18);
            const rawVal = cfg[def.key];
            const valueText = isEditing ? `${this.inputBuffer}_` : String(rawVal);
            text(valueText, valueX + valueBoxW / 2, cellY + rowH / 2 + 1);

            this.dayParamHitboxes.push({ key: def.key, x: valueX, y: cellY + 4, w: valueBoxW, h: rowH - 8 });
        }
    }

    drawHomelessBubbleParams(x, y, w, h) {
        const cfg = OBSTACLE_CONFIG.HOMELESS;
        if (!cfg) return;

        this.homelessParamHitboxes = [];

        fill(255, 255, 255, 22);
        rect(x, y, w, h, 8);
        fill(220);
        textStyle(BOLD);
        textSize(19);
        textAlign(LEFT, CENTER);
        text("Homeless Bubble", x + 12, y + 16);

        const startX = x + 12;
        const startY = y + 40;
        const gap = 18;
        const cellW = floor((w - 24 - gap) / 2);
        const labelY = startY + 14;

        for (let i = 0; i < this.homelessParamDefs.length; i++) {
            const def = this.homelessParamDefs[i];
            const cellX = startX + i * (cellW + gap);

            fill(180);
            textStyle(BOLD);
            textSize(16);
            textAlign(LEFT, CENTER);
            text(def.label, cellX, labelY);

            const valueW = 180;
            const valueX = cellX + cellW - valueW;
            const isEditing = this.isEditingHomelessParam(def.key);
            fill(isEditing ? color(78, 124, 214, 230) : color(44, 52, 72, 230));
            rect(valueX, startY, valueW, 28, 5);

            fill(255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(16);
            const valueText = isEditing ? `${this.inputBuffer}_` : String(cfg[def.key]);
            text(valueText, valueX + valueW / 2, startY + 14);

            this.homelessParamHitboxes.push({ key: def.key, x: valueX, y: startY, w: valueW, h: 28 });
        }
    }

    drawObstacleTable(x, y, w, h) {
        const cfg = this.getCurrentDifficultyConfig();
        if (!cfg) return;

        this.rowHitboxes = [];

        const rowH = 38;
        const headerH = 30;
        const colTypeX = x + 10;
        const colCatX = x + 240;
        const colDamageX = x + 382;
        const colEffectX = x + 500;
        const colDayX = x + 760;
        const colWeightX = x + w - 170;
        const weightW = 140;

        fill(255, 255, 255, 26);
        rect(x, y, w, headerH, 8);
        fill(220);
        textStyle(BOLD);
        textSize(19);
        textAlign(LEFT, CENTER);
        text("Obstacle", colTypeX, y + headerH / 2 + 1);
        text("Category", colCatX, y + headerH / 2 + 1);
        text("Damage", colDamageX, y + headerH / 2 + 1);
        text("Effect", colEffectX, y + headerH / 2 + 1);
        text("Default Days", colDayX, y + headerH / 2 + 1);
        text("Weight", colWeightX + 8, y + headerH / 2 + 1);

        const maxRows = floor((h - headerH) / rowH);
        const rowsToDraw = min(this.obstacleOrder.length, maxRows);

        for (let i = 0; i < rowsToDraw; i++) {
            const obstacleType = this.obstacleOrder[i];
            const obCfg = OBSTACLE_CONFIG[obstacleType] || {};
            const rowY = y + headerH + i * rowH;
            const enabled = this.isObstacleEnabled(obstacleType);
            const baseDays = (this.baseDayMap[obstacleType] || []).join(", ");

            fill(enabled ? color(45, 62, 98, 220) : color(78, 78, 86, 190));
            rect(x, rowY, w, rowH - 2, 6);

            fill(enabled ? 255 : 170);
            textStyle(BOLD);
            textSize(18);
            textAlign(LEFT, CENTER);
            text(obstacleType, colTypeX, rowY + rowH / 2);
            text(obCfg.type || "-", colCatX, rowY + rowH / 2);
            text(String(obCfg.damage ?? "-"), colDamageX, rowY + rowH / 2);
            text(obCfg.effect || "-", colEffectX, rowY + rowH / 2);
            text(baseDays || "-", colDayX, rowY + rowH / 2);

            fill(enabled ? color(25, 36, 64, 230) : color(66, 66, 74, 220));
            rect(colWeightX, rowY + 5, weightW, rowH - 12, 5);
            fill(enabled ? 255 : 160);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(18);
            const isEditing = this.isEditingWeight(obstacleType);
            const weightText = enabled
                ? (isEditing ? `${this.inputBuffer || ""}_` : String((cfg.obstacleWeights || {})[obstacleType] ?? 1))
                : "--";
            text(weightText, colWeightX + weightW / 2, rowY + rowH / 2);

            this.rowHitboxes.push({
                type: obstacleType,
                y: rowY,
                h: rowH - 2,
                toggleX: x,
                toggleW: w,
                weightX: colWeightX,
                weightW: weightW
            });
        }
    }

    drawDevActions(x, y, w, h) {
        this.devButtons = [];

        fill(255, 255, 255, 22);
        rect(x, y, w, h, 8);
        fill(220);
        textAlign(LEFT, CENTER);
        textStyle(BOLD);
        textSize(20);
        text("Dev Actions", x + 12, y + 14);

        const buttons = [
            { id: "restart_current", label: "Restart Current" },
            { id: "run_selected_day", label: `Run Day ${this.selectedDay}` },
            { id: "goto_room", label: "Go Room" },
            { id: "refill", label: "Refill HP" },
            { id: "toggle_dev", label: developerMode ? "Dev ON" : "Dev OFF" },
            { id: "win", label: "Force Win" },
            { id: "fail_hit_bus", label: "Fail HIT_BUS" },
            { id: "fail_late", label: "Fail LATE" }
        ];

        const btnGap = 8;
        const btnW = floor((w - 16 - (buttons.length - 1) * btnGap) / buttons.length);
        const btnH = 38;
        const startX = x + 8;
        const btnY = y + 28;

        for (let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            const bx = startX + i * (btnW + btnGap);

            fill(54, 72, 108, 235);
            rect(bx, btnY, btnW, btnH, 6);
            fill(255);
            textAlign(CENTER, CENTER);
            textStyle(BOLD);
            textSize(17);
            text(b.label, bx + btnW / 2, btnY + btnH / 2 + 1);

            this.devButtons.push({ id: b.id, x: bx, y: btnY, w: btnW, h: btnH });
        }
    }
}
