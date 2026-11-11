"""Generates the arcade opponent art for the sandbox fighter (local tool, not shipped).

Opponents are faceless archetype silhouettes defined by a prop and an outfit, never by a likeness:
no photos, no reference images. Bodies reuse the hero body machinery in build.py. Output:
src/lib/sandbox/fighter/art/opponents.ts plus a contact sheet PNG for visual review.

Usage: python scripts/fighter-art/opponents.py <contact_sheet_png>
Pixel values: 0 transparent, 1 ink, 2 paper, 3 vermilion.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image  # noqa: E402

import build  # noqa: E402
from build import CX, FH, FW, Grid, RGB, draw_body, draw_ko_flat, poses, smear, ts_sprite  # noqa: E402

OUT_FILE = os.path.join(build.OUT, 'opponents.ts')
PORTRAIT = 40


# ---------- heads: blank silhouettes, a hat or a chair back says who ----------

def blank_head(kind):
    g = Grid(24, 24)
    cy = 15 if kind in ('cap', 'beret', 'visor', 'toque') else 13
    for y in range(24):
        for x in range(24):
            dx, dy = (x - 11.5) / 8.0, (y - cy) / 9.5
            if dx * dx + dy * dy <= 1:
                g.set(x, y, 1)
    g.outline(2)
    for y in range(24):  # halftone light from the upper left, no features
        for x in range(24):
            if g.get(x, y) == 1 and x + y < 22 and (x + y) % 2 == 0 and x > 5 and y > 6:
                g.set(x, y, 2)
    if kind == 'cap':  # peaked service cap, vermilion band
        g.rect(4, 3, 19, 7, 1)
        g.rect(3, 7, 22, 8, 1)
        g.rect(4, 5, 19, 5, 3)
        g.rect(8, 4, 15, 4, 2)
    elif kind == 'beret':
        g.rect(3, 4, 20, 8, 1)
        g.rect(5, 3, 17, 3, 1)
        g.set(11, 2, 3)
        g.set(12, 2, 3)
    elif kind == 'visor':  # paper eyeshade with an ink edge
        g.rect(3, 7, 21, 10, 2)
        g.rect(3, 7, 21, 7, 1)
        g.rect(3, 10, 21, 10, 1)
        g.rect(9, 8, 14, 9, 3)
    elif kind == 'toque':  # tall paper hat, ink outlined
        g.rect(6, 0, 17, 8, 2)
        for x in range(6, 18):
            g.set(x, 0, 1)
            g.set(x, 8, 1)
        for y in range(0, 9):
            g.set(6, y, 1)
            g.set(17, y, 1)
        g.rect(7, 7, 16, 7, 3)
    elif kind == 'chair':  # the committee has no head: an empty chair back and a TBD nameplate
        g = Grid(24, 24)
        g.rect(4, 0, 19, 23, 1)
        g.rect(6, 2, 17, 21, 2)
        for x in (9, 12, 15):
            g.rect(x, 2, x, 21, 1)
        g.rect(7, 9, 16, 14, 3)
        for x in range(8, 16):
            if x % 2 == 0:
                g.set(x, 11, 2)
                g.set(x, 12, 2)
        g.outline(2)
    return g


# ---------- outfits ----------

def outfit_juru(g, sh, hip):  # lanyard and badge
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    for k in range(10):
        g.set(sx - 3 + k // 2, 29 + k, 2)
        g.set(sx + 3 - k // 2, 29 + k, 2)
    g.rect(sx - 2, 39, sx + 2, 44, 2)
    g.rect(sx - 1, 40, sx + 1, 40, 3)
    for x in range(hip[0] - 7, hip[0] + 8):
        g.set(x, 51, 2 if x % 2 else 1)


def outfit_pelabel(g, sh, hip):  # sticker vest
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    for y in range(32, 50, 3):
        for x in range(sx - 6, sx + 7, 3):
            g.set(x + (y // 3) % 2, y, 2)
    g.rect(sx - 5, 36, sx - 3, 37, 3)
    g.rect(sx + 3, 42, sx + 5, 43, 3)
    for x in range(hip[0] - 7, hip[0] + 8):
        g.set(x, 51, 2 if x % 3 == 0 else 1)


def outfit_katering(g, sh, hip):  # long apron
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    g.rect(sx - 6, 36, sx + 6, 52, 2)
    for x in range(sx - 6, sx + 7):
        g.set(x, 36, 1)
    for y in range(36, 53):
        g.set(sx - 6, y, 1)
        g.set(sx + 6, y, 1)
    g.rect(sx - 4, 41, sx + 4, 42, 3)
    g.rect(sx - 3, 46, sx + 3, 49, 1)


def outfit_pengganti(g, sh, hip):  # queue number slip pinned on the chest
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    g.rect(sx - 5, 33, sx + 5, 43, 2)
    for x in range(sx - 5, sx + 6):
        g.set(x, 33, 1)
        g.set(x, 43, 1)
    g.rect(sx - 3, 35, sx + 3, 37, 3)
    for x in range(sx - 3, sx + 4, 2):
        g.set(x, 40, 1)
    for x in range(hip[0] - 7, hip[0] + 8):
        g.set(x, 51, 2 if x % 2 else 1)


def outfit_penempatan(g, sh, hip):  # plain uniform, buttons, still marching
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    for y in range(31, 50, 3):
        g.set(sx, y, 2)
        g.set(sx + 1, y, 2)
    for i in range(3):
        g.set(sx - 8 + i, 29, 2)
        g.set(sx + 6 + i, 29, 2)
    g.rect(sx - 7, 30, sx - 5, 31, 3)
    for x in range(hip[0] - 7, hip[0] + 8):
        g.set(x, 51, 2)


def outfit_panitia(g, sh, hip):  # long robe with a paper stripe, like a table runner
    sx = sh[0]
    for k in range(5):
        g.set(sx - 2 + k, 28, 2)
    for y in range(29, 52):
        g.set(sx, y, 2)
        g.set(sx + 1, y, 2)
    for y in range(34, 52, 4):
        for x in range(sx - 7, sx + 8):
            if x % 2 == 0:
                g.set(x, y, 2)
    g.rect(sx - 2, 40, sx + 3, 41, 3)


# ---------- props held in the front hand ----------

def prop_mic(g, h):
    hx, hy = h
    g.line((hx, hy), (hx + 3, hy - 5), 2, 1)
    g.rect(hx + 2, hy - 9, hx + 6, hy - 5, 1)
    g.rect(hx + 3, hy - 8, hx + 5, hy - 6, 2)
    g.set(hx + 4, hy - 7, 3)


def prop_clipboard(g, h):
    hx, hy = h
    g.rect(hx - 1, hy - 10, hx + 7, hy + 1, 1)
    g.rect(hx, hy - 9, hx + 6, hy, 2)
    for y in (hy - 7, hy - 5, hy - 3):
        g.rect(hx + 1, y, hx + 5, y, 1)
    g.rect(hx + 2, hy - 11, hx + 5, hy - 10, 3)


def prop_ladle(g, h):
    hx, hy = h
    g.line((hx, hy + 2), (hx + 7, hy - 8), 2, 1)
    g.rect(hx + 5, hy - 12, hx + 10, hy - 8, 1)
    g.rect(hx + 6, hy - 11, hx + 9, hy - 9, 2)


def prop_stamp(g, h):
    hx, hy = h
    g.rect(hx, hy - 7, hx + 3, hy - 1, 1)
    g.rect(hx - 2, hy - 1, hx + 5, hy + 1, 1)
    g.rect(hx - 1, hy + 2, hx + 4, hy + 2, 3)
    g.set(hx + 1, hy - 5, 2)


def prop_none(g, h):
    pass


def prop_gavel(g, h):
    hx, hy = h
    g.line((hx, hy), (hx + 2, hy - 7), 2, 1)
    g.rect(hx - 1, hy - 11, hx + 6, hy - 7, 1)
    g.rect(hx, hy - 10, hx + 5, hy - 8, 2)
    g.set(hx + 2, hy - 9, 3)


# id -> (head kind, outfit, prop)
OPPONENTS = {
    'sang-juru-bicara': ('beret', outfit_juru, prop_mic),
    'si-pelabel': ('visor', outfit_pelabel, prop_clipboard),
    'sang-katering': ('toque', outfit_katering, prop_ladle),
    'sang-pengganti': ('bare', outfit_pengganti, prop_stamp),
    'sang-penempatan': ('cap', outfit_penempatan, prop_none),
    'panitia-tetap': ('chair', outfit_panitia, prop_gavel),
}


def compose_opp(head, pose, outfit, prop):
    if pose is None:
        g = draw_ko_flat(outfit)
        g.blit(head, 8, 56)
        return g
    body = draw_body(pose, outfit)
    prop(body, pose['fh'])
    hx = CX - 12 + pose.get('lean', 0) + pose.get('dx', 0)
    hy = pose.get('dy', 0)
    body.rect(hx + 9, hy + 22, hx + 14, 30, 2)
    body.blit(head, hx, hy)
    return body


def portrait_of(head):
    g = Grid(PORTRAIT, PORTRAIT)
    g.rect(0, 0, PORTRAIT - 1, PORTRAIT - 1, 2)
    # 20x20 centre of the head at 2x fills the 40x40 plate
    for y in range(PORTRAIT):
        for x in range(PORTRAIT):
            v = head.get(2 + x // 2, 2 + y // 2)
            if v:
                g.set(x, y, v)
    for i in range(PORTRAIT):
        g.set(i, 0, 1)
        g.set(i, PORTRAIT - 1, 1)
        g.set(0, i, 1)
        g.set(PORTRAIT - 1, i, 1)
    return g


def emit(arts, portraits):
    lines = ["import type { FighterArt, Sprite } from './sprite'", '', '// Generated by scripts/fighter-art/opponents.py. Do not edit by hand.', '',
             'export const OPPONENT_ART: Record<string, FighterArt> = {']
    for oid, (head, frames) in arts.items():
        lines.append("  '%s': {" % oid)
        lines.append('    head: %s,' % ts_sprite(head))
        lines.append('    frames: {')
        for anim, fl in frames.items():
            lines.append('      %s: [' % anim)
            for f in fl:
                lines.append('        %s,' % ts_sprite(f))
            lines.append('      ],')
        lines.append('    },')
        lines.append('    smear: %s,' % ts_sprite(smear()))
        lines.append('  },')
    lines.append('}')
    lines.append('')
    lines.append('export const OPPONENT_PORTRAITS: Record<string, Sprite> = {')
    for oid, p in portraits.items():
        lines.append("  '%s': %s," % (oid, ts_sprite(p)))
    lines.append('}')
    with open(OUT_FILE, 'w', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')


def main():
    sheet_path = sys.argv[1]
    arts, portraits = {}, {}
    pick = [('idle', 0), ('punch', 1), ('kick', 1), ('special', 1), ('hit', 0), ('ko', 1)]
    sheet = Image.new('RGBA', (len(pick) * 164 + 120, len(OPPONENTS) * 170), (0x70, 0x70, 0x70, 255))
    for row, (oid, (kind, outfit, prop)) in enumerate(OPPONENTS.items()):
        head = blank_head(kind)
        frames = {anim: [compose_opp(head, p, outfit, prop) for p in plist] for anim, plist in poses().items()}
        arts[oid] = (head, frames)
        portraits[oid] = portrait_of(head)
        pim = portraits[oid].image(3)
        sheet.paste(pim, (4, row * 170 + 20), pim)
        for col, (anim, i) in enumerate(pick):
            im = frames[anim][i].image(2)
            sheet.paste(im, (120 + col * 164, row * 170), im)
    emit(arts, portraits)
    sheet.save(sheet_path)
    print('wrote', OUT_FILE, 'and', sheet_path)


if __name__ == '__main__':
    main()
