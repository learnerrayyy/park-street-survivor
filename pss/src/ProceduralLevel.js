// Procedural Level - Difficulty and Process Configuration
// Defines the obstacle generation rules for each level:
// available obstacles, generation rate, variant pool, dialogue text, etc.

const MODE_PRESETS = {
  1: {
    avgbuffPerWindow: 3.0,
    buffGlobalMinGapSec: 5.0,
    buffTypeMinGapSec: { COFFEE: 4, EMPTY_SCOOTER: 14.0 },
    avgobPerWindow: 2.2,
    obTypeMinGapSec: { LARGE_CAR: 6.0, PROMOTER: 8.0 },
    obWeights: {
      LARGE_CAR: 0.8,
      SMALL_CAR: 2.2,
      SCOOTER_RIDER: 0.9,
      HOMELESS: 1.0,
      PROMOTER: 0.8,
      SMALL_BUSINESS: 1.0
    },
    minOnScreenOb: 1,
    maxOnScreenOb: 4
  },
  2: {
    avgbuffPerWindow: 0.6,
    buffGlobalMinGapSec: 9.0,
    buffTypeMinGapSec: { COFFEE: 10.0, EMPTY_SCOOTER: 16.0 },
    avgobPerWindow: 3.0,
    obTypeMinGapSec: { LARGE_CAR: 4.5, PROMOTER: 7.0 },
    obWeights: {
      LARGE_CAR: 1.3,
      SMALL_CAR: 1.8,
      SCOOTER_RIDER: 1.0,
      HOMELESS: 1.2,
      PROMOTER: 1.0,
      SMALL_BUSINESS: 1.1,
      FANTASY_COFFEE: 0.5,
      PUDDLE: 0.8
    },
    minOnScreenOb: 2,
    maxOnScreenOb: 5
  },
  3: {
    avgbuffPerWindow: 1.0,
    buffGlobalMinGapSec: 7.5,
    buffTypeMinGapSec: { COFFEE: 9.0, EMPTY_SCOOTER: 12.0 },
    avgobPerWindow: 2.5,
    obTypeMinGapSec: { LARGE_CAR: 5.0, PROMOTER: 7.0 },
    obWeights: {
      LARGE_CAR: 0.9,
      SMALL_CAR: 1.4,
      SCOOTER_RIDER: 1.3,
      HOMELESS: 1.6,
      PROMOTER: 1.4,
      SMALL_BUSINESS: 1.3,
      FANTASY_COFFEE: 0.8,
      PUDDLE: 0.9
    },
    minOnScreenOb: 1,
    maxOnScreenOb: 4
  },
  4: {
    avgbuffPerWindow: 0.4,
    buffGlobalMinGapSec: 10.0,
    buffTypeMinGapSec: { COFFEE: 12.0, EMPTY_SCOOTER: 18.0 },
    avgobPerWindow: 3.6,
    obTypeMinGapSec: { LARGE_CAR: 3.8, PROMOTER: 6.0 },
    obWeights: {
      LARGE_CAR: 1.8,
      SMALL_CAR: 1.6,
      SCOOTER_RIDER: 1.6,
      HOMELESS: 1.1,
      PROMOTER: 0.9,
      SMALL_BUSINESS: 1.0,
      FANTASY_COFFEE: 1.0,
      PUDDLE: 1.2
    },
    minOnScreenOb: 2,
    maxOnScreenOb: 6
  }
};

function createModeCycleConfig(modePattern, modePresets, windowSec = 5) {
  const sanitizedPattern = Array.isArray(modePattern) && modePattern.length > 0
    ? modePattern.map(v => Number(v)).filter(v => Number.isFinite(v))
    : [1];
  const modeDisplayMap = {};
  for (const id of sanitizedPattern) modeDisplayMap[id] = id;
  return {
    windowSec: Math.max(1, Number(windowSec || 5)),
    modePattern: sanitizedPattern.length > 0 ? sanitizedPattern : [1],
    modes: { ...modePresets },
    modeDisplayMap
  };
}

const DIFFICULTY_PROGRESSION = {
  //level 1 is tutorial, so no procedural generation config needed
  1: {
    description: "Day 1 - The Morning Commute",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 30
    },
    modeCycleConfig: createModeCycleConfig([1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 3], MODE_PRESETS, 5),
    variants: {}
  },

  2: {
    description: "Day 2 - Running Late",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "SMALL_BUSINESS", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 50
    },
    modeCycleConfig: createModeCycleConfig([1, 2, 1, 3], MODE_PRESETS, 5),
    variants: {}
  },

  3: {
    description: "Day 3 - Midweek Rush",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 40
    },
    modeCycleConfig: createModeCycleConfig([2, 3, 2, 4], MODE_PRESETS, 5),
    variants: {}
  },

  4: {
    description: "Day 4 - Deadline Pressure",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "PUDDLE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 35
    },
    modeCycleConfig: createModeCycleConfig([2, 4, 3, 4, 2], MODE_PRESETS, 5),
    variants: {}
  },

  5: {
    description: "Day 5 - Final Challenge",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "PUDDLE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 30
    },
    modeCycleConfig: createModeCycleConfig([3, 4, 2, 4, 3, 4], MODE_PRESETS, 5),
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
