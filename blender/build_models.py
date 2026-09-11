import bpy
import math

PALETTE = {
    "cream": (0.6, 0.55, 0.46),
    "ink": (0.13, 0.13, 0.16),
    "teal": (0.16, 0.8, 0.58),
    "pink": (0.58, 0.38, 1.0),
    "pineapple": (1.0, 0.26, 0.48),
    "white": (0.7, 0.68, 0.64),
    "grey": (0.4, 0.4, 0.42),
    "screen": (0.05, 0.07, 0.1),
    "red": (1.0, 0.12, 0.1),
}


def scene():
    sc = bpy.data.scenes.get("Portfolio") or bpy.data.scenes.new("Portfolio")
    bpy.context.window.scene = sc
    for ob in list(sc.collection.all_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    return sc


def mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    rgb = PALETTE[name]
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.6
    m.diffuse_color = (*rgb, 1.0)
    return m


def box(name, size, loc, material, bevel=0.0, segs=4, parent=None, weight=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat(material))
    if bevel > 0:
        b = ob.modifiers.new("Bevel", "BEVEL")
        b.width = bevel
        b.segments = segs
        b.limit_method = "ANGLE"
    ob["sample_weight"] = weight
    if parent:
        ob.parent = parent
    return ob


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=32, parent=None, weight=1.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat(material))
    ob["sample_weight"] = weight
    if parent:
        ob.parent = parent
    return ob


def build_ting(sc):
    root = bpy.data.objects.new("Ting", None)
    sc.collection.objects.link(root)
    box("Ting_Body", (5.6, 1.6, 8.8), (0, 0, 0), "cream", bevel=0.45, segs=6, parent=root)
    box("Ting_Grille", (5.0, 0.25, 4.0), (0, -0.85, 2.3), "ink", bevel=0.12, segs=3, parent=root)
    for i in range(11):
        box(f"Ting_Rib{i}", (4.8, 0.12, 0.10), (0, -1.02, 0.5 + i * 0.36), "cream", parent=root)
    cyl("Ting_MicRim", 1.75, 0.22, (0, -1.06, 2.3), "ink", rot=(math.pi / 2, 0, 0), verts=48, parent=root)
    cyl("Ting_Mic", 1.5, 0.12, (0, -1.15, 2.3), "ink", rot=(math.pi / 2, 0, 0), verts=48, parent=root)
    box("Ting_Plate", (5.0, 0.2, 3.7), (0, -0.85, -2.25), "cream", bevel=0.1, segs=3, parent=root)
    for sx in (-2.05, 2.05):
        for sz in (-3.6, -0.9):
            cyl(f"Ting_Screw_{sx:+.0f}_{sz:+.0f}", 0.16, 0.08, (sx, -1.0, sz), "grey", rot=(math.pi / 2, 0, 0), verts=24, parent=root, weight=3.0)
    box("Ting_Lever", (0.7, 1.3, 7.6), (-3.05, 0.05, -0.3), "ink", bevel=0.2, segs=4, parent=root)
    box("Ting_BtnOrange", (0.45, 0.9, 0.9), (3.0, 0.0, 3.2), "pineapple", bevel=0.12, segs=3, parent=root, weight=2.5)
    box("Ting_BtnGreen", (0.45, 0.9, 0.9), (3.0, 0.0, 2.0), "teal", bevel=0.12, segs=3, parent=root, weight=2.5)
    box("Ting_BtnWhite", (0.45, 0.9, 1.1), (3.0, 0.0, -1.2), "white", bevel=0.12, segs=3, parent=root, weight=2.5)
    box("Ting_Clip", (1.2, 0.15, 6.0), (0, 0.95, -0.4), "ink", bevel=0.05, segs=2, parent=root)
    cyl("Ting_CableStub", 0.32, 0.6, (0, 0, -4.6), "ink", verts=24, parent=root)
    curve = bpy.data.curves.new("Ting_Coil", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.1
    curve.bevel_resolution = 4
    curve.resolution_u = 6
    spl = curve.splines.new("NURBS")
    pts = []
    turns, per = 7, 12
    for i in range(turns * per + 1):
        t = i / per
        a = t * 2 * math.pi
        pts.append((0.42 * math.cos(a), 0.42 * math.sin(a), -4.95 - t * 0.42))
    for i in range(5):
        pts.append((0, 0, -4.95 - turns * 0.42 - (i + 1) * 0.35))
    spl.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(spl.points, pts):
        p.co = (x, y, z, 1.0)
    spl.use_endpoint_u = True
    spl.order_u = 4
    coil = bpy.data.objects.new("Ting_Coil", curve)
    coil.data.materials.append(mat("pineapple"))
    coil["sample_weight"] = 1.2
    coil.parent = root
    sc.collection.objects.link(coil)


def build_stick(sc):
    root = bpy.data.objects.new("Stick", None)
    root.location = (12, 0, 0)
    sc.collection.objects.link(root)
    box("Stick_Body", (2.6, 1.4, 5.6), (0, 0, 0), "cream", bevel=0.35, segs=6, parent=root)
    box("Stick_Bezel", (2.25, 0.08, 3.1), (0, -0.72, 0.9), "ink", bevel=0.15, segs=3, parent=root)
    box("Stick_Screen", (2.0, 0.04, 2.85), (0, -0.77, 0.9), "screen", bevel=0.08, segs=2, parent=root, weight=1.4)
    box("Stick_ScrHeader", (1.3, 0.03, 0.14), (-0.25, -0.80, 2.0), "pineapple", parent=root, weight=3.0)
    for i, w in enumerate((1.5, 1.2, 1.6)):
        box(f"Stick_ScrLine{i}", (w, 0.03, 0.12), (-0.95 + w / 2, -0.80, 0.85 - i * 0.42), "teal", parent=root, weight=3.0)
    box("Stick_ScrCursor", (0.5, 0.03, 0.12), (-0.55, -0.80, -0.35), "pink", parent=root, weight=3.0)
    box("Stick_Button", (1.7, 0.3, 0.6), (0, -0.78, -1.55), "teal", bevel=0.28, segs=6, parent=root, weight=2.5)
    box("Stick_Slot", (0.6, 0.2, 0.18), (0, -0.72, -2.35), "ink", bevel=0.06, segs=2, parent=root, weight=2.0)
    cyl("Stick_LED", 0.08, 0.06, (0.9, -0.72, 2.55), "red", rot=(math.pi / 2, 0, 0), verts=16, parent=root, weight=6.0)
    cyl("Stick_Pinhole", 0.05, 0.06, (-0.9, -0.72, 2.55), "ink", rot=(math.pi / 2, 0, 0), verts=12, parent=root, weight=4.0)
    box("Stick_SideBtnL", (0.14, 0.6, 0.8), (-1.33, 0, 1.6), "cream", bevel=0.05, segs=2, parent=root, weight=2.0)
    box("Stick_SideBtnR", (0.14, 0.6, 0.8), (1.33, 0, -0.2), "cream", bevel=0.05, segs=2, parent=root, weight=2.0)
    box("Stick_USB", (0.9, 0.32, 0.12), (0, 0, -2.83), "ink", bevel=0.05, segs=2, parent=root, weight=2.0)


def coil(name, sc, parent, start, turns=8, radius=0.55, pitch=0.5, tail=4, material="pineapple", hot=0.2):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.14
    curve.bevel_resolution = 4
    curve.resolution_u = 6
    spl = curve.splines.new("NURBS")
    pts = []
    per = 12
    for i in range(turns * per + 1):
        t = i / per
        a = t * 2 * math.pi
        pts.append((start[0] + radius * math.cos(a), start[1] + radius * math.sin(a), start[2] - t * pitch))
    for i in range(tail):
        pts.append((start[0], start[1], start[2] - turns * pitch - (i + 1) * 0.5))
    spl.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(spl.points, pts):
        p.co = (x, y, z, 1.0)
    spl.use_endpoint_u = True
    spl.order_u = 4
    ob = bpy.data.objects.new(name, curve)
    ob.data.materials.append(mat(material))
    ob["sample_weight"] = 1.2
    ob["hot"] = hot
    ob.parent = parent
    sc.collection.objects.link(ob)
    return ob


def build_handset(sc):
    root = bpy.data.objects.new("Handset", None)
    root.location = (0, 20, 0)
    sc.collection.objects.link(root)
    tilt = bpy.data.objects.new("Handset_Tilt", None)
    tilt.rotation_euler = (0.5, 0, 0)
    tilt.parent = root
    sc.collection.objects.link(tilt)

    curve = bpy.data.curves.new("Handset_Handle", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 1.25
    curve.bevel_resolution = 8
    curve.resolution_u = 24
    spl = curve.splines.new("BEZIER")
    spl.bezier_points.add(2)
    coords = [(-7.6, 0, 0.4), (0, 0, 4.6), (7.6, 0, 0.4)]
    for bp, co in zip(spl.bezier_points, coords):
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    handle = bpy.data.objects.new("Handset_Handle", curve)
    handle.data.materials.append(mat("cream"))
    handle["sample_weight"] = 1.0
    handle["hot"] = 0.0
    handle.parent = tilt
    sc.collection.objects.link(handle)

    for side, sx, rot in (("L", -8.4, 0.42), ("R", 8.4, -0.42)):
        cup = cyl(f"Handset_Cup{side}", 3.1, 2.4, (sx, 0, -0.9), "cream", rot=(0, rot, 0), verts=48, parent=tilt)
        cup["hot"] = 0.0
        b = cup.modifiers.new("Bevel", "BEVEL")
        b.width = 0.5
        b.segments = 4
        b.limit_method = "ANGLE"
        rim = cyl(f"Handset_Rim{side}", 3.35, 0.6, (0, 0, -1.2), "grey", verts=48, parent=cup)
        rim["hot"] = 0.0
        rim.location = (0, 0, -1.2)
        for i in range(7):
            if i == 0:
                hx, hy = 0.0, 0.0
            else:
                a = (i - 1) / 6 * math.pi * 2
                hx, hy = math.cos(a) * 1.5, math.sin(a) * 1.5
            hole = cyl(f"Handset_Hole{side}{i}", 0.4, 0.35, (hx, hy, -1.6), "teal", verts=16, parent=cup, weight=2.5)
            hole["hot"] = 1.0
    coil("Handset_Cord", sc, tilt, (-9.9, 0, -2.6), turns=7, radius=0.55, pitch=0.55, tail=3, hot=0.2)


if __name__ == "__main__":
    sc = scene()
    build_ting(sc)
    build_stick(sc)
    build_handset(sc)
    print("built", len(sc.collection.all_objects), "objects")
