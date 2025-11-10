// Canvas setup
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;

// Difficulty settings
const difficultySettings = {
    easy: {
        aiSpeed: 3,
        aiError: 60,           // větší tolerance = více chyb
        aiReactionDelay: 0.3,  // 30% šance že nereaguje
        ballSpeedIncrease: 0.02,
        maxBallSpeed: 10
    },
    medium: {
        aiSpeed: 4,
        aiError: 35,
        aiReactionDelay: 0.15,
        ballSpeedIncrease: 0.03,
        maxBallSpeed: 12
    },
    hard: {
        aiSpeed: 5,
        aiError: 15,
        aiReactionDelay: 0.05,
        ballSpeedIncrease: 0.04,
        maxBallSpeed: 15
    }
};

let currentDifficulty = 'medium';
let gamePaused = true;

// Player paddle (left)
const player = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    speed: 6
};

// AI paddle (right)
const ai = {
    x: canvas.width - 20 - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    speed: 4
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: ballSize,
    dx: 4,
    dy: 4,
    baseSpeed: 4,
    currentSpeed: 4
};

// Score
let playerScore = 0;
let aiScore = 0;

// Keyboard state
const keys = {};

// Menu elements
const difficultyMenu = document.getElementById('difficultyMenu');
const difficultyLabel = document.getElementById('difficultyLabel');
const menuButtons = document.querySelectorAll('.menu-button');

// Menu button handlers
menuButtons.forEach(button => {
    button.addEventListener('click', () => {
        const difficulty = button.getAttribute('data-difficulty');
        setDifficulty(difficulty);
        closeMenu();
        startGame();
    });
});

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    // Reset game with SPACE
    if (e.key === ' ') {
        resetGame();
    }

    // Open difficulty menu with ESC
    if (e.key === 'Escape') {
        toggleMenu();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Set difficulty
function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    const settings = difficultySettings[difficulty];

    ai.speed = settings.aiSpeed;
    ball.baseSpeed = 4;
    ball.currentSpeed = 4;

    // Update label
    const difficultyNames = {
        easy: 'LEHKÁ',
        medium: 'STŘEDNÍ',
        hard: 'TĚŽKÁ'
    };
    difficultyLabel.textContent = `Obtížnost: ${difficultyNames[difficulty]}`;

    resetGame();
}

// Toggle menu
function toggleMenu() {
    gamePaused = !gamePaused;
    difficultyMenu.classList.toggle('hidden');
}

// Close menu
function closeMenu() {
    gamePaused = false;
    difficultyMenu.classList.add('hidden');
}

// Start game
function startGame() {
    gamePaused = false;
}

// Draw rectangle
function drawRect(x, y, width, height) {
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, width, height);
}

// Draw circle
function drawCircle(x, y, size) {
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

// Draw center line
function drawCenterLine() {
    ctx.strokeStyle = '#0f0';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Update player paddle
function updatePlayer() {
    if (keys['w'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['s'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
}

// Update AI paddle with errors
function updateAI() {
    const settings = difficultySettings[currentDifficulty];

    // Náhodná šance, že AI nereaguje (chyba/nepozornost)
    if (Math.random() < settings.aiReactionDelay) {
        return;
    }

    const aiCenter = ai.y + ai.height / 2;

    // Přidání náhodné nepřesnosti (AI není dokonalá)
    const targetY = ball.y + (Math.random() - 0.5) * settings.aiError;

    if (aiCenter < targetY - 10) {
        ai.y += ai.speed;
    } else if (aiCenter > targetY + 10) {
        ai.y -= ai.speed;
    }

    // Keep AI paddle in bounds
    if (ai.y < 0) ai.y = 0;
    if (ai.y > canvas.height - ai.height) ai.y = canvas.height - ai.height;
}

// Update ball
function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top and bottom walls
    if (ball.y - ball.size < 0 || ball.y + ball.size > canvas.height) {
        ball.dy *= -1;
    }

    // Ball collision with player paddle
    if (ball.x - ball.size < player.x + player.width &&
        ball.x + ball.size > player.x &&
        ball.y > player.y &&
        ball.y < player.y + player.height) {

        // Postupné zrychlování při odrazu
        speedUpBall();

        ball.dx = Math.abs(ball.dx);

        // Add angle based on where ball hits paddle
        const hitPos = (ball.y - player.y) / player.height;
        ball.dy = (hitPos - 0.5) * 8 * (ball.currentSpeed / ball.baseSpeed);
    }

    // Ball collision with AI paddle
    if (ball.x + ball.size > ai.x &&
        ball.x - ball.size < ai.x + ai.width &&
        ball.y > ai.y &&
        ball.y < ai.y + ai.height) {

        // Postupné zrychlování při odrazu
        speedUpBall();

        ball.dx = -Math.abs(ball.dx);

        // Add angle based on where ball hits paddle
        const hitPos = (ball.y - ai.y) / ai.height;
        ball.dy = (hitPos - 0.5) * 8 * (ball.currentSpeed / ball.baseSpeed);
    }

    // Score point for player
    if (ball.x + ball.size > canvas.width) {
        playerScore++;
        updateScore();
        resetBall();
    }

    // Score point for AI
    if (ball.x - ball.size < 0) {
        aiScore++;
        updateScore();
        resetBall();
    }
}

// Speed up ball gradually
function speedUpBall() {
    const settings = difficultySettings[currentDifficulty];

    if (ball.currentSpeed < settings.maxBallSpeed) {
        ball.currentSpeed += settings.ballSpeedIncrease;

        // Aplikuj novou rychlost zachováním směru
        const angle = Math.atan2(ball.dy, ball.dx);
        ball.dx = Math.cos(angle) * ball.currentSpeed;
        ball.dy = Math.sin(angle) * ball.currentSpeed;
    }
}

// Reset ball to center
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;

    // Reset rychlosti
    ball.currentSpeed = ball.baseSpeed;

    // Random direction
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.baseSpeed;
    ball.dy = (Math.random() * 2 - 1) * ball.baseSpeed;
}

// Update score display
function updateScore() {
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('aiScore').textContent = aiScore;
}

// Reset game
function resetGame() {
    playerScore = 0;
    aiScore = 0;
    updateScore();
    resetBall();
    player.y = canvas.height / 2 - paddleHeight / 2;
    ai.y = canvas.height / 2 - paddleHeight / 2;
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    drawCenterLine();

    // Draw paddles
    drawRect(player.x, player.y, player.width, player.height);
    drawRect(ai.x, ai.y, ai.width, ai.height);

    // Draw ball
    drawCircle(ball.x, ball.y, ball.size);
}

// Game loop
function gameLoop() {
    if (!gamePaused) {
        updatePlayer();
        updateAI();
        updateBall();
    }

    draw();

    requestAnimationFrame(gameLoop);
}

// Initialize game
setDifficulty('medium');

// Start game loop
gameLoop();
