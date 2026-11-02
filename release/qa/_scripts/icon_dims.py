#!/usr/bin/env python3
"""Read PNG IHDR dims for preview icons + app assets without external deps."""
import struct, sys

def png_size(p):
    with open(p, 'rb') as f:
        head = f.read(33)
    if head[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    w, h = struct.unpack('>II', head[16:24])
    return w, h

for p in ['preview/icon.png', 'preview/icon-512.png', 'preview/icon.svg-fallback-512.png',
          'app/assets/icon.png', 'app/assets/favicon.png', 'app/assets/splash-icon.png',
          'app/assets/android-icon-foreground.png', 'app/assets/android-icon-background.png']:
    try:
        print(p, '->', png_size(p))
    except FileNotFoundError:
        print(p, '-> MISSING')
