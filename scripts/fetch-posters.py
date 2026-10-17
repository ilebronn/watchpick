"""Download the fixed sample catalog's TMDB promotional images; no API token needed."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess

assets = {
    'interstellar.jpg': 'w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    'stranger-things.jpg': 'w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
    'grand-budapest.jpg': 'w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    'breaking-bad.jpg': 'w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    'spirited-away.jpg': 'w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    'the-bear.jpg': 'w500/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg',
    'inception.jpg': 'w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    'last-of-us.jpg': 'w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
    'inception-backdrop.jpg': 'w1280/gqby0RhyehP3uRrzmdyUZ0CgPPe.jpg',
    'stranger-things-backdrop.jpg': 'w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    'grand-budapest-backdrop.jpg': 'w1280/xHDynIimfsgj0ZOs0j5ma8v1vmM.jpg',
    'interstellar-backdrop.jpg': 'w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
}
root = Path(__file__).resolve().parents[1] / 'public' / 'posters'
root.mkdir(exist_ok=True)
def download(item):
    name, path = item
    target = root / name
    subprocess.run(['curl', '-fsSL', '--max-time', '25', f'https://image.tmdb.org/t/p/{path}', '-o', str(target)], check=True)
    if not target.read_bytes().startswith(b'\xff\xd8'):
        raise ValueError(f'Not a JPEG: {name}')
    return f'{name}: {target.stat().st_size:,} bytes'
with ThreadPoolExecutor(max_workers=5) as pool:
    for result in pool.map(download, assets.items()):
        print(result)
