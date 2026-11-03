// 動かない建物のメッシュを素材ごとに一つにまとめる（ドローコールを減らす：スマホ対策）。
// グループ自体は残す（灯籠の位置・光源プールなどが getWorldPosition で参照するため）。
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function freeze(roots, scene) {
  scene.updateMatrixWorld(true);
  const buckets = new Map();
  for (const r of roots) r.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.material.transparent || !o.visible) return;
    for (let p = o; p; p = p.parent) if (p.userData.live) return;                  // 動く部分（御扉など）はそのまま
    if (o.matrixWorld.determinant() < 0) return;                                   // 反転したものは面の向きが変わるので除外
    const g = o.geometry, attrs = Object.keys(g.attributes).sort().join(",");
    const key = `${o.material.uuid}|${attrs}|${g.index ? 1 : 0}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  let before = 0, after = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => { const g = o.geometry.clone(); g.morphAttributes = {}; g.clearGroups(); g.applyMatrix4(o.matrixWorld); return g; });
    const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.matrixAutoUpdate = false; m.updateMatrixWorld(true);
    scene.add(m);
    for (const o of list) o.removeFromParent();
    before += list.length; after++;
  }
  return { before, after };
}
