import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class EarthScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        // Scene Setup
        this.scene = new THREE.Scene();

        // Environment / Stars
        this.createStars();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.z = 2.8; // Slightly further back for better view

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color accuracy
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableZoom = false;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Lighting
        this.setupLighting();

        // Earth Group
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);

        // Load Textures
        const loader = new THREE.TextureLoader();
        const texturePath = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/';

        // 1. Base Earth Sphere
        const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
        this.earthMaterial = new THREE.MeshPhongMaterial({
            map: loader.load(texturePath + 'earth_atmos_2048.jpg', undefined, undefined, (err) => {
                console.warn('Texture load fail, fallback color', err);
                this.earthMaterial.color.setHex(0x2233ff);
            }),
            specularMap: loader.load(texturePath + 'earth_specular_2048.jpg'),
            normalMap: loader.load(texturePath + 'earth_normal_2048.jpg'),
            specular: new THREE.Color(0x333333),
            shininess: 15
        });

        this.earthMesh = new THREE.Mesh(earthGeometry, this.earthMaterial);
        this.earthGroup.add(this.earthMesh);

        // 2. Cloud Layer
        const cloudGeo = new THREE.SphereGeometry(1.02, 64, 64);
        this.cloudMat = new THREE.MeshPhongMaterial({
            map: loader.load(texturePath + 'earth_clouds_1024.png'),
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.clouds = new THREE.Mesh(cloudGeo, this.cloudMat);
        this.earthGroup.add(this.clouds);

        // 3. Atmosphere (Glow)
        const atmosphereGeo = new THREE.SphereGeometry(1.05, 64, 64);
        this.atmosphereMat = new THREE.MeshPhongMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.2, // Default
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.atmosphere = new THREE.Mesh(atmosphereGeo, this.atmosphereMat);
        this.earthGroup.add(this.atmosphere);

        // 4. Ice Caps (Dynamic)
        // White overlay spheres for poles
        const iceGeo = new THREE.SphereGeometry(1.001, 64, 64, 0, Math.PI * 2, 0, 0.4);
        this.iceMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.iceNorth = new THREE.Mesh(iceGeo, this.iceMat);
        this.earthGroup.add(this.iceNorth);

        // We create South cap separately to manage geometry
        const iceGeoSouth = new THREE.SphereGeometry(1.001, 64, 64, 0, Math.PI * 2, Math.PI - 0.4, 0.4);
        this.iceSouth = new THREE.Mesh(iceGeoSouth, this.iceMat);
        this.earthGroup.add(this.iceSouth);

        this.currentIceAngle = 0.4;

        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    createStars() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const r = 80 + Math.random() * 200; // Radius distance
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            sizeAttenuation: true
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2); // Low ambient
        this.scene.add(ambientLight);

        // Main Sun
        this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.sunLight.position.set(5, 3, 5);
        this.scene.add(this.sunLight);

        // Rim light / Backlight for atmosphere effect
        const backLight = new THREE.DirectionalLight(0x5555ff, 0.5);
        backLight.position.set(-5, -3, -10);
        this.scene.add(backLight);
    }

    updateState(simulationState) {
        const { temp, co2, forest } = simulationState;

        // 1. Ice Coverage Logic
        // Map 15C -> 0.4 radians. 25C -> 0. -20C -> 1.57.
        let iceAngle = 0.4;
        if (temp > 25) iceAngle = 0;
        else if (temp < -20) iceAngle = Math.PI / 2;
        else {
            iceAngle = ((25 - temp) / 45) * (Math.PI / 2);
        }

        // Visualize Logic (Throttled geometry update)
        if (Math.abs(this.currentIceAngle - iceAngle) > 0.01) {
            this.currentIceAngle = iceAngle;

            this.iceNorth.geometry.dispose();
            this.iceSouth.geometry.dispose();

            const endPhi = Math.max(0.001, iceAngle);
            this.iceNorth.geometry = new THREE.SphereGeometry(1.001, 64, 64, 0, Math.PI * 2, 0, endPhi);
            this.iceSouth.geometry = new THREE.SphereGeometry(1.001, 64, 64, 0, Math.PI * 2, Math.PI - endPhi, endPhi);
        }

        // 2. Forest Coverage (Color Tint)
        // Tint the Earth Material slightly based on forest.
        // Base tint: White (no tint). 
        // 100% Forest -> Slight Green tint (0xddffdd)
        // 0% Forest -> Slight Brown tint (0xffeedd)

        // Note: MeshPhongMaterial 'color' is multiplied by texture.
        const forestColor = new THREE.Color(0xffeedd).lerp(new THREE.Color(0xddffdd), forest / 100);
        this.earthMaterial.color.copy(forestColor);


        // 3. Atmosphere opacity based on CO2
        // 280ppm -> 0.2
        // 600ppm -> 0.5
        const co2Norm = (co2 - 280) / (600 - 280);
        this.atmosphereMat.opacity = 0.2 + (co2Norm * 0.3);
        // Shift atmosphere color slightly towards yellow/grey "smog" at high CO2
        const cleanSky = new THREE.Color(0x88ccff);
        const smogSky = new THREE.Color(0xaabbcc);
        this.atmosphereMat.color.copy(cleanSky).lerp(smogSky, co2Norm);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Rotate Earth
        // this.earthGroup.rotation.y += 0.0005; // Handled by autoRotate

        // Rotate Clouds slightly faster/differently
        this.clouds.rotation.y += 0.0007;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
