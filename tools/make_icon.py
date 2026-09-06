"""
Aqua Flow Supplier launcher icon — three water jars on the brand gradient.

Emits everything Android needs from one description of the art:

    drawable/ic_launcher_background.xml   adaptive background (vector gradient)
    mipmap-*/ic_launcher_foreground.png   adaptive foreground (jars, transparent)
    mipmap-*/ic_launcher_monochrome.png   Android 13 themed icon (silhouette)
    mipmap-*/ic_launcher{,_round}.png     legacy tiles for API 24-25
    mipmap-anydpi-v26/ic_launcher*.xml    the adaptive-icon wiring

The art is drawn with signed distance fields and analytic antialiasing — pure
stdlib, so this runs without ImageMagick, librsvg or Pillow.

Set VARIANT below to pick how much detail the mark carries; run:

    python3 tools/make_icon.py
"""

import math
import os
import struct
import zlib

# 'full'    — three filled jars, rippled water, soft ground shadow
# 'flat'    — same, but the water surface is a straight line
# 'oneblue' — outer jars left empty, a single blue inside the middle one
# 'bold'    — 'oneblue', scaled up to fill more of the tile
VARIANT = 'full'

RES = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'android', 'app', 'src', 'main', 'res',
)

CANVAS = 108.0        # Android's icon design grid
CENTRE = CANVAS / 2
ADAPTIVE_SCALE = 72.0 / 108.0   # an adaptive icon only shows its middle 72dp

# --------------------
# Brand palette (src/Constant/Colors.ts)
# --------------------
TEAL = (0x12, 0xB5, 0xCE)      # gradFrom
BLUE = (0x0F, 0x62, 0xB8)      # gradTo
DEEP = (0x08, 0x35, 0x6B)
NAVY = (0x0B, 0x1B, 0x2B)      # text / shadow
WHITE = (0xFF, 0xFF, 0xFF)
PALE = (0xA9, 0xE1, 0xF5)
MIDBLUE = (0x2C, 0x8F, 0xD4)

TRANSPARENT = 'transparent'    # a layer that punches back to the background
WATER = 'water'                # vertical BLUE -> DEEP, so the fill has depth


# --------------------
# Maths
# --------------------

def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else hi if v > hi else v


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def sd_box(px, py, x0, y0, x1, y1, r=0.0):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    qx, qy = abs(px - cx) - hx, abs(py - cy) - hy
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r


def sd_ellipse(px, py, cx, cy, rx, ry):
    dx, dy = (px - cx) / rx, (py - cy) / ry
    return (math.hypot(dx, dy) - 1.0) * min(rx, ry)


def smin(a, b, k):
    """Polynomial smooth union — blends two shapes into one silhouette."""
    h = clamp(0.5 + 0.5 * (b - a) / k)
    return b * (1 - h) + a * h - k * h * (1 - h)


def uni(*d):
    return min(d)


def inter(*d):
    return max(d)


# --------------------
# The jar
# --------------------

def jar(px, py, cx, base, h, w):
    """
    A 19L returnable jar standing on `base`. Width is independent of height:
    three of them side by side only read if each is slimmed, and scaling the
    whole shape down instead would shrink them out of legibility.
    """
    cy = base - h / 2
    sx, sy = w / 78.0, h / 100.0
    X = lambda v: cx + (v - 50) * sx
    Y = lambda v: cy + (v - 50) * sy
    k = min(sx, sy)
    cap = sd_box(px, py, X(35), Y(0), X(65), Y(13), 4 * k)
    neck = sd_box(px, py, X(42), Y(11), X(58), Y(34), 2 * k)
    body = sd_box(px, py, X(11), Y(29), X(89), Y(100), 15 * k)
    return smin(smin(cap, neck, 3 * sy), body, 14 * sy)


def jar_inside(px, py, cx, base, h, w, inset=7.0):
    cy = base - h / 2
    sx, sy = w / 78.0, h / 100.0
    X = lambda v: cx + (v - 50) * sx
    Y = lambda v: cy + (v - 50) * sy
    return sd_box(px, py, X(11) + inset * sx, Y(29) + inset * sy,
                  X(89) - inset * sx, Y(100) - inset * sy, 10 * min(sx, sy))


def water(px, py, spec, level, ripple):
    """Everything under the surface line inside one jar."""
    surface = level + (math.sin((px - spec['cx']) / 6.0) * 2.2 if ripple else 0.0)
    return inter(jar_inside(px, py, **spec), surface - py)


# --------------------
# Layout — nothing leaves x/y 15..93, so a circular mask can't clip it
# --------------------

FRONT = dict(cx=54, base=88, h=64, w=34)
LEFT = dict(cx=28, base=85, h=50, w=25)
RIGHT = dict(cx=80, base=85, h=50, w=25)

BIG_FRONT = dict(cx=54, base=91, h=72, w=38)
BIG_LEFT = dict(cx=26, base=88, h=56, w=28)
BIG_RIGHT = dict(cx=82, base=88, h=56, w=28)


def art(px, py):
    """
    The mark, as (sdf, colour, alpha, blur) layers painted back to front.
    A blur > 0 softens the edge — that is how the ground shadow is made.
    """
    ripple = VARIANT == 'full'

    if VARIANT == 'bold':
        front, left, right = BIG_FRONT, BIG_LEFT, BIG_RIGHT
    else:
        front, left, right = FRONT, LEFT, RIGHT

    sides = uni(jar(px, py, **left), jar(px, py, **right))
    body = jar(px, py, **front)
    layers = []

    if VARIANT in ('full', 'flat'):
        layers.append((sd_ellipse(px, py, 54, 91, 33, 5), NAVY, 0.20, 10))

    layers.append((sides, PALE, 1.0, 0))

    if VARIANT in ('full', 'flat'):
        layers.append((uni(water(px, py, left, 68, ripple),
                           water(px, py, right, 68, ripple)), MIDBLUE, 1.0, 0))

    # A hairline of background around the front jar separates it from the pair
    # behind without needing an outline.
    if VARIANT != 'bold':
        layers.append((body + 3.0, TRANSPARENT, 1.0, 0))

    layers.append((body, WHITE, 1.0, 0))
    layers.append((water(px, py, front, 66 if VARIANT != 'bold' else 68, ripple),
                   WATER if VARIANT in ('full', 'flat') else BLUE, 1.0, 0))
    return layers


def silhouette(px, py):
    """Themed-icon layer: the same group as one flat shape, no fill detail."""
    if VARIANT == 'bold':
        front, left, right = BIG_FRONT, BIG_LEFT, BIG_RIGHT
    else:
        front, left, right = FRONT, LEFT, RIGHT
    body = jar(px, py, **front)
    return [
        (uni(jar(px, py, **left), jar(px, py, **right)), WHITE, 1.0, 0),
        (body + 3.0, TRANSPARENT, 1.0, 0),
        (body, WHITE, 1.0, 0),
    ]


def background(px, py):
    """The brand ramp, corner to corner."""
    return mix(TEAL, BLUE, clamp((px + py) / (2 * CANVAS)))


# --------------------
# Rasteriser
# --------------------

def render(size, layers_fn, mask=None, scale=1.0, bg_fn=None):
    """
    `mask` clips to the legacy tile shape ('squircle'/'circle'); None leaves the
    canvas transparent, which is what an adaptive foreground wants.
    `scale` shrinks the art about the centre — the adaptive layers use 72/108 so
    the mark lands inside the part of the canvas launchers actually show.
    """
    unit = CANVAS / size
    rows = []
    for y in range(size):
        py = (y + 0.5) * unit
        row = []
        for x in range(size):
            px = (x + 0.5) * unit

            if mask == 'circle':
                tile = math.hypot(px - CENTRE, py - CENTRE) - CENTRE
            elif mask == 'squircle':
                tile = sd_box(px, py, 0, 0, CANVAS, CANVAS, 24)
            else:
                tile = -1.0
            tile_a = clamp(0.5 - tile / unit)
            if tile_a <= 0:
                row.append((0, 0, 0, 0))
                continue

            ax = (px - CENTRE) / scale + CENTRE
            ay = (py - CENTRE) / scale + CENTRE

            if bg_fn:
                col, alpha = bg_fn(px, py), 1.0
            else:
                col, alpha = (0.0, 0.0, 0.0), 0.0

            for sd, colour, a, blur in layers_fn(ax, ay):
                cov = clamp(0.5 - sd / max(unit / scale, blur)) * a
                if cov <= 0:
                    continue
                if colour is TRANSPARENT:
                    alpha *= 1 - cov
                    continue
                if colour is WATER:
                    src = mix(BLUE, DEEP, clamp((ay - 55) / 40))
                else:
                    src = colour
                # Source-over on straight (non-premultiplied) colour. Weighting
                # by alpha matters on the transparent foreground layer: without
                # it the edges blend toward the empty pixel's black.
                out_a = cov + alpha * (1 - cov)
                if out_a > 0:
                    col = tuple(
                        (s * cov + c * alpha * (1 - cov)) / out_a
                        for c, s in zip(col, src)
                    )
                alpha = out_a

            out = int(round(clamp(alpha, 0, 1) * tile_a * 255))
            row.append(tuple(int(round(clamp(c, 0, 255))) for c in col) + (out,))
        rows.append(row)
    return rows


def write_png(path, size, rows):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for r, g, b, a in rows[y]:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack(
            '>I', zlib.crc32(payload) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(png)


# --------------------
# XML
# --------------------

def hexc(rgb):
    return '#%02X%02X%02X' % rgb


BACKGROUND_XML = '''<?xml version="1.0" encoding="utf-8"?>
<!-- Adaptive-icon background: the brand ramp (Colors.gradFrom -> gradTo).
     Full bleed — the launcher applies its own mask.
     Generated by tools/make_icon.py; edit that, not this. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">

    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:type="linear"
                android:startX="0"
                android:startY="0"
                android:endX="108"
                android:endY="108">
                <item android:offset="0" android:color="%s" />
                <item android:offset="1" android:color="%s" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
''' % (hexc(TEAL), hexc(BLUE))

ADAPTIVE_XML = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <!-- Android 13+ themed icons: the launcher tints this silhouette itself. -->
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
'''

# Legacy mipmaps are sized in dp*density; the adaptive layers are 108dp.
DENSITIES = [('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3),
             ('xxxhdpi', 4)]


def main():
    written = []

    def put_text(rel, text):
        path = os.path.join(RES, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as fh:
            fh.write(text)
        written.append(rel)

    def put_png(rel, size, rows):
        write_png(os.path.join(RES, rel), size, rows)
        written.append('%s  (%dpx)' % (rel, size))

    put_text('drawable/ic_launcher_background.xml', BACKGROUND_XML)
    put_text('mipmap-anydpi-v26/ic_launcher.xml', ADAPTIVE_XML)
    put_text('mipmap-anydpi-v26/ic_launcher_round.xml', ADAPTIVE_XML)

    for bucket, factor in DENSITIES:
        legacy = int(48 * factor)
        layer = int(108 * factor)

        put_png('mipmap-%s/ic_launcher.png' % bucket, legacy,
                render(legacy, art, mask='squircle', bg_fn=background))
        put_png('mipmap-%s/ic_launcher_round.png' % bucket, legacy,
                render(legacy, art, mask='circle', bg_fn=background))
        put_png('mipmap-%s/ic_launcher_foreground.png' % bucket, layer,
                render(layer, art, scale=ADAPTIVE_SCALE))
        put_png('mipmap-%s/ic_launcher_monochrome.png' % bucket, layer,
                render(layer, silhouette, scale=ADAPTIVE_SCALE))

    # Stale from the previous mark — an unused drawable would still compile,
    # but it would shadow the mipmap the adaptive icon now points at.
    for stale in ('drawable/ic_launcher_foreground.xml',
                  'drawable/ic_launcher_monochrome.xml'):
        path = os.path.join(RES, stale)
        if os.path.exists(path):
            os.remove(path)
            print('   removed', stale)

    print('variant:', VARIANT)
    for rel in written:
        print('  ', rel)


if __name__ == '__main__':
    main()
