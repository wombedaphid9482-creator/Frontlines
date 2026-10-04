"""Encode preserved Commander source portraits for the offline runtime.

This script only resizes/encodes finished artwork. Generation uses the built-in
image_gen tool; prompts and source hashes live beside the preserved PNGs.
Requires Pillow, available in the Codex workspace dependency runtime.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'assets/source/commanders/portraits-v2.json'


def inside(relative):
    result = (ROOT / relative).resolve()
    if not result.is_relative_to(ROOT):
        raise ValueError('Asset path escaped the workspace')
    return result


def optimize():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    total = 0
    for asset in manifest['assets']:
        source, runtime = inside(asset['source']), inside(asset['runtime'])
        if hashlib.sha256(source.read_bytes()).hexdigest() != asset['sourceSha256']:
            raise ValueError('Source art changed: ' + asset['id'])
        with Image.open(source) as image:
            if image.width != image.height:
                raise ValueError('Commander artwork must be square: ' + asset['id'])
            portrait = image.convert('RGB').resize((768, 768), Image.Resampling.LANCZOS)
            runtime.parent.mkdir(parents=True, exist_ok=True)
            portrait.save(runtime, format='WEBP', quality=84, method=6)
        payload = runtime.read_bytes()
        if len(payload) >= 200000:
            raise ValueError('Portrait exceeds the runtime budget: ' + asset['id'])
        asset['runtimeBytes'] = len(payload)
        asset['runtimeSha256'] = hashlib.sha256(payload).hexdigest()
        total += len(payload)
        print(asset['id'] + ': ' + str(len(payload)) + ' bytes')
    if total >= 1600000:
        raise ValueError('Commander set exceeds the 1.6MB budget')
    manifest['runtimeTotalBytes'] = total
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('Ten painted Commander portraits: ' + str(total) + ' bytes total')


if __name__ == '__main__':
    optimize()
