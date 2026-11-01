import bpy
import math
import bpy_extras
from mathutils import Vector

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Configure rendering
try:
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 40
except Exception:
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'RenderSettings') else 'BLENDER_EEVEE'

scene.render.film_transparent = True
res_w = 1200
res_h = 900
scene.render.resolution_x = res_w
scene.render.resolution_y = res_h
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# High-end anodized finish materials
def make_mat(name, color, roughness=0.25, metallic=0.7):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return mat

mat_outer = make_mat("OuterChassis", (0.16, 0.16, 0.18), roughness=0.22, metallic=0.85) # Sleek anodized aluminum rim
mat_stand = make_mat("Stand", (0.22, 0.22, 0.25), roughness=0.20, metallic=0.9) # Apple-grade aluminum stand
mat_screen = make_mat("ScreenVoid", (0.005, 0.005, 0.008), roughness=0.08, metallic=0.0)

# 1. Main Display Chassis (Seamless unibody with beautifully rounded curved corners on ALL 4 sides)
# Outer: width 17.6, height 10.6, depth 0.4
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 5.3))
chassis = bpy.context.active_object
chassis.name = "MonitorChassis"
chassis.scale = (17.6, 0.4, 10.6)
chassis.data.materials.append(mat_outer)

# Smooth curved bevel on ALL 4 corners (top-left, top-right, bottom-left, bottom-right)
bev = chassis.modifiers.new('Bevel', 'BEVEL')
bev.width = 0.08
bev.segments = 5

# 2. Display Screen Cutout (Screen width: 16.7, height: 9.7 - perfectly nested inside the beveled chassis)
# NO sharp separate chin bar! Clean uniform borders all around!
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.201, 5.3))
screen = bpy.context.active_object
screen.name = "ScreenDisplay"
screen.scale = (16.7, 0.02, 9.7)
screen.data.materials.append(mat_screen)

bev_screen = screen.modifiers.new('Bevel', 'BEVEL')
bev_screen.width = 0.04
bev_screen.segments = 4

# 3. Stand Neck (Behind the chassis)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.22, 1.6))
neck = bpy.context.active_object
neck.name = "StandNeck"
neck.scale = (1.8, 0.5, 3.4)
neck.data.materials.append(mat_stand)
bev_neck = neck.modifiers.new('Bevel', 'BEVEL')
bev_neck.width = 0.04
bev_neck.segments = 3

# 4. Stand Base (Flat desktop base with smooth rounded corners)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.2))
base = bpy.context.active_object
base.name = "StandBase"
base.scale = (8.2, 5.0, 0.25)
base.data.materials.append(mat_stand)
bev_base = base.modifiers.new('Bevel', 'BEVEL')
bev_base.width = 0.06
bev_base.segments = 4

# 5. Lighting - Studio 3-point + Rim
bpy.ops.object.light_add(type='AREA', location=(0, -22, 10))
key = bpy.context.active_object
key.data.energy = 600
key.data.size = 14

bpy.ops.object.light_add(type='AREA', location=(-12, -15, 6))
left_fill = bpy.context.active_object
left_fill.data.energy = 280
left_fill.data.size = 8

bpy.ops.object.light_add(type='AREA', location=(12, -15, 6))
right_fill = bpy.context.active_object
right_fill.data.energy = 280
right_fill.data.size = 8

bpy.ops.object.light_add(type='AREA', location=(0, 3, 14))
top_rim = bpy.context.active_object
top_rim.data.energy = 350
top_rim.data.size = 12

# 6. Camera (Straight Facing, 90 deg, zero tilt, framed to make monitor wider & bigger)
bpy.ops.object.camera_add(location=(0, -25.5, 4.8), rotation=(math.radians(90), 0, 0))
cam = bpy.context.active_object
cam.data.lens = 50
scene.camera = cam

# Update scene
bpy.context.view_layer.update()

# Calculate EXACT CSS percentages for the screen mesh down to 0.01%
corners = [screen.matrix_world @ Vector(corner) for corner in screen.bound_box]
coords_2d = [bpy_extras.object_utils.world_to_camera_view(scene, cam, c) for c in corners]

min_x = min(c.x for c in coords_2d)
max_x = max(c.x for c in coords_2d)
min_y = min(c.y for c in coords_2d)
max_y = max(c.y for c in coords_2d)

css_left = min_x * 100
css_width = (max_x - min_x) * 100
css_top = (1.0 - max_y) * 100
css_height = (max_y - min_y) * 100

print(f"=== EXACT SCREEN CSS COORDINATES ===")
print(f"top: {css_top:.2f}%;")
print(f"left: {css_left:.2f}%;")
print(f"width: {css_width:.2f}%;")
print(f"height: {css_height:.2f}%;")
print(f"====================================")

# Render and save
out_path = r"C:\Users\Jeevan Yadav\.gemini\antigravity\scratch\video-call-app\client\public\pc_monitor_straight_transparent.png"
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("SUCCESS: Rendered straight-facing PC monitor to:", out_path)
