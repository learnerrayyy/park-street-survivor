# Think Aloud Study

## Executive Summary

- This study utilises the Think Aloud Protocol to evaluate the intuitive nature of Park Street Survivor’s current demo. We focused on the transition from narrative exploration (Room phase) to active mechanics (DayRun phase).

	- Successes: High narrative engagement; the main menu and settings are frictionless; thematic hazards (e.g., the Promoter) are well-received.

	- Pain Points: Visual guidance "vacuums" in the room leads to stagnation; semiotic conflicts exist where players mistake hazards (Food Trucks) for buffs.

	- Core Conclusion: Future development will shift focus from content volume to Communication Clarity, specifically regarding interaction signifiers and HUD visibility.

## Research Design: Rationale & Objectives

- We designed two distinct, sequential tasks to cover the game's core loop:

	- Task 1 (Early Game Flow & Navigation):
		- Rationale: To test if environmental cues alone can guide a player through the "Pack & Exit" logic. This is the first "churn point" where players might quit if they feel aimless.

	- Task 2 (Core Mechanics & Hazard Semiotics):
		- Rationale: To evaluate the readability of the HUD and the clarity of obstacle types. We aimed to observe if the player's mental model matches the game's intended penalties.

---

## Task 1: Onboarding & Room Exploration

### Objectives & Protocol
- Evaluate the clarity of early-game navigation. Observe whether players understand the narrative requirement to "pack the bag" and successfully trigger the DayRun transition.

### Facilitator's Prompt:
> "Please enter the game and complete what you believe is the first full gameplay flow. You are free to explore, but try to: Start the game, understand available actions, and leave the room to enter the street. Please vocalize your thoughts constantly."

### Record sheet

| Time  | Action                     | Verbalisation                              | Behaviour                      | Issue Type          | Notes                             |
| ----- | -------------------------- | ------------------------------------------ | ------------------------------ | ------------------- | --------------------------------- |
| 00:12 | Clicked Help               | “Let me see what this is about.”           | Immediate click, no hesitation | Exploration         | Menu is clear                     |
| 00:30 | Reading Help page          | “The text is so small, it's hard to read.” | Leaned forward                 | Readability         | Help font size too small          |
| 01:30 | Clicked Setting            | “This is easy to understand.”              | Quick navigation               | None                | Settings page clear               |
| 01:50 | Entered Room               | “What should I do now?”                    | 5s pause                       | Discoverability     | Lack of immediate guidance        |
| 02:15 | Approached desk            | “Oh, there’s something here.”              | Walk around                    | Visual cue weakness | Prompt icon too small             |
| 02:30 | Entered Backpack           | “Which one am I supposed to take?”         | Mouse hovering repeatedly      | Decision clarity    | Required item not highlighted     |
| 03:05 | Attempted second Buff-item | “Why tcan't I take this?”                  | Click attempt blocked          | Rule clarity        | ‘Only one item’ not clear         |
| 03:50 | Returned to Room           | “How do I leave now?”                      | 6s pause                       | Navigation          | No clear prompt to return to Room |
| 04:10 | Found door                 | “Is this the exit?”                        | Hesitant click                 | Visual affordance   | Door marker not obvious           |

### Summary & Critical Reflection

#### What worked well (Strengths)

- Menu Intuition: The Main Menu and Settings architecture are highly effective. The "Start" button provides a frictionless entry point with zero reported confusion.

- Interface Familiarity: Players were able to understand the core purpose of the backpack and settings pages quickly once they were accessed.

#### What failed (Weaknesses)

- Guidance Vacuum: Once in the Room phase, player hesitation increased significantly. Players were unsure which objects were interactive and spent time wandering without a clear goal.

- Weak Interaction Signifiers: The prompt icon for the desk was too small and located in the periphery, causing players to miss interaction points even when standing nearby.

- Logical Obscurity: Interaction constraints, such as the "Only one buff-item" rule, were not communicated. This led players to believe the game was unresponsive rather than following a rule.

#### Future Iteration Goals

- Based on this session, our next development sprint (leading to the final submission) will shift focus from content volume to communication clarity

	- Strengthen Prompts: Redesign interaction icons and environmental markers (like the exit door) to be more visually prominent.

	- Improve Visual Hierarchy: Use lighting or shaders to highlight key interaction points, ensuring players don't need to "guess" what is clickable.

	- Explicit Constraints: Make game rules and interaction limits (e.g., item counts) visible within the UI to prevent user frustration.

---

## Task 2: Core Gameplay & Hazard Clarity

### Summary & Critical Reflection

### Objectives & Protocol
- Assess the intuitiveness of the DayRun phase. Observe how players identify street hazards and whether the HUD provides sufficient progress information.

### Facilitator's Prompt:
> "While playing, describe: What does this obstacle represent? What do you expect it to do? How do you know you have been penalised? Do you clearly understand why you lost health? If anything feels unexpected, please say so."

### Record Sheet
| Time | Feature Type                               | User Reaction | Expected Outcome                                        | Actual Outcome                                  | Evidence of Confusion (User Quote/Action)                                                                             | Proposed Solution                                                                                                       |
| ---- | ------------------------------------------ | ------------- | ------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 05:20 | **Hazard:**<br>Small Business Trucks       | **Confused**  | Player avoids the truck to prevent energy loss.         | Player intentionally collided with the truck.   | _"I thought the Ice Cream truck was a shop where I could buy food to restore energy, like the coffee."_               | **Visual Re-design:** <br>Add warning strobes or change palette to high-contrast 'hazard' colours. Clarify in tutorial. |
| 06:10 | **HUD:**<br>Progress Bar                   | **Ignored**   | Use the bar to estimate remaining distance per chapter. | Player failed to notice the bar or its purpose. | _"I didn't know the chapters had different lengths or where I was in the level."_                                     | **UI Label:** <br>Add a explicit 'DISTANCE' or 'PROGRESS' label and chapter markers to the HUD bar.                     |
| 07:05 | **Hazard / Mechanic:**<br>Promoter (Flyer) | **Stuck**     | Press `SPACE` to dismiss the flyer overlay.             | Player panicked and failed the level.           | _"I thought the flyer was just an un-skippable advertisement overlay. I didn't know I had to interact to remove it."_ | **UX Feedback:** <br>Add a pulsing "Press SPACE to Dismiss" prompt when the flyer is active on screen.                  |

#### What worked well (Strengths)

- Engagement: The participant was highly engaged with the "Promoter" hazard, acknowledging it as a unique and thematic challenge.

- Immediate Feedback: The "Death/Fail" screen effectively communicated that the run had ended, even if the intermediate health loss was sometimes missed.

#### What failed (Weaknesses)
- Semiotic Confusion: There is a clear "mental model" conflict. In many games, food equals health. By making food trucks (Kebab/Ice Cream) obstacles, we violated user expectations without enough visual warning.

- Peripheral Blindness: The HUD is currently too "quiet". Users focused on the center of the screen (the character) and completely missed the progress bar at the top.

- Lack of Affordance: The interactive hazards (Promoter) lacked a clear call-to-action, leading to "Stall-and-Fail" scenarios.

#### Future Iteration Goals
- Based on this session, our next development sprint (leading to the final submission) will shift focus from content volume to communication clarity

	- Visual Hierarchy: Redesign obstacles to look more "threatening" (e.g., darker palettes or caution outlines for trucks).

	- Explicit HUD: Add micro-interactions or labels to the Progress Bar so it feels like a functional tool rather than background decoration.

	- Contextual Tutorials: Instead of a wall of text, implement "Just-in-Time" hints (e.g., a flashing Space key icon when a flyer hits the screen).

