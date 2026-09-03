const $ = (selector) => document.querySelector(selector);
const homeScreen = $('#home-screen');
const gameScreen = $('#game-screen');
const sceneContainer = $('#scene-container');
const scoreLabel = $('#score');
const homeBest = $('#home-best');
const modes = { classic: { label: 'CLASSIC RUSH', speed: .34 }, zen: { label: 'ZEN CIRCUIT', speed: .25 }, night: { label: 'NIGHT RUN', speed: .46 } };
let selectedMode = 'classic';
let bestScore = Number(localStorage.getItem('run471k-best') || 0);
homeBest.textContent = String(bestScore).padStart(6, '0');
document.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => { if (card.dataset.mode === 'night') return; document.querySelectorAll('.mode-card').forEach((item) => item.classList.remove('selected')); card.classList.add('selected'); selectedMode = card.dataset.mode; }));
$('#play-button').addEventListener('click', startGame);
$('#pause-button').addEventListener('click', togglePause);
$('#resume-button').addEventListener('click', togglePause);
$('#retry-button').addEventListener('click', startGame);
$('#home-button').addEventListener('click', showHome);
$('#gameover-home-button').addEventListener('click', showHome);
let renderer, camera, world, player, playerTexture, clock, animationFrame;
let runnerParts = {};
let active = false, paused = false, ended = false, lane = 1, targetLane = 1, playerY = 1.15, verticalVelocity = 0, sliding = false, distance = 0, spawnTimer = 0, pickupTimer = 0, obstacles = [], pickups = [], touchStart = null, slideTimer;

function startGame() {
    if (!window.THREE) return showBootError('The 3D engine did not load. Refresh the page and try again.');
    try {
        cancelAnimationFrame(animationFrame);
        homeScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); $('#pause-panel').classList.add('hidden'); $('#gameover-panel').classList.add('hidden'); $('#mode-label').textContent = modes[selectedMode].label;
        setupScene(); active = true; paused = false; ended = false; distance = 0; lane = 1; targetLane = 1; playerY = 1.15; verticalVelocity = 0; sliding = false; spawnTimer = .7; pickupTimer = .4; clock = new THREE.Clock(); animationFrame = requestAnimationFrame(loop);
    } catch (error) {
        console.error('Run471K could not start:', error);
        showBootError('3D mode could not start in this browser. Please enable WebGL or try another browser.');
    }
}
function showBootError(message) { const errorBox = $('#boot-error'); errorBox.textContent = message; errorBox.classList.remove('hidden'); }
function setupScene() {
    if (renderer) renderer.dispose(); sceneContainer.innerHTML = ''; world = new THREE.Scene(); world.background = new THREE.Color(0x08141b); world.fog = new THREE.Fog(0x08141b, 16, 58);
    camera = new THREE.PerspectiveCamera(57, sceneContainer.clientWidth / sceneContainer.clientHeight, .1, 100); camera.position.set(0, 5.1, 9.2); camera.lookAt(0, 1.7, -12);
    renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight); sceneContainer.appendChild(renderer.domElement);
    world.add(new THREE.HemisphereLight(0x9ed7ff, 0x102326, 2.2)); const sun = new THREE.DirectionalLight(0xfff3cf, 2.7); sun.position.set(-5, 10, 5); world.add(sun); createRoad(); createCity(); createPlayer(); obstacles = []; pickups = []; window.addEventListener('resize', resizeGame);
}
function createRoad() {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 80), new THREE.MeshStandardMaterial({ color: 0x172c32, roughness: .72 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -22); world.add(road);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x0b555a, emissive: 0x063337, emissiveIntensity: 1.4 }); [-4.9, 4.9].forEach((x) => { const edge = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, 80), edgeMaterial); edge.position.set(x, .08, -22); world.add(edge); });
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0x79e6d1, emissive: 0x20bca8, emissiveIntensity: 2 }); [-1.45, 1.45].forEach((x) => { for (let z = -58; z < 12; z += 5) { const line = new THREE.Mesh(new THREE.BoxGeometry(.055, .025, 2.2), lineMaterial); line.position.set(x, .04, z); line.userData.scroll = true; world.add(line); } });
}
function createCity() {
    const colors = [0x12353b, 0x183248, 0x1c2939, 0x223a3d];
    for (let side = -1; side <= 1; side += 2) for (let index = 0; index < 20; index++) { const height = 2 + Math.random() * 7; const building = new THREE.Mesh(new THREE.BoxGeometry(2.2 + Math.random() * 2, height, 2.4), new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: .8 })); building.position.set(side * (6.2 + Math.random() * 3), height / 2, -index * 4 - 5); world.add(building); for (let window = 0; window < 3; window++) { const glow = new THREE.Mesh(new THREE.PlaneGeometry(.28, .14), new THREE.MeshBasicMaterial({ color: index % 3 ? 0x35c9b4 : 0xffca69 })); glow.position.set(building.position.x - side * 1.11, 1.1 + window * .65, building.position.z + 1.22); glow.rotation.y = side * Math.PI / 2; world.add(glow); } }
}
function createPlayer() {
    player = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x9b5f3e, roughness: .7 });
    const suit = new THREE.MeshStandardMaterial({ color: 0x20a99a, emissive: 0x073d3e, emissiveIntensity: .45, roughness: .45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x18212d, roughness: .75 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xe7f3e8, roughness: .45 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.05, .48), suit);
    torso.position.y = 1.62;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12), skin);
    head.position.y = 2.45;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
    hair.position.y = 2.58;
    runnerParts.leftArm = new THREE.Group(); runnerParts.rightArm = new THREE.Group();
    runnerParts.leftArm.add(createLimb(.18, .78, .18, skin)); runnerParts.rightArm.add(createLimb(.18, .78, .18, skin));
    runnerParts.leftArm.position.set(-.47, 1.82, 0); runnerParts.rightArm.position.set(.47, 1.82, 0);
    runnerParts.leftLeg = new THREE.Group(); runnerParts.rightLeg = new THREE.Group();
    runnerParts.leftLeg.add(createLimb(.22, .9, .22, dark)); runnerParts.rightLeg.add(createLimb(.22, .9, .22, dark));
    runnerParts.leftLeg.position.set(-.22, 1.05, 0); runnerParts.rightLeg.position.set(.22, 1.05, 0);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(.3, .16, .55), shoe); leftShoe.position.set(0, -.48, .11);
    const rightShoe = leftShoe.clone(); runnerParts.leftLeg.add(leftShoe); runnerParts.rightLeg.add(rightShoe);
    const watch = new THREE.Mesh(new THREE.BoxGeometry(.12, .14, .12), new THREE.MeshStandardMaterial({ color: 0xb8ff5b, emissive: 0x71ff22, emissiveIntensity: 2 })); watch.position.set(-.55, 1.57, -.02);
    player.add(torso, head, hair, runnerParts.leftArm, runnerParts.rightArm, runnerParts.leftLeg, runnerParts.rightLeg, watch);
    player.scale.set(.72, .72, .72); player.position.set(0, playerY, 2.1); world.add(player);
}
function createLimb(width, height, depth, material) { const limb = new THREE.Mesh(new THREE.CapsuleGeometry(width / 2, height - width, 8, 4), material); limb.position.y = -height / 2; return limb; }
function getPlayerTexture() {
    if (playerTexture) return playerTexture; const image = new Image(); image.src = 'assets/player_spritesheet.png'; const canvas = document.createElement('canvas'); canvas.width = 416; canvas.height = 928; const context = canvas.getContext('2d');
    image.onload = () => { context.drawImage(image, 0, 0, 416, 928, 0, 0, 416, 928); const data = context.getImageData(0, 0, 416, 928); for (let index = 0; index < data.data.length; index += 4) { const red = data.data[index], green = data.data[index + 1], blue = data.data[index + 2]; if (Math.min(red, green, blue) > 215 && Math.max(red, green, blue) - Math.min(red, green, blue) < 25) data.data[index + 3] = 0; } context.putImageData(data, 0, 0); playerTexture.needsUpdate = true; };
    playerTexture = new THREE.CanvasTexture(canvas); playerTexture.colorSpace = THREE.SRGBColorSpace; return playerTexture;
}
function spawnObstacle() { const laneIndex = Math.floor(Math.random() * 3), height = Math.random() > .5 ? 1.2 : 1.8; const object = new THREE.Mesh(new THREE.BoxGeometry(1.55, height, 1.25), new THREE.MeshStandardMaterial({ color: 0xe04d48, emissive: 0x5a151b, emissiveIntensity: .55, roughness: .3, metalness: .25 })); object.position.set((laneIndex - 1) * 2.9, height / 2, -42); object.userData = { lane: laneIndex, type: 'obstacle', height }; world.add(object); obstacles.push(object); }
function spawnPickup() { const laneIndex = Math.floor(Math.random() * 3); const coin = new THREE.Mesh(new THREE.TorusGeometry(.38, .12, 10, 20), new THREE.MeshStandardMaterial({ color: 0xffcf65, emissive: 0xff8a19, emissiveIntensity: 1.8, metalness: .8, roughness: .2 })); coin.position.set((laneIndex - 1) * 2.9, 1.5 + Math.random() * 1.3, -42); coin.rotation.x = Math.PI / 2; coin.userData = { lane: laneIndex, type: 'pickup' }; world.add(coin); pickups.push(coin); }
function loop() {
    if (!active) return; animationFrame = requestAnimationFrame(loop); if (paused || ended) return; const delta = Math.min(clock.getDelta(), .05), mode = modes[selectedMode]; distance += delta * mode.speed * 100; scoreLabel.textContent = String(Math.floor(distance)).padStart(6, '0'); spawnTimer -= delta; pickupTimer -= delta;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(.62, 1.25 - distance / 2200); } if (pickupTimer <= 0) { spawnPickup(); pickupTimer = .75; } updatePlayer(delta); updateObjects(delta, mode.speed); renderer.render(world, camera);
}
function updatePlayer(delta) {
    lane += (targetLane - lane) * Math.min(1, delta * 10); player.position.x = (lane - 1) * 2.9;
    if (verticalVelocity || playerY > 1.15) { verticalVelocity -= 19 * delta; playerY += verticalVelocity * delta; if (playerY <= 1.15) { playerY = 1.15; verticalVelocity = 0; } }
    player.position.y = playerY;
    const runTime = performance.now() * .012;
    const stride = sliding || playerY > 1.2 ? 0 : Math.sin(runTime) * .75;
    runnerParts.leftLeg.rotation.x = stride; runnerParts.rightLeg.rotation.x = -stride;
    runnerParts.leftArm.rotation.x = -stride * .8; runnerParts.rightArm.rotation.x = stride * .8;
    player.rotation.z = (targetLane - lane) * -.12;
    player.scale.y += ((sliding ? .5 : .72) - player.scale.y) * Math.min(1, delta * 12);
}
function updateObjects(delta, speed) {
    const travel = speed * delta * 28; world.children.forEach((object) => { if (object.userData.scroll) object.position.z += travel; });
    obstacles = obstacles.filter((object) => { object.position.z += travel; object.rotation.y += delta * .4; if (object.position.z > 5) { world.remove(object); return false; } if (Math.abs(object.position.z - 2.1) < 1 && Math.abs(object.position.x - player.position.x) < 1.15 && playerY < object.userData.height + .35 && !sliding) endGame(); return true; });
    pickups = pickups.filter((coin) => { coin.position.z += travel; coin.rotation.z += delta * 4; if (coin.position.z > 5) { world.remove(coin); return false; } if (Math.abs(coin.position.z - 2.1) < 1.2 && Math.abs(coin.position.x - player.position.x) < 1.1 && Math.abs(coin.position.y - player.position.y) < 2) { distance += 25; world.remove(coin); return false; } return true; });
}
function move(direction) { if (!active || paused || ended) return; targetLane = Math.max(0, Math.min(2, targetLane + direction)); player.position.x = (targetLane - 1) * 2.9; }
function jump() { if (active && !paused && !ended && playerY <= 1.16 && !sliding) verticalVelocity = 8.2; }
function slide() { if (active && !paused && !ended && playerY <= 1.2) { sliding = true; clearTimeout(slideTimer); slideTimer = setTimeout(() => { sliding = false; }, 600); } }
function togglePause() { if (!active || ended) return; paused = !paused; $('#pause-panel').classList.toggle('hidden', !paused); if (!paused) clock.getDelta(); }
function endGame() { if (ended) return; ended = true; const final = Math.floor(distance); if (final > bestScore) { bestScore = final; localStorage.setItem('run471k-best', bestScore); homeBest.textContent = String(bestScore).padStart(6, '0'); } $('#final-score').textContent = String(final).padStart(6, '0'); $('#gameover-panel').classList.remove('hidden'); }
function showHome() { active = false; ended = true; cancelAnimationFrame(animationFrame); window.removeEventListener('resize', resizeGame); homeScreen.classList.remove('hidden'); gameScreen.classList.add('hidden'); }
function resizeGame() { if (!renderer) return; camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight); }
window.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') move(-1); if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') move(1); if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') jump(); if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') slide(); if (event.key === 'Escape') togglePause(); });
document.querySelectorAll('.mobile-controls button').forEach((button) => button.addEventListener('pointerdown', (event) => { event.preventDefault(); const action = button.dataset.action; if (action === 'left') move(-1); if (action === 'right') move(1); if (action === 'jump') jump(); if (action === 'slide') slide(); }));
sceneContainer.addEventListener('pointerdown', (event) => { if (!active || paused || ended) return; sceneContainer.setPointerCapture(event.pointerId); touchStart = { x: event.clientX, y: event.clientY, time: Date.now() }; });
sceneContainer.addEventListener('pointerup', (event) => { if (!touchStart) return; const start = touchStart; touchStart = null; const dx = event.clientX - start.x, dy = event.clientY - start.y; if (Date.now() - start.time > 700 || Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1); else if (dy < 0) jump(); else slide(); });
sceneContainer.addEventListener('pointercancel', () => { touchStart = null; });
