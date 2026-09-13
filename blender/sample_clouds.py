import bpy
import struct
import numpy as np

OUT_DIR = "/Users/jrad/Developer/portfolio/public/clouds"
COUNT = 65536


def gather_triangles(root, front_only=True, back_limit=0.25):
    dg = bpy.context.evaluated_depsgraph_get()
    inv_root = root.matrix_world.inverted()
    verts = []
    cols = []
    weights = []
    hots = []
    for ob in root.children_recursive:
        if ob.type not in ("MESH", "CURVE"):
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        if me is None or len(me.polygons) == 0:
            ev.to_mesh_clear()
            continue
        me.calc_loop_triangles()
        mw = inv_root @ ev.matrix_world
        mats = me.materials if len(me.materials) else ob.data.materials
        weight = float(ob.get("sample_weight", 1.0))
        hot = float(ob.get("hot", 0.5))
        coords = np.array([tuple(mw @ v.co) for v in me.vertices], dtype=np.float64)
        tri_idx = np.array([lt.vertices[:] for lt in me.loop_triangles], dtype=np.int64)
        mat_idx = np.array([lt.material_index for lt in me.loop_triangles], dtype=np.int64)
        palette = np.array(
            [tuple(m.diffuse_color[:3]) if m else (0.8, 0.8, 0.8) for m in mats] or [(0.8, 0.8, 0.8)],
            dtype=np.float64,
        )
        mat_idx = np.clip(mat_idx, 0, len(palette) - 1)
        tri = coords[tri_idx]
        keep = np.ones(len(tri_idx), dtype=bool)
        if front_only:
            n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
            n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
            keep = n[:, 1] < back_limit
        verts.append(tri[keep])
        cols.append(palette[mat_idx][keep])
        weights.append(np.full(int(keep.sum()), weight))
        hots.append(np.full(int(keep.sum()), hot))
        ev.to_mesh_clear()
    return np.concatenate(verts), np.concatenate(cols), np.concatenate(weights), np.concatenate(hots)


def sample_surface(tris, cols, weights, hots, count, seed):
    rng = np.random.default_rng(seed)
    e1 = tris[:, 1] - tris[:, 0]
    e2 = tris[:, 2] - tris[:, 0]
    areas = 0.5 * np.linalg.norm(np.cross(e1, e2), axis=1) * weights
    probs = areas / areas.sum()
    pick = rng.choice(len(tris), size=count, p=probs)
    r1 = np.sqrt(rng.random(count))
    r2 = rng.random(count)
    a = 1.0 - r1
    b = r1 * (1.0 - r2)
    c = r1 * r2
    t = tris[pick]
    pts = t[:, 0] * a[:, None] + t[:, 1] * b[:, None] + t[:, 2] * c[:, None]
    return pts, cols[pick], hots[pick]


def to_y_up(pts):
    return np.stack([pts[:, 0], pts[:, 2], -pts[:, 1]], axis=1)


def write_cloud(path, pts, cols, hots):
    pts = to_y_up(pts)
    lo = pts.min(axis=0)
    hi = pts.max(axis=0)
    center = (lo + hi) / 2.0
    extent = hi - lo
    scale = extent.max() / 2.0
    norm = (pts - center) / scale
    q = np.clip(np.round(norm * 32767.0), -32767, 32767).astype("<i2")
    rgb = np.clip(np.round(cols * 255.0), 0, 255).astype(np.uint8)
    hot = np.clip(np.round(hots * 255.0), 0, 255).astype(np.uint8)
    header = b"PCLD" + struct.pack("<II", 2, len(pts)) + struct.pack("<fff", *extent.astype(float))
    with open(path, "wb") as f:
        f.write(header)
        f.write(q.tobytes())
        f.write(rgb.tobytes())
        f.write(hot.tobytes())
    return len(pts), extent


def export_cloud(root_name, filename, count=COUNT, seed=7):
    root = bpy.data.objects[root_name]
    tris, cols, weights, hots = gather_triangles(root)
    pts, pcols, phots = sample_surface(tris, cols, weights, hots, count, seed)
    n, extent = write_cloud(f"{OUT_DIR}/{filename}", pts, pcols, phots)
    print(f"{filename}: {n} pts, {len(tris)} tris, extent(cm) {np.round(extent, 2)}")


if __name__ == "__main__":
    export_cloud("Ting", "ting.bin")
    export_cloud("Stick", "stick.bin")
    export_cloud("Truck", "truck.bin")
