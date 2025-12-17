// --- Game State ---
let health = 20;
let score = 0;
let deck = [];
let room = [];
let equippedWeapon = null;
let potionUsed = false;
let fleeUsedLastRoom = false; 
let resolvedInRoom = 0;
let isGameOver = false;

const SUITS = { S: '♠', C: '♣', D: '♦', H: '♥' };
const RANKS = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };

function init() {
    createDeck();
    updateUI();
    loadHighScores();
    logMessage("The dungeon gate creaks shut. 44 cards remain.", "text-amber-400");
}

function createDeck() {
    for (let s in SUITS) {
        for (let r in RANKS) {
            if ((s === 'H' || s === 'D') && ['A', 'K', 'Q', 'J'].includes(r)) continue;
            deck.push({ suit: s, rank: r, val: RANKS[r], id: Math.random() });
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

// --- Effects (Idea 5) ---
function triggerShake() {
    const el = document.getElementById('game-container');
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
}

function updateDynamicBackground() {
    // Darkens the background as the deck gets smaller
    const darkness = 1 - (deck.length / 44);
    document.body.style.backgroundColor = `rgb(${15 - (10 * darkness)}, ${11 - (8 * darkness)}, ${7 - (5 * darkness)})`;
}

// --- Logic ---
function drawRoom() {
    if (resolvedInRoom < 3 && room.length > 0 && deck.length > 0) return;
    const carryOver = room.find(c => !c.resolved);
    room = carryOver ? [carryOver] : [];
    while (room.length < 4 && deck.length > 0) {
        room.push({ ...deck.shift(), resolved: false });
    }
    resolvedInRoom = 0;
    potionUsed = false;
    updateDynamicBackground();
    renderRoom();
    updateUI();
}

function runRoom() {
    if (fleeUsedLastRoom || resolvedInRoom > 0 || room.length === 0) return;
    deck.push(...room);
    room = [];
    fleeUsedLastRoom = true;
    logMessage("Tactical retreat! Clear the next chamber first.", "text-red-400 font-bold");
    drawRoom();
}

function handleInteract(idx) {
    if (resolvedInRoom >= 3 && deck.length > 0) return;
    const card = room[idx];
    if (card.resolved || isGameOver) return;

    if (card.suit === 'S' || card.suit === 'C') resolveCombat(card, idx);
    else if (card.suit === 'D') resolveWeapon(card, idx);
    else if (card.suit === 'H') resolvePotion(card, idx);
}

function resolveCombat(card, idx) {
    let damage = card.val;
    if (equippedWeapon) {
        if (equippedWeapon.val > card.val) {
            damage = 0;
            equippedWeapon.val = Math.max(0, equippedWeapon.val - 1); 
        } else {
            damage = card.val - equippedWeapon.val;
        }
    }
    
    if (damage > 0) {
        triggerShake();
        document.getElementById('room-panel').classList.add('flash-red');
        setTimeout(() => document.getElementById('room-panel').classList.remove('flash-red'), 400);
    }
    
    applyDamage(damage);
    score += (card.val * 10);
    logMessage(damage > 0 ? `Took ${damage} damage from ${card.rank}.` : `Slayed ${card.rank} safely.`, damage > 0 ? "text-red-500" : "text-emerald-400");
    addToGraveyard(card);
    finishCard(idx);
}

function resolveWeapon(card, idx) {
    equippedWeapon = { ...card };
    logMessage(`Equipped ${card.rank}♦ Steel.`, "text-sky-400");
    finishCard(idx);
}

function resolvePotion(card, idx) {
    if (potionUsed) {
        logMessage("Potions don't stack.", "text-neutral-500");
    } else {
        health = Math.min(20, health + card.val);
        potionUsed = true;
        document.getElementById('room-panel').classList.add('flash-green');
        setTimeout(() => document.getElementById('room-panel').classList.remove('flash-green'), 400);
        logMessage(`Healed ${card.val} Vitality.`, "text-rose-400");
    }
    finishCard(idx);
}

function applyDamage(d) {
    health = Math.max(0, health - d);
    if (health <= 0) endGame(false);
    updateUI();
}

function finishCard(idx) {
    room[idx].resolved = true;
    resolvedInRoom++;
    if (resolvedInRoom >= 3) fleeUsedLastRoom = false;
    renderRoom();
    updateUI();
    if (deck.length === 0 && room.every(c => c.resolved)) endGame(true);
}

// --- High Score System (Idea 7) ---
function loadHighScores() {
    const scores = JSON.parse(localStorage.getItem('scoundrel_scores') || '[]');
    const container = document.getElementById('high-scores');
    container.innerHTML = scores.length ? scores.map((s, i) => `
        <div class="flex justify-between border-b border-amber-900/20">
            <span>${i+1}. ${s.date}</span>
            <span class="text-amber-400 font-bold">${s.val}</span>
        </div>
    `).join('') : '<div class="italic opacity-40">No legends yet...</div>';
}

function saveScore(finalScore) {
    let scores = JSON.parse(localStorage.getItem('scoundrel_scores') || '[]');
    scores.push({ val: finalScore, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.val - a.val);
    localStorage.setItem('scoundrel_scores', JSON.stringify(scores.slice(0, 5)));
}

// --- UI ---
function updateUI() {
    document.getElementById('health-bar').style.width = (health / 20 * 100) + "%";
    document.getElementById('health-text').innerText = `${health}/20`;
    document.getElementById('deck-count').innerText = deck.length;
    document.getElementById('score-value').innerText = score;
    document.getElementById('resolved-indicator').innerText = `${resolvedInRoom} / 3 Resolved`;
    
    const runBtn = document.getElementById('run-btn');
    runBtn.disabled = fleeUsedLastRoom || resolvedInRoom > 0 || room.length === 0;
    runBtn.innerText = fleeUsedLastRoom ? "Recharging..." : "Flee Dungeon";

    const wSlot = document.getElementById('weapon-slot');
    wSlot.innerHTML = equippedWeapon ? 
        `<div class="text-3xl font-bold text-amber-600 font-['Cinzel']">${equippedWeapon.rank}♦</div><div class="text-[10px] font-bold text-sky-400">Power: ${equippedWeapon.val}</div>` : 
        `<div class="text-sky-500/50 italic text-xs">Hands are empty</div>`;

    document.getElementById('draw-btn').disabled = (resolvedInRoom < 3 && room.length > 0 && deck.length > 0);
}

function renderRoom() {
    const container = document.getElementById('card-slots');
    container.innerHTML = room.map((c, i) => {
        const isRed = c.suit === 'D' || c.suit === 'H';
        return `
        <div onclick="handleInteract(${i})" class="card-slot ${c.resolved ? 'card-resolved' : ''}">
            <div class="flex justify-between items-start z-10">
                <div class="text-2xl font-black font-['Cinzel'] ${isRed ? 'text-red-700' : 'text-black'}">${c.rank}</div>
                <div class="text-[9px] font-bold uppercase tracking-widest text-neutral-800 opacity-60">${c.suit==='S'||c.suit==='C'?'Danger':c.suit==='D'?'Might':'Life'}</div>
            </div>
            <div class="suit-watermark ${isRed ? 'text-red-700' : 'text-black'}">${SUITS[c.suit]}</div>
            <div class="text-center z-10"><div class="text-5xl font-['Cinzel'] font-black text-neutral-900">${c.val}</div></div>
            <div class="text-center z-10"><span class="text-[9px] font-black uppercase bg-black/10 px-2 py-0.5 rounded text-neutral-800">${c.suit==='S'||c.suit==='C'?'Monster':c.suit==='D'?'Steel':'Ichor'}</span></div>
        </div>
    `}).join('');
}

function logMessage(txt, color) {
    const log = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = `${color} border-l-2 border-current pl-3 py-1 bg-black/10`;
    entry.innerText = txt;
    log.prepend(entry);
}

function addToGraveyard(card) {
    const gy = document.getElementById('graveyard');
    const icon = document.createElement('span');
    icon.innerText = SUITS[card.suit];
    gy.appendChild(icon);
}

function endGame(win) {
    isGameOver = true;
    const finalScore = score + (win ? health * 100 : 0);
    saveScore(finalScore);
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-title').innerText = win ? "ASCENDED" : "EXTINGUISHED";
    document.getElementById('modal-content').innerText = `Your Final Score: ${finalScore}`;
}

init();
