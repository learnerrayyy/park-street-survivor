  let bColourR = 255; //change background colour R
  let bColourG = 255; //change background colour G
  let bColourB = 255; //change background colour B
  let isEraser = false;
  let isImg = false;
  let brushSize = 30; //set brushsize
  let eraserSize = 30; //set eraser size
  let brushImg;

function setup() {
  createCanvas(1000, 1000);
  background(bColourR, bColourG, bColourB); //fill background
  textSize(20);
  fill(100);
  textFont('cursive');
  text("press e use Eraser\npress i use Image Brush\npress b exit Image Brush and Eraser\n ", 20, 20);
  let fileInput = createFileInput(handleFile);
  fileInput.position(10, 100);
  
}


function draw() {
  if(mouseIsPressed){
    if(isEraser){
      fill(bColourR, bColourG, bColourB);
      noStroke();
      ellipse(mouseX, mouseY, eraserSize, eraserSize);

    }
    else if(isImg && brushImg){
      imageMode(CENTER);
      image(brushImg, mouseX, mouseY, brushSize, brushSize);
    }
    else{
    fill(random(100, 255));
    noStroke();
    ellipse(mouseX, mouseY, brushSize, brushSize); 
  }
}
}

function keyPressed(){
  if(key == 'e'){
    isEraser = true;
  }
  if(key == 'b'){
    isEraser = false;
    isImg = false;
  }
  if(key == 'i'){
    isImg = true;
  }
}

function handleFile(file){
  if(file.type === 'image'){
    brushImg = loadImage(file.data);
  }else{
    console.log("Not an image file");
  }
}
