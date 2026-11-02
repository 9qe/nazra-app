# Tariq brand icon — draw straight in PIL, no external deps.
# Navy bg + road-yellow radar arcs + amber wave-dot, iOS-icon safe.
from PIL import Image, ImageDraw
import math

S = 512
img = Image.new('RGB', (S, S), '#0B0F1A')
d = ImageDraw.Draw(img, 'RGBA')

CX = CY = S // 2
d.ellipse([CX - 210, CY - 210, CX + 210, CY + 210], fill='#0F1522')

# subtle winding-road diagonal (desaturated blue), behind the arcs
road = Image.new('RGBA', (S, S), (0, 0, 0, 0))
rd = ImageDraw.Draw(road)
pts = []
for i in range(-40, 41):
    x = S * (i / 60) + S / 2
    y = CY + math.sin((i / 40) * math.pi) * 60
    pts.append((x, y))
for w, a in ((34, 60), (22, 90), (4, 40)):
    rd.line(pts, fill=(90, 150, 255, a), width=w, joint='curve')
road = road.rotate(38, expand=False, resample=Image.BICUBIC)
img.paste(road, (0, 0), road)
d = ImageDraw.Draw(img, 'RGBA')

# radar arcs — three concentric sectors, upper-left open, thick yellow
for r, w in ((208, 14), (152, 12), (96, 11)):
    d.arc([CX - r, CY - r, CX + r, CY + r], start=200, end=360, fill='#F2BB06', width=w)
    d.arc([CX - r, CY - r, CX + r, CY + r], start=20, end=140, fill='#F5A000', width=max(4, w - 6))

# small amber wave at top-right cap
d.ellipse([CX + 62, CY - 62, CX + 92, CY - 32], outline='#FFC24D', width=6)

# white centre dot (the "eye")
d.ellipse([CX - 26, CY - 26, CX + 26, CY + 26], fill='#EDEFF6')
d.ellipse([CX - 11, CY - 11, CX + 11, CY + 11], fill='#0B0F1A')

for name, size in (('icon.svg-fallback-512', 512), ):
    img.save(f'{name}.png')
img.resize((192, 192), Image.LANCZOS).save('icon.png')
img.save('icon.png')  # final: 192 uses downscale of 512 master
img.save('icon-512.png')
print('icons written')
