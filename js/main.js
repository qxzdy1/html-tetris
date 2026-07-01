/**
 * Realistic Garden - Main Application
 * A photorealistic interactive 3D garden using Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    worldSize: 120,
    grassCount: 45000,
    treeCount: 45,
    bushCount: 80,
    stoneCount: 35,
    flowerCount: 300,
    fireflyCount: 120,
    pollenCount: 800,
    windSpeed: 1.2,
    shadowMapSize: 4096,
};

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
let currentSeason = 'summer';
let windEnabled = true;
let timeOfDay = 'day';

// ============================================
// PROCEDURAL TEXTURE GENERATION
// ============================================
class TextureGenerator {
    static createCanvas(size = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    }

    static noise(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    }

    static fbm(x, y, octaves = 4, seed = 0) {
        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;
        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise(x * frequency, y * frequency, seed + i);
            amplitude *= 0.5;
            frequency *= 2;
        }
        return value;
    }

    static grassTexture() {
        const canvas = this.createCanvas(1024);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(1024, 1024);
        const data = imageData.data;

        for (let y = 0; y < 1024; y++) {
            for (let x = 0; x < 1024; x++) {
                const idx = (y * 1024 + x) * 4;
                const n = this.fbm(x / 200, y / 200, 6, 1);
                const detail = this.fbm(x / 30, y / 30, 3, 2);

                const baseGreen = 0.18 + n * 0.12;
                const r = Math.floor((baseGreen + detail * 0.03) * 90);
                const g = Math.floor((baseGreen + detail * 0.05) * 140);
                const b = Math.floor((baseGreen * 0.5 + detail * 0.02) * 60);

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(12, 12);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static soilTexture() {
        const canvas = this.createCanvas(1024);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(1024, 1024);
        const data = imageData.data;

        for (let y = 0; y < 1024; y++) {
            for (let x = 0; x < 1024; x++) {
                const idx = (y * 1024 + x) * 4;
                const n = this.fbm(x / 150, y / 150, 7, 3);
                const detail = this.fbm(x / 20, y / 20, 4, 4);

                const r = Math.floor((0.25 + n * 0.15 + detail * 0.05) * 255);
                const g = Math.floor((0.18 + n * 0.12 + detail * 0.04) * 255);
                const b = Math.floor((0.12 + n * 0.08 + detail * 0.03) * 255);

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(16, 16);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static barkTexture() {
        const canvas = this.createCanvas(1024);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(1024, 1024);
        const data = imageData.data;

        for (let y = 0; y < 1024; y++) {
            for (let x = 0; x < 1024; x++) {
                const idx = (y * 1024 + x) * 4;
                const vertical = Math.sin(x * 0.05 + this.fbm(y / 100, x / 50, 3, 5) * 3) * 0.5 + 0.5;
                const n = this.fbm(x / 80, y / 30, 5, 6);
                const cracks = Math.pow(this.fbm(x / 15, y / 8, 4, 7), 3);

                const base = 0.18 + n * 0.12 - cracks * 0.25;
                const r = Math.floor(base * 140);
                const g = Math.floor(base * 110);
                const b = Math.floor(base * 85);

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static stoneTexture() {
        const canvas = this.createCanvas(1024);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(1024, 1024);
        const data = imageData.data;

        for (let y = 0; y < 1024; y++) {
            for (let x = 0; x < 1024; x++) {
                const idx = (y * 1024 + x) * 4;
                const n = this.fbm(x / 120, y / 120, 6, 8);
                const detail = this.fbm(x / 25, y / 25, 4, 9);
                const moss = Math.pow(this.fbm(x / 60 + 100, y / 60 + 100, 4, 10), 2);

                const stoneBase = 0.35 + n * 0.2 + detail * 0.08;
                const mossMix = moss * 0.5;

                const r = Math.floor((stoneBase * (1 - mossMix) + 0.2 * mossMix) * 200);
                const g = Math.floor((stoneBase * (1 - mossMix) + 0.35 * mossMix) * 210);
                const b = Math.floor((stoneBase * (1 - mossMix) + 0.15 * mossMix) * 190);

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static leafTexture(season = 'summer') {
        const canvas = this.createCanvas(1024);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(1024, 1024);
        const data = imageData.data;

        const palettes = {
            spring: { r: 0.35, g: 0.65, b: 0.25 },
            summer: { r: 0.18, g: 0.52, b: 0.14 },
            autumn: { r: 0.75, g: 0.42, b: 0.12 },
            winter: { r: 0.55, g: 0.55, b: 0.50 }
        };
        const pal = palettes[season];

        for (let y = 0; y < 1024; y++) {
            for (let x = 0; x < 1024; x++) {
                const idx = (y * 1024 + x) * 4;
                const n = this.fbm(x / 100, y / 100, 5, 11);
                const detail = this.fbm(x / 20, y / 20, 3, 12);
                const vein = Math.abs(Math.sin((x + y) * 0.08 + this.fbm(x/30, y/30, 2, 13) * 2));

                const variation = n * 0.25 + detail * 0.1 - vein * 0.08;
                const r = Math.floor((pal.r + variation) * 255);
                const g = Math.floor((pal.g + variation) * 255);
                const b = Math.floor((pal.b + variation) * 255);

                data[idx] = Math.min(255, r);
                data[idx + 1] = Math.min(255, g);
                data[idx + 2] = Math.min(255, b);
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static waterNormalTexture() {
        const canvas = this.createCanvas(512);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(512, 512);
        const data = imageData.data;

        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 512; x++) {
                const idx = (y * 512 + x) * 4;
                const n1 = this.fbm(x / 40, y / 40, 4, 14);
                const n2 = this.fbm(x / 20 + 100, y / 20 + 100, 4, 15);

                data[idx] = Math.floor((n1 * 0.5 + 0.5) * 255);
                data[idx + 1] = Math.floor((n2 * 0.5 + 0.5) * 255);
                data[idx + 2] = 255;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }
}

// ============================================
// MAIN APPLICATION
// ============================================
class GardenApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();
        this.mixers = [];
        this.interactables = [];
        this.leafMaterials = [];
        this.windTime = 0;
        this.keys = {};
        this.walkSpeed = 8;
        this.cameraVelocity = new THREE.Vector3();

        this.init();
    }

    init() {
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initControls();
        this.initLights();
        this.initMaterials();
        this.initTerrain();
        this.initGrass();
        this.initTrees();
        this.initBushes();
        this.initStones();
        this.initFlowers();
        this.initWater();
        this.initParticles();
        this.initPostProcessing();
        this.initInteraction();
        this.initEvents();
        this.setTimeOfDay('day');

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 1500);

        this.animate();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.012);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            300
        );
        this.camera.position.set(0, 4, 22);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 60;
        this.controls.target.set(0, 2, 0);
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.3;
    }

    initLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
        this.sunLight.position.set(50, 80, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = CONFIG.shadowMapSize;
        this.sunLight.shadow.mapSize.height = CONFIG.shadowMapSize;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -70;
        this.sunLight.shadow.camera.right = 70;
        this.sunLight.shadow.camera.top = 70;
        this.sunLight.shadow.camera.bottom = -70;
        this.sunLight.shadow.bias = -0.0003;
        this.sunLight.shadow.normalBias = 0.02;
        this.scene.add(this.sunLight);

        this.moonLight = new THREE.DirectionalLight(0x8fa8d3, 0.4);
        this.moonLight.position.set(-30, 60, -20);
        this.moonLight.castShadow = false;
        this.scene.add(this.moonLight);

        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c2d, 0.5);
        this.scene.add(this.hemiLight);
    }

    initMaterials() {
        this.textures = {
            grass: TextureGenerator.grassTexture(),
            soil: TextureGenerator.soilTexture(),
            bark: TextureGenerator.barkTexture(),
            stone: TextureGenerator.stoneTexture(),
            waterNormal: TextureGenerator.waterNormalTexture()
        };
        this.textures.leaves = {};
        SEASONS.forEach(s => {
            this.textures.leaves[s] = TextureGenerator.leafTexture(s);
        });

        this.materials = {
            grass: new THREE.MeshStandardMaterial({
                map: this.textures.grass,
                roughness: 0.95,
                metalness: 0.0,
                side: THREE.DoubleSide
            }),
            soil: new THREE.MeshStandardMaterial({
                map: this.textures.soil,
                roughness: 1.0,
                metalness: 0.0
            }),
            bark: new THREE.MeshStandardMaterial({
                map: this.textures.bark,
                roughness: 0.9,
                metalness: 0.0,
                bumpMap: this.textures.bark,
                bumpScale: 0.08
            }),
            stone: new THREE.MeshStandardMaterial({
                map: this.textures.stone,
                roughness: 0.85,
                metalness: 0.05,
                bumpMap: this.textures.stone,
                bumpScale: 0.05
            }),
            water: new THREE.MeshPhysicalMaterial({
                color: 0x4a90a4,
                transmission: 0.7,
                opacity: 0.85,
                metalness: 0.1,
                roughness: 0.05,
                ior: 1.33,
                thickness: 1.5,
                normalMap: this.textures.waterNormal,
                normalScale: new THREE.Vector2(0.6, 0.6),
                transparent: true,
                side: THREE.DoubleSide
            })
        };
    }

    getTerrainHeight(x, z) {
        const scale = 0.035;
        let h = Math.sin(x * scale) * Math.cos(z * scale) * 1.2;
        h += Math.sin(x * scale * 2.3 + z * scale * 1.7) * 0.5;
        h += TextureGenerator.fbm(x / 30, z / 30, 4, 20) * 1.5;

        // Create a pond depression in the center
        const dist = Math.sqrt(x * x + z * z);
        const pondRadius = 10;
        if (dist < pondRadius + 5) {
            const factor = Math.max(0, (pondRadius + 5 - dist) / 5);
            h -= factor * factor * 2.5;
        }

        return Math.max(-2.2, h);
    }

    initTerrain() {
        const geometry = new THREE.PlaneGeometry(
            CONFIG.worldSize,
            CONFIG.worldSize,
            160,
            160
        );
        geometry.rotateX(-Math.PI / 2);

        const pos = geometry.attributes.position;
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y = this.getTerrainHeight(x, z);
            pos.setY(i, y);

            // Vertex colors based on height and slope
            if (y < -1.5) {
                color.setHex(0x3d4a3a); // Wet soil
            } else if (y < -0.3) {
                color.setHex(0x4a5d3a); // Near water
            } else {
                const n = TextureGenerator.fbm(x / 20, z / 20, 3, 21);
                color.setRGB(0.18 + n * 0.08, 0.35 + n * 0.12, 0.12 + n * 0.05);
            }
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        this.terrain = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                map: this.textures.soil,
                vertexColors: true,
                roughness: 1.0,
                metalness: 0.0
            })
        );
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        this.scene.add(this.terrain);
    }

    initGrass() {
        const bladeGeo = new THREE.PlaneGeometry(0.12, 0.8, 1, 4);
        bladeGeo.translate(0, 0.4, 0);

        const material = new THREE.MeshStandardMaterial({
            color: 0x5a8c3a,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
            alphaTest: 0.3
        });

        this.grassMesh = new THREE.InstancedMesh(bladeGeo, material, CONFIG.grassCount);
        this.grassMesh.castShadow = true;
        this.grassMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const colors = [];
        const color = new THREE.Color();
        let index = 0;

        for (let i = 0; i < CONFIG.grassCount; i++) {
            const x = (Math.random() - 0.5) * CONFIG.worldSize * 0.92;
            const z = (Math.random() - 0.5) * CONFIG.worldSize * 0.92;
            const y = this.getTerrainHeight(x, z);

            if (y < -0.8) continue; // Skip underwater
            if (Math.abs(x) < 8 && Math.abs(z) < 8) continue; // Skip center path/pond area

            dummy.position.set(x, y, z);
            dummy.scale.set(
                0.6 + Math.random() * 0.7,
                0.6 + Math.random() * 1.2,
                0.6 + Math.random() * 0.7
            );
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.rotation.z = (Math.random() - 0.5) * 0.15;
            dummy.updateMatrix();
            this.grassMesh.setMatrixAt(index, dummy.matrix);

            const shade = 0.5 + Math.random() * 0.4;
            color.setHSL(0.25 + Math.random() * 0.08, 0.55, 0.25 + shade * 0.2);
            this.grassMesh.setColorAt(index, color);

            index++;
        }

        this.grassMesh.count = index;
        this.grassMesh.instanceMatrix.needsUpdate = true;
        if (this.grassMesh.instanceColor) this.grassMesh.instanceColor.needsUpdate = true;
        this.scene.add(this.grassMesh);

        // Store original matrices for wind animation
        this.grassOriginalMatrices = [];
        for (let i = 0; i < index; i++) {
            const mat = new THREE.Matrix4();
            this.grassMesh.getMatrixAt(i, mat);
            this.grassOriginalMatrices.push(mat);
        }
    }

    createTree(x, z, scale = 1, type = 'oak') {
        const group = new THREE.Group();
        const y = this.getTerrainHeight(x, z);
        group.position.set(x, y, z);
        group.scale.setScalar(scale);

        // Trunk
        const trunkHeight = 2.5 + Math.random() * 1.5;
        const trunkGeo = new THREE.CylinderGeometry(
            0.12 * scale,
            0.22 * scale,
            trunkHeight,
            10,
            6
        );
        const trunk = new THREE.Mesh(trunkGeo, this.materials.bark);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Roots
        for (let i = 0; i < 5; i++) {
            const rootGeo = new THREE.CylinderGeometry(0.03, 0.1, 1.2, 6);
            const root = new THREE.Mesh(rootGeo, this.materials.bark);
            const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
            root.position.set(
                Math.cos(angle) * 0.35,
                0.15,
                Math.sin(angle) * 0.35
            );
            root.rotation.z = Math.cos(angle) * 0.4;
            root.rotation.x = Math.sin(angle) * 0.4;
            root.castShadow = true;
            group.add(root);
        }

        // Foliage - multiple clusters
        const foliageCount = type === 'pine' ? 6 : 8;
        const leafMat = new THREE.MeshStandardMaterial({
            map: this.textures.leaves[currentSeason],
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        this.leafMaterials.push(leafMat);

        for (let i = 0; i < foliageCount; i++) {
            const size = 1.0 + Math.random() * 1.2;
            let foliageGeo;
            if (type === 'pine') {
                foliageGeo = new THREE.ConeGeometry(size * 0.6, size * 1.8, 8);
            } else {
                foliageGeo = new THREE.IcosahedronGeometry(size, 1);
            }

            const foliage = new THREE.Mesh(foliageGeo, leafMat);
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.8;
            foliage.position.set(
                Math.cos(angle) * radius,
                trunkHeight + (type === 'pine' ? i * 0.6 : Math.random() * 1.2),
                Math.sin(angle) * radius
            );
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.userData = { type: 'foliage', swayOffset: Math.random() * 10 };
            group.add(foliage);
            this.interactables.push(foliage);
        }

        group.userData = { type: 'tree', name: type === 'pine' ? '松树' : '橡树' };
        this.scene.add(group);
        return group;
    }

    initTrees() {
        this.trees = [];
        const treeTypes = ['oak', 'oak', 'oak', 'pine', 'pine'];

        for (let i = 0; i < CONFIG.treeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 12 + Math.random() * 42;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);

            if (y < -1.0) continue;

            const scale = 0.8 + Math.random() * 0.9;
            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            const tree = this.createTree(x, z, scale, type);
            this.trees.push(tree);
        }
    }

    createBush(x, z, scale = 1) {
        const group = new THREE.Group();
        const y = this.getTerrainHeight(x, z);
        group.position.set(x, y, z);
        group.scale.setScalar(scale);

        const leafMat = new THREE.MeshStandardMaterial({
            map: this.textures.leaves[currentSeason],
            roughness: 0.85,
            side: THREE.DoubleSide
        });
        this.leafMaterials.push(leafMat);

        const clusters = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < clusters; i++) {
            const geo = new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.4, 1);
            const mesh = new THREE.Mesh(geo, leafMat);
            mesh.position.set(
                (Math.random() - 0.5) * 0.8,
                0.2 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.8
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { type: 'bush', swayOffset: Math.random() * 10 };
            group.add(mesh);
            this.interactables.push(mesh);
        }

        group.userData = { type: 'bush', name: '灌木丛' };
        this.scene.add(group);
        return group;
    }

    initBushes() {
        this.bushes = [];
        for (let i = 0; i < CONFIG.bushCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * 46;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);

            if (y < -0.8) continue;

            const bush = this.createBush(x, z, 0.7 + Math.random() * 0.6);
            this.bushes.push(bush);
        }
    }

    initStones() {
        const stoneGeo = new THREE.DodecahedronGeometry(1, 1);
        this.stones = new THREE.InstancedMesh(stoneGeo, this.materials.stone, CONFIG.stoneCount);
        this.stones.castShadow = true;
        this.stones.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let index = 0;

        for (let i = 0; i < CONFIG.stoneCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 8;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);

            if (y < -1.5) continue;

            dummy.position.set(x, y + 0.1, z);
            dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            const s = 0.2 + Math.random() * 0.5;
            dummy.scale.set(
                s * (0.8 + Math.random() * 0.4),
                s * (0.5 + Math.random() * 0.5),
                s * (0.8 + Math.random() * 0.4)
            );
            dummy.updateMatrix();
            this.stones.setMatrixAt(index, dummy.matrix);
            index++;
        }

        this.stones.count = index;
        this.stones.instanceMatrix.needsUpdate = true;
        this.scene.add(this.stones);
    }

    initFlowers() {
        const flowerColors = [0xff6b6b, 0xffd93d, 0xffffff, 0xff9ff3, 0x54a0ff];
        const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 5);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
        const petalGeo = new THREE.SphereGeometry(0.06, 6, 6);

        this.flowers = [];
        for (let i = 0; i < CONFIG.flowerCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 40;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);

            if (y < -0.5) continue;

            const group = new THREE.Group();
            group.position.set(x, y, z);

            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.175;
            group.add(stem);

            const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            const petals = new THREE.Mesh(petalGeo, new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.1
            }));
            petals.position.y = 0.35;
            petals.scale.set(1, 0.4, 1);
            group.add(petals);

            group.userData = { type: 'flower', name: '野花', originalY: y };
            this.scene.add(group);
            this.flowers.push(group);
            this.interactables.push(petals);
        }
    }

    initWater() {
        const waterGeo = new THREE.CircleGeometry(9.5, 64);
        waterGeo.rotateX(-Math.PI / 2);
        this.water = new THREE.Mesh(waterGeo, this.materials.water);
        this.water.position.y = -1.55;
        this.water.receiveShadow = true;
        this.scene.add(this.water);

        // Pond bed
        const bedGeo = new THREE.CircleGeometry(9.5, 48);
        bedGeo.rotateX(-Math.PI / 2);
        const bedMat = new THREE.MeshStandardMaterial({
            color: 0x2a3a2a,
            roughness: 1.0
        });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = -2.15;
        this.scene.add(bed);

        // Fountain centerpiece
        const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.5, 16);
        const base = new THREE.Mesh(baseGeo, this.materials.stone);
        base.position.set(0, -1.3, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);

        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 12);
        const pillar = new THREE.Mesh(pillarGeo, this.materials.stone);
        pillar.position.set(0, -0.3, 0);
        pillar.castShadow = true;
        this.scene.add(pillar);

        const bowlGeo = new THREE.CylinderGeometry(1.0, 0.2, 0.4, 16);
        const bowl = new THREE.Mesh(bowlGeo, this.materials.stone);
        bowl.position.set(0, 0.65, 0);
        bowl.castShadow = true;
        this.scene.add(bowl);

        // Water jet particles
        this.fountainParticles = [];
        const dropGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const dropMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
        for (let i = 0; i < 60; i++) {
            const drop = new THREE.Mesh(dropGeo, dropMat);
            drop.position.set(0, 0.9, 0);
            drop.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.12,
                    0.3 + Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.12
                ),
                life: Math.random() * 2
            };
            this.scene.add(drop);
            this.fountainParticles.push(drop);
        }
    }

    initParticles() {
        // Fireflies
        const fireflyGeo = new THREE.SphereGeometry(0.03, 6, 6);
        const fireflyMat = new THREE.MeshBasicMaterial({
            color: 0xcfff70,
            transparent: true,
            opacity: 0.9
        });
        this.fireflies = new THREE.InstancedMesh(fireflyGeo, fireflyMat, CONFIG.fireflyCount);
        this.fireflyData = [];
        const dummy = new THREE.Object3D();

        for (let i = 0; i < CONFIG.fireflyCount; i++) {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            const y = 0.5 + Math.random() * 3;
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            this.fireflies.setMatrixAt(i, dummy.matrix);
            this.fireflyData.push({
                basePos: new THREE.Vector3(x, y, z),
                phase: Math.random() * Math.PI * 2,
                speed: 0.2 + Math.random() * 0.5
            });
        }
        this.fireflies.instanceMatrix.needsUpdate = true;
        this.fireflies.visible = false;
        this.scene.add(this.fireflies);

        // Pollen / dust
        const pollenGeo = new THREE.BufferGeometry();
        const pollenPos = [];
        for (let i = 0; i < CONFIG.pollenCount; i++) {
            pollenPos.push(
                (Math.random() - 0.5) * 80,
                0.5 + Math.random() * 6,
                (Math.random() - 0.5) * 80
            );
        }
        pollenGeo.setAttribute('position', new THREE.Float32BufferAttribute(pollenPos, 3));
        const pollenMat = new THREE.PointsMaterial({
            color: 0xfff5d5,
            size: 0.06,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        this.pollen = new THREE.Points(pollenGeo, pollenMat);
        this.pollen.userData = { originalPos: pollenPos.slice() };
        this.scene.add(this.pollen);
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.25,
            0.4,
            0.85
        );
        this.composer.addPass(this.bloomPass);
    }

    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.tooltip = document.getElementById('tooltip');

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.tooltip.style.left = e.clientX + 12 + 'px';
            this.tooltip.style.top = e.clientY + 12 + 'px';
        });

        window.addEventListener('click', (e) => {
            // Only trigger on canvas clicks, not UI
            if (e.target.closest('#controls')) return;
            this.handleClick();
        });
    }

    handleClick() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const parent = obj.parent;

            // Shake animation
            if (parent) {
                const originalScale = parent.scale.clone();
                let t = 0;
                const shake = setInterval(() => {
                    t += 0.3;
                    const s = 1 + Math.sin(t * 15) * 0.08 * Math.exp(-t);
                    parent.scale.copy(originalScale).multiplyScalar(s);
                    if (t > 3) {
                        clearInterval(shake);
                        parent.scale.copy(originalScale);
                    }
                }, 16);
            }

            const name = parent?.userData?.name || obj.userData?.name || '植物';
            this.showTooltip(name + ' 🌿');
        }
    }

    showTooltip(text) {
        this.tooltip.textContent = text;
        this.tooltip.style.opacity = '1';
        if (this.tooltipTimer) clearTimeout(this.tooltipTimer);
        this.tooltipTimer = setTimeout(() => {
            this.tooltip.style.opacity = '0';
        }, 2000);
    }

    initEvents() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.code === 'Space') {
                windEnabled = !windEnabled;
                this.updateWindButton();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // UI buttons
        document.getElementById('btn-day').addEventListener('click', () => this.setTimeOfDay('day'));
        document.getElementById('btn-sunset').addEventListener('click', () => this.setTimeOfDay('sunset'));
        document.getElementById('btn-night').addEventListener('click', () => this.setTimeOfDay('night'));
        document.getElementById('btn-season').addEventListener('click', () => this.cycleSeason());
        document.getElementById('btn-wind').addEventListener('click', () => {
            windEnabled = !windEnabled;
            this.updateWindButton();
        });

        this.updateWindButton();
    }

    updateWindButton() {
        const btn = document.getElementById('btn-wind');
        if (windEnabled) {
            btn.classList.add('active');
            btn.textContent = '风动开关';
        } else {
            btn.classList.remove('active');
            btn.textContent = '风动已关';
        }
    }

    cycleSeason() {
        const idx = SEASONS.indexOf(currentSeason);
        currentSeason = SEASONS[(idx + 1) % SEASONS.length];
        this.updateSeasonMaterials();
        this.showTooltip('季节：' + this.getSeasonName(currentSeason));
    }

    getSeasonName(s) {
        return { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' }[s];
    }

    updateSeasonMaterials() {
        this.leafMaterials.forEach(mat => {
            mat.map = this.textures.leaves[currentSeason];
            mat.needsUpdate = true;
        });
    }

    setTimeOfDay(tod) {
        timeOfDay = tod;
        const settings = {
            day: {
                bg: 0x87CEEB,
                fog: 0x87CEEB,
                fogDensity: 0.012,
                sunColor: 0xfff5e6,
                sunIntensity: 2.2,
                ambient: 0.35,
                hemiSky: 0x87CEEB,
                hemiGround: 0x3d5c2d,
                moonIntensity: 0,
                bloom: 0.25,
                exposure: 0.9,
                fireflies: false
            },
            sunset: {
                bg: 0xff9966,
                fog: 0xffaa77,
                fogDensity: 0.018,
                sunColor: 0xffaa55,
                sunIntensity: 1.6,
                ambient: 0.3,
                hemiSky: 0xffaa77,
                hemiGround: 0x5a4a3a,
                moonIntensity: 0,
                bloom: 0.4,
                exposure: 0.85,
                fireflies: false
            },
            night: {
                bg: 0x0a1020,
                fog: 0x0a1020,
                fogDensity: 0.022,
                sunColor: 0x1a2a4a,
                sunIntensity: 0.1,
                ambient: 0.08,
                hemiSky: 0x1a2a4a,
                hemiGround: 0x1a2515,
                moonIntensity: 0.5,
                bloom: 0.55,
                exposure: 0.7,
                fireflies: true
            }
        };

        const s = settings[tod];
        this.scene.background.setHex(s.bg);
        this.scene.fog.color.setHex(s.fog);
        this.scene.fog.density = s.fogDensity;
        this.sunLight.color.setHex(s.sunColor);
        this.sunLight.intensity = s.sunIntensity;
        this.ambientLight.intensity = s.ambient;
        this.hemiLight.color.setHex(s.hemiSky);
        this.hemiLight.groundColor.setHex(s.hemiGround);
        this.moonLight.intensity = s.moonIntensity;
        this.bloomPass.strength = s.bloom;
        this.renderer.toneMappingExposure = s.exposure;
        this.fireflies.visible = s.fireflies;

        // Update button states
        ['day', 'sunset', 'night'].forEach(id => {
            document.getElementById('btn-' + id).classList.toggle('active', id === tod);
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCameraMovement(dt) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

        const move = new THREE.Vector3();
        if (this.keys['w'] || this.keys['arrowup']) move.add(forward);
        if (this.keys['s'] || this.keys['arrowdown']) move.sub(forward);
        if (this.keys['d'] || this.keys['arrowright']) move.add(right);
        if (this.keys['a'] || this.keys['arrowleft']) move.sub(right);

        if (move.length() > 0) {
            move.normalize().multiplyScalar(this.walkSpeed * dt);
            this.cameraVelocity.lerp(move, 0.1);
            this.controls.autoRotate = false;
        } else {
            this.cameraVelocity.multiplyScalar(0.9);
        }

        const nextPos = this.camera.position.clone().add(this.cameraVelocity);
        nextPos.x = THREE.MathUtils.clamp(nextPos.x, -55, 55);
        nextPos.z = THREE.MathUtils.clamp(nextPos.z, -55, 55);
        nextPos.y = Math.max(this.getTerrainHeight(nextPos.x, nextPos.z) + 1.7, 0.5);

        this.camera.position.copy(nextPos);
        this.controls.target.add(this.cameraVelocity);
    }

    updateWind(dt) {
        if (!windEnabled) return;
        this.windTime += dt * CONFIG.windSpeed;

        // Animate grass instances
        if (this.grassMesh && this.grassOriginalMatrices) {
            const dummy = new THREE.Object3D();
            const count = this.grassMesh.count;
            for (let i = 0; i < count; i += 4) { // Update every 4th blade for performance
                const mat = this.grassOriginalMatrices[i];
                dummy.matrix.copy(mat);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                const x = dummy.position.x;
                const z = dummy.position.z;
                const wind = Math.sin(this.windTime + x * 0.3 + z * 0.2) * 0.08
                           + Math.sin(this.windTime * 0.5 + x * 0.1) * 0.04;
                dummy.rotation.z = wind;
                dummy.updateMatrix();
                this.grassMesh.setMatrixAt(i, dummy.matrix);
            }
            this.grassMesh.instanceMatrix.needsUpdate = true;
        }

        // Animate trees and bushes
        this.trees.forEach((tree, i) => {
            const sway = Math.sin(this.windTime * 0.7 + i) * 0.015;
            tree.rotation.z = sway;
            tree.rotation.x = sway * 0.5;
        });
    }

    updateFountain(dt) {
        this.fountainParticles.forEach(drop => {
            drop.userData.velocity.y -= 0.98 * dt;
            drop.position.addScaledVector(drop.userData.velocity, dt);
            drop.userData.life -= dt;

            if (drop.position.y < -1.5 || drop.userData.life <= 0) {
                drop.position.set(0, 0.9, 0);
                drop.userData.velocity.set(
                    (Math.random() - 0.5) * 0.12,
                    0.3 + Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.12
                );
                drop.userData.life = 1.5 + Math.random();
            }
        });
    }

    updateParticles(dt, time) {
        // Fireflies
        if (this.fireflies.visible) {
            const dummy = new THREE.Object3D();
            for (let i = 0; i < CONFIG.fireflyCount; i++) {
                const d = this.fireflyData[i];
                const x = d.basePos.x + Math.sin(time * d.speed + d.phase) * 2;
                const y = d.basePos.y + Math.cos(time * d.speed * 0.7 + d.phase) * 0.6;
                const z = d.basePos.z + Math.cos(time * d.speed * 0.5 + d.phase) * 2;
                dummy.position.set(x, y, z);
                const scale = 0.6 + Math.sin(time * 3 + d.phase) * 0.4;
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                this.fireflies.setMatrixAt(i, dummy.matrix);
            }
            this.fireflies.instanceMatrix.needsUpdate = true;
        }

        // Pollen drift
        const positions = this.pollen.geometry.attributes.position.array;
        const original = this.pollen.userData.originalPos;
        for (let i = 0; i < CONFIG.pollenCount; i++) {
            const idx = i * 3;
            positions[idx] = original[idx] + Math.sin(time * 0.3 + original[idx + 1]) * 1.5;
            positions[idx + 1] = original[idx + 1] + Math.sin(time * 0.5 + i) * 0.1;
            positions[idx + 2] = original[idx + 2] + Math.cos(time * 0.2 + original[idx]) * 1.5;
        }
        this.pollen.geometry.attributes.position.needsUpdate = true;
    }

    updateWater(dt, time) {
        this.textures.waterNormal.offset.x = time * 0.03;
        this.textures.waterNormal.offset.y = time * 0.02;
    }

    updateFlowers(time) {
        this.flowers.forEach((flower, i) => {
            flower.rotation.y = Math.sin(time * 0.5 + i) * 0.1;
            flower.children[1].rotation.y = time + i;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.getElapsedTime();

        this.controls.update();
        this.updateCameraMovement(dt);
        this.updateWind(dt);
        this.updateFountain(dt);
        this.updateParticles(dt, time);
        this.updateWater(dt, time);
        this.updateFlowers(time);

        this.composer.render();
    }
}

// Start the application
new GardenApp();
