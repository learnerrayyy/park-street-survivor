// Park Street Survivor - Global Configuration
// Responsibilities: Centralised constants for canvas, physics, layout, and level data.

// ─── ENGINE STATE CONSTANTS ───────────────────────────────────────────────────
// Integer mapping for the Finite State Machine (FSM) transitions.
const STATE_MENU = 0;
const STATE_LEVEL_SELECT = 1;
const STATE_SETTINGS = 2;
const STATE_ROOM = 3;
const STATE_PAUSED = 4;
const STATE_DAY_RUN = 5;
const STATE_FAIL = 6;
const STATE_WIN = 7;
const STATE_LOADING = 8;
const STATE_SPLASH = 9;
const STATE_HELP = 10;
const STATE_INVENTORY = 11;
const STATE_WARNING  = 12;
const STATE_CREDITS     = 13;
const STATE_CUTSCENE    = 14;
const STATE_SAVE_CHOICE = 15;

/**
 * Core canvas resolution, world-space boundaries, and scroll physics.
 * Implements the 2-2-2 layout: two scenery zones, two sidewalks, two road lanes each side.
 */
const GLOBAL_CONFIG = {
    resolutionW: 1920,
    resolutionH: 1080,
    scrollSpeed: 12, // Base velocity for world-space translation

    // THE 2-2-2 LAYOUT INFRASTRUCTURE
    // Strict coordinate boundaries for scenery, sidewalks, and the road network.
    layout: {
        leftSceneryEnd: 500,  // Right edge of left scenery zone
        leftSidewalkEnd: 700,  // Right edge of left sidewalk
        rightLaneEnd: 1220, // Right edge of the road (all four lanes)
        rightSidewalkEnd: 1420  // Right edge of right sidewalk
    },

    // LANE CALCULATIONS
    // Precise X-coordinates for center-point snapping and obstacle spawning.
    lanes: {
        lane1: 600,
        lane2: 830,
        lane3: 1090,
        lane4: 1320
    }
};

// Player foot anchor for DAY_RUN scene. Keep this near bottom of the screen.
const PLAYER_RUN_FOOT_Y = GLOBAL_CONFIG.resolutionH - 140;

/**
 * Default player attributes applied at the start of every session.
 */
const PLAYER_DEFAULTS = {
    baseHealth: 100,
    healthDecay: 0.05, // Stamina depletion per frame during a run
    baseSpeed: 10
};

/**
 * Per-day level configuration: distance targets, time limits, and spawn rates.
 */
const DAYS_CONFIG = {
    1: {
        description: "Day 1 - Learn the Basics",
        totalDistance: 1500,
        obstacleSpawnInterval: 60,
        baseScrollSpeed: 15,
        basePlayerSpeed: 10,
        healthDecay: 0.02,
        buffControlConfig: {
            avgRespawnSec: 2.0,
            respawnJitter: 0.5,
            buffWeights: { COFFEE: 1.0, EMPTY_SCOOTER: 1.0 }
        },
        type: "NORMAL"
    },
    2: {
        description: "Day 2 - Running Late",
        totalDistance: 2500,
        obstacleSpawnInterval: 60,
        baseScrollSpeed: 15,
        basePlayerSpeed: 18,
        healthDecay: 0.04,
        buffControlConfig: {
            avgRespawnSec: 3.5,
            respawnJitter: 0.2,
            buffWeights: { COFFEE: 0.7, EMPTY_SCOOTER: 0.5 }
        },
        type: "NORMAL"
    },
    3: {
        description: "Day 3 - Midweek Rush",
        totalDistance: 3500,
        obstacleSpawnInterval: 60,
        baseScrollSpeed: 18,
        basePlayerSpeed: 23,
        healthDecay: 0.04,
        buffControlConfig: {
            avgRespawnSec: 4.0,
            respawnJitter: 0.3,
            buffWeights: { COFFEE: 1.0, EMPTY_SCOOTER: 0.65 }
        },
        type: "NORMAL"
    },
    4: {
        description: "Day 4 - Deadline Pressure",
        totalDistance: 4500,
        obstacleSpawnInterval: 60,
        baseScrollSpeed: 23,
        basePlayerSpeed: 25,
        healthDecay: 0.08,
        buffControlConfig: {
            avgRespawnSec: 5.0,
            respawnJitter: 0.25,
            buffWeights: { COFFEE: 1.0, EMPTY_SCOOTER: 0.45 }
        },
        type: "NORMAL"
    },
    5: {
        description: "Day 5 - Final Challenge",
        totalDistance: 5500,
        obstacleSpawnInterval: 60,
        baseScrollSpeed: 25,
        basePlayerSpeed: 28,
        healthDecay: 0.10,
        buffControlConfig: {
            avgRespawnSec: 5.5,
            respawnJitter: 0.35,
            buffWeights: { COFFEE: 1.0, EMPTY_SCOOTER: 0.4 }
        },
        type: "NORMAL"
    }
};
