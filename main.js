/* ----------------------------------------------------------------------
   Solar System – Sun texture + full Saturn ring (July 2025)
   
   Renders a minimal but realistic 3‑D Solar System using Three.js.
   ✦ Eight planets revolve around the textured Sun.
   ✦ Saturn has a tilted, transparent ring.
   ✦ Sliders let you change each planet’s orbital speed in real‑time.
   ✦ Pause / Resume buttons stop / start the animation loop.
   ---------------------------------------------------------------------- */

/* ===================== 1. Renderer & Canvas ========================== */
const canvas   = document.getElementById('canvas');            // <canvas> DOM node
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);                      // full‑screen
renderer.setPixelRatio(devicePixelRatio);                       // Hi‑DPI aware
renderer.outputEncoding      = THREE.sRGBEncoding;              // correct colour‑space
renderer.toneMapping         = THREE.ACESFilmicToneMapping;     // cinematic contrast
renderer.toneMappingExposure = 1.1;                             // global brightness

/* ===================== 2. Scene & Camera ============================ */
const scene  = new THREE.Scene();                               // root container
const camera = new THREE.PerspectiveCamera(
  50, innerWidth / innerHeight, 0.1, 2000                      // fov, aspect, near, far
);
camera.position.set(0, 80, 140);                               // pulled back & slightly above
camera.lookAt(0, 0, 0);                                        // focus on origin (Sun)

// Keep renderer / camera in sync when window resizes
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ===================== 3. Lighting ================================== */
// Bright point‑light placed at the Sun’s position
const sunLight = new THREE.PointLight(0xffffff, 6, 5000);       // colour, intensity, range
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Soft global fill so planets aren’t pitch‑black on far side
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ===================== 4. Texture Loader Helper ===================== */
const loader  = new THREE.TextureLoader();
const loadTex = (file) =>                                  // loads & configures textures
  loader.load(`textures/${file}`, (t) => {
    t.encoding   = THREE.sRGBEncoding;                     // ensure correct colour
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); // sharpen at oblique angles
    return t;
  });

/* ===================== 5. Sun (textured) ============================ */
scene.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),                  // radius, segments
    new THREE.MeshBasicMaterial({ map: loadTex('sun.jpg') })
  )
);

/* ===================== 6. Background Star‑field ===================== */
(function createStars(count = 1200) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push((Math.random() - 0.5) * 2000);         // x
    positions.push((Math.random() - 0.5) * 2000);         // y
    positions.push((Math.random() - 0.5) * 2000);         // z
  }
  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ colour: 0xffffff, size: 0.7 });
  scene.add(new THREE.Points(geometry, material));
})();

/* ===================== 7. Planet Meta‑data ========================== */
const planetsData = [
  { n: 'Mercury', sz: 1,   d: 10, sp: 4.15,  tex: 'mercury.jpg' },
  { n: 'Venus',   sz: 1.2, d: 15, sp: 1.62,  tex: 'venus.jpg'   },
  { n: 'Earth',   sz: 1.3, d: 20, sp: 1.00,  tex: 'earth.jpg'   },
  { n: 'Mars',    sz: 1.1, d: 25, sp: 0.53,  tex: 'mars.jpg'    },
  { n: 'Jupiter', sz: 3.5, d: 34, sp: 0.084, tex: 'jupiter.jpg'  },
  { n: 'Saturn',  sz: 3.0, d: 43, sp: 0.034, tex: 'saturn.jpg',  ringTex: 'saturn_ring.png' },
  { n: 'Uranus',  sz: 2.2, d: 50, sp: 0.012, tex: 'uranus.jpg'  },
  { n: 'Neptune', sz: 2.1, d: 57, sp: 0.006, tex: 'neptune.jpg' }
];

/* ===================== 8. Orbit‑Path Helper ========================= */
function addOrbit(radius) {
  const points   = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2)
                      .getSpacedPoints(480);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x888888, dashSize: 1, gapSize: 1,
    transparent: true, opacity: 0.45
  });
  const orbit = new THREE.Line(geometry, material);
  orbit.rotation.x = Math.PI / 2;                         // lay flat in X‑Z plane
  orbit.computeLineDistances();                           // enables dashed effect
  scene.add(orbit);
}

/* ===================== 9. Build Planets & Sliders =================== */
const planets = [];
planetsData.forEach((p) => {
  addOrbit(p.d);                                          // dashed orbit circle

  const pivot = new THREE.Object3D();                     // invisible pivot for orbit
  scene.add(pivot);

  // Base material for planet sphere
  const matOpts = { map: loadTex(p.tex), roughness: 1, metalness: 0 };
  if (p.bump) {
    matOpts.bumpMap   = loadTex(p.bump);
    matOpts.bumpScale = p.bumpScale || 0.03;
  }
  const planetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.sz, 64, 64),
    new THREE.MeshStandardMaterial(matOpts)
  );
  planetMesh.position.x = p.d;                            // place along +x axis
  pivot.add(planetMesh);

  /* -- Saturn’s ring -- */
  if (p.ringTex) {
    const ringMat = new THREE.MeshStandardMaterial({
      map: loadTex(p.ringTex),
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.5,  // remove fully transparent pixels
      roughness: 1,
      metalness: 0
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.sz * 1.35, p.sz * 2.15, 192),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;                        // flat
    ring.rotation.z = THREE.MathUtils.degToRad(15);       // tilted 15°
    planetMesh.add(ring);
  }

  planets.push({ ...p, mesh: planetMesh, ang: Math.random() * Math.PI * 2, factor: 1 });
  addSlider(p.n);
});

/* ===================== 10. UI — Speed Sliders ======================= */
function addSlider(name) {
  const panel = document.getElementById('controls');
  const label = document.createElement('label');
  label.textContent = `${name} Speed: 1×`;
  panel.appendChild(label);

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = 0; slider.max = 5; slider.step = 0.1; slider.value = 1;
  slider.oninput = (e) => {
    const v = parseFloat(e.target.value);
    label.textContent = `${name} Speed: ${v}×`;
    planets.find((pl) => pl.n === name).factor = v;
  };
  panel.appendChild(slider);
}

/* ===================== 11. Pause / Resume =========================== */
let paused = false;
const pauseBtn  = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');

pauseBtn.onclick  = () => { paused = true;  pauseBtn.hidden = true;  resumeBtn.hidden = false; };
resumeBtn.onclick = () => { paused = false; resumeBtn.hidden = true; pauseBtn.hidden = false; };

/* ===================== 12. Main Animation Loop ===================== */
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);

  if (!paused) {
    const dt = clock.getDelta();
    planets.forEach((pl) => {
      // revolution around Sun
      pl.ang += pl.sp * pl.factor * dt * 0.5;          // 0.5 = global speed scaler
      pl.mesh.position.set(
        Math.cos(pl.ang) * pl.d,
        0,
        Math.sin(pl.ang) * pl.d
      );
      // axial spin
      pl.mesh.rotation.y += 0.02;
    });
  }

  renderer.render(scene, camera);
})();
