# 1. Background Assets
All background assets are standard **1920x1080** resolution unless otherwise specified.
## Environmental Backgrounds

| **Asset Name**     | **Dimensions** | **Description**                                                                                             | Path                         |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **bg_sunny**       | 1920x1080      | Clear weather with a pleasant, ethereal, and dreamlike atmosphere.                                          | ArtAsset\Background\bg_sunny |
| **bg_light_rain**  | 1920x1080      | Overcast with grey clouds and minor puddles; features muted lighting and a grounded yet surreal tone.       |                              |
| **bg_heavy_rain**  | 1920x1080      | Dark, heavy overcast with significant puddles and intense rain effects; realistic and somber color palette. |                              |
| **bg_game_start**  | 1920x1080      | Uphill view of Bristol featuring a pixel filter; the Wills Memorial Building serves as the focal point.     | ArtAsset\Background          |
| **bg_destination** | 1920x1920      | The end of road, the Wills Memorial Building.                                                               | ArtAsset\Background\bg_sunny |
| **bg_library**     | 1920x1080      | In library, player and NPC dialogue scene.                                                                  | ArtAsset\Background          |
| **bg_news**        | 1920x1080      | News report on incident.                                                                                    | ArtAsset\Background         |
## Dialogue & UI Backgrounds
| **Asset Name**  | **Dimensions** | Description**                                                    | Path                        |
| --------------- | -------------- | ---------------------------------------------------------------- | --------------------------- |
| **bg_game_end** | N/A            | A icon of Iris celebrating.                                      |                             |
| **bg_bedroom**  | 1920x1080      | A cluttered student dormitory interior.                          | ArtAsset\Background\Bedroom |
| **bg_hospital** | 1920x1080      | Interior view of a hospital ceiling featuring surgical lighting. |                             |
# 2. Character Assets
## Portraits
| **Asset Name**         | **Dimensions** | **Description**                                                              | Path                                    |
| ---------------------- | -------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| **portrait_Iris**      | 380x380        | Dialogue portrait of the protagonist wearing a helmet and riding a scooter.  | ArtAsset\Character\Iris\portrait |
| **portrait_wiola**     | 380x380        | Brown long hair, gentle, no glasses, wearing windbreaker.                    | ArtAsset\Character\Wiola                |
| **portrait_layla**     | 380x380        | mysterious, short-haired, wearing a hoodie.                                  | ArtAsset\Character\Layla              |
| **portrait_yuki**      | 380x380        | irritable, repetitive in speech, appears artificial/fake, curly hair, dress. |                                         |
| **portrait_raymond**   | 380x380        | robot, abstract, eerie expression, long straight black hair T-shirt.         |                                         |
| **portrait_charlotte** | 380x380        | Most normal, a true friend, short hair, red hair, leather jacket.            |                                         |
|                        |                |                                                                              |                                         |

## Sprite Sheets
| **Asset Name**       | **Dimensions**   | **Description**                                      | **Path**                                                   |
| -------------------- | ---------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| **main_player_run**  | 256x256(4-frame) | 4-frame running animation cycle for the protagonist. | ArtAsset\Character\main_player\sprite_frames\sprite_sheets |
| **main_player_move** | 256x256(5-frame) | 5-frame walking animation cycle.                     | ArtAsset\Character\main_player\sprite_frames\sprite_sheets |

# 3. Obstacles & Power-ups

The gameplay area is divided into four lanes: Lanes 1 & 4 (Sidewalks, 200px) and Lanes 2 & 3 (Road, 260px).
## Road Obstacles (Lanes 2 & 3)

| **Asset Name**         | **Dimensions** | **Description**                                                            | Path              |
| ---------------------- | -------------- | -------------------------------------------------------------------------- | ----------------- |
| **obstacle_bus**       | 170x420        | A large double-decker public transit bus (First Bus style).                | ArtAsset\Obstacle |
| **obstacle_ambulance** | 140x260        | Emergency medical vehicle (Yellow ambulance).                              | ArtAsset\Obstacle |
| **obstacle_car**       | 110x210        | Standard passenger automobile.                                             | ArtAsset\Obstacle |
| **obstacle_scooter**   | 110x230        | A motorized scooter operated by a driver.                                  | ArtAsset\Obstacle |
| **obstacle_kebab**    | 320x230        | Kebab stall on side-walk.| ArtAsset\Obstacle |
| **obstacle_scoop**    | 270x311        | Ice cream stall on side-walk.| ArtAsset\Obstacle |
| **obstacle_puddle**    | 260x120        | Environmental hazard; appears exclusively during rainy weather conditions. | ArtAsset\Obstacle |
## Sidewalk Obstacles (Lanes 1 & 4)
| **Asset Name**        | **Dimensions** | **Description**                                                 | Path              |
| --------------------- | -------------- | --------------------------------------------------------------- | ----------------- |
| **obstacle_promoter** | 120x220        | An NPC actively distributing promotional flyers.                | ArtAsset\Obstacle |
| **obstacle_homeless** | 200x200        | A seated NPC representing a homeless individual.                | ArtAsset\Obstacle |
| **obstacle_flyer**    | 810x970        | Item with three visual states: Intact, crumpled, and balled up. | ArtAsset\Obstacle |
## Power-ups
| **Asset Name**      | **Dimensions** | **Description**                    | Path              |
| ------------------- | -------------- | ---------------------------------- | ----------------- |
| **powerup_coffee**  | 96x96          | A coffee cup collectible.          | ArtAsset\Power-up |
| **powerup_scooter** | 140x160        | An unoccupied scooter collectible. | ArtAsset\Power-up |
# 4. Backpack Items
| **Asset Name**    | **Dimensions** | **Description**        | Path              |
| ----------------- | -------------- | ---------------------- | ----------------- |
| **bag_vitamin**   | 300x300        | Vitamin gummies        | ArtAsset\Backpack |
| **bag_tangle**    | 300x300        | tangle                 | ArtAsset\Backpack |
| **bag_headphone** | 300x300        | Noise cancel earphone. | ArtAsset\Backpack |
| **bag_boots**     | 300x300        | rain boots             | ArtAsset\Backpack |

# 5. UI Related
| **Asset Name**    | **Dimensions** | **Description**        | Path              |
| ----------------- | -------------- | ---------------------- | ----------------- |
| **icon_success**   | 300x300        | Iris celebrating. Used in success page.    | ArtAsset\UI |
| **Frame**    | 1920x1080        | Story background frame            | ArtAsset\UI |
