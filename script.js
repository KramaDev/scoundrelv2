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

function drawRoom() {
    // FIX: You can only draw if 3 cards were resolved (or deck is empty)
    if (resolvedInRoom < 3 && room.length > 0 && deck.length > 0) return;

    // Identify the card that was NOT played (the 4th card) to carry over
    const carryOver = room.find(c => !c.resolved);
    room = carryOver ? [carryOver] : [];
    
    // Fill the room back to 4 cards
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
    fleeUsedLastRoom = true;
    logMessage("Tactical retreat! Clear the next chamber before fleeing again.", "text-red-400 font-bold");
    drawRoom();
}

function handleInteract(idx) {
    const card = room[idx];
    if (card.resolved || isGameOver) return;
    
    // FIX: Lock interaction if 3 cards have already been played in this room
    // Exception: If the deck is empty, allow playing all cards to finish the game.
    if (resolvedInRoom >= 3 && deck.length > 0) {
        logMessage("Room cleared! The 4th card remains. Draw the next room.", "text-amber-200 italic");
        return;
    }

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
            logMsg = `Shielded ${equippedWeapon.val}, but took ${damage} damage.`;
        }
    } else {
        logMsg = `Barehanded vs ${card.rank}. Took ${damage} damage!`;
    }
    applyDamage(damage);
    score += (card.val * 10);
    logMessage(logMsg, damage > 0 ? "text-red-500" : "text-emerald-400");
    addToGraveyard(card);
    finishCard(idx);
}

function resolveWeapon(card, idx) {
    equippedWeapon = { ...card };
    logMessage(`Found ${card.rank}♦ Steel.`, "text-sky-400");
    finishCard(idx);
}

function resolvePotion(card, idx) {
    if (potionUsed) logMessage("Potions don't stack in the same room.", "text-neutral-500");
    else {
        health = Math.min(20, health + card.val);
        potionUsed = true;
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
    
    if (resolvedInRoom >= 3) {
        fleeUsedLastRoom = false;
        if (deck.length > 0) {
            logMessage("Chamber resolved. One card remains for the next room.", "text-amber-500 font-bold");
        }
    }

    renderRoom();
    updateUI();

    // End game only if deck is empty AND all cards in current room are resolved
    if (deck.length === 0 && room.every(c => c.resolved)) endGame(true);
}

function updateUI() {
    document.getElementById('health-bar').style.width = (health / 20 * 100) + "%";
    document.getElementById('health-text').innerText = `${health}/20`;
    document.getElementById('deck-count').innerText = deck.length;
    document.getElementById('score-value').innerText = score;
    document.getElementById('resolved-indicator').innerText = `${resolvedInRoom} / 3 Resolved`;
    
    const runBtn = document.getElementById('run-btn');
    if (fleeUsedLastRoom) {
        runBtn.disabled = true;
        runBtn.innerText = "Recharging...";
    } else {
        runBtn.disabled = resolvedInRoom > 0 || room.length === 0;
        runBtn.innerText = "Flee Dungeon";
    }

    const wSlot = document.getElementById('weapon-slot');
    wSlot.innerHTML = equippedWeapon ? 
        `<div class="text-3xl font-bold suit-diamond font-['Cinzel']">${equippedWeapon.rank}♦</div><div class="text-[10px] font-bold text-sky-400">Power: ${equippedWeapon.val}</div>` : 
        `<div class="text-sky-500/50 italic text-xs font-['Cinzel']">Hands are empty</div>`;

    // Only allow drawing if 3 cards were played
    document.getElementById('draw-btn').disabled = (resolvedInRoom < 3 && room.length > 0 && deck.length > 0) || (deck.length === 0 && room.every(c => c.resolved));
}

function renderRoom() {
    const container = document.getElementById('card-slots');
    container.innerHTML = room.map((c, i) => {
        const isRed = c.suit === 'D' || c.suit === 'H';
        return `
        <div onclick="handleInteract(${i})" class="card-slot ${c.resolved ? 'card-resolved' : ''} ${c.suit === 'D' ? 'card-weapon' : ''} ${c.suit === 'H' ? 'card-potion' : ''}">
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
    entry.className = `${color} border-l-2 border-current pl-3 py-1 bg-black/20 rounded-r`;
    entry.innerHTML = ` ${txt}`;
    log.prepend(entry);
}

function addToGraveyard(card) {
    const gy = document.getElementById('graveyard');
    const icon = document.createElement('span');
    icon.className = `text-lg ${card.suit==='S'||card.suit==='C'?'text-black':'text-red-700'}`;
    icon.innerText = SUITS[card.suit];
    gy.appendChild(icon);
}

function endGame(win) {
    isGameOver = true;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-title').innerText = win ? "ASCENDED" : "EXTINGUISHED";
    document.getElementById('modal-content').innerText = win ? `Final Score: ${score + (health*100)}` : `Your journey ends. Score: ${score}`;
}

init();
