// --- STATE MANAGEMENT ---
let sessionData = JSON.parse(localStorage.getItem('cubeAppSolves')) || {
    "3x3": [], "2x2": [], "4x4": [], "5x5": []
};

let currentCube = "3x3";
let timerState = 'stopped'; // stopped, holding, ready, running
let holdTimeout;
let startTime;
let timerInterval;
let myChart = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const cubeSelect = document.getElementById('cube-type');
const clockFace = document.getElementById('timer-clock');
const touchArea = document.getElementById('touch-trigger');
const scrambleBox = document.getElementById('scramble');
const historyGrid = document.getElementById('history-grid');

// --- 1. NAVIGATION TABS LOGIC ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        document.querySelector('.nav-item.active').classList.remove('active');
        document.querySelector('.app-screen.active').classList.remove('active');
        item.classList.add('active');
        const target = item.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
        
        if(target === 'screen-stats') renderAnalyticsChart();
    });
});

// --- 2. MULTI-CUBE SCRAMBLE ENGINE ---
function generateScramble() {
    let moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    let modifiers = ['', "'", '2'];
    let length = currentCube === '2x2' ? 10 : currentCube === '4x4' ? 40 : currentCube === '5x5' ? 50 : 22;
    
    if (currentCube === '4x4' || currentCube === '5x5') {
        moves.push('Rw', 'Uw', 'Fw', 'Lw');
    }

    let scramble = [];
    let lastMove = '';
    while (scramble.length < length) {
        let move = moves[Math.floor(Math.random() * moves.length)];
        if (move !== lastMove) {
            scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
            lastMove = move;
        }
    }
    scrambleBox.innerText = scramble.join(' ');
}

// --- 3. PHONE TOUCH & SPACEBAR TIMER LOGIC ---
function handlePressStart() {
    if (timerState === 'running') {
        stopTimer();
    } else if (timerState === 'stopped') {
        timerState = 'holding';
        clockFace.classList.add('holding');
        holdTimeout = setTimeout(() => {
            timerState = 'ready';
            clockFace.classList.remove('holding');
            clockFace.classList.add('ready');
            clockFace.innerText = "0.00";
        }, 500); // 0.5s screen-hold configuration
    }
}

function handlePressRelease() {
    clearTimeout(holdTimeout);
    if (timerState === 'ready') {
        timerState = 'running';
        clockFace.classList.remove('ready');
        startTime = performance.now();
        timerInterval = setInterval(() => {
            clockFace.innerText = ((performance.now() - startTime) / 1000).toFixed(2);
        }, 10);
    } else if (timerState === 'holding') {
        timerState = 'stopped';
        clockFace.classList.remove('holding');
    }
}

// Mobile Screen Tap Bindings
touchArea.addEventListener('touchstart', (e) => { e.preventDefault(); handlePressStart(); });
touchArea.addEventListener('touchend', (e) => { e.preventDefault(); handlePressRelease(); });
// Desktop Fallback
window.addEventListener('keydown', (e) => { if(e.code === 'Space') { e.preventDefault(); handlePressStart(); } });
window.addEventListener('keyup', (e) => { if(e.code === 'Space') handlePressRelease(); });

function stopTimer() {
    clearInterval(timerInterval);
    timerState = 'stopped';
    let solveTime = parseFloat(clockFace.innerText);
    
    // Save to dynamic specific cube storage array
    sessionData[currentCube].unshift(solveTime);
    localStorage.setItem('cubeAppSolves', JSON.stringify(sessionData));
    
    generateScramble();
    updateDashboard();
}

// --- 4. DYNAMIC STATS & CARDS LOGIC ---
function updateDashboard() {
    let list = sessionData[currentCube] || [];
    
    // Render History Screen Cards Grid (Screenshot 3 Style)
    historyGrid.innerHTML = list.length === 0 ? '<p class="empty-msg">No solves yet.</p>' : '';
    list.forEach((time, index) => {
        let card = document.createElement('div');
        card.className = 'solve-card';
        card.innerHTML = `<span class="card-idx">#${list.length - index}</span><span class="card-time">${time.toFixed(2)}s</span>`;
        historyGrid.appendChild(card);
    });

    // Update Main Screen Fast Track Widgets
    document.getElementById('mini-pb').innerText = list.length > 0 ? Math.min(...list).toFixed(2) + 's' : '--';
    
    if (list.length >= 5) {
        let last5 = list.slice(0, 5).sort((a,b)=>a-b);
        last5.pop(); last5.shift(); // Remove best and worst
        let avg = last5.reduce((a,b)=>a+b, 0) / 3;
        document.getElementById('mini-ao5').innerText = avg.toFixed(2) + 's';
    } else {
        document.getElementById('mini-ao5').innerText = '--';
    }
}

// --- 5. CHART.JS GRAPH CONTROLLER ---
function renderAnalyticsChart() {
    let list = [...sessionData[currentCube]].reverse(); // Chronological order
    let labels = list.map((_, i) => i + 1);
    
    let ctx = document.getElementById('analyticsChart').getContext('2d');
    if (myChart) myChart.destroy(); // Clear old instance on data changes

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Solve Times',
                data: list,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: false } }
        }
    });

    // Mean / Median calculations
    if(list.length > 0) {
        let sum = list.reduce((a,b)=>a+b,0);
        document.getElementById('stat-mean').innerText = (sum/list.length).toFixed(2) + 's';
        let sorted = [...list].sort((a,b)=>a-b);
        let mid = Math.floor(sorted.length/2);
        document.getElementById('stat-median').innerText = sorted.length % 2 !== 0 ? sorted[mid].toFixed(2)+'s' : ((sorted[mid-1]+sorted[mid])/2).toFixed(2)+'s';
    }
}

// Category Change Handler
cubeSelect.addEventListener('change', (e) => {
    currentCube = e.target.value;
    generateScramble();
    updateDashboard();
});

// WCA Mock Connect Feature
document.getElementById('wca-mock-trigger').addEventListener('click', () => {
    document.getElementById('wca-status-text').innerHTML = "🟢 Connected as <strong>WCA Competitor</strong><br>PR Single: 32.40s | Rank: National #450";
    alert("WCA Connected Successfully!");
});

// Reset
document.getElementById('clear-btn').addEventListener('click', () => {
    if(confirm("Reset data?")) {
        sessionData[currentCube] = [];
        localStorage.setItem('cubeAppSolves', JSON.stringify(sessionData));
        updateDashboard();
    }
});

// Initiation Trigger
generateScramble();
updateDashboard();

