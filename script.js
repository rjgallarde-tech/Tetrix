// ---------------------------
// Tetris Neon Arcade Script
// ---------------------------

let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let level = 1;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const blockSize = 20;
const gridWidth = 10;
const gridHeight = 20;

let grid = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));
let currentPiece = getRandomPiece();
let currentX = 3;
let currentY = 0;
let gameOver = false;
let dropInterval = 500;
let lastDropTime = Date.now();
let comboCount = 0;

// ---------------------------
// Audio Elements
// ---------------------------
const bgMusic = document.getElementById('bgMusic');
const collideSound = document.getElementById('collide-sound');
const breakSound = document.getElementById('break-sound');
const gameOverSound = document.getElementById('game-over-sound');
const comboSound = document.getElementById('combo-sound');
const musicToggle = document.getElementById('musicToggle');
const tryAgainSound = document.getElementById('tryagain-sound');
const controlSound = document.getElementById('control-sound');
const moveSound = document.getElementById('control-sound'); // same for left/right
const rotateSound = document.getElementById('control-sound'); // rotate sound
const dropSound = document.getElementById('control-sound'); // down sound

let musicEnabled = true;

// ---------------------------
// Controls
// ---------------------------
document.getElementById('left-btn').addEventListener('click', () => { moveLeft(); });
document.getElementById('right-btn').addEventListener('click', () => { moveRight(); });
document.getElementById('rotate-btn').addEventListener('click', () => { rotatePiece(); });
document.getElementById('down-btn').addEventListener('click', () => { moveDown(); });
document.getElementById('try-again').addEventListener('click', () => {
    tryAgainSound.currentTime = 0;
    tryAgainSound.play().catch(()=>{});
    tryAgain();
});

musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    if(musicEnabled){ bgMusic.play(); musicToggle.textContent='MUSIC: ON'; }
    else{ bgMusic.pause(); musicToggle.textContent='MUSIC: OFF'; }
});

document.getElementById('high-score').textContent = highScore;

// ---------------------------
// Auto-start Music
// ---------------------------
window.addEventListener('load', () => {
    bgMusic.volume = 0.3;
    bgMusic.play().catch(()=>{
        const resumeMusic = () => { bgMusic.play(); window.removeEventListener('click', resumeMusic); window.removeEventListener('keydown', resumeMusic); };
        window.addEventListener('click', resumeMusic);
        window.addEventListener('keydown', resumeMusic);
    });
});

// ---------------------------
// Drawing Functions
// ---------------------------
function drawGrid(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<gridHeight;y++){
        for(let x=0;x<gridWidth;x++){
            if(grid[y][x]===1){
                const gradient=ctx.createLinearGradient(x*blockSize,y*blockSize,(x+1)*blockSize,(y+1)*blockSize);
                gradient.addColorStop(0,'#00ffff');
                gradient.addColorStop(1,'#0077ff');
                ctx.fillStyle=gradient;
                ctx.shadowColor='#00ffff';
                ctx.shadowBlur=10;
                ctx.fillRect(x*blockSize,y*blockSize,blockSize,blockSize);
                ctx.strokeStyle='#0077ff';
                ctx.strokeRect(x*blockSize,y*blockSize,blockSize,blockSize);
                ctx.shadowBlur=0;
            }
        }
    }
    drawGhostPiece();
}

function drawPiece(){
    for(let y=0;y<currentPiece.length;y++){
        for(let x=0;x<currentPiece[y].length;x++){
            if(currentPiece[y][x]===1){
                const px=(currentX+x)*blockSize;
                const py=(currentY+y)*blockSize;
                const gradient=ctx.createLinearGradient(px,py,px+blockSize,py+blockSize);
                gradient.addColorStop(0,'#ff00ff');
                gradient.addColorStop(1,'#ff66ff');
                ctx.fillStyle=gradient;
                ctx.shadowColor='#ff00ff';
                ctx.shadowBlur=15;
                ctx.fillRect(px,py,blockSize,blockSize);
                ctx.strokeStyle='#ff66ff';
                ctx.strokeRect(px,py,blockSize,blockSize);
                ctx.shadowBlur=0;
            }
        }
    }
}

function drawGhostPiece(){
    let ghostY=currentY;
    while(isValidMove(currentX,ghostY+1)) ghostY++;
    ctx.globalAlpha=0.3;
    for(let y=0;y<currentPiece.length;y++){
        for(let x=0;x<currentPiece[y].length;x++){
            if(currentPiece[y][x]===1){
                ctx.fillStyle='#00ffff';
                ctx.fillRect((currentX+x)*blockSize,(ghostY+y)*blockSize,blockSize,blockSize);
            }
        }
    }
    ctx.globalAlpha=1;
}

// ---------------------------
// Pieces & Movement
// ---------------------------
function getRandomPiece(){
    const pieces=[
        [[1,1,1,1]], [[1,1],[1,1]], [[1,1,0],[0,1,1]],
        [[0,1,1],[1,1,0]], [[1,1,1],[0,1,0]], [[1,1,1],[1,0,0]],
        [[1,1,1],[0,0,1]]
    ];
    return pieces[Math.floor(Math.random()*pieces.length)];
}

// Play 8-bit sound safely
function playSound(audio){
    audio.currentTime=0;
    audio.play().catch(()=>{});
}

function moveLeft(){ 
    if(currentX>0 && isValidMove(currentX-1,currentY)){ 
        currentX--; 
        playSound(moveSound);
    } 
}
function moveRight(){ 
    if(currentX+currentPiece[0].length<gridWidth && isValidMove(currentX+1,currentY)){ 
        currentX++; 
        playSound(moveSound);
    } 
}

// Rotation with wall-kick
function rotatePiece(){
    const newPiece=[];
    for(let x=0;x<currentPiece[0].length;x++){
        newPiece.push([]);
        for(let y=currentPiece.length-1;y>=0;y--) newPiece[x].push(currentPiece[y][x]);
    }
    if(isValidMove(currentX,currentY,newPiece)){ currentPiece=newPiece; playSound(rotateSound); return; }
    if(isValidMove(currentX-1,currentY,newPiece)){ currentX--; currentPiece=newPiece; playSound(rotateSound); return; }
    if(isValidMove(currentX+1,currentY,newPiece)){ currentX++; currentPiece=newPiece; playSound(rotateSound); return; }
}

function moveDown(){
    if(isValidMove(currentX,currentY+1)){ 
        currentY++; 
        playSound(dropSound);
    }
    else{ 
        placePiece(); 
        collideSound.currentTime=0; 
        collideSound.play().catch(()=>{}); 
    }
}

function placePiece(){
    for(let y=0;y<currentPiece.length;y++){
        for(let x=0;x<currentPiece[y].length;x++){
            if(currentPiece[y][x]===1) grid[currentY+y][currentX+x]=1;
        }
    }
    checkLines();

    if(isGameOver()){
        gameOver=true;
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-high-score').textContent = highScore;
        document.getElementById('game-over').classList.add('show');
        gameOverSound.play().catch(()=>{});
        bgMusic.pause(); bgMusic.currentTime=0;
        if(score>highScore){ highScore=score; localStorage.setItem('highScore',highScore); document.getElementById('high-score').textContent=highScore; }
    } else { currentPiece=getRandomPiece(); currentX=3; currentY=0; }
}

// ---------------------------
// Check Lines & Combo
function checkLines(){
    let linesCleared = 0;
    const linesToRemove = [];

    for(let y=0;y<gridHeight;y++){
        if(grid[y].every(cell=>cell===1)) linesToRemove.push(y);
    }

    if(linesToRemove.length===0) return 0;

    requestAnimationFrame(()=>{
        linesToRemove.reverse().forEach(y=>{
            grid.splice(y,1);
            grid.unshift(Array(gridWidth).fill(0));
        });

        breakSound.currentTime=0; breakSound.play().catch(()=>{});
        const originalVolume = bgMusic.volume; bgMusic.volume=0.1;
        setTimeout(()=>{ bgMusic.volume = originalVolume; },200);

        if(linesToRemove.length>1){
            comboCount++;
            showCombo(linesToRemove.length);
            comboSound.currentTime=0; comboSound.play().catch(()=>{});
        } else comboCount=0;

        score += linesToRemove.length*10;
        document.getElementById('score').textContent=score;
    });

    return linesToRemove.length;
}

function showCombo(lines){
    const scoreElem = document.querySelector('.score-container');
    const comboElem = document.createElement('div');
    comboElem.className = 'combo-text';
    comboElem.textContent = `COMBO x${lines}`;
    scoreElem.appendChild(comboElem);
    requestAnimationFrame(()=> comboElem.style.opacity=1);
    setTimeout(()=>{ comboElem.style.opacity=0; comboElem.remove(); },600);
}

// ---------------------------
// Game Utilities
function isGameOver(){ return grid[0].some(cell=>cell===1); }
function isValidMove(x,y,piece=currentPiece){
    for(let i=0;i<piece.length;i++){
        for(let j=0;j<piece[i].length;j++){
            if(piece[i][j]===1){
                if(x+j<0||x+j>=gridWidth||y+i>=gridHeight||grid[y+i][x+j]===1) return false;
            }
        }
    }
    return true;
}

// ---------------------------
// Try Again
function tryAgain(){
    score=0; level=1; grid=Array(gridHeight).fill(0).map(()=>Array(gridWidth).fill(0));
    currentPiece=getRandomPiece(); currentX=3; currentY=0; gameOver=false; comboCount=0;
    document.getElementById('game-over').classList.remove('show');
    document.getElementById('score').textContent=score;
    document.getElementById('level').textContent=level;

    if(musicEnabled){ bgMusic.currentTime = 0; bgMusic.play().catch(()=>{}); }
    gameLoop();
}

// ---------------------------
// Game Loop
function gameLoop(){
    if(!gameOver){
        const currentTime=Date.now();
        if(currentTime-lastDropTime>=dropInterval){ moveDown(); lastDropTime=currentTime; }
        drawGrid(); drawPiece();
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
