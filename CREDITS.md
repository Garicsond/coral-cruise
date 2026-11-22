# Credits

Coral Cruise uses only original code and CC0 assets. Nothing here is a real car brand, logo, or ripped game model.

## Models (CC0 1.0)

| File | What it is in the game | Source |
| --- | --- | --- |
| `public/assets/models/breeze.glb` | Breeze, the starter coupe | [Classic 1970s Coupe](https://tevy.dev/models/classic-coupe) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/sundart.glb` | Sundart, the quicker car | [Muscle Car](https://tevy.dev/models/muscle-car) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/palmetto.glb` | Palmetto, the family wagon | [Family Estate Car](https://tevy.dev/models/estate-car) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/apartment.glb` | Mid-rise condo | [Apartment Block](https://tevy.dev/models/apartment-block) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/motel.glb` | The Pink Marlin and low blocks | [Roadside Motel](https://tevy.dev/models/roadside-motel) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/tower.glb` | Taller condo | [Korean Apartment Tower](https://tevy.dev/models/korean-apartment-tower) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/pencil.glb` | Narrow tower | [Pencil Building](https://tevy.dev/models/pencil-building) LOD1 by tevy, CC0 1.0 |
| `public/assets/models/palm.glb` | Palm trees | [Palm Tree](https://grab3d.com/models/nature/palm-tree/) light GLB, Grab3D Cozy Nature Kit, CC0 1.0 |

Paint colors are applied in the game. The models are generic and unbranded.

## Textures and lighting (CC0)

| File | Use | Source |
| --- | --- | --- |
| `clean_asphalt_*.jpg` | Roads | [clean_asphalt](https://polyhaven.com/a/clean_asphalt) 1K JPG, Poly Haven, CC0 |
| `concrete_pavement_*.jpg` | Sidewalks and curbs | [concrete_pavement](https://polyhaven.com/a/concrete_pavement) 1K JPG, Poly Haven, CC0 |
| `coast_sand_01_*.jpg` | Beach and ground | [coast_sand_01](https://polyhaven.com/a/coast_sand_01) 1K JPG, Poly Haven, CC0 |
| `hdri/sky.hdr` | Image-based lighting on High | [kloofendal_43d_clear_puresky](https://polyhaven.com/a/kloofendal_43d_clear_puresky) 1K HDR, Poly Haven, CC0 |

Each texture set is albedo, OpenGL normal, and roughness.

## Code libraries

- [Three.js](https://threejs.org/) r170, MIT. Includes the meshopt decoder and the Basis Universal transcoder (`public/basis/`) used to read the KTX2 textures packed in the tevy models. Basis Universal is from [BinomialLLC/basis_universal](https://github.com/BinomialLLC/basis_universal).
- City layout, driving, jobs, audio, and interface are original.

## Audio

Engine, music, and interface sounds are synthesized in the browser with the Web Audio API. No audio files are shipped.
