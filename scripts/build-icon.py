"""Optional authoring helper; Pillow produces the Windows icon from the UI glyph."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
scale = 8
image = Image.new('RGBA', (64*scale, 64*scale), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, 64*scale-1, 64*scale-1), radius=10*scale, fill='#0c1116')
def polygon(points, fill):
    draw.polygon([(x*scale,y*scale) for x,y in points], fill=fill)
polygon([(12,12),(26,12),(26,26),(38,26),(38,12),(52,12),(52,52),(38,52),(38,38),(26,38),(26,52),(12,52)], '#f3a052')
polygon([(18,17),(21,17),(21,31),(43,31),(43,17),(46,17),(46,47),(43,47),(43,33),(21,33),(21,47),(18,47)], '#0c1116')
image = image.resize((256,256), Image.Resampling.LANCZOS)
image.save(root / 'assets/ui/frontlines-icon.png')
image.save(root / 'assets/ui/frontlines-icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
