// Polished Three.js Fuji diorama — smoother mountain, rim lighting, mist layers,
// reflective lake, glowing sun, cherry blossoms, floating manga panels on the edges.

const FujiScene3D = ({ dark = false, interactive = true }) => {
  const mountRef = React.useRef();
  const rendererRef = React.useRef();

  React.useEffect(() => {
    if (!mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // -------- Renderer / scene --------
    const scene = new THREE.Scene();
    const fogColor = dark ? 0x0f0d0a : 0xf5efe3;
    scene.fog = new THREE.Fog(fogColor, 7, 22);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // -------- Lights --------
    scene.add(new THREE.AmbientLight(dark ? 0x2a2418 : 0xfff6e4, dark ? 0.5 : 0.7));
    const keyLight = new THREE.DirectionalLight(dark ? 0xe5dbc4 : 0xfff1d6, dark ? 0.9 : 1.2);
    keyLight.position.set(5, 7, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(dark ? 0xe04156 : 0xC8102E, 0.9);
    rimLight.position.set(-4, 3, -2);
    scene.add(rimLight);
    const fill = new THREE.PointLight(dark ? 0x2a3a6a : 0xb5d8ff, 0.5, 18);
    fill.position.set(-3, -1, 4);
    scene.add(fill);

    // -------- Fuji (base + snow) with vertex noise for ridges --------
    const fujiGroup = new THREE.Group();

    const baseGeom = new THREE.ConeGeometry(2.8, 3.0, 96, 12);
    // Carve ridges into the mountain
    const pos = baseGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.sqrt(x*x + z*z);
      if (r > 0.01) {
        const a = Math.atan2(z, x);
        const noise = Math.sin(a * 7) * 0.04 + Math.cos(a * 13 + y * 2) * 0.025 + Math.sin(y * 4) * 0.02;
        pos.setX(i, x + (x / r) * noise);
        pos.setZ(i, z + (z / r) * noise);
      }
    }
    baseGeom.computeVertexNormals();

    const baseMat = new THREE.MeshStandardMaterial({
      color: dark ? 0x1f1a15 : 0x26201b,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: false,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    fujiGroup.add(base);

    // Snow cap — separate cone with gradient using vertex colors
    const snowGeom = new THREE.ConeGeometry(1.1, 1.25, 96, 8);
    const snowPos = snowGeom.attributes.position;
    const snowColors = [];
    const cTop = new THREE.Color(0xffffff);
    const cMid = new THREE.Color(0xf5efe3);
    const cEdge = new THREE.Color(0xcbbfa3);
    for (let i = 0; i < snowPos.count; i++) {
      const x = snowPos.getX(i), y = snowPos.getY(i), z = snowPos.getZ(i);
      const r = Math.sqrt(x*x + z*z);
      if (r > 0.01) {
        const a = Math.atan2(z, x);
        const ridge = Math.sin(a * 9) * 0.035 + Math.cos(a * 17) * 0.02;
        snowPos.setX(i, x + (x / r) * ridge);
        snowPos.setZ(i, z + (z / r) * ridge);
      }
      // gradient: top white -> mid cream -> bottom warm
      const h = (y + 0.625) / 1.25; // 0..1
      const col = h > 0.7 ? cTop.clone().lerp(cMid, (1 - h) / 0.3) : cMid.clone().lerp(cEdge, (0.7 - h) / 0.7);
      snowColors.push(col.r, col.g, col.b);
    }
    snowGeom.setAttribute("color", new THREE.Float32BufferAttribute(snowColors, 3));
    snowGeom.computeVertexNormals();
    const snowMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.05,
    });
    const snow = new THREE.Mesh(snowGeom, snowMat);
    snow.position.y = 0.95;
    fujiGroup.add(snow);

    // Subtle back ridge
    const backRidgeGeom = new THREE.ConeGeometry(1.8, 2.2, 48, 4);
    const backRidge = new THREE.Mesh(backRidgeGeom, new THREE.MeshStandardMaterial({ color: dark ? 0x14110d : 0x1a1612, roughness: 1, flatShading: true, opacity: 0.85, transparent: true }));
    backRidge.position.set(1.2, -0.4, -1.6);
    backRidge.scale.set(0.9, 0.9, 0.9);
    fujiGroup.add(backRidge);

    fujiGroup.position.set(0, -0.9, -2.0);
    scene.add(fujiGroup);

    // -------- Ground / lake (subtle reflection plane) --------
    const lakeGeom = new THREE.PlaneGeometry(30, 18, 1, 1);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: dark ? 0x0a0806 : 0xe4dcc8,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.75,
    });
    const lake = new THREE.Mesh(lakeGeom, lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.y = -2.3;
    scene.add(lake);

    // Mirrored faint Fuji for reflection
    const reflFuji = fujiGroup.clone();
    reflFuji.scale.y = -1;
    reflFuji.position.y = -3.7;
    reflFuji.traverse(obj => {
      if (obj.material) {
        obj.material = obj.material.clone();
        obj.material.transparent = true;
        obj.material.opacity = 0.18;
        obj.material.depthWrite = false;
      }
    });
    scene.add(reflFuji);

    // -------- Sun (hinomaru) with rays and soft glow --------
    const sunGroup = new THREE.Group();
    // Glow halo
    const haloGeom = new THREE.CircleGeometry(1.9, 64);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(dark ? 0xe04156 : 0xC8102E) } },
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 color;
        void main(){
          float d = distance(vUv, vec2(0.5));
          float a = smoothstep(0.5, 0.15, d);
          gl_FragColor = vec4(color, a * 0.55);
        }`,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.z = -0.02;
    sunGroup.add(halo);

    // Disc
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 64),
      new THREE.MeshBasicMaterial({ color: dark ? 0xe04156 : 0xC8102E })
    );
    sunGroup.add(sunDisc);

    // Rays
    const rayGroup = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.04),
        new THREE.MeshBasicMaterial({ color: dark ? 0xe04156 : 0xC8102E, transparent: true, opacity: 0.35 })
      );
      ray.position.set(Math.cos(angle) * 1.35, Math.sin(angle) * 1.35, -0.01);
      ray.rotation.z = angle;
      rayGroup.add(ray);
    }
    sunGroup.add(rayGroup);

    // Offset sun to top-right corner so it doesn't collide with hero text
    sunGroup.position.set(4.2, 2.6, -5.5);
    sunGroup.scale.setScalar(0.85);
    scene.add(sunGroup);

    // -------- Floating manga panels (pushed to outer edges) --------
    const makePanelTexture = (kanji, label, color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 352;
      const ctx = canvas.getContext("2d");
      // paper
      const grad = ctx.createLinearGradient(0, 0, 0, 352);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "#efe6d2");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 352);
      // halftone dots
      ctx.fillStyle = "rgba(17,17,17,0.18)";
      for (let y = 6; y < 352; y += 10) {
        for (let x = 6; x < 256; x += 10) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      // border
      ctx.strokeStyle = "#111"; ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 250, 346);
      // shadow behind kanji
      ctx.fillStyle = "rgba(17,17,17,0.08)";
      ctx.font = "bold 184px 'Shippori Mincho', serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(kanji, 132, 164);
      // kanji
      ctx.fillStyle = "#C8102E";
      ctx.fillText(kanji, 128, 160);
      // label bar
      ctx.fillStyle = "#111";
      ctx.fillRect(12, 300, 232, 36);
      ctx.fillStyle = "#f5efe3";
      ctx.font = "bold 14px 'Zen Kaku Gothic New', sans-serif";
      ctx.fillText(label, 128, 318);
      const tex = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    };

    const panels = [];
    // Pushed wider/higher so they hug the corners of the viewport, leaving center clear for hero copy
    const panelDefs = [
      { pos: [-4.6, 1.7, -0.3], rot: [0, 0.25, 0.1], size: [1.35, 1.82], kanji: "読", label: "READ", delay: 0 },
      { pos: [4.9, 1.3, -0.2], rot: [0, -0.3, -0.08], size: [1.45, 1.95], kanji: "訳", label: "TRANSLATE", delay: 1.2 },
      { pos: [-4.2, -1.6, 1.2], rot: [0.05, 0.2, -0.05], size: [1.25, 1.65], kanji: "問", label: "ASK AI", delay: 2.4 },
      { pos: [4.5, -1.8, 1.4], rot: [0, -0.15, 0.06], size: [1.2, 1.55], kanji: "物", label: "STORY", delay: 3.1 },
    ];
    panelDefs.forEach(def => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(def.size[0], def.size[1], 0.08),
        new THREE.MeshStandardMaterial({ color: 0xfbf7ec, roughness: 0.92, metalness: 0.02 })
      );
      group.add(body);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(def.size[0], def.size[1]),
        new THREE.MeshBasicMaterial({ map: makePanelTexture(def.kanji, def.label, "#fbf7ec") })
      );
      face.position.z = 0.045;
      group.add(face);
      // thin dark edge to emphasize panel
      const edge = new THREE.Mesh(
        new THREE.PlaneGeometry(def.size[0] + 0.04, def.size[1] + 0.04),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      edge.position.z = -0.045;
      group.add(edge);

      group.position.set(...def.pos);
      group.rotation.set(...def.rot);
      group.userData = { baseY: def.pos[1], baseRotZ: def.rot[2], delay: def.delay };
      scene.add(group);
      panels.push(group);
    });

    // -------- Cherry blossoms (instanced, 5-petal) --------
    const blossomCount = 48;
    const petalShape = new THREE.Shape();
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rOuter = 1.0, rInner = 0.42;
      petalShape.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
      const midA = a + Math.PI / 5;
      petalShape.lineTo(Math.cos(midA) * rInner, Math.sin(midA) * rInner);
    }
    const blossomGeom = new THREE.ShapeGeometry(petalShape);
    const blossomMat = new THREE.MeshBasicMaterial({ color: dark ? 0xffc2cb : 0xf4a4b0, transparent: true, opacity: 0.85 });
    const blossoms = new THREE.InstancedMesh(blossomGeom, blossomMat, blossomCount);
    const blossomData = [];
    for (let i = 0; i < blossomCount; i++) {
      blossomData.push({
        x: (Math.random() - 0.5) * 14,
        y: Math.random() * 9 + 2,
        z: (Math.random() - 0.5) * 9 - 1,
        speed: 0.15 + Math.random() * 0.25,
        drift: Math.random() * Math.PI * 2,
        scale: 0.04 + Math.random() * 0.05,
      });
    }
    scene.add(blossoms);
    const dummy = new THREE.Object3D();

    // -------- Deco wave lines in front of lake --------
    for (let i = 0; i < 5; i++) {
      const points = [];
      for (let x = -7; x <= 7; x += 0.2) {
        points.push(new THREE.Vector3(x, Math.sin(x * 0.8 + i * 0.5) * 0.08 - i * 0.22 - 1.9, -2.8));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: dark ? 0x4a4336 : 0x2a2623, transparent: true, opacity: 0.55 - i * 0.09 }));
      scene.add(line);
    }

    // -------- Mist plane layers --------
    for (let i = 0; i < 3; i++) {
      const mistGeom = new THREE.PlaneGeometry(16, 2.5);
      const mistCanvas = document.createElement("canvas");
      mistCanvas.width = 512; mistCanvas.height = 128;
      const mctx = mistCanvas.getContext("2d");
      const mg = mctx.createLinearGradient(0, 0, 0, 128);
      mg.addColorStop(0, "rgba(245,239,227,0)");
      mg.addColorStop(0.5, dark ? "rgba(36,32,28,0.55)" : "rgba(245,239,227,0.85)");
      mg.addColorStop(1, "rgba(245,239,227,0)");
      mctx.fillStyle = mg; mctx.fillRect(0, 0, 512, 128);
      const mistTex = new THREE.CanvasTexture(mistCanvas);
      const mistMat = new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.55 - i * 0.12 });
      const mist = new THREE.Mesh(mistGeom, mistMat);
      mist.position.set(0, -1.3 - i * 0.2, -1 + i * 0.6);
      mist.userData = { baseX: 0, speed: (i + 1) * 0.08 };
      scene.add(mist);
    }

    // -------- Mouse + scroll --------
    const mouse = { x: 0, y: 0 };
    const target = new THREE.Vector3(0, 0.4, 9);
    const onMove = (e) => {
      if (!interactive) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);

    let scrollP = 0;
    const onScroll = () => {
      const rect = mount.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (rect.height * 0.8)));
      scrollP = p;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const clock = new THREE.Clock();
    let rafId;
    const tick = () => {
      const t = clock.getElapsedTime();
      // Fuji gentle sway
      fujiGroup.rotation.y = Math.sin(t * 0.12) * 0.05;
      reflFuji.rotation.y = fujiGroup.rotation.y;
      // Sun slow spin of rays
      rayGroup.rotation.z += 0.002;
      // Panels float + subtle rotate
      panels.forEach(p => {
        const d = p.userData;
        p.position.y = d.baseY + Math.sin((t + d.delay) * 0.55) * 0.1;
        p.rotation.z = d.baseRotZ + Math.sin((t + d.delay) * 0.4) * 0.025;
      });
      // Blossoms
      blossomData.forEach((p, i) => {
        p.y -= p.speed * 0.016;
        p.x += Math.sin(t * 0.5 + p.drift) * 0.007;
        if (p.y < -2.2) { p.y = 9; p.x = (Math.random() - 0.5) * 14; }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.z = t * 0.7 + p.drift;
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        blossoms.setMatrixAt(i, dummy.matrix);
      });
      blossoms.instanceMatrix.needsUpdate = true;
      // Camera — parallax follow + scroll push-in
      if (interactive) {
        target.x = mouse.x * 0.55;
        target.y = 0.4 + mouse.y * 0.35;
        target.z = 9 - scrollP * 3.5;
        camera.position.lerp(target, 0.05);
        camera.lookAt(0, -0.1, 0);
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [dark, interactive]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }}/>;
};

window.FujiScene3D = FujiScene3D;
