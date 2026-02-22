/**
 * LEVEL CONTROLLER
 * Responsibilities: Route dayID to appropriate level instance, manage level lifecycle,
 * apply difficulty parameters, and coordinate transitions between scenes.
 */
class LevelController {
   /**
    * CONSTRUCTOR: INITIALIZATION
    * Creates references for level instances and configuration storage.
    */
   constructor() {
      // Level Instance References
      this.proceduralLevel = null;
      this.currentLevel = null;

      // Session tracking
      this.currentDayID = 1;
      this.levelType = "NORMAL"; // NORMAL level

      // Victory Phase Management
      this.levelPhase = "RUNNING"; // RUNNING, VICTORY_TRANSITION, or VICTORY_ZONE
      this.victoryStartScrollPos = 0; // Record scrollPos when victory triggers
      this.victoryZoneFrames = 0; // Frames spent in victory zone (1.5s = 90 frames)
      this.victoryZoneStartY = 0; // Y position of victory bg when entering VICTORY_ZONE
   }

   /**
    * LIFECYCLE: LEVEL INITIALIZATION
    * Called when entering DAY_RUN state from the room scene.
    * Routes to the correct level based on currentDayID.
    */
   initializeLevel(dayID) {
      console.log(`[LevelController] Initializing Level - Day ${dayID}`);

      this.currentDayID = dayID;
      this.resetRunPhaseState();
      const levelConfig = DAYS_CONFIG[dayID];

      if (!levelConfig) {
         console.error(`[LevelController] ERROR: Day ${dayID} not found in DAYS_CONFIG`);
         return false;
      }

      // Initialize procedural level
      this.initializeProceduralLevel(dayID, levelConfig);

      // Apply level-specific difficulty parameters to player
      this.applyDifficultyParameters(dayID);

      // Load background images for this day
      this.loadLevelBackgrounds(dayID);

      return true;
   }

   /**
    * SESSION RESET: PREPARE A FRESH RUN
    * Ensures re-entering a day after WIN/FAIL starts from RUNNING phase.
    */
   resetRunPhaseState() {
      this.levelPhase = "RUNNING";
      this.victoryStartScrollPos = 0;
      this.victoryZoneFrames = 0;
      this.victoryZoneStartY = 0;

      if (typeof env !== "undefined" && env) {
         env.scrollPos = 0;
         env.defaultBgHeadIndex = 0;
      }
   }

   /**
    * ASSET LOADING: BACKGROUND IMAGES
    * Dynamically loads default and destination backgrounds for the current day.
    */
   loadLevelBackgrounds(dayID) {
      console.log(`[LevelController] Loading backgrounds for Day ${dayID}`);

      try {
         // Load running background cycle (A/B/C). Keep current scroll logic unchanged;
         // only tile image source varies.
         const sunnyRunPaths = [
            "assets/background/bg_sunny/bg_sunny_A.png",
            "assets/background/bg_sunny/bg_sunny_B.png",
            "assets/background/bg_sunny/bg_sunny_C.png"
         ];
         const shuffledRunPaths = [...sunnyRunPaths].sort(() => Math.random() - 0.5);
         env.defaultBgCycle = [];
         env.defaultBgHeadIndex = 0;
         for (const p of shuffledRunPaths) {
            const img = loadImage(
               p,
               () => console.log(`[LevelController] ✓ Loaded run tile: ${p}`),
               () => console.warn(`[LevelController] ✗ Failed to load run tile: ${p}`)
            );
            env.defaultBgCycle.push(img);
         }
         env.defaultBg = env.defaultBgCycle[0] || null;

         // Load destination/victory background
         let destinationBgPath = `assets/background/day${dayID}_destination.png`;
         if (dayID >= 1 && dayID <= 3) destinationBgPath = "assets/background/bg_sunny/bg_sunny_destination.png";
         if (dayID === 4) destinationBgPath = "assets/background/bg_light_rain/bg_light_rain_destination.png";
         if (dayID === 5) destinationBgPath = "assets/background/bg_heavy_rain/bg_heavy_rain_destination.png";

         env.destinationBg = loadImage(destinationBgPath,
            () => console.log(`[LevelController] ✓ Loaded destination background: ${destinationBgPath}`),
            () => console.warn(`[LevelController] ✗ Failed to load: ${destinationBgPath}`)
         );
      } catch (error) {
         console.error(`[LevelController] Error loading backgrounds: ${error}`);
      }
   }

   /**
    * LEVEL ROUTING: PROCEDURAL LEVEL
    * Instantiate and initialize the ProceduralLevel for all days.
    */
   initializeProceduralLevel(dayID, config) {
      console.log(`[LevelController] → Loading Procedural Level (Day ${dayID})`);

      this.proceduralLevel = new ProceduralLevel(dayID, config);
      this.currentLevel = this.proceduralLevel;
      this.levelType = "NORMAL";

      // Initialize level with session data
      this.proceduralLevel.setup();

      // Set obstacle manager difficulty config
      if (typeof obstacleManager !== 'undefined' && obstacleManager) {
         const difficultyConfig = this.proceduralLevel.getDifficultyConfig();
         console.log(`[LevelController] Setting level config for ObstacleManager:`, difficultyConfig);
         obstacleManager.setLevelConfig(difficultyConfig);
      } else {
         console.warn(`[LevelController] obstacleManager is not defined!`);
      }
   }

   /**
    * DIFFICULTY PARAMETERS: APPLY TO SYSTEMS
    * Transfers level-specific parameters to player and obstacle manager.
    */
   applyDifficultyParameters(dayID) {
      const config = DAYS_CONFIG[dayID];

      console.log(`[LevelController] Applying difficulty parameters for Day ${dayID}:`);
      console.log(`  - scrollSpeed: ${config.baseScrollSpeed}`);
      console.log(`  - playerSpeed: ${config.basePlayerSpeed}`);
      console.log(`  - healthDecay: ${config.healthDecay}`);

      // Apply to Player
      if (player) {
         player.baseSpeed = config.basePlayerSpeed;
         player.healthDecay = config.healthDecay;
      }

      // Update global scroll speed
      GLOBAL_CONFIG.scrollSpeed = config.baseScrollSpeed;
   }

   /**
    * LIFECYCLE: UPDATE LOOP
    * Called every frame during STATE_DAY_RUN.
    * Delegates to the current level's update logic.
    */
   update() {
      if (!this.currentLevel) return;

      this.currentLevel.update();
   }

   /**
    * LIFECYCLE: DISPLAY/RENDER
    * Called every frame during STATE_DAY_RUN.
    * Delegates to the current level's display logic.
    */
   display() {
      if (!this.currentLevel) return;

      this.currentLevel.display();
   }

   /**
    * LIFECYCLE: LEVEL RESET
    * Called when restarting a level after failure.
    */
   resetLevel() {
      console.log(`[LevelController] Resetting Level - Day ${this.currentDayID}`);

      if (this.currentLevel) {
         this.currentLevel.reset();
      }

      // Reset player to level start state
      if (player) {
         player.applyLevelStats(this.currentDayID);
      }
   }

   /**
    * LIFECYCLE: LEVEL CLEANUP
    * Called when leaving a level to prepare for next scene.
    */
   cleanup() {
      console.log(`[LevelController] Cleaning up Level - Day ${this.currentDayID}`);

      if (this.currentLevel) {
         this.currentLevel.cleanup();
      }

      this.currentLevel = null;
   }

   /**
    * QUERY: GET CURRENT LEVEL TYPE
    * Returns the type of level currently active (NORMAL).
    */
   getLevelType() {
      return this.levelType;
   }

   /**
    * QUERY: GET CURRENT DAY CONFIG
    * Returns the configuration object for the current day.
    */
   getCurrentDayConfig() {
      return DAYS_CONFIG[this.currentDayID];
   }

   /**
    * QUERY: GET PROGRESS
    * Returns completion percentage of the current level.
    */
   getProgressPercentage() {
      if (!player) return 0;
      const config = this.getCurrentDayConfig();
      return Math.min(100, (player.distanceRun / config.totalDistance) * 100);
   }

   /**
    * VICTORY PHASE: TRIGGER VICTORY TRANSITION
    * Called when player reaches the target distance with health > 0.
    * Records current scroll position and transitions to victory phase.
    */
   triggerVictoryPhase() {
      console.log(`[LevelController] 🎉 Victory Triggered!`);
      console.log(`  - Current ScrollPos: ${env.scrollPos}`);
      console.log(`  - Level Phase: ${this.levelPhase}`);
      this.levelPhase = "VICTORY_TRANSITION";
      this.victoryStartScrollPos = env.scrollPos;
      console.log(`  - Victory Start ScrollPos: ${this.victoryStartScrollPos}`);

      // Notify ObstacleManager to stop spawning
      if (obstacleManager) {
         obstacleManager.stopSpawning();
      }
   }

   /**
    * VICTORY PHASE: CHECK TRANSITION COMPLETION & HANDLE SETTLEMENT
    * Monitors if victory background has fully scrolled in and displays for 1.5 seconds.
    */
   checkSettlementPoint() {
      if (this.levelPhase === "VICTORY_TRANSITION") {
         const bgHeight = (env && env.destinationBg && env.destinationBg.height)
            ? env.destinationBg.height
            : 1080;
         const scrolledSinceVictory = env.scrollPos - this.victoryStartScrollPos;
         console.log(`[checkSettlementPoint] TRANSITION: scrolled=${scrolledSinceVictory.toFixed(1)}, target=${bgHeight}`);

         if (scrolledSinceVictory >= bgHeight) {
            console.log(`[LevelController] 🎉 Victory Background Fully Visible! Entering settlement.`);
            this.levelPhase = "VICTORY_ZONE";
            this.victoryZoneFrames = 0;
            // Record victory bg Y position when entering VICTORY_ZONE (should be 0, bg top aligned with screen top)
            this.victoryZoneStartY = scrolledSinceVictory - bgHeight;
            GLOBAL_CONFIG.scrollSpeed = 0;
         }
         // Continue to next check without returning false yet
      }

      if (this.levelPhase === "VICTORY_ZONE") {
         this.victoryZoneFrames++;
         console.log(`[checkSettlementPoint] ZONE: frames=${this.victoryZoneFrames}/90`);

         if (this.victoryZoneFrames >= 90) {
            console.log(`[LevelController] ✨ 1.5 seconds elapsed. Triggering WIN!`);
            return true;
         }
      }

      return false;
   }


   getLevelPhase() {
      return this.levelPhase;
   }
}
