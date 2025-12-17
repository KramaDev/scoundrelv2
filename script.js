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

// --- Initialization ---
function init() {
    createDeck();
    updateUI();
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

// --- Logic ---
function drawRoom() {
    if (resolvedInRoom < 3 && room.length > 0) return;
    
    const carryOver = room.find(c => !c.resolved);
    room = carryOver ? [carryOver] : [];
    
    while (room.length < 4 && deck.length > 0) {
        room.push({ ...deck.shift(), resolved: false });
    }

    resolvedInRoom = 0;
    potionUsed = false;
    renderRoom();
    updateUI();
}

function runRoom() {
    if (fleeUsedLastRoom || resolvedInRoom > 0 || room.length === 0) return;
    
    deck.push(...room);
    room = [];
    fleeUsedLastRoom = true; // Lock the flee mechanic
    logMessage("You flee! You must fight your way through the next room before you can run again.", "text-red-400 font-bold");
    drawRoom();
}

function handleInteract(idx) {
    const card = room[idx];
    if (card.resolved || isGameOver) return;

    if (card.suit === 'S' || card.suit === 'C') resolveCombat(card, idx);
    else if (card.suit === 'D') resolveWeapon(card, idx);
    else if (card.suit === 'H') resolvePotion(card, idx);
}

function resolveCombat(card, idx) {
    let damage = card.val;
    let logMsg = "";

    if (equippedWeapon) {
        if (equippedWeapon.val > card.val) {
            damage = 0;
            logMsg = `Slayed ${card.rank}${SUITS[card.suit]} with ${equippedWeapon.rank}♦.`;
            equippedWeapon.val = Math.max(0, equippedWeapon.val - 1); 
        } else {
            damage = card.val - equippedWeapon.val;
            logMsg = `Weapon blocked ${equippedWeapon.val}, but ${card.rank} hit for ${damage}.`;
        }
    } else {
        logMsg = `Barehanded vs ${card.rank}. Took ${damage} damage.`;
    }

    applyDamage(damage);
    score += (card.val * 10);
    logMessage(logMsg, damage > 0 ? "text-red-500" : "text-emerald-400");
    addToGraveyard(card);
    finishCard(idx);
}

function resolveWeapon(card, idx) {
    equippedWeapon = { ...card };
    logMessage(`Found a ${card.rank}♦. Mighty!`, "text-sky-400");
    finishCard(idx);
}

function resolvePotion(card, idx) {
    if (potionUsed) {
        logMessage("Potions are ineffective if taken too quickly.", "text-neutral-500");
    } else {
        health = Math.min(20, health + card.val);
        potionUsed = true;
        logMessage(`Drank Ichor. Healed ${card.val}.`, "text-rose-400");
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
    
    // Reset flee lock if they've cleared the minimum required cards
    if (resolvedInRoom >= 3) fleeUsedLastRoom = false;

    renderRoom();
    updateUI();
    if (deck.length === 0 && room.every(c => c.resolved)) endGame(true);
}

// --- UI Rendering ---
function updateUI() {
    document.getElementById('health-bar').style.width = (health / 20 * 100) + "%";
    document.getElementById('health-text').innerText = `${health}/20`;
    document.getElementById('deck-count').innerText = deck.length;
    document.getElementById('score-value').innerText = score;
    document.getElementById('resolved-indicator').innerText = `${resolvedInRoom} / 3 Resolved`;

    const runBtn = document.getElementById('run-btn');
    if (fleeUsedLastRoom) {
        runBtn.disabled = true;
        runBtn.innerText = "Flee Recharging...";
    } else {
        runBtn.disabled = resolvedInRoom > 0 || room.length === 0;
        runBtn.innerText = "Flee Dungeon";
    }

    const wSlot = document.getElementById('weapon-slot');
    wSlot.innerHTML = equippedWeapon ? 
        `<div class="text-3xl font-bold suit-diamond font-['Cinzel']">${equippedWeapon.rank}♦</div><div class="text-[10px] font-bold text-sky-400">Power: ${equippedWeapon.val}</div>` : 
        `<div class="text-sky-500/50 italic text-xs font-['Cinzel']">Hands are empty</div>`;

    document.getElementById('draw-btn').disabled = (resolvedInRoom < 3 && room.length > 0) || deck.length === 0;
}

function renderRoom() {
    const container = document.getElementById('card-slots');
    container.innerHTML = room.map((c, i) => `
        <div onclick="handleInteract(${i})" class="card-slot ${c.resolved ? 'card-resolved' : ''} ${c.suit === 'D' ? 'card-weapon' : ''} ${c.suit === 'H' ? 'card-potion' : ''}">
            <div class="flex justify-between items-start z-10">
                <div class="text-2xl font-black font-['Cinzel'] suit-${getSuitClass(c.suit)}">${c.rank}</div>
                <div class="text-[9px] font-bold uppercase tracking-widest text-neutral-800 opacity-60">${getTypeLabel(c.suit)}</div>
            </div>
            <div class="suit-watermark suit-${getSuitClass(c.suit)}">${SUITS[c.suit]}</div>
            <div class="text-center z-10"><div class="text-5xl font-['Cinzel'] font-black text-neutral-900">${c.val}</div></div>
            <div class="text-center z-10"><span class="text-[9px] font-black uppercase bg-black/10 px-2 py-0.5 rounded text-neutral-800">${getCardType(c.suit)}</span></div>
        </div>
    `).join('');
}

function getSuitClass(s) { return s==='S'?'spade':s==='C'?'club':s==='D'?'diamond':'heart'; }
function getTypeLabel(s) { return (s==='S'||s==='C')?'Danger':(s==='D')?'Might':'Life'; }
function getCardType(s) { return (s==='S'||s==='C')?'Monster':(s==='D')?'Steel':'Ichor'; }

function logMessage(txt, color) {
    const log = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = `${color} border-l-2 border-current pl-3 py-1 bg-black/20 rounded-r`;
    entry.innerHTML = ` ${txt}`;
    log.prepend(entry);
}

function addToGraveyard(card) {
    const gy = document.getElementById('graveyard');
    const icon = document.createElement('span');
    icon.className = `text-lg suit-${getSuitClass(card.suit)}`;
    icon.innerText = SUITS[card.suit];
    gy.appendChild(icon);
}

function endGame(win) {
    isGameOver = true;
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('modal-title').innerText = win ? "ASCENDED" : "EXTINGUISHED";
    document.getElementById('modal-content').innerText = win ? `You cleared the dungeon! Score: ${score + (health*100)}` : `Your journey ends here. Score: ${score}`;
}

init();
