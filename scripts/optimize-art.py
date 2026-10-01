"""Compress project-bound source atlases; preserve original paintings.
Usage: python scripts/optimize-art.py (requires Pillow).
No painted details are edited; output is resized to 1024x1024 and encoded WebP.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
for source in sorted((ROOT / 'assets' / 'source' / 'cards').glob('*/starter-atlas.png')):
    with Image.open(source) as image:
        image = image.convert('RGB')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        target = ROOT / 'assets' / 'cards' / source.parent.name / 'starter-atlas.webp'
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'WEBP', quality=86, method=6)
        print(f'{source.parent.name}: {image.width}x{image.height}, {target.stat().st_size:,} bytes')
