import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const BASE = import.meta.env.BASE_URL;

function texture(url, colorSpace, manager) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader(manager).load(url, (map) => {
      map.colorSpace = colorSpace;
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      resolve(map);
    }, undefined, reject);
  });
}

async function pbrSet(name, manager) {
  const root = `${BASE}assets/textures/${name}`;
  const [map, normalMap, roughnessMap] = await Promise.all([
    texture(`${root}_diff.jpg`, THREE.SRGBColorSpace, manager),
    texture(`${root}_nor_gl.jpg`, THREE.NoColorSpace, manager),
    texture(`${root}_rough.jpg`, THREE.NoColorSpace, manager),
  ]);
  return { map, normalMap, roughnessMap };
}

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

/** CC0 models, PBR photos, and (on High) a 1k HDRI. */
export async function loadGameAssets(renderer, preset, onProgress) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (total > 0) onProgress(Math.min(0.98, loaded / total));
  };
  const gltfLoader = new GLTFLoader(manager);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const ktx2 = new KTX2Loader(manager)
    .setTranscoderPath(`${BASE}basis/`)
    .detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2);

  const modelFiles = {
    breeze: 'models/breeze.glb',
    sundart: 'models/sundart.glb',
    palmetto: 'models/palmetto.glb',
    apartment: 'models/apartment.glb',
    motel: 'models/motel.glb',
    tower: 'models/tower.glb',
    pencil: 'models/pencil.glb',
    palm: 'models/palm.glb',
  };

  const entries = await Promise.all(Object.entries(modelFiles).map(async ([key, file]) => {
    const scene = await loadGltf(gltfLoader, `${BASE}assets/${file}`);
    return [key, scene];
  }));
  const models = Object.fromEntries(entries);

  const [asphalt, concrete, sand] = await Promise.all([
    pbrSet('clean_asphalt', manager),
    pbrSet('concrete_pavement', manager),
    pbrSet('coast_sand_01', manager),
  ]);

  let envMap = null;
  if (preset.level === 'high') {
    const hdr = await new Promise((resolve, reject) => {
      new RGBELoader(manager).load(`${BASE}assets/hdri/sky.hdr`, resolve, undefined, reject);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    envMap = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
  }

  ktx2.dispose();
  onProgress(1);
  return { models, maps: { asphalt, concrete, sand }, envMap };
}
