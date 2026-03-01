/**
 * * CHALLENGES ADDRESSED:
 * - Change brush color & size via UI
 * - Key commands via keyPressed()
 * - Save image as example.jpg
 * - Multiple brush types with key selection
 * - Image brush with random rotation
 * - Eraser on right click (Transparency & Cover modes)
 * - Reset/Clear canvas functionality
 * - Auto-scribbler (Nudge pen position)
 * - Symmetry (Horizontal, Vertical, Quadrant)
 * - Smooth lines using pmouse coordinates
 * - Opacity/Alpha control for brushes
 * - Gridded paper using for-loops
 * - Dynamic strokeWeight based on mouse speed
 * - Documentation via print() and text()
 */

// Global Variables
let currentBrush = 1;
let pg; // Drawing Layer
let myBrush;
let brushImgInput;
let history = []; 

// State Flags
let showGrid = false; 

// UI References
let colorPicker, bgColorPicker;
let sizeSlider, alphaSlider;
let symmetryCheckbox, axisSelect;
let wInput, hInput, nameInput;
let helpModal; 

// Layout Configuration
const TOP_BAR_HEIGHT = 60;
const SIDE_BAR_WIDTH = 200;
const CANVAS_X = SIDE_BAR_WIDTH + 20; 
const CANVAS_Y = TOP_BAR_HEIGHT + 20; 
const CUTE_FONT = 'Comic Sans MS, Chalkboard SE, sans-serif';

function preload() {
    // Challenge: Use an image() as a brush
    myBrush = loadImage('https://upload.wikimedia.org/wikipedia/commons/f/f1/Heart_coraz%C3%B3n.svg');
}

function setup() {
    // Challenge: Documentation via print() to console
    print("Welcome to the Advanced Paint App!");
    print("Commands: [1-5] Brushes, [6-7] Erasers, [C] Clear, [S] Save, [Z] Undo.");

    // Initialize Main Canvas
    let cnv = createCanvas(500, 500);
    cnv.position(CANVAS_X, CANVAS_Y); 
    cnv.style('box-shadow', '0 4px 15px rgba(0,0,0,0.1)');
    cnv.style('border-radius', '4px'); 
    
    // Initialize Drawing Layer (Layer 3)
    pg = createGraphics(500, 500);
    
    // Challenge: Right click as eraser - Disable default context menu
    document.oncontextmenu = function() {
        return false;
    };

    textFont(CUTE_FONT);
    imageMode(CENTER);
    pg.imageMode(CENTER);

    // Build UI Elements
    createTopBar();
    createSideBar();
    createHelpModal();
    
    // Initial history snapshot
    saveHistory(); 
}

function draw() {
    // Layer 1: Dynamic Background Color
    background(bgColorPicker.color());

    // Layer 2: Grid Layer (Challenge: Gridded paper using a for loop)
    if (showGrid) {
        drawGridLayer();
    }

    // Input Handler Logic
    handleInput();

    // Layer 3: Render Drawing Layer
    image(pg, width / 2, height / 2);

    // Layer 4: Symmetry Axis Overlay
    if (symmetryCheckbox.checked()) {
        drawAxisGuide();
    }

    // Layer 5: HUD (Challenge: Documentation via text() to screen)
    drawOnScreenDocs();
}

/**
 * Challenge: Smooth lines by drawing between pmouse and current mouse position
 */
function handleInput() {
    if (mouseIsPressed) {
        let mx = mouseX;
        let my = mouseY;
        let pmx = pmouseX;
        let pmy = pmouseY;

        // Ensure drawing only happens within canvas boundaries
        if (mx > 0 && mx < width && my > 0 && my < height) {
            // Challenge: Add an eraser on right click
            let activeBrush = (mouseButton === RIGHT) ? 6 : currentBrush;

            if (activeBrush === 6 || activeBrush === 7) {
                eraserTool(mx, my, pmx, pmy, activeBrush);
                if (symmetryCheckbox.checked()) {
                    applySymmetry(mx, my, pmx, pmy, true, activeBrush);
                }
            } 
            else if (mouseButton === LEFT) {
                drawBrushAt(mx, my, pmx, pmy);
                if (symmetryCheckbox.checked()) {
                    applySymmetry(mx, my, pmx, pmy, false, 0);
                }
            }
        }
    }
}

/**
 * Challenge: Create lined or gridded paper using a for loop
 */
function drawGridLayer() {
    push();
    stroke(200); 
    strokeWeight(1);
    // Draw vertical lines
    for (let i = 0; i <= width; i += 20) {
        line(i, 0, i, height);
    }
    // Draw horizontal lines
    for (let j = 0; j <= height; j += 20) {
        line(0, j, width, j);
    }
    pop();
}

/**
 * Challenge: Documentation - text() to write to screen
 */
function drawOnScreenDocs() {
    push();
    fill(0, 120);
    noStroke();
    rect(0, height - 25, width, 25);
    fill(255);
    textSize(11);
    textAlign(LEFT, CENTER);
    let hudText = ` Brush: ${currentBrush} | Size: ${sizeSlider.value()} | Right-Click to Erase | Press S to Save`;
    text(hudText, 10, height - 12);
    pop();
}

/**
 * Handles all brush rendering logic
 * Challenge: Opacity control (fourth parameter in col.setAlpha)
 */
function drawBrushAt(x, y, px, py) {
    let size = sizeSlider.value();
    let col = colorPicker.color();
    
    // Challenge: Add opacity to brush
    col.setAlpha(alphaSlider.value());
    
    pg.stroke(col); 
    pg.fill(col); 
    pg.noErase(); 

    switch (currentBrush) {
        case 1: // Basic Smooth Brush
            pg.strokeWeight(size); 
            pg.strokeCap(ROUND);
            pg.line(px, py, x, y); 
            break;
        case 2: // Spray Brush
            pg.noStroke();
            let density = size * 3;
            for (let i = 0; i < density; i++) {
                pg.ellipse(x + randomGaussian(0, size / 3), y + randomGaussian(0, size / 3), 2, 2);
            }
            break;
        case 3: // Challenge: Change strokeWeight based on mouse speed
            let speed = dist(x, y, px, py);
            let dynamicWeight = constrain(map(speed, 0, 50, size, size / 5), 1, size * 2);
            pg.strokeWeight(dynamicWeight);
            pg.strokeCap(ROUND);
            pg.line(px, py, x, y);
            break;
        case 4: // Challenge: Image Brush with random rotation
            if (myBrush) {
                pg.push();
                pg.translate(x, y);
                pg.rotate(random(TWO_PI)); // Rotate randomly to vary the stroke
                pg.tint(col);
                pg.image(myBrush, 0, 0, size * 3, size * 3);
                pg.pop();
            }
            break;
        case 5: // Challenge: Auto-scribbler (Nudge the pen)
            pg.strokeWeight(1 + size / 10);
            pg.noFill();
            pg.beginShape();
            for (let i = 0; i < 5; i++) {
                pg.vertex(x + random(-size, size), y + random(-size, size));
            }
            pg.endShape();
            break;
    }
}

/**
 * Challenge: Add an eraser
 * Type 6: Transparent (reveals grid) | Type 7: Cover (paints background)
 */
function eraserTool(x, y, px, py, type) {
    let size = sizeSlider.value();
    if (type === 6) { 
        pg.erase(); 
        pg.strokeWeight(size); 
        pg.strokeCap(ROUND);
        pg.line(px, py, x, y); 
        pg.noErase(); 
    } else { 
        pg.noErase(); 
        pg.stroke(bgColorPicker.color());
        pg.strokeWeight(size); 
        pg.strokeCap(ROUND); 
        pg.line(px, py, x, y);
    }
}

/**
 * Challenge: Symmetry - draw a second point on the opposite side
 */
function applySymmetry(x, y, px, py, isEraser, eraserType) {
    let mode = axisSelect.value();
    let act = function(ax, ay, apx, apy) { 
        if (isEraser) eraserTool(ax, ay, apx, apy, eraserType); 
        else drawBrushAt(ax, ay, apx, apy); 
    };

    if (mode === 'Horizontal' || mode === 'Quadrant') {
        act(width - x, y, width - px, py);
    }
    if (mode === 'Vertical' || mode === 'Quadrant') {
        act(x, height - y, px, height - py);
    }
    if (mode === 'Quadrant') {
        act(width - x, height - y, width - px, height - py);
    }
}

/**
 * Challenge: Documentation via keyPressed() commands
 */
function keyPressed() {
    // Challenge: Select brush with a key (1-5)
    if (key >= '1' && key <= '7') {
        currentBrush = int(key);
        print("Switched to Brush: " + currentBrush);
    }
    
    // Challenge: Save image
    if (key === 's' || key === 'S') {
        saveArt();
    }
    
    // Challenge: Reset/Clear whole canvas
    if (key === 'c' || key === 'C') {
        saveHistory();
        pg.clear();
        print("Canvas Cleared.");
    }

    // Undo System
    if (key === 'z' || key === 'Z') {
        undoLastAction();
    }
}

// --- History & File Functions ---

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        saveHistory();
    }
}

function saveHistory() {
    let snapshot = pg.get(); 
    history.push(snapshot);
    if (history.length > 20) {
        history.shift();
    }
}

function undoLastAction() {
    if (history.length > 0) {
        let previousState = history.pop();
        pg.clear();
        pg.push();
        pg.imageMode(CORNER);
        pg.image(previousState, 0, 0);
        pg.pop();
        print("Undo performed.");
    }
}

function saveArt() { 
    let name = nameInput.value().trim() || "example"; 
    // Challenge: Save an image with save()
    saveCanvas(name, 'jpg'); 
    print("Image saved as: " + name + ".jpg");
}

function updateCanvasSize() {
    let newW = parseInt(wInput.value());
    let newH = parseInt(hInput.value());
    if (newW >= 100 && newH >= 100) {
        resizeCanvas(newW, newH);
        pg = createGraphics(newW, newH);
        pg.imageMode(CENTER);
        pg.clear();
        history = []; 
        print("Canvas resized to: " + newW + "x" + newH);
    }
}

function handleFile(f) {
    if (f.type === 'image') {
        myBrush = createImg(f.data, '');
        myBrush.hide();
        currentBrush = 4;
        print("New brush image uploaded.");
    }
}

// --- UI Construction Functions ---

function createTopBar() {
    let y = 15; let startX = 20;

    // Canvas Size Inputs
    createSpan("W:").position(startX, y + 5).style('font-family', CUTE_FONT).style('font-size', '12px');
    wInput = createInput('500'); wInput.position(startX + 20, y); wInput.size(35, 20);
    createSpan("H:").position(startX + 65, y + 5).style('font-family', CUTE_FONT).style('font-size', '12px');
    hInput = createInput('500'); hInput.position(startX + 85, y); hInput.size(35, 20);
    
    let resizeBtn = createButton('Set Size'); 
    styleSmallButton(resizeBtn, startX + 135, y);
    resizeBtn.mousePressed(updateCanvasSize);

    startX += 220; 

    // Actions
    let undoBtn = createButton('↩️ Undo'); 
    styleSmallButton(undoBtn, startX, y);
    undoBtn.mousePressed(undoLastAction);

    let gridBtn = createButton('▦ Grid'); 
    styleSmallButton(gridBtn, startX + 80, y);
    gridBtn.mousePressed(function() { showGrid = !showGrid; });

    let clearBtn = createButton('🗑️ Clear'); 
    styleSmallButton(clearBtn, startX + 155, y);
    clearBtn.mousePressed(function() { saveHistory(); pg.clear(); });

    startX += 240;

    // Saving
    createSpan("File:").position(startX, y + 5).style('font-family', CUTE_FONT).style('font-size', '12px');
    nameInput = createInput('myArt'); nameInput.position(startX + 35, y); nameInput.size(90, 20);
    
    let saveBtn = createButton('💾 Save'); 
    styleSmallButton(saveBtn, startX + 140, y);
    saveBtn.style('background-color', '#E1BEE7'); 
    saveBtn.mousePressed(saveArt);

    let helpBtn = createButton('❓ Keys'); 
    styleSmallButton(helpBtn, startX + 220, y);
    helpBtn.style('background-color', '#FFF9C4'); 
    helpBtn.mousePressed(toggleHelp);
}

function createSideBar() {
    let x = 20; let y = TOP_BAR_HEIGHT + 20; let col2 = x + 90; 

    // Challenge: Change brush color
    createLabel('🎨 PEN STYLE', x, y); y += 25;
    createSpan("BG Color:").position(x, y + 5).style('font-family', CUTE_FONT).style('font-size', '10px');
    bgColorPicker = createColorPicker('#FEC7D7'); bgColorPicker.position(x + 55, y); stylePicker(bgColorPicker); y += 35;
    createSpan("Pen Color:").position(x, y + 5).style('font-family', CUTE_FONT).style('font-size', '10px');
    colorPicker = createColorPicker('#A786DF'); colorPicker.position(x + 55, y); stylePicker(colorPicker); y += 35;

    // Challenge: Change brush size
    createLabel('Size:', x, y); 
    sizeSlider = createSlider(1, 100, 10); sizeSlider.position(x + 40, y); sizeSlider.style('width', '120px'); y += 30;
    
    // Challenge: Add opacity parameter
    createLabel('Alpha:', x, y); 
    alphaSlider = createSlider(0, 255, 255); alphaSlider.position(x + 40, y); alphaSlider.style('width', '120px'); y += 45;

    // Brushes Section
    createLabel('🖌️ BRUSHES', x, y); y += 25;
    makeBtn('🖊️ Basic', 1, x, y); makeBtn('💨 Spray', 2, col2, y); y += 35;
    makeBtn('⚡ Speed', 3, x, y); makeBtn('❤️ Image', 4, col2, y); y += 35;
    makeBtn('🌀 Scribble', 5, x, y); y += 45;

    // Eraser Section
    createLabel('🧽 ERASERS', x, y); y += 25;
    makeBtn('✨ Clear', 6, x, y); makeBtn('🖍️ Cover', 7, col2, y); y += 45;

    // Symmetry Section
    createLabel('🦋 SYMMETRY', x, y); y += 25;
    symmetryCheckbox = createCheckbox(' On', false); 
    symmetryCheckbox.position(x, y); symmetryCheckbox.style('font-family', CUTE_FONT);
    
    axisSelect = createSelect(); 
    axisSelect.position(x + 60, y); 
    axisSelect.option('Horizontal'); axisSelect.option('Vertical'); axisSelect.option('Quadrant');
    axisSelect.size(100, 25); axisSelect.style('font-family', CUTE_FONT); y += 50;

    // Upload Section
    brushImgInput = createFileInput(handleFile); brushImgInput.hide();
    let uploadBtn = createButton('📂 Upload Brush'); 
    styleButton(uploadBtn, x, y); 
    uploadBtn.style('width', '180px'); 
    uploadBtn.mousePressed(function() { brushImgInput.elt.click(); });
}

// --- Visual Guide & Styling Helpers ---

function drawAxisGuide() { 
    push(); 
    stroke(150, 150); 
    strokeWeight(2); 
    drawingContext.setLineDash([5, 5]); 
    let mode = axisSelect.value(); 
    if (mode === 'Horizontal' || mode === 'Quadrant') line(width / 2, 0, width / 2, height); 
    if (mode === 'Vertical' || mode === 'Quadrant') line(0, height / 2, width, height / 2); 
    pop(); 
}

function stylePicker(p) { 
    p.style('height', '25px'); p.style('width', '30px'); p.style('border', 'none'); p.style('cursor', 'pointer'); 
}

function createLabel(t, x, y) { 
    createSpan(t).position(x, y).style('font-family', CUTE_FONT).style('font-weight', 'bold').style('font-size', '12px').style('color', '#888'); 
}

function makeBtn(label, type, x, y) { 
    let b = createButton(label); 
    styleButton(b, x, y); 
    b.mousePressed(function() { 
        currentBrush = type; 
        print("Switched Brush via UI: " + type);
    }); 
}

function styleButton(b, x, y) { 
    b.position(x, y); b.size(85, 30); b.style('background', '#fff'); b.style('border', '1px solid #ddd'); b.style('border-radius', '15px'); b.style('font-family', CUTE_FONT); b.style('cursor', 'pointer'); 
    b.mouseOver(function() { b.style('background', '#f5f5f5'); }); 
    b.mouseOut(function() { b.style('background', '#fff'); }); 
}

function styleSmallButton(b, x, y) { 
    b.position(x, y); b.size(70, 25); b.style('background', '#eee'); b.style('border', '1px solid #ccc'); b.style('border-radius', '5px'); b.style('font-family', CUTE_FONT); b.style('font-size', '11px'); b.style('cursor', 'pointer'); 
}

function toggleHelp() { 
    let disp = helpModal.style('display'); 
    helpModal.style('display', disp === 'none' ? 'block' : 'none'); 
}

function createHelpModal() {
    helpModal = createDiv(`
        <div style="text-align:center; font-family:${CUTE_FONT}">
            <h3>🎹 Shortcuts</h3>
            <hr style="border:1px solid #eee">
            <ul style="text-align:left; padding-left:20px; line-height:1.8; font-size:14px;">
                <li><b>Ctrl + Z</b> : Undo Action</li>
                <li><b>1 - 5</b> : Switch Brushes</li>
                <li><b>6 - 7</b> : Eraser Modes</li>
                <li><b>S</b> : Save Artwork</li>
                <li><b>C</b> : Clear Canvas</li>
            </ul>
            <button onclick="this.parentElement.parentElement.style.display='none'" style="padding:8px 20px; border-radius:15px; border:1px solid #ccc; cursor:pointer; margin-top:10px;">Close</button>
        </div>
    `);
    helpModal.position(0, 0); helpModal.style('position', 'fixed'); helpModal.style('top', '50%'); helpModal.style('left', '50%');
    helpModal.style('transform', 'translate(-50%, -50%)'); helpModal.style('background', 'white'); helpModal.style('padding', '20px');
    helpModal.style('border-radius', '15px'); helpModal.style('box-shadow', '0 10px 40px rgba(0,0,0,0.3)'); helpModal.style('display', 'none'); helpModal.style('z-index', '9999');
}
