/* VALENTINE CASE - UPDATED LOGIC */

// --- AUDIO ENGINE ---
const AudioEngine = {
    ctx: null,
    muted: false,
    musicPlaying: false,
    
    init() {
        // 1. Init Web Audio API for SFX
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // 2. Init Background Music (Triggered on first click)
        if (!this.musicPlaying && !this.muted) {
            const music = document.getElementById('bg-music');
            music.volume = 0.5; // Set volume to 50%
            music.play().then(() => {
                this.musicPlaying = true;
            }).catch(e => console.log("Audio autoplay blocked until interaction"));
        }
    },

    playTone(type) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'solve') {
            [440, 554, 659].forEach((freq, i) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.connect(g);
                g.connect(this.ctx.destination);
                o.frequency.value = freq;
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(0.1, now + 0.1 + (i*0.1));
                g.gain.exponentialRampToValueAtTime(0.001, now + 2);
                o.start(now);
                o.stop(now + 2);
            });
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        const btn = document.getElementById('mute-btn');
        const music = document.getElementById('bg-music');
        
        if (this.muted) {
            btn.innerText = "🔇";
            music.muted = true;
        } else {
            btn.innerText = "🔈";
            music.muted = false;
            // If music wasn't playing (e.g. started while muted), try playing now
            if (music.paused) {
                music.play();
                this.musicPlaying = true;
            }
        }
    }
};

// --- GAME STATE ---
const state = {
    p1Mix: [],
    p3PiecesPlaced: 0
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            AudioEngine.init();
            AudioEngine.playTone('click');
            const targetId = e.target.dataset.next;
            transitionTo(targetId);
        });
    });

    document.getElementById('mute-btn').addEventListener('click', () => AudioEngine.toggleMute());

    setupPuzzle1();
    setupPuzzle2();
    setupPuzzle3();
    setupPuzzle4();
});

function transitionTo(id) {
    const current = document.querySelector('.panel.active');
    const next = document.getElementById(id);
    current.classList.remove('active');
    setTimeout(() => { next.classList.add('active'); }, 300);
}

function unlockRing(index, nextSectionId) {
    AudioEngine.playTone('solve');
    const ring = document.querySelector(`#slot-${index} .ring`);
    ring.classList.add('unlocked');
    setTimeout(() => { transitionTo(nextSectionId); }, 2500);
}

// --- PUZZLE 1: MIXING (RGB Logic) ---
function setupPuzzle1() {
    const bowl = document.getElementById('mixing-bowl');
    const draggables = document.querySelectorAll('#p1-game .blob');
    
    draggables.forEach(d => {
        d.addEventListener('dragstart', e => {
            e.dataTransfer.setData('rgb', e.target.dataset.color);
        });
    });

    bowl.addEventListener('dragover', e => e.preventDefault());
    bowl.addEventListener('drop', e => {
        e.preventDefault();
        const rgb = e.dataTransfer.getData('rgb');
        if(rgb) {
            state.p1Mix.push(rgb.split(',').map(Number));
            calcMix();
        }
    });

    document.getElementById('p1-reset').addEventListener('click', () => {
        state.p1Mix = [];
        bowl.style.backgroundColor = 'transparent';
        bowl.querySelector('span').style.display = 'block';
    });
}

function calcMix() {
    const bowl = document.getElementById('mixing-bowl');
    if(state.p1Mix.length === 0) return;

    let r=0, g=0, b=0;
    state.p1Mix.forEach(c => { r+=c[0]; g+=c[1]; b+=c[2]; });
    r = Math.round(r / state.p1Mix.length);
    g = Math.round(g / state.p1Mix.length);
    b = Math.round(b / state.p1Mix.length);

    bowl.style.backgroundColor = `rgb(${r},${g},${b})`;
    bowl.querySelector('span').style.display = 'none';

    // Pink Target
    const isRedDominant = r > 200;
    const isGreenModerate = g > 100 && g < 180;
    const isBlueModerate = b > 100 && b < 180;
    const areGBBalanced = Math.abs(g - b) < 30;

    if(isRedDominant && isGreenModerate && isBlueModerate && areGBBalanced) {
        document.querySelector('#p1-game .puzzle-area').style.pointerEvents = 'none';
        unlockRing(1, 'p2-text');
    }
}

// --- PUZZLE 2: DEBATE ---
function setupPuzzle2() {
    const args = [
        { text: "Connects people globally", type: "boon" },
        { text: "Threatens privacy", type: "bane" },
        { text: "Empowers education", type: "boon" },
        { text: "Job displacement", type: "bane" },
        { text: "Increases dependency", type: "bane" },
        { text: "Accelerates innovation", type: "boon" }
    ];
    
    args.sort(() => Math.random() - 0.5);
    const stack = document.getElementById('card-stack');
    
    args.forEach(arg => {
        const div = document.createElement('div');
        div.className = 'arg-card';
        div.draggable = true;
        div.innerText = arg.text;
        div.dataset.type = arg.type;
        div.addEventListener('dragstart', e => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('type', arg.type);
        });
        div.addEventListener('dragend', e => e.target.classList.remove('dragging'));
        stack.appendChild(div);
    });

    document.querySelectorAll('.drop-container').forEach(zone => {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const card = document.querySelector('.dragging');
            if(card) {
                zone.appendChild(card);
                checkP2Win();
            }
        });
    });
}

function checkP2Win() {
    const rightZone = document.getElementById('zone-right');
    const cards = rightZone.querySelectorAll('.arg-card');
    let baneCount = 0;
    cards.forEach(c => { if(c.dataset.type === 'bane') baneCount++; });
    if(baneCount >= 3) {
        document.querySelector('#p2-game .puzzle-area').style.pointerEvents = 'none';
        unlockRing(2, 'interlude');
    }
}

// --- PUZZLE 3: JIGSAW (UPDATED LOGIC) ---
function setupPuzzle3() {
    // 1. Handle Input (Unveil Pieces)
    document.querySelectorAll('.riddle-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            const correct = e.target.dataset.ans;
            
            if (val === correct) {
                AudioEngine.playTone('click');
                // Hide the overlay, show the piece
                const container = e.target.closest('.riddle-card-container');
                const overlay = container.querySelector('.riddle-overlay');
                const piece = container.querySelector('.puzzle-piece');
                
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                
                piece.draggable = true;
                setupPieceDrag(piece);
            }
        });
    });

    // 2. Handle Board Drop
    document.querySelectorAll('.jigsaw-slot').forEach(slot => {
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', e => {
            e.preventDefault();
            const id = e.dataTransfer.getData('id');
            const piece = document.querySelector(`.puzzle-piece[data-id="${id}"]`);
            
            if(piece) {
                if(slot.children.length === 0) {
                    slot.appendChild(piece);
                    checkJigsawWin();
                }
            }
        });
    });
}

function setupPieceDrag(piece) {
    piece.addEventListener('dragstart', e => {
        e.dataTransfer.setData('id', piece.dataset.id);
    });
}

function checkJigsawWin() {
    let correctCount = 0;
    const slots = document.querySelectorAll('.jigsaw-slot');
    
    // Check strict order
    slots.forEach(slot => {
        if(slot.children.length > 0) {
            const piece = slot.children[0];
            const slotIndex = slot.dataset.index;
            const pieceId = piece.dataset.id;
            
            if(slotIndex === pieceId) {
                correctCount++;
            }
        }
    });

    if(correctCount === 4) {
        document.querySelector('#p3-game').style.pointerEvents = 'none';
        unlockRing(3, 'p4-text');
    }
}

// --- PUZZLE 4: DATE ---
function setupPuzzle4() {
    const btn = document.getElementById('check-date-btn');
    const input = document.getElementById('date-input');
    btn.addEventListener('click', () => {
        const val = input.value.replace(/\s/g, '');
        if(val === '03/07' || val === '0307') {
            unlockRing(4, 'finale');
        } else {
            input.style.color = '#8b3a3a';
            setTimeout(() => input.style.color = '#2c2c2c', 500);
        }
    });

    document.querySelectorAll('.yes-btn').forEach(b => {
        b.addEventListener('click', () => {
            AudioEngine.playTone('solve');
            alert("❤️ Forever. ❤️");
        });
    });
}