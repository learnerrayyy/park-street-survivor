// Obstacle Configuration File - Records all obstacle parameters

const OBSTACLE_CONFIG = {
   /**
* Large vehicles (Bus, Ambulance, Truck, Fire Engine)
* Characteristics: One-hit kill, relatively slow.
    */
   LARGE_CAR: {
      baseType: "LARGE_CAR",
      type: "HAZARD",
      name: "Large Car",
      description: "Instant kill obstacle",

      // Physical parameters
      speed: { min: 0.6, max: 0.8 },  // × player speed
      size: { width: 170, height: 420 },

      // Damage parameters
      damage: 100,
      instantKill: true,
      effect: "hitKill",
      failType: "HIT_BUS",

      allowedLanes: [2, 3],  // Only in the middle two lanes
      mutualExclusion: ["PROMOTER", "HOMELESS"],

      // Variants (same type, different sprites)
      variants: [
         { name: "Bus", sprite: "assets/obstacles/obstacle_bus.png", size: { width: 170, height: 420 } },
         { name: "Ambulance", sprite: "assets/obstacles/obstacle_ambulance.png", size: { width: 140, height: 260 } },
      ]
   },

   /**
    * Small vehicles (Police, Sedan, Tractor)
    * Characteristics: 3 hits to kill, speed similar to player
    */
   SMALL_CAR: {
      baseType: "SMALL_CAR",
      type: "HAZARD",
      name: "Small Car",
      description: "Damage obstacle - 3 hits to kill",

      // Physical parameters
      speed: { min: 0.9, max: 1.1 },  // Close to player speed
      size: { width: 110, height: 210 },

      // Damage parameters
      damage: 34,
      instantKill: false,
      hitsToKill: 3,
      effect: "damage",

      // Generation constraints
      allowedLanes: [2, 3],
      mutualExclusion: [],

      // Variants
      variants: [
         { name: "Car_red", sprite: "assets/obstacles/obstacle_car_red.png", hasSiren: true },
         { name: "Car_brown", sprite: "assets/obstacles/obstacle_car_brown.png" },

      ]
   },

   /**
    * Scooter Rider
    * Characteristics: 0.5s stun → 1s lane change delay → Camera shake (TODO)
    */
   SCOOTER_RIDER: {
      baseType: "SCOOTER_RIDER",
      type: "HAZARD",
      name: "Scooter Rider",
      description: "Stun 0.5s + Lane delay 1s + Camera shake",

      // Physical parameters
      speed: { min: 1.3, max: 1.4 },
      size: { width: 88, height: 138 },

      // Damage parameters
      damage: 0,
      instantKill: false,
      effect: "stun",

      // Effect sequence
      stunDuration: 0.5,              // Stage 1: Stun 0.5s
      laneDelayDuration: 1.0,         // Stage 2: Lane change delay 1s (starts after stun)
      // cameraShakeDuration: 1.0,    // TODO: Stage 3: Camera shake (to be implemented)

      // Lane-change behaviour on road (dynamic space pressure)
      laneChangeInterval: { min: 0.45, max: 0.95 },  // seconds between lane decisions
      laneChangeDuration: { min: 0.18, max: 0.28 },  // linear move duration per lane switch
      //less is fast if switching from lane 

      // Generation constraints
      allowedLanes: [1, 2, 3, 4],  // Any lane
      mutualExclusion: [],

      // Variants
      variants: [
         { name: "Scooter Rider", sprite: "assets/obstacles/obstacle_scooter.png" }
      ]
   },

   /**
    * Homeless
    * Characteristics: Forced lane switch
    */
   HOMELESS: {
      baseType: "HOMELESS",
      type: "HAZARD",
      name: "Homeless",
      description: "Forced lane switch - Different dialogue per day",

      // Physical parameters
      speed: { min: 0, max: 0 },
      size: { width: 140, height: 140 },

      // Damage parameters
      damage: 10,
      instantKill: false,
      effect: "forcedLaneSwitch",

      // Dialogue test copy (fallback for all days until day-specific lines are authored)
      defaultDialogue: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die.",
      dialoguesByDay: {
         1: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die.",
         2: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die.",
         3: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die.",
         4: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die.",
         5: "people don't want to look at the weak, because it remind them of their own weakness, but they don't get is that when someone struggling, it's means she's strong, he's strong, because the weak don't struggling, they just die."
      },
      bubbleOffsetX: 0,      // Horizontal offset relative to homeless X (pixels)
      bubbleTextSize: 14,    // Speech bubble font size

      // Generation constraints
      allowedLanes: [1, 4], // Only on the edges of the sidewalk
      mutualExclusion: ["LARGE_CAR"],

      variants: [
         { id: "homeless_v1", name: "Homeless", sprite: "assets/obstacles/obstacle_homeless.png" }
      ]
   },

   /**
    * Promoter - Leaflet mechanism
    * Characteristics: Screen covered by leaflet upon collision, press SPACE 10x to clear leaflet,
    *      Leaflet clears the first obstacle in the current lane
    *      Side effect: LARGE_CAR won't spawn for 5 seconds
    */
   PROMOTER: {
      baseType: "PROMOTER",
      type: "INTERACTIVE",
      name: "Promoter",
      description: "Leaflet - Press SPACE 10x to throw paper ball and clear nearest obstacle",

      // Physical parameters
      speed: { min: 0, max: 0 },  // Stationary on the road
      size: { width: 150, height: 160 },

      // Damage parameters
      damage: 0,
      effect: "leaflet",

      // Leaflet interaction parameters
      leafletWidth: 810,
      leafletHeight: 970,
      spacePressRequired: 10,        // Press SPACE 10 times
      clearNearestObstacle: true,    // Clear the first obstacle in the current lane

      // Cooldown mechanism: Cooldown time after hitting the promoter
      interactionCooldown: 5.0,      // 5 seconds cooldown after interaction
      cooldownAffectsObstacle: "LARGE_CAR",  // LARGE_CAR won't spawn during cooldown

      // Generation constraints
      allowedLanes: [1, 4],          // Only on the edges of the sidewalk
      mutualExclusion: ["LARGE_CAR"],

      // Variants: 2 leaflet sprites
      variants: [
         { id: "promoter_leaflet_1", name: "Leaflet 1", sprite: "assets/obstacles/obstacle_flyer1.png" },
         { id: "promoter_leaflet_2", name: "Leaflet 2", sprite: "assets/obstacles/obstacle_flyer2.png" }
      ]
   },

   /**
    * Fantasy Coffee (TODO)
    * Characteristics: 10 damage + full-screen distortion effect
    * NOTE: Visual distortion pipeline is not implemented yet.
    */
   FANTASY_COFFEE: {
      baseType: "FANTASY_COFFEE",
      type: "HAZARD",
      name: "Fantasy Coffee",
      description: "TODO: Deals 10 damage and distorts the whole screen",

      // Physical parameters
      speed: { min: 0, max: 0 },  // Stationary pickup-like hazard
      size: { width: 110, height: 120 },

      // Damage / effect parameters
      damage: 10,
      instantKill: false,
      effect: "screenDistortion",
      distortionDuration: 2.5,     // seconds
      distortionIntensity: 1.0,    // TODO visual parameter

      // Generation constraints
      allowedLanes: [1, 4],        // Sidewalk spawn by default
      mutualExclusion: [],

      // TODO art placeholder path (asset not provided yet)
      sprite: "assets/obstacles/obstacle_fantasy_coffee.png"
   },

   /**
    * Puddle
    * Characteristics: Environmental obstacle - Minor damage
    * TODO: Add sprite file
    */
   /*
   PUDDLE: {
      baseType: "PUDDLE",
      type: "ENVIRONMENTAL",
      name: "Puddle",
      description: "Environmental obstacle - Minor damage",

      // Physical parameters
      speed: { min: 0, max: 0 },  // Stationary
      size: { width: 260, height: 120 },

      // Damage parameters
      damage: 10,
      effect: "none",

      // Generation constraints
      allowedLanes: [2, 3],  // Only on the road
      mutualExclusion: [],

      // No variants
      variants: [
         { name: "Puddle", sprite: "assets/obstacles/obstacle_puddle.png" }
      ]
   },
   */

   // ===== BUFF Items =====

   /**
    * Coffee
    * Characteristics: Heal 33 HP - Overflow locks HP for 3s (invincible)
    */
   COFFEE: {
      baseType: "COFFEE",
      type: "BUFF",
      name: "Coffee",
      description: "Heal +33 HP - Overflow locks HP for 3s (invincible)",

      // Physical parameters
      speed: { min: 0, max: 0 },  // Stationary
      size: { width: 96, height: 96 },

      // Effect parameters
      damage: 0,
      effect: "heal",
      healAmount: 33,
      overflowEffect: "hpLock",
      hpLockDuration: 3.0,

      // Generation constraints
      allowedLanes: [1, 4],  // Only on the sidewalk
      mutualExclusion: [],

      // No variants
      sprite: "assets/power_up/powerup_coffee.png"
   },

   /**
    * Empty Scooter
    * Characteristics: 5s Speed Boost + 7s Invincible, ignore all obstacles
    */
   EMPTY_SCOOTER: {
      baseType: "EMPTY_SCOOTER",
      type: "BUFF",
      name: "Empty Scooter",
      description: "5s Speed Boost + 7s Invincible (ignore all obstacles)",

      // Physical parameters
      speed: { min: 0, max: 0 },  // Stationary
      size: { width: 140, height: 160 },

      // Effect parameters
      effect: "speedBoostAndInvincible",
      speedBoostDuration: 5.0,
      invincibleDuration: 7.0,
      speedMultiplier: 1.2,
      ignoreAllObstacles: true,
      helmetAutoPick: true,

      // Generation constraints
      allowedLanes: [1, 2, 3, 4],  // Anywhere
      mutualExclusion: [],

      // Variants
      variants: [
         { name: "Scooter", sprite: "assets/power_up/powerup_scooter.png", weight: 1 },
         { name: "Motorcycle", sprite: "assets/power_up/powerup_motorcycle.png", weight: 1 }
      ]
   }
};
