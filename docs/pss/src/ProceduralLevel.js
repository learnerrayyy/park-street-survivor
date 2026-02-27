// Procedural Level - Difficulty and Process Configuration
// Defines the obstacle generation rules for each level:
// available obstacles, generation rate, variant pool, dialogue text, etc.

const MODE_PRESETS = {
  1: {
    avgobPerWindow: 4.0,
    obTypeMinGapSec: { PROMOTER: 8.0, SCOOTER_RIDER: 8.0 },
    obWeights: {
      LARGE_CAR: 0.0,
      SMALL_CAR: 1.0,
      SCOOTER_RIDER: 0.5,
      HOMELESS: 0.2,
      PROMOTER: 0.9,
      SMALL_BUSINESS: 1.0,
    },
    minOnScreenOb: 2,
    maxOnScreenOb: 4
  },
  2: {
    avgobPerWindow: 5.0,
    obTypeMinGapSec: { LARGE_CAR: 6.0, PROMOTER: 7.0, SCOOTER_RIDER: 6.0 },
    obWeights: {
      LARGE_CAR: 0.1,
      SMALL_CAR: 1.0,
      SCOOTER_RIDER: 0.2,
      HOMELESS: 0.5,
      PROMOTER: 0.8,
      SMALL_BUSINESS: 1.1,
      FANTASY_COFFEE: 0.5,
      PUDDLE: 0.8
    },
    minOnScreenOb: 3,
    maxOnScreenOb: 6
  },
  3: {
    avgobPerWindow: 6.0,
    obTypeMinGapSec: { LARGE_CAR: 5.0, PROMOTER: 7.0 },
    obWeights: {
      LARGE_CAR: 0.5,
      SMALL_CAR: 2.0,
      SCOOTER_RIDER: 0.5,
      HOMELESS: 0.6,
      PROMOTER: 0.8,
      SMALL_BUSINESS: 2.1,
      FANTASY_COFFEE: 0.8,
    },
    minOnScreenOb: 5,
    maxOnScreenOb: 7
  },
  4: {
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
  },
  5: {
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
    difficultyModeCycleConfig: createModeCycleConfig([1, 1, 2, 2, 1, 2, 1, 2, 1, 2, 1], MODE_PRESETS, 5),
    variants: {}
  },

  2: {
    description: "Day 2 - Running Late",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "SMALL_BUSINESS", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 50
    },
    difficultyModeCycleConfig: createModeCycleConfig([1, 2, 1, 2, 2, 2, 3, 2, 2, 1, 1, 2, 1], MODE_PRESETS, 5),
    variants: {}
  },

  3: {
    description: "Day 3 - Midweek Rush",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 40
    },
    difficultyModeCycleConfig: createModeCycleConfig([1, 2, 2, 2, 3, 3, 2, 2, 3, 1, 2, 1, 2, 3, 1, 1, 1], MODE_PRESETS, 5),
    variants: {}
  },

  4: {
    description: "Day 4 - Deadline Pressure",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "PUDDLE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 35
    },
    difficultyModeCycleConfig: createModeCycleConfig([2, 4, 3, 4, 2], MODE_PRESETS, 5),
    variants: {}
  },

  5: {
    description: "Day 5 - Final Challenge",
    availableObstacles: ["LARGE_CAR", "SMALL_CAR", "SCOOTER_RIDER", "HOMELESS", "PROMOTER", "SMALL_BUSINESS", "FANTASY_COFFEE", "PUDDLE", "COFFEE", "EMPTY_SCOOTER"],
    spawnConfig: {
      minObstacleInterval: 30
    },
    difficultyModeCycleConfig: createModeCycleConfig([3, 4, 2, 4, 3, 4], MODE_PRESETS, 5),
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
