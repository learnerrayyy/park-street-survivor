// Procedural Level - Difficulty and Process Configuration
// Defines the obstacle generation rules for each level:
// available obstacles, generation rate, variant pool, dialogue text, etc.

const DIFFICULTY_PROGRESSION = {
  //level 1 is tutorial, so no procedural generation config needed
  1: {
    description: "Day 1 - The Morning Commute",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      spawnRatePerFrame: 0.01,
      minObstacleInterval: 40,
      buffSpawnRatio: 0.15,
      buffMinIntervalSec: 10.0,
    },
    variants: {}
  },

  2: {
    description: "Day 2 - Running Late",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      spawnRatePerFrame: 0.01,
      minObstacleInterval: 50,
      buffSpawnRatio: 0.005,
      buffMinIntervalSec: 12.0,
    },
    variants: {}
  },

  3: {
    description: "Day 3 - Midweek Rush",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      spawnRatePerFrame: 0.018,
      minObstacleInterval: 40,
      buffSpawnRatio: 0.10,
      buffMinIntervalSec: 9.0,
    },
    variants: {}
  },

  4: {
    description: "Day 4 - Deadline Pressure",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      spawnRatePerFrame: 0.020,
      minObstacleInterval: 35,
      buffSpawnRatio: 0.08,
      buffMinIntervalSec: 10.0,
    },
    variants: {}
  },

  5: {
    description: "Day 5 - Final Challenge",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      spawnRatePerFrame: 0.022,
      minObstacleInterval: 30,
      buffSpawnRatio: 0.06,
      buffMinIntervalSec: 11.0,
    },
    variants: {}
  }
};

class ProceduralLevel {
  constructor(dayID, config) {
    this.dayID = dayID;
    this.config = config;
    this.levelText = `Day ${dayID} - ${DIFFICULTY_PROGRESSION[dayID]?.description || 'Unknown'}`;
    this.frameCounter = 0;
    this.displayDuration = 180; // 3 seconds display (60fps)
    // Get current level difficulty config
    this.difficultyConfig = DIFFICULTY_PROGRESSION[dayID] || DIFFICULTY_PROGRESSION[1];
  }

  /**
   * Get current level difficulty config
   */
  getDifficultyConfig() {
    return this.difficultyConfig;
  }

  /**
   * Get obstacle variant config for specified type
   */
  getObstacleVariant(obstacleType) {
    return this.difficultyConfig.variants[obstacleType] || null;
  }

  setup() {
    console.log(`[ProceduralLevel] Setup - ${this.levelText}`);
    console.log(`[ProceduralLevel] Available obstacles:`, this.difficultyConfig.availableObstacles);
    this.frameCounter = 0;
  }

  update() {
    // Procedural level update logic
    this.frameCounter++;
    if (player.distanceRun >= this.config.totalDistance && player.health > 0) {
      // Only trigger once
      if (levelController.getLevelPhase() === "RUNNING") {
        console.log(`[ProceduralLevel] Victory condition met! Distance: ${player.distanceRun}, Target: ${this.config.totalDistance}`);
        levelController.triggerVictoryPhase();
      }
    }
  }

  display() {
    // Display level text in center of screen for first 3 seconds
    if (this.frameCounter < this.displayDuration) {
      push();
      fill(255, 255, 255, 255);
      textSize(48);
      textAlign(CENTER, CENTER);
      text(this.levelText, GLOBAL_CONFIG.resolutionW / 2, GLOBAL_CONFIG.resolutionH / 2);
      pop();
    }
  }

  reset() {
    console.log(`[ProceduralLevel] Reset - ${this.levelText}`);
    this.frameCounter = 0;
  }

  cleanup() {
    console.log(`[ProceduralLevel] Cleanup - ${this.levelText}`);
  }
}
