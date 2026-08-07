const foolioIcon = document.querySelector('#icon');
const loginBtn = document.querySelector('#login-btn');
const startBtn = document.querySelector('#start-btn');

loginBtn.addEventListener('mouseover', () => {
    foolioIcon.src = 'images/foolio-icon-left.PNG';
})

loginBtn.addEventListener('mouseout', () => {
    foolioIcon.src = 'images/foolio-icon.PNG';
})

startBtn.addEventListener('mouseover', () => {
    foolioIcon.src = 'images/foolio-icon-right.PNG';
})

startBtn.addEventListener('mouseout', () => {
    foolioIcon.src = 'images/foolio-icon.PNG';
})

/* Proximity-based avoidance: push letters slightly away when cursor nears */
const letters = document.querySelectorAll('#foolio-text h1');
const letterState = new Map();

letters.forEach(letter => {
    letter.style.setProperty('--px', '0px');
    letter.style.setProperty('--py', '0px');
    letterState.set(letter, { cx: 0, cy: 0, curX: 0, curY: 0, targetX: 0, targetY: 0 });
});

function updateCenters() {
    letters.forEach(letter => {
        const r = letter.getBoundingClientRect();
        const s = letterState.get(letter);
        s.cx = r.left + r.width / 2;
        s.cy = r.top + r.height / 2;
    });
}

updateCenters();
window.addEventListener('resize', updateCenters);

let mouse = { x: -9999, y: -9999 };
document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

const THRESHOLD = 120; // px distance where avoidance starts
const MAX_PUSH = 8; // max px push-away

function rafLoop() {
    letters.forEach(letter => {
        const s = letterState.get(letter);
        const dx = s.cx - mouse.x;
        const dy = s.cy - mouse.y;
        const dist = Math.hypot(dx, dy);
        let tx = 0, ty = 0;

        if (dist < THRESHOLD) {
            const strength = (1 - dist / THRESHOLD) * MAX_PUSH;
            if (dist > 0.5) {
                tx = (dx / dist) * strength;
                ty = (dy / dist) * strength;
            } else {
                tx = strength;
                ty = 0;
            }
        }

        s.targetX = tx;
        s.targetY = ty;

        // smooth towards target
        const LERP = 0.18;
        s.curX += (s.targetX - s.curX) * LERP;
        s.curY += (s.targetY - s.curY) * LERP;

        if (Math.abs(s.curX) < 0.01) s.curX = 0;
        if (Math.abs(s.curY) < 0.01) s.curY = 0;

        letter.style.setProperty('--px', `${s.curX}px`);
        letter.style.setProperty('--py', `${s.curY}px`);
    });
    requestAnimationFrame(rafLoop);
}

requestAnimationFrame(rafLoop);