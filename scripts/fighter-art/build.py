"""Generates fighter art data for the sandbox fighter (local tool, not shipped).

Heads: tone map of a public-domain reference photo (kept OUTSIDE the repo) is
dithered to the 3 site colors inside a hand-made silhouette, then traits are
drawn on top. Bodies and the stage are drawn in code. Output: TS modules under
src/lib/sandbox/fighter/art/ and a contact sheet PNG for visual review.

Usage: python scripts/fighter-art/build.py <refs_dir> <contact_sheet_png>
Pixel values: 0 transparent, 1 ink, 2 paper, 3 vermilion. Rows are emitted as
strings of '.', 'i', 'p', 'v'.
"""
import os
import random
import sys

from PIL import Image, ImageOps

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'lib', 'sandbox', 'fighter', 'art')
CH = '.ipv'
RGB = {0: (0, 0, 0, 0), 1: (0x1A, 0x1A, 0x1A, 255), 2: (0xEC, 0xE7, 0xDE, 255), 3: (0xE8, 0x4C, 0x28, 255)}

FW, FH = 80, 80  # body frame
CX = 40


class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [[0] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.w and 0 <= y < self.h else 0

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def line(self, p0, p1, t, c):
        (x0, y0), (x1, y1) = p0, p1
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n)
            y = round(y0 + (y1 - y0) * i / n)
            o = t // 2
            self.rect(x - o, y - o, x - o + t - 1, y - o + t - 1, c)

    def blit(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                v = other.g[y][x]
                if v:
                    self.set(ox + x, oy + y, v)

    def outline(self, c):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        if self.get(x + dx, y + dy) == 1:
                            add.append((x, y))
                            break
        for x, y in add:
            self.g[y][x] = c

    def rows(self):
        return [''.join(CH[v] for v in r) for r in self.g]

    def image(self, scale=1):
        im = Image.new('RGBA', (self.w, self.h))
        im.putdata([RGB[v] for r in self.g for v in r])
        return im.resize((self.w * scale, self.h * scale), Image.NEAREST) if scale != 1 else im


# ---------- heads ----------

BAYER = [[0, 2], [3, 1]]


def tone_map(path, box, size, ink_t, paper_t):
    im = Image.open(path).convert('L').crop(box)
    im = ImageOps.autocontrast(im, cutoff=2).resize(size, Image.LANCZOS)
    w, h = size
    out = [[2] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            v = im.getpixel((x, y)) / 255
            if v < ink_t:
                out[y][x] = 1
            elif v > paper_t:
                out[y][x] = 2
            else:
                f = (v - ink_t) / (paper_t - ink_t)
                out[y][x] = 2 if f > (BAYER[y % 2][x % 2] + 0.5) / 4 else 1
    return out


def head_penyadap(refs):
    g = Grid(24, 24)
    # silhouette rows: (x0, x1) inclusive; cap = rows 0..7, face = rows 8..23
    cap = [(7, 16), (5, 18), (3, 20), (2, 21), (2, 21), (1, 22), (1, 22), (1, 22)]
    face = [(3, 20)] * 2 + [(3, 20)] * 6 + [(4, 19)] * 3 + [(5, 18)] * 2 + [(6, 17)] * 2 + [(8, 15)] * 1
    face = [(3, 20), (3, 20), (3, 20), (3, 20), (3, 20), (3, 20), (3, 20), (3, 20), (4, 19), (4, 19), (5, 18), (5, 18), (6, 17), (7, 16), (8, 15), (9, 14)]
    tm = tone_map(os.path.join(refs, 'si-penyadap.jpg'), (150, 133, 290, 228), (20, 16), 0.30, 0.62)
    for i, (x0, x1) in enumerate(face):
        y = 8 + i
        for x in range(x0, x1 + 1):
            g.set(x, y, 2)
    # photo tones in the interior only (keeps a clean face outline)
    for ty in range(16):
        for tx in range(20):
            x, y = 2 + tx, 8 + ty
            if g.get(x, y) == 2 and 7 <= x <= 16:
                if tm[ty][tx] == 1 and 5 <= ty <= 11:
                    g.set(x, y, 1)
    # cap: ink crown, vermilion band, paper braid dither
    for i, (x0, x1) in enumerate(cap):
        for x in range(x0, x1 + 1):
            g.set(x, i, 1)
    for x in range(1, 23):
        g.set(x, 6, 3)
        g.set(x, 7, 3)
    for x in range(2, 22, 2):
        g.set(x, 5, 2)  # braid dither on the peak
    for x in range(10, 14):
        g.set(x, 2, 2)  # badge
    g.set(11, 3, 2)
    g.set(12, 3, 2)
    # traits: slim oval face, high forehead, thin lips, heavy-lidded eyes
    for x in (7, 8, 9):
        g.set(x, 12, 1)
    for x in (14, 15, 16):
        g.set(x, 12, 1)
    g.set(8, 13, 1)
    g.set(15, 13, 1)
    g.set(11, 15, 1)
    g.set(12, 15, 1)
    for x in range(10, 14):
        g.set(x, 19, 1)  # thin lips
    g.set(11, 16, 1)
    g.set(12, 16, 1)
    return g


def head_ajudan(refs):
    g = Grid(24, 24)
    peci = [(5, 18)] * 7
    face = [(3, 20)] * 2 + [(2, 21)] * 2 + [(3, 20)] * 9 + [(4, 19), (5, 18), (6, 17)]
    for i, (x0, x1) in enumerate(face):
        y = 7 + i
        for x in range(x0, x1 + 1):
            g.set(x, y, 2)
    tm = tone_map(os.path.join(refs, 'sang-ajudan.jpg'), (95, 160, 340, 345), (20, 17), 0.30, 0.62)
    for ty in range(17):
        for tx in range(20):
            x, y = 2 + tx, 7 + ty
            if g.get(x, y) == 2 and 7 <= x <= 16:
                if tm[ty][tx] == 1 and 4 <= ty <= 11:
                    g.set(x, y, 1)
    # peci: flat-top ink block
    for y in range(0, 7):
        for x in range(5, 19):
            g.set(x, y, 1)
    # traits: squarish face, thick straight brows, stern mouth, young
    for x in range(5, 11):
        g.set(x, 10, 1)
    for x in range(13, 19):
        g.set(x, 10, 1)
    g.set(7, 12, 1)
    g.set(8, 12, 1)
    g.set(15, 12, 1)
    g.set(16, 12, 1)
    g.set(11, 14, 1)
    g.set(12, 14, 1)
    for x in range(9, 15):
        g.set(x, 19, 1)  # stern mouth
    for x in range(10, 14):
        g.set(x, 20, 1)
    return g


# ---------- bodies ----------

def ik(shoulder, hand, l1, l2, sign):
    sx, sy = shoulder
    hx, hy = hand
    dx, dy = hx - sx, hy - sy
    d = max((dx * dx + dy * dy) ** 0.5, 0.001)
    d = min(d, l1 + l2 - 0.5)
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = max(l1 * l1 - a * a, 0) ** 0.5
    ux, uy = dx / ((dx * dx + dy * dy) ** 0.5 or 1), dy / ((dx * dx + dy * dy) ** 0.5 or 1)
    ex = sx + ux * a - uy * h * sign
    ey = sy + uy * a + ux * h * sign
    return (round(ex), round(ey))


def draw_body(pose, outfit):
    g = Grid(FW, FH)
    lean = pose.get('lean', 0)
    hip = (CX + pose.get('hip', 0), 53)
    sh_c = (CX + lean, 30)
    # back leg, back arm first (behind torso)
    bf, ff = pose['bf'], pose['ff']
    for foot, hx in ((bf, hip[0] - 4), (ff, hip[0] + 4)):
        knee = ik((hx, 53), foot, 14, 14, 1 if foot is ff else -1)
        g.line((hx, 53), knee, 6, 1)
        g.line(knee, foot, 6, 1)
        g.rect(foot[0] - 3, foot[1] - 2, foot[0] + 5, foot[1], 1)  # shoe
    bs = (sh_c[0] - 6, 31)
    bh = pose['bh']
    be = ik(bs, bh, 11, 11, -1)
    g.line(bs, be, 5, 1)
    g.line(be, bh, 5, 1)
    g.rect(bh[0] - 2, bh[1] - 2, bh[0] + 2, bh[1] + 2, 1)
    # torso: trapezoid shoulders -> hips
    for y in range(28, 54):
        t = (y - 28) / 25
        half = round(9 - 2.5 * t)
        cx = round(sh_c[0] + (hip[0] - sh_c[0]) * t)
        g.rect(cx - half, y, cx + half, y, 1)
    outfit(g, sh_c, hip)
    # front arm over torso
    fs = (sh_c[0] + 6, 31)
    fh = pose['fh']
    fe = ik(fs, fh, 11, 11, 1)
    g.line(fs, fe, 5, 1)
    g.line(fe, fh, 5, 1)
    g.rect(fh[0] - 2, fh[1] - 2, fh[0] + 2, fh[1] + 2, 1)
    g.outline(2)
    return g


def outfit_penyadap(g, sh, hip):
    sx = sh[0]
    for k in range(5):  # collar V
        g.set(sx - 2 + k, 28, 2)
    g.set(sx - 1, 29, 2)
    g.set(sx, 29, 2)
    g.set(sx + 1, 29, 2)
    g.set(sx, 30, 2)
    for k in range(18):  # diagonal sash dither
        if k % 2 == 0:
            g.set(sx - 6 + k // 2 + 1, 30 + k, 2)
    for i in range(3):  # medals
        g.set(sx + 3 + i * 2, 36, 2)
        g.set(sx + 3 + i * 2, 38, 3 if i == 1 else 2)
    g.set(sx - 8, 29, 2)  # epaulettes
    g.set(sx - 7, 29, 2)
    g.set(sx + 7, 29, 2)
    g.set(sx + 8, 29, 2)
    for x in range(hip[0] - 7, hip[0] + 8):  # belt
        g.set(x, 51, 2 if x % 2 else 1)


def outfit_ajudan(g, sh, hip):
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    g.set(sx - 1, 29, 2)
    g.set(sx, 29, 2)
    g.set(sx + 1, 29, 2)
    for y in range(29, 44):  # vermilion tie
        g.set(sx, y, 3)
        if 30 <= y <= 40:
            g.set(sx + 1, y, 3)
    for i in range(3):  # brevet dots
        g.set(sx + 4 + i, 35, 2)
    for x in range(hip[0] - 7, hip[0] + 8):
        g.set(x, 51, 2 if x % 3 == 0 else 1)


def draw_ko_flat(outfit):
    g = Grid(FW, FH)
    g.rect(24, 68, 56, 77, 1)  # torso lying
    g.rect(56, 70, 72, 76, 1)  # legs
    g.rect(70, 74, 77, 78, 1)  # shoes
    g.rect(32, 64, 40, 67, 1)  # arm
    g.rect(46, 70, 50, 72, 2)  # dithered collar hint
    g.outline(2)
    return g


def poses():
    I = lambda **k: k
    walk_ff = [(48, 79), (52, 78), (46, 79), (40, 78)]
    walk_bf = [(32, 79), (28, 78), (34, 79), (40, 78)]
    return {
        'idle': [I(fh=(54, 42), bh=(47, 44), ff=(48, 79), bf=(32, 79)),
                 I(fh=(54, 43), bh=(47, 45), ff=(48, 79), bf=(32, 79), dy=1)],
        'walk': [I(fh=(54, 42), bh=(47, 44), ff=walk_ff[i], bf=walk_bf[i], dy=1 if i % 2 else 0) for i in range(4)],
        'punch': [I(fh=(46, 40), bh=(50, 40), ff=(46, 79), bf=(32, 79), lean=-2, dx=-1),
                  I(fh=(74, 36), bh=(48, 42), ff=(50, 79), bf=(30, 79), lean=4, dx=3),
                  I(fh=(56, 40), bh=(48, 42), ff=(48, 79), bf=(32, 79), lean=1)],
        'kick': [I(fh=(52, 38), bh=(46, 40), ff=(48, 62), bf=(30, 79), lean=-3, dx=-2),
                 I(fh=(50, 36), bh=(42, 38), ff=(74, 52), bf=(28, 79), lean=-4, dx=-2),
                 I(fh=(52, 40), bh=(46, 42), ff=(50, 70), bf=(30, 79), lean=-1)],
        'special': [I(fh=(44, 38), bh=(48, 38), ff=(46, 79), bf=(30, 79), lean=-3, dx=-2),
                    I(fh=(74, 34), bh=(70, 38), ff=(52, 79), bf=(28, 79), lean=6, dx=4),
                    I(fh=(60, 40), bh=(54, 42), ff=(48, 79), bf=(32, 79), lean=2)],
        'hit': [I(fh=(38, 46), bh=(34, 44), ff=(44, 79), bf=(26, 79), lean=-5, dx=-4, dy=1),
                I(fh=(36, 48), bh=(32, 46), ff=(42, 79), bf=(24, 79), lean=-6, dx=-5, dy=2)],
        'block': [I(fh=(52, 36), bh=(50, 40), ff=(46, 79), bf=(32, 79), lean=-1, dy=2)],
        'jump': [I(fh=(54, 40), bh=(46, 42), ff=(48, 66), bf=(34, 68), dy=0)],
        'ko': [I(fh=(34, 48), bh=(30, 46), ff=(40, 79), bf=(22, 79), lean=-8, dx=-8, dy=4), None],
    }


def compose(head, pose, outfit, ko_flat=False):
    if pose is None:
        g = draw_ko_flat(outfit)
        g.blit(head, 8, 56)
        return g
    body = draw_body(pose, outfit)
    hx = CX - 12 + pose.get('lean', 0) + pose.get('dx', 0)
    hy = pose.get('dy', 0)
    body.rect(hx + 9, hy + 22, hx + 14, 30, 2)
    body.blit(head, hx, hy)
    return body


def smear():
    g = Grid(FW, FH)
    for i, (x, y) in enumerate([(52, 34), (58, 33), (64, 33), (70, 34)]):
        g.rect(x, y, x + 4, y + 1, 3 if i % 2 else 2)
    for x in range(56, 72, 2):
        g.set(x, 38, 2)
    return g


FIGHTERS = {
    'si-penyadap': (head_penyadap, outfit_penyadap),
    'sang-ajudan': (head_ajudan, outfit_ajudan),
}


SW, SH, FLOOR_Y = 320, 180, 156


def stage_forest():
    """Pale hazy sky, dim vermilion sun, smoke plumes, burnt trunks, fire at the
    bases, ash ground. Dither only, no solid orange sky (that read as hell)."""
    import math
    rnd = random.Random(7)
    g = Grid(SW, SH)
    for y in range(SH):
        for x in range(SW):
            g.set(x, y, 2)
    # haze: ink dither thicker toward the top
    for y in range(0, 110):
        dens = 0.34 * (1 - y / 110)
        for x in range(SW):
            if (x + y) % 2 == 0 and rnd.random() < dens * 1.6:
                g.set(x, y, 1)
    # dim sun with a dithered rim
    sx, sy = 236, 58
    for y in range(sy - 28, sy + 29):
        for x in range(sx - 28, sx + 29):
            d = math.hypot(x - sx, y - sy)
            if d <= 20:
                g.set(x, y, 3)
            elif d <= 26 and (x + y) % 2 == 0:
                g.set(x, y, 3)
    # smoke plumes
    for i, base in enumerate((60, 150, 250)):
        for y in range(134, 8, -1):
            cx = base + math.sin(y * 0.06 + i * 2) * 7
            half = 5 + (134 - y) * 0.13
            for x in range(int(cx - half), int(cx + half) + 1):
                if (x + y) % 2 == 0 and rnd.random() < 0.75:
                    g.set(x, y, 1)
    # far trunks (dithered) and near trunks (solid)
    for x0 in (30, 84, 124, 176, 208, 262, 300):
        w = rnd.choice((5, 6, 7))
        top = rnd.randint(30, 60)
        for y in range(top, FLOOR_Y):
            for x in range(x0, x0 + w):
                if (x + y) % 2 == 0:
                    g.set(x, y, 1)
    for x0, w in ((8, 12), (296, 14)):
        for y in range(10, FLOOR_Y):
            for x in range(x0, x0 + w):
                g.set(x, y, 1)
    # fire at trunk bases
    for bx in (30, 84, 124, 176, 208, 262, 300, 12, 302):
        for k in range(5):
            fx = bx + rnd.randint(-6, 10)
            hgt = rnd.randint(8, 22)
            for yy in range(hgt):
                half = max(0, (hgt - yy) // 4)
                for x in range(fx - half, fx + half + 1):
                    y = FLOOR_Y - 1 - yy
                    g.set(x, y, 3 if (x + yy) % 3 else 2)
    # ash ground
    for y in range(FLOOR_Y, SH):
        for x in range(SW):
            g.set(x, y, 1)
    for _ in range(260):
        g.set(rnd.randint(0, SW - 1), rnd.randint(FLOOR_Y + 2, SH - 1), 2)
    for x in range(0, SW, 2):
        g.set(x, FLOOR_Y, 2)
    return g


def emit_stage():
    g = stage_forest()
    lines = ["import type { Sprite } from './sprite'", '', '// Generated by scripts/fighter-art/build.py. Do not edit by hand.', '', 'export const FLOOR_Y = %d' % FLOOR_Y, '']
    lines.append('export const STAGE_FOREST: Sprite = %s' % ts_sprite(g))
    with open(os.path.join(OUT, 'stage-forest.ts'), 'w', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')
    return g


def ts_sprite(g):
    return '{ w: %d, h: %d, rows: [\n' % (g.w, g.h) + ''.join("    '%s',\n" % r for r in g.rows()) + '  ] }'


def emit_fighter(fid, head, frames_by_anim):
    const = ''.join(p.capitalize() for p in fid.split('-'))
    lines = ["import type { FighterArt } from './sprite'", '', '// Generated by scripts/fighter-art/build.py. Do not edit by hand.', '']
    lines.append('export const ART: FighterArt = {')
    lines.append('  head: %s,' % ts_sprite(head))
    lines.append('  frames: {')
    for anim, frames in frames_by_anim.items():
        lines.append('    %s: [' % anim)
        for f in frames:
            lines.append('      %s,' % ts_sprite(f))
        lines.append('    ],')
    lines.append('  },')
    lines.append('  smear: %s,' % ts_sprite(smear()))
    lines.append('}')
    with open(os.path.join(OUT, fid + '.ts'), 'w', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')


def main():
    refs, sheet_path = sys.argv[1], sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGBA', (1700, 760), (0x70, 0x70, 0x70, 255))
    row = 0
    pick = [('idle', 0), ('walk', 1), ('punch', 0), ('punch', 1), ('kick', 1), ('special', 1), ('hit', 0), ('block', 0), ('jump', 0), ('ko', 0), ('ko', 1)]
    for fid, (hfn, ofn) in FIGHTERS.items():
        head = hfn(refs)
        frames = {anim: [compose(head, p, ofn) for p in plist] for anim, plist in poses().items()}
        for col, (anim, i) in enumerate(pick):
            im = frames[anim][i].image(2)
            sheet.paste(im, (col * 154, row * 380), im)
        hi = head.image(10)
        sheet.paste(hi, (20, row * 380 + 170), hi)
        emit_fighter(fid, head, frames)
        row += 1
    sg = emit_stage()
    sg.image(2).save(sheet_path.replace('.png', '-stage.png'))
    sheet.save(sheet_path)
    print('wrote art + sheet', sheet_path)


if __name__ == '__main__':
    main()
