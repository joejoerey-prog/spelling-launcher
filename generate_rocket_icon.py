import math
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter

def create_rocket_icon(size=1024):
    # Create RGBA image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background rounded squircle / badge
    # Deep emerald to electric green gradient in circular / squircle badge
    padding = size * 0.06
    r = size * 0.22 # corner radius
    
    # Create background mask with rounded rectangle
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    
    # Draw gradient on background
    for y in range(int(padding), int(size - padding)):
        ratio = (y - padding) / (size - 2 * padding)
        # Gradient from bright emerald (#10b981) at top to deep forest green (#064e3b / #022c22) at bottom
        r_col = int(16 * (1 - ratio) + 2 * ratio)
        g_col = int(185 * (1 - ratio) + 44 * ratio)
        b_col = int(129 * (1 - ratio) + 34 * ratio)
        bg_draw.line([(padding, y), (size - padding, y)], fill=(r_col, g_col, b_col, 255))
    
    # Rounded mask for squircle
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=r,
        fill=255
    )
    
    # Apply mask
    bg.putalpha(mask)
    img.paste(bg, (0, 0), bg)
    draw = ImageDraw.Draw(img)
    
    # Outer subtle glow border
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=r,
        outline=(52, 211, 153, 200),
        width=int(size * 0.015)
    )

    # 2. Stars & Space Particles
    stars = [
        (0.25, 0.22, 0.018), (0.75, 0.20, 0.015), (0.20, 0.45, 0.012),
        (0.82, 0.50, 0.02), (0.30, 0.70, 0.014), (0.72, 0.75, 0.016),
        (0.48, 0.18, 0.022), (0.15, 0.30, 0.01), (0.85, 0.35, 0.012)
    ]
    for sx, sy, srad in stars:
        cx, cy, rad = sx * size, sy * size, srad * size
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(255, 255, 255, 220))
        # 4-point twinkle sparkle on larger stars
        if srad > 0.015:
            draw.line([(cx - rad*2.2, cy), (cx + rad*2.2, cy)], fill=(255, 255, 255, 180), width=int(size*0.005))
            draw.line([(cx, cy - rad*2.2), (cx, cy + rad*2.2)], fill=(255, 255, 255, 180), width=int(size*0.005))

    # 3. Rocket Exhaust Flames (retro multi-layered fire plume)
    flame_top_y = size * 0.65
    flame_bottom_y = size * 0.88
    center_x = size * 0.5
    
    # Outer orange flame
    draw.polygon([
        (center_x - size * 0.12, flame_top_y),
        (center_x + size * 0.12, flame_top_y),
        (center_x + size * 0.07, flame_bottom_y * 0.95),
        (center_x, flame_bottom_y),
        (center_x - size * 0.07, flame_bottom_y * 0.95),
    ], fill=(249, 115, 22, 255))
    
    # Middle yellow flame
    draw.polygon([
        (center_x - size * 0.08, flame_top_y + size * 0.02),
        (center_x + size * 0.08, flame_top_y + size * 0.02),
        (center_x, flame_bottom_y * 0.88),
    ], fill=(251, 191, 36, 255))

    # Inner white flame core
    draw.polygon([
        (center_x - size * 0.04, flame_top_y + size * 0.04),
        (center_x + size * 0.04, flame_top_y + size * 0.04),
        (center_x, flame_bottom_y * 0.78),
    ], fill=(255, 255, 255, 255))

    # 4. Retro Rocket Fins (Left, Right, Center)
    # Left Fin (Bright Red/Coral)
    draw.polygon([
        (center_x - size * 0.13, size * 0.50),
        (center_x - size * 0.28, size * 0.68),
        (center_x - size * 0.24, size * 0.73),
        (center_x - size * 0.12, size * 0.64),
    ], fill=(225, 29, 72, 255), outline=(159, 18, 57, 255))
    
    # Right Fin (Bright Red/Coral)
    draw.polygon([
        (center_x + size * 0.13, size * 0.50),
        (center_x + size * 0.28, size * 0.68),
        (center_x + size * 0.24, size * 0.73),
        (center_x + size * 0.12, size * 0.64),
    ], fill=(225, 29, 72, 255), outline=(159, 18, 57, 255))

    # 5. Rocket Main Body (Fuselage) - Sleek Classic Bullet Shape
    body_top_y = size * 0.20
    body_bottom_y = size * 0.66
    body_half_w = size * 0.15

    # Draw fuselage using smooth curve
    fuselage_points = []
    # Left curve from nose to base
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        y = body_top_y + t * (body_bottom_y - body_top_y)
        # Bullet curve width
        w = body_half_w * math.sin(t * math.pi * 0.55)
        fuselage_points.append((center_x - w, y))
    
    # Right curve from base to nose
    for i in range(steps, -1, -1):
        t = i / steps
        y = body_top_y + t * (body_bottom_y - body_top_y)
        w = body_half_w * math.sin(t * math.pi * 0.55)
        fuselage_points.append((center_x + w, y))

    # Fuselage main white/cream body
    draw.polygon(fuselage_points, fill=(248, 250, 252, 255), outline=(203, 213, 225, 255))

    # Fuselage 3D shadow / shading (left side slightly darker)
    left_shadow = []
    for i in range(steps + 1):
        t = i / steps
        y = body_top_y + t * (body_bottom_y - body_top_y)
        w = body_half_w * math.sin(t * math.pi * 0.55)
        left_shadow.append((center_x - w, y))
    for i in range(steps, -1, -1):
        t = i / steps
        y = body_top_y + t * (body_bottom_y - body_top_y)
        left_shadow.append((center_x, y))
    draw.polygon(left_shadow, fill=(226, 232, 240, 160))

    # 6. Rocket Nose Cone (Crimson / Red)
    nose_cone_h = size * 0.14
    nose_points = [
        (center_x, body_top_y),
    ]
    for i in range(15):
        t = (i / 14) * (nose_cone_h / (body_bottom_y - body_top_y))
        y = body_top_y + t * (body_bottom_y - body_top_y)
        w = body_half_w * math.sin(t * math.pi * 0.55)
        nose_points.append((center_x - w, y))
    
    for i in range(14, -1, -1):
        t = (i / 14) * (nose_cone_h / (body_bottom_y - body_top_y))
        y = body_top_y + t * (body_bottom_y - body_top_y)
        w = body_half_w * math.sin(t * math.pi * 0.55)
        nose_points.append((center_x + w, y))
    
    draw.polygon(nose_points, fill=(225, 29, 72, 255), outline=(159, 18, 57, 255))

    # 7. Center Fin (front ridge)
    center_fin = [
        (center_x - size * 0.015, size * 0.50),
        (center_x + size * 0.015, size * 0.50),
        (center_x + size * 0.02, size * 0.69),
        (center_x - size * 0.02, size * 0.69),
    ]
    draw.polygon(center_fin, fill=(190, 18, 60, 255))

    # 8. Retro Circular Porthole Window
    porthole_y = size * 0.44
    port_rad_outer = size * 0.075
    port_rad_rim = size * 0.065
    port_rad_glass = size * 0.052

    # Outer chrome ring
    draw.ellipse([
        center_x - port_rad_outer, porthole_y - port_rad_outer,
        center_x + port_rad_outer, porthole_y + port_rad_outer
    ], fill=(100, 116, 139, 255))

    # Brass/silver rim
    draw.ellipse([
        center_x - port_rad_rim, porthole_y - port_rad_rim,
        center_x + port_rad_rim, porthole_y + port_rad_rim
    ], fill=(203, 213, 225, 255))

    # Cyan glowing glass
    draw.ellipse([
        center_x - port_rad_glass, porthole_y - port_rad_glass,
        center_x + port_rad_glass, porthole_y + port_rad_glass
    ], fill=(14, 165, 233, 255))

    # Glass highlight glare
    glare_w = port_rad_glass * 0.6
    draw.chord([
        center_x - port_rad_glass + 3, porthole_y - port_rad_glass + 3,
        center_x + port_rad_glass - 3, porthole_y + port_rad_glass - 3
    ], start=190, end=330, fill=(186, 230, 253, 220))

    # Porthole rivets
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        rad_ang = math.radians(angle)
        rx = center_x + (port_rad_outer - 5) * math.cos(rad_ang)
        ry = porthole_y + (port_rad_outer - 5) * math.sin(rad_ang)
        draw.ellipse([rx - 2, ry - 2, rx + 2, ry + 2], fill=(51, 65, 85, 255))

    # 9. Nozzle Exhaust Ring at base
    draw.ellipse([
        center_x - size * 0.08, body_bottom_y - size * 0.015,
        center_x + size * 0.08, body_bottom_y + size * 0.02
    ], fill=(71, 85, 105, 255), outline=(51, 65, 85, 255))

    return img

def main():
    base_dir = "/Users/joerey/.gemini/antigravity/scratch/wordtune-personal"
    icon_dir = os.path.join(base_dir, "src-tauri/icons")
    iconset_dir = os.path.join(base_dir, "src-tauri/icons/icon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)
    os.makedirs(os.path.join(base_dir, "public"), exist_ok=True)

    master = create_rocket_icon(1024)
    master.save(os.path.join(base_dir, "public/logo.png"))
    master.save(os.path.join(icon_dir, "icon.png"))
    master.save(os.path.join(icon_dir, "512x512.png"))

    # Generate standard Tauri icon sizes
    sizes_and_names = [
        (32, "32x32.png"),
        (128, "128x128.png"),
        (256, "128x128@2x.png"),
    ]
    for s, name in sizes_and_names:
        resized = master.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(icon_dir, name))

    # Generate macOS iconset for iconutil
    iconset_specs = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    for s, filename in iconset_specs:
        resized = master.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, filename))

    # Compile .icns with iconutil
    icns_path = os.path.join(icon_dir, "icon.icns")
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_path], check=True)
    print(f"Generated {icns_path} successfully!")

    # Generate .ico for Windows/universal
    ico_path = os.path.join(icon_dir, "icon.ico")
    master.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Generated {ico_path} successfully!")

if __name__ == "__main__":
    main()
