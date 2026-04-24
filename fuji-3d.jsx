// Pure Three.js Fuji scene (no R3F dependency) — mounts into a canvas div

const FujiScene3D = ({ dark = false, interactive = true }) => {
  const mountRef = React.useRef();
  const rendererRef = React.useRef();
  const animRef = React.useRef();

  React.useEffect(() => {
    if (!mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(dark ? 0x0f0d0a : 0xf5efe3, 6, 20);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.35 : 0.6));
    const dir = new THREE.DirectionalLight(dark ? 0xe5dbc4 : 0xfff1d6, dark ? 0.8 : 1.1);
    dir.position.set(4, 6, 5);
    scene.add(dir);
    const redFill = new THREE.PointLight(0xC8102E, 0.7, 15);
    redFill.position.set(3, 2, 2);
    scene.add(redFill);

    // ---- Fuji ----
    const fujiGroup = new THREE.Group();
    const coneGeom = new THREE.ConeGeometry(2.4, 2.6, 32, 4);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9, flatShading: true });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.y = 0;
    fujiGroup.add(cone);

    const snowGeom = new THREE.ConeGeometry(0.95, 1.05, 32, 1);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf5efe3, roughness: 0.7, flatShading: true });
    const snow = new THREE.Mesh(snowGeom, snowMat);
    snow.position.y = 0.8;
    fujiGroup.add(snow);

    const ridge = new THREE.Mesh(coneGeom, new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 1, flatShading: true }));
    ridge.position.set(0.3, -0.1, -0.4);
    ridge.scale.set(0.55, 0.7, 0.55);
    fujiGroup.add(ridge);

    fujiGroup.position.set(0, -0.6, -2.2);
    scene.add(fujiGroup);

    // ---- Sun (hinomaru with rays) ----
    const sunGroup = new THREE.Group();
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 64),
      new THREE.MeshBasicMaterial({ color: 0xC8102E })
    );
    sunGroup.add(sunDisc);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0.55 })
      );
      ray.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, -0.01);
      ray.rotation.z = angle;
      sunGroup.add(ray);
    }
    sunGroup.position.set(3, 2.2, -5);
    scene.add(sunGroup);

    // ---- Floating manga panels ----
    const makePanelTexture = (kanji, label, color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 352;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 352);
      ctx.fillStyle = "rgba(17,17,17,0.22)";
      for (let y = 6; y < 352; y += 10) {
        for (let x = 6; x < 256; x += 10) {
          ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = "#111"; ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 250, 346);
      ctx.fillStyle = "#C8102E";
      ctx.font = "bold 180px 'Shippori Mincho', serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(kanji, 128, 160);
      ctx.fillStyle = "#111";
      ctx.fillRect(12, 300, 232, 36);
      ctx.fillStyle = "#f5efe3";
      ctx.font = "bold 14px 'Zen Kaku Gothic New', sans-serif";
      ctx.fillText(label, 128, 318);
      const tex = new THREE.CanvasTexture(canvas);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const panels = [];
    const panelDefs = [
      { pos: [-3.2, 1.2, -0.5], rot: [0, 0.2, 0.08], size: [1.4, 1.9], kanji: "読", label: "READ", delay: 0 },
      { pos: [3.4, 0.8, 0.3], rot: [0, -0.25, -0.06], size: [1.6, 2.1], kanji: "訳", label: "TRANSLATE", delay: 1.2 },
      { pos: [-2.5, -1.4, 1.4], rot: [0.05, 0.15, -0.04], size: [1.3, 1.7], kanji: "問", label: "ASK AI", delay: 2.4 },
      { pos: [2.8, -1.1, 1.8], rot: [0, -0.1, 0.05], size: [1.2, 1.55], kanji: "物", label: "STORY", delay: 3.1 },
    ];
    panelDefs.forEach(def => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(def.size[0], def.size[1], 0.06),
        new THREE.MeshStandardMaterial({ color: 0xfbf7ec, roughness: 0.95 })
      );
      group.add(body);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(def.size[0], def.size[1]),
        new THREE.MeshBasicMaterial({ map: makePanelTexture(def.kanji, def.label, "#fbf7ec") })
      );
      face.position.z = 0.035;
      group.add(face);
      group.position.set(...def.pos);
      group.rotation.set(...def.rot);
      group.userData = { baseY: def.pos[1], baseRotZ: def.rot[2], delay: def.delay };
      scene.add(group);
      panels.push(group);
    });

    // ---- Cherry blossoms (instanced) ----
    const blossomCount = 32;
    const blossomGeom = new THREE.CircleGeometry(1, 5);
    const blossomMat = new THREE.MeshBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0.9 });
    const blossoms = new THREE.InstancedMesh(blossomGeom, blossomMat, blossomCount);
    const blossomData = [];
    for (let i = 0; i < blossomCount; i++) {
      blossomData.push({
        x: (Math.random() - 0.5) * 12,
        y: Math.random() * 8 + 2,
        z: (Math.random() - 0.5) * 8 - 2,
        speed: 0.2 + Math.random() * 0.3,
        drift: Math.random() * Math.PI * 2,
        scale: 0.05 + Math.random() * 0.05,
      });
    }
    scene.add(blossoms);
    const dummy = new THREE.Object3D();

    // ---- Wave lines ----
    for (let i = 0; i < 4; i++) {
      const points = [];
      for (let x = -6; x <= 6; x += 0.2) {
        points.push(new THREE.Vector3(x, Math.sin(x * 0.8 + i * 0.5) * 0.08 - i * 0.25 - 1.8, -3));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x2a2623, transparent: true, opacity: 0.5 - i * 0.1 }));
      scene.add(line);
    }

    // ---- Mouse tracking ----
    const mouse = { x: 0, y: 0 };
    const target = new THREE.Vector3(0, 0, 8);
    const onMove = (e) => {
      if (!interactive) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove);

    // ---- Scroll for depth push ----
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
      // fuji sway
      fujiGroup.rotation.y = Math.sin(t * 0.15) * 0.06;
      // sun slow spin
      sunGroup.rotation.z += 0.001;
      // panels float
      panels.forEach(p => {
        const d = p.userData;
        p.position.y = d.baseY + Math.sin((t + d.delay) * 0.6) * 0.08;
        p.rotation.z = d.baseRotZ + Math.sin((t + d.delay) * 0.4) * 0.02;
      });
      // blossoms
      blossomData.forEach((p, i) => {
        p.y -= p.speed * 0.015;
        p.x += Math.sin(t * 0.5 + p.drift) * 0.006;
        if (p.y < -2) { p.y = 8; p.x = (Math.random() - 0.5) * 12; }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.z = t * 0.8 + p.drift;
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        blossoms.setMatrixAt(i, dummy.matrix);
      });
      blossoms.instanceMatrix.needsUpdate = true;
      // camera follow
      if (interactive) {
        target.x = mouse.x * 0.4;
        target.y = 0.2 + mouse.y * 0.3;
        target.z = 8 - scrollP * 3;
        camera.position.lerp(target, 0.05);
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();
    animRef.current = rafId;

    // Resize
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
