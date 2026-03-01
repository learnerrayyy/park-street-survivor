<div align="center">

# Lab 2: Interactive Paint System

<br>

## Description

</div>

> The primary objective of Lab 2 was to develop a **Feature-Rich Drawing Application** using p5.js. This project demonstrates advanced canvas manipulation, including layered rendering, custom brush physics, and interactive UI systems.

<br>

<div align="center">

## Live Demo & Source

[**[ Click Here to Run Paint App ]**](https://uob-comsm0166.github.io/2026-group-7/docs/Labs/Week_2_Paint_App)

[**View Source Code (sketch.js)**](./sketch.js)

<br>

---

## Catalog of Features

| Category | Functionality | Key Mechanism |
|:---:|:---|:---|
| **Brushes** | 5 Unique Brush Types | `switch()` state management |
| **Physics** | Speed-based Stroke | `dist(mouseX, mouseY, pmouseX, pmouseY)` |
| **Symmetry** | Multi-axis Mirroring | Coordinate mapping logic |
| **Systems** | 20-Step Undo History | `p5.Image` snapshot stack |

<br>

---

## Core System Overview

</div>

**Interactive Brushes**
* **Basic & Spray:** Classic line drawing and Gaussian-distributed particle spray.
* **Speed-Sensitive Stroke:** Dynamic `strokeWeight` that adapts based on mouse velocity.
* **Image Brush:** Custom SVG/Image textures with randomized rotation (`random(TWO_PI)`) for varied strokes.
* **Auto-Scribbler:** An autonomous-feel brush that nudges vertex positions for organic textures.

**System Functionalities**
* **Layered Architecture:** Separate `p5.Graphics` layers for the background, grid paper, drawing, and UI guides.
* **Undo System:** A 20-step snapshot history allowing users to revert actions via `Z` key.
* **Symmetry Suite:** Real-time Horizontal, Vertical, and Quadrant symmetry mapping.
* **Dual-Mode Eraser:** Supports both Transparency Erasing (revealing grid) and Cover Erasing (painting background).

**Implemented Challenges**
* **Keyboard Shortcuts:** Full integration of `keyPressed()` for brush switching (1-7), saving (S), and clearing (C).
* **Grid Paper System:** Implementation of nested `for` loops to generate a coordinate-accurate background grid.
* **Dynamic HUD:** On-screen documentation using `text()` and console feedback via `print()`.
* **File Management:** Custom canvas resizing and high-quality JPG export.

<br>

<div align="center">

## Technical Challenges & Solutions

</div>

1. **Input Synchronization:** Managing `pmouse` vs `mouse` coordinates across different layers to ensure smooth lines without "gaps" during high-speed movement.
2. **State Management:** Utilizing a centralized `currentBrush` state machine to toggle between distinct rendering logic in a single `draw()` loop.
3. **Right-Click Hijacking:** Overriding the browser's `contextmenu` to repurpose the right mouse button as a secondary eraser tool.

<br>

---

<div align="center">

**[ Back to Project Home ](../../README.md)**

</div>
