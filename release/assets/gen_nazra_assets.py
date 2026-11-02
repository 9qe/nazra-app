# -*- coding: utf-8 -*-
"""
Nazra asset generator — release/store/screenshots/*.png + release/assets/*
PIL-only, offline. Arabic strings are shaped with arabic_reshaper + python-bidi
(both installed via pip this session). Fonts: Arial (Arabic-capable) on Windows.
Every number/label mirrors the real product data (preview/data/radars.json):
9 corridors, 177 cameras (101 fixed / 66 traffic-light / 6 checkpoints / 4 bumps),
2 verified camera entries. No invented stats.
"""
import os, shutil, sys, io
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"C:\Users\pc\Downloads\radarbot-clone"
SHOT_DIR = os.path.join(ROOT, "release", "store", "screenshots")
ASSET_DIR = os.path.join(ROOT, "release", "assets")
os.makedirs(SHOT_DIR, exist_ok=True)
os.makedirs(ASSET_DIR, exist_ok=True)

# ---- brand palette (app/src/theme/tokens.ts) ----
NIGHT    = (20, 19, 26)      # 14131A Wadi Rum Night
STONE    = (33, 29, 41)      # 211D29 Gerasa Stone
RAISED   = (42, 36, 56)      # 2A2438
BORDER   = (51, 43, 69)      # 332B45
ROSE     = (240, 83, 126)    # F0537E Petra Rose
BLUE     = (61, 90, 241)     # 3D5AF1 Nazar Blue
AMBER    = (245, 166, 35)    # F5A623 Dana Amber
PINE     = (47, 191, 113)    # 2FBF71 Ajloun Pine
TXT      = (237, 239, 246)   # EDEFF6
TXT2     = (154, 163, 184)   # 9AA3B8
ROAD1    = (28, 25, 36)      # faint road
ROAD2    = (38, 33, 50)      # main road

W, H = 1179, 2556
M = 60  # margin

# ---- fonts ----
FDIR = r"C:\Windows\Fonts"
def _load(name_candidates, size):
    for n in name_candidates:
        p = os.path.join(FDIR, n)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    raise RuntimeError("no font found for " + repr(name_candidates))
F_H1   = _load(["arialbd.ttf", "segoeuib.ttf", "tahomabd.ttf"], 92)
F_H2   = _load(["arialbd.ttf", "segoeuib.ttf", "tahomabd.ttf"], 66)
F_BODY = _load(["arial.ttf", "segoeui.ttf", "tahoma.ttf"], 46)
F_MED  = _load(["arial.ttf", "segoeui.ttf", "tahoma.ttf"], 40)
F_SMALL= _load(["arial.ttf", "segoeui.ttf", "tahoma.ttf"], 34)
F_TINY = _load(["arial.ttf", "segoeui.ttf", "tahoma.ttf"], 28)
F_NUM  = _load(["arialbd.ttf", "segoeuib.ttf", "tahomabd.ttf"], 150)

# ---- arabic shaping ----
import arabic_reshaper
from bidi.algorithm import get_display
_reshaper = arabic_reshaper.ArabicReshaper()
def ar(s):
    """shape + reorder an Arabic (or mixed) string for PIL rendering"""
    return get_display(_reshaper.reshape(s))

def T(d, xy, s, font, fill=TXT, anchor="ra"):
    d.text(xy, ar(s) if any("\u0600" <= c <= "\u06FF" for c in s) else s,
           font=font, fill=fill, anchor=anchor)

def rrect(d, box, rad, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=rad, fill=fill, outline=outline, width=width)

def pill(d, box, text, fill, fg, font):
    rrect(d, box, box[3]-box[1]-1 if box[3]-box[1]<90 else 45, fill=fill)
    cx, cy = (box[0]+box[2])//2, (box[1]+box[3])//2
    T(d, (cx, cy), text, font, fg, anchor="mm")

def nazar(d, cx, cy, r):
    """nazar-blue 'eye' bead motif"""
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(238, 236, 244))
    r2 = int(r*0.72); d.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], fill=BLUE)
    r3 = int(r*0.40); d.ellipse([cx-r3, cy-r3, cx+r3, cy+r3], fill=ROSE)
    r4 = int(r*0.15); d.ellipse([cx-r4, cy-r4, cx+r4, cy+r4], fill=NIGHT)

def status_bar(d):
    T(d, (M, 46), "9:41", F_MED, TXT, anchor="lm")
    # battery (right side)
    d.rounded_rectangle([W-M-84, 52, W-M-46, 84], radius=10, outline=TXT2, width=3)
    d.rounded_rectangle([W-M-80, 57, W-M-53, 79], radius=5, fill=PINE)
    d.rounded_rectangle([W-M-42, 60, W-M-36, 76], radius=3, outline=TXT2, width=2)

def home_indicator(d):
    d.rounded_rectangle([W//2-160, H-46, W//2+160, H-32], radius=7, fill=TXT)

def new_canvas():
    img = Image.new("RGB", (W, H), NIGHT)
    return img, ImageDraw.Draw(img)

def dot(d, x, y, r, fill, ring=None):
    d.ellipse([x-r, y-r, x+r, y+r], fill=fill, outline=ring, width=6 if ring else 0)

def cam_glyph(d, x, y, col):
    """tiny camera glyph 46px"""
    d.rounded_rectangle([x-26, y-18, x+26, y+18], radius=10, fill=col)
    d.ellipse([x-10, y-9, x+10, y+9], fill=(238, 236, 244))
    d.rounded_rectangle([x-18, y-24, x-2, y-16], radius=4, fill=col)

# =============================
# SHOT 1 — map home
# =============================
def shot1():
    img, d = new_canvas()
    # stylized roads
    for a, b in ((0, 700), (860, 1500), (1650, 2350)):
        d.line([(0, a), (W, a)], fill=ROAD1, width=26)
    for a in (120, 420, 760, 1060):
        d.line([(a, 0), (a-260, H)], fill=ROAD1, width=18)
    d.line([(0, 1980), (W, 1560)], fill=ROAD2, width=64)   # main highway
    d.line([(300, H), (560, 640)], fill=ROAD2, width=52)   # jordan st
    # corridor band along airport rd (dark->light along travel dir)
    corridor = [(40, 1900), (330, 1815), (640, 1730), (940, 1645), (1140, 1593)]
    d.line(corridor, fill=BLUE, width=34, joint="curve")
    d.ellipse([40-24, 1900-24, 40+24, 1900+24], fill=BLUE)
    d.ellipse([1140-24, 1593-24, 1140+24, 1593+24], fill=PINE)
    # cameras along corridor
    pts = [(330, 1815), (640, 1730), (940, 1645)]
    for i, (x, y) in enumerate(pts):
        cam_glyph(d, x, y, AMBER if i != 2 else AMBER)
        if i == 2:
            d.ellipse([x-38, y-38, x+38, y+38], outline=PINE, width=5)
    # traffic-light cam on jordan st + checkpoint marker off-road
    cam_glyph(d, 470, 1200, ROSE)
    dot(d, 760, 980, 30, STONE, ring=TXT2)
    T(d, (760, 980), "6", F_SMALL, TXT, anchor="mm")
    # legend chips (right-aligned row)
    ys = 220
    x = W - M
    for label, col in (("ثابتة ١٠١", AMBER), ("إشارة ٦٦", ROSE),
                       ("حواجز ٦", STONE), ("مطبات ٤", PINE)):
        wch = 340
        pill(d, [x-wch, ys, x, ys+72], label, STONE, TXT, F_SMALL)
        x -= wch + 24
    # brand chip top-left
    nazar(d, M+36, 258, 34)
    T(d, (M+92, 258), "نظرة", F_H2, TXT, anchor="lm")
    T(d, (W-M, 335), "بيانات OpenStreetMap + بلدية عمّان", F_SMALL, TXT2, anchor="ra")
    # corridor bottom card
    top = H - 500
    rrect(d, [M, top, W-M, H-120], 44, fill=STONE, outline=BORDER, width=3)
    T(d, (W-M-36, top+52), "امتداد شارع المطار", F_H2, TXT, anchor="ra")
    T(d, (W-M-36, top+150), "ممر سرعة متوسطة · حسب بلدية عمّان", F_SMALL, TXT2, anchor="ra")
    pill(d, [M+36, top+40, M+36+300, top+112], "٦ كاميرات", AMBER, NIGHT, F_SMALL)
    # progress
    px1, px2 = M+36, W-M-36
    py = top+210
    rrect(d, [px1, py, px2, py+22], 11, fill=RAISED)
    rrect(d, [px2-620, py, px2, py+22], 11, fill=BLUE)
    T(d, (px1, py+50), "مقطع ٢ · ٥٠٠ م قبلك", F_SMALL, TXT2, anchor="la")
    status_bar(d); home_indicator(d)
    img.save(os.path.join(SHOT_DIR, "01-map-corridors.png"))

# =============================
# SHOT 2 — live alert card
# =============================
def shot2():
    img, d = new_canvas()
    # faint map behind
    d.line([(0, 1980), (W, 1560)], fill=ROAD1, width=64)
    d.line([(300, H), (560, 640)], fill=ROAD1, width=52)
    d.rectangle([0, 0, W, H], fill=(0, 0, 0))
    img2 = Image.new("RGB", (W, H), NIGHT)
    d2 = ImageDraw.Draw(img2)
    d2.alpha = None
    # simpler: dark base + vignette panels
    d.rectangle([0, 0, W, H], fill=NIGHT)
    d.line([(0, 1980), (W, 1560)], fill=(25, 22, 33), width=64)
    d.line([(300, H), (560, 640)], fill=(25, 22, 33), width=52)
    rrect(d, [M, 190, W-M, 2360], 60, fill=STONE, outline=ROSE, width=6)
    # header
    nazar(d, M+70, 320, 44)
    T(d, (W-M-70, 320), "تنبيه زيزو", F_H2, ROSE, anchor="ra")
    T(d, (M+140, 320), "ممر سرعة متوسطة", F_SMALL, TXT2, anchor="lm")
    d.line([M+48, 420, W-M-48, 420], fill=BORDER, width=3)
    # headline
    T(d, (W-M-70, 560), "كاميرا بعد ٥٠٠ م", F_NUM, TXT, anchor="rm")
    T(d, (W-M-70, 760), "ممر متوسط السرعة — شارع المطار · حد ٦٠", F_MED, TXT2, anchor="ra")    # distance bar 500 -> 150
    bx1, bx2, by = M+70, W-M-70, 900
    rrect(d, [bx1, by, bx2, by+30], 15, fill=RAISED)
    seg = (bx2-bx1)
    pos = int(bx2 - seg*0.72)  # 72% travelled
    rrect(d, [pos, by, bx2, by+30], 15, fill=ROSE)
    for frac, lbl in ((0.0, "٥٠٠"), (0.72, "الآن"), (1.0, "١٥٠")):
        x = int(bx2 - seg*frac)
        dot(d, x, by+15, 13, TXT if frac != 0.72 else ROSE)
        T(d, (x, by+70), lbl, F_SMALL, TXT2, anchor="mm")
    # speed limit block
    T(d, (W-M-70, 1090), "حد السرعة", F_SMALL, TXT2, anchor="ra")
    rrect(d, [W-M-330, 1130, W-M-70, 1320], 36, outline=AMBER, width=5, fill=RAISED)
    T(d, (W-M-200, 1225), "٦٠", F_NUM, AMBER, anchor="mm")
    T(d, (W-M-390, 1225), "كم/س", F_MED, TXT2, anchor="rm")
    # voice bubble
    byy = 1480
    rrect(d, [M+70, byy, W-M-70, byy+330], 40, fill=RAISED, outline=BORDER, width=3)
    # waveform (left side) + quote (right side)
    import random
    random.seed(7)
    wx = M+220
    for i in range(18):
        hh = 16 + (i*13 + 37) % 76
        d.line([(wx+i*26, byy+195-hh//2), (wx+i*26, byy+195+hh//2)], fill=ROSE, width=8)
    T(d, (M+180, byy+250), "زيزو — الزرقاء", F_SMALL, TXT2, anchor="lm")
    T(d, (W-M-140, byy+60), "بالك كاميرا بعد ٥٠٠ —", F_MED, TXT, anchor="ra")
    T(d, (W-M-140, byy+130), "خفّف ما تشوف الفلاش", F_MED, TXT, anchor="ra")
    # pills
    pill(d, [W-M-70-620, 1960, W-M-70, 2040], "موقع تقريبي — بلاغ بلدية", STONE, TXT, F_SMALL)
    pill(d, [M+70, 1960, M+70+420, 2040], "بلاغاتك على جهازك", PINE, NIGHT, F_SMALL)
    T(d, (W-M-70, 2120), "نظرة بتقولك قبل — مش بدل عينك على الطريق", F_SMALL, TXT2, anchor="ra")
    status_bar(d); home_indicator(d)
    img.save(os.path.join(SHOT_DIR, "02-alert-voice.png"))

# =============================
# SHOT 3 — corridor list (real names from radars.json)
# =============================
SEG = [
    ("شارع المطار — مقطع ١", "١٤٠٠ م", 60),
    ("شارع المطار — مقطع ٢", "٢١٠٠ م", 60),
    ("شارع المطار — مقطع ٣", "٨٠٠ م", 60),
    ("شارع الأردن — مقطع ١", "٨٥٠ م", 60),
    ("شارع الأردن — مقطع ٢", "٦٤٠ م", 60),
]
def shot3():
    img, d = new_canvas()
    T(d, (W-M, 300), "الامتدادات — ٩ ممرات", F_H1, TXT, anchor="ra")
    T(d, (W-M, 420), "١٧٧ كاميرا · ٢ منها محقّقة ميدانياً — الباقي OSM وبلاغات بلدية", F_SMALL, TXT2, anchor="ra")
    rows = [
        (520,  SEG[0], AMBER, "غير محقق"),
        (760,  SEG[1], AMBER, "غير محقق"),
        (1000, SEG[2], AMBER, "غير محقق"),
        (1240, SEG[3], ROSE,  "غير محقق"),
        (1480, SEG[4], ROSE,  "غير محقق"),
    ]
    for y, (name, ln, lim), col, st in rows:
        rrect(d, [M, y, W-M, y+200], 36, fill=STONE, outline=BORDER, width=3)
        T(d, (W-M-40, y+56), name, F_H2, TXT, anchor="ra")
        T(d, (W-M-40, y+140), "طول الممر " + ln + " · الحد " + ("٦٠" if lim == 60 else "٨٠"), F_SMALL, TXT2, anchor="ra")
        pill(d, [M+40, y+120, M+40+280, y+180], st, RAISED, TXT2, F_TINY)
    # summary row
    y = 1720
    rrect(d, [M, y, W-M, y+200], 36, fill=RAISED, outline=BORDER, width=3)
    T(d, (W-M-40, y+56), "٧ امتدادات ثانية", F_H2, TXT, anchor="ra")
    T(d, (W-M-40, y+140), "شارع المطار (٦) وشارع الأردن (٣) — التفاصيل داخل التطبيق", F_SMALL, TXT2, anchor="ra")
    # trust note
    T(d, (W-M, 2260), "للصراحة: أغلب المواقع تقريبية من OSM وبلاغات", F_SMALL, TXT2, anchor="ra")
    T(d, (W-M, 2320), "وعلى ٢ من ١٧٧ كاميرا بس علامة «محقّق» ميدانياً.", F_SMALL, TXT2, anchor="ra")
    status_bar(d); home_indicator(d)
    img.save(os.path.join(SHOT_DIR, "03-corridor-list.png"))

# =============================
# SHOT 4 — report camera
# =============================
def shot4():
    img, d = new_canvas()
    T(d, (W-M, 300), "بلّغ عن كاميرا", F_H1, TXT, anchor="ra")
    T(d, (W-M, 420), "بلاغك بيتخزّن على جهازك — ما في خادم بعد", F_SMALL, TXT2, anchor="ra")
    # type chips
    chips = [("ثابتة", True), ("إشارة", False), ("حواجز", False), ("مطبات", False)]
    x = W - M
    y = 560
    for label, sel in chips:
        wch = 240
        pill(d, [x-wch, y, x, y+96], label, ROSE if sel else STONE,
             TXT if sel else TXT2, F_MED)
        x -= wch + 28
    # fields
    y2 = 740
    for i, ph in enumerate(("الموقع — قرب دوار محلي", "ملاحظة (اختياري)")):
        rrect(d, [M, y2, W-M, y2+140], 32, fill=STONE, outline=BORDER, width=3)
        T(d, (W-M-40, y2+70), ph, F_MED, TXT2 if i else TXT, anchor="ra")
        y2 += 180
    # full-width note
    rrect(d, [M, y2+40, W-M, y2+220], 32, fill=STONE, outline=PINE, width=4)
    nazar(d, M+70, y2+130, 34)
    T(d, (W-M-40, y2+90), "نظرة ما فيها إعلانات — وبلاغك مسجّل على جهازك بس", F_SMALL, TXT, anchor="ra")
    T(d, (W-M-40, y2+160), "لما يتوفّر خادم المجتمع، بنرقي البلاغات وننشرها للكل", F_SMALL, TXT2, anchor="ra")
    # CTA
    cy = 2050
    rrect(d, [M, cy, W-M, cy+150], 75, fill=ROSE)
    T(d, (W//2, cy+75), "بلّغ", F_H2, NIGHT, anchor="mm")
    T(d, (W//2, 2290), "التوقيت والتاريخ من جهازك — بدون حساب، بدون تسجيل", F_SMALL, TXT2, anchor="mm")
    status_bar(d); home_indicator(d)
    img.save(os.path.join(SHOT_DIR, "04-report-camera.png"))

# =============================
# SHOT 5 — voice personality
# =============================
def shot5():
    img, d = new_canvas()
    T(d, (W-M, 300), "صوت التنبيه", F_H1, TXT, anchor="ra")
    T(d, (W-M, 420), "١٢ جملة بلهجة أردنية · ٦ بالفصحى", F_SMALL, TXT2, anchor="ra")
    # Zeizo card
    rrect(d, [M, 560, W-M, 1060], 44, fill=STONE, outline=ROSE, width=5)
    nazar(d, M+150, 810, 110)
    T(d, (W-M-60, 720), "زيزو", F_H1, ROSE, anchor="ra")
    T(d, (W-M-60, 860), "من الزرقاء — صوت الطريق", F_MED, TXT, anchor="ra")
    # waveform (left side only, under the subtitle)
    import random; random.seed(3)
    for i in range(26):
        hh = 16 + (i*17 + 41) % 110
        x = M+560 - i*20
        d.line([(x, 965-hh//2), (x, 965+hh//2)], fill=ROSE, width=9)
    # quote card (real app.js line)
    rrect(d, [M, 1200, W-M, 1420], 36, fill=RAISED, outline=BORDER, width=3)
    T(d, (W-M-40, 1260), "«أهلاً بك في نظرة يا زلمة —", F_MED, TXT, anchor="ra")
    T(d, (W-M-40, 1330), "الكاميرا قبل ما تشوفك»", F_MED, TXT, anchor="ra")
    # MSA toggle row
    rrect(d, [M, 1560, W-M, 1760], 36, fill=STONE, outline=BORDER, width=3)
    T(d, (W-M-40, 1630), "فصحى بدل اللهجة", F_MED, TXT, anchor="ra")
    T(d, (W-M-40, 1700), "٦ جمل رسمية عند اللزوم", F_SMALL, TXT2, anchor="ra")
    rrect(d, [M+60, 1620, M+60+140, 1735], 57, fill=PINE)
    d.ellipse([M+105, 1628, M+195, 1727], fill=TXT)
    # voice list
    rrect(d, [M, 1900, W-M, 2100], 36, fill=STONE, outline=BORDER, width=3)
    dot(d, W-M-124, 2000, 16, ROSE)
    T(d, (W-M-160, 1955), "زيزو", F_MED, TXT, anchor="ra")
    T(d, (W-M-700, 1955), "الافتراضي — لهجة الزرقاء", F_SMALL, TXT2, anchor="ra")
    rrect(d, [M, 2140, W-M, 2340], 36, fill=STONE, outline=BORDER, width=3)
    dot(d, W-M-124, 2240, 16, BLUE)
    T(d, (W-M-160, 2195), "الإذاعي", F_MED, TXT, anchor="ra")
    T(d, (W-M-700, 2195), "صوت فصحى — رسمي وواضح", F_SMALL, TXT2, anchor="ra")
    status_bar(d); home_indicator(d)
    img.save(os.path.join(SHOT_DIR, "05-voice-personality.png"))

# =============================
# BRAND ASSETS
# =============================
def brand():
    src = os.path.join(ROOT, "preview", "icon.png")
    dst = os.path.join(ASSET_DIR, "icon.png")
    shutil.copyfile(src, dst)              # reuse per instructions
    ic = Image.open(dst).convert("RGBA")

    # splash 1179x2556 — real icon + wordmark + tagline
    splash = Image.new("RGB", (W, H), NIGHT)
    sd = ImageDraw.Draw(splash)
    sz = ic.resize((520, 520), Image.LANCZOS)
    splash.paste(sz, (W//2-260, 980), sz)
    fd = _load(["arialbd.ttf"], 110)
    T(sd, (W//2, 1700), "نظرة", fd, TXT, anchor="mm")
    T(sd, (W//2, 1810), "الكاميرا قبل ما تشوفك", F_MED, ROSE, anchor="mm")
    splash.save(os.path.join(ASSET_DIR, "splash.png"))

    # lockup 1536x512
    lk = Image.new("RGB", (1536, 512), NIGHT)
    ld = ImageDraw.Draw(lk)
    nazar(ld, 256, 256, 140)
    fd2 = _load(["arialbd.ttf"], 150)
    T(ld, (470, 190), "نظرة", fd2, TXT, anchor="lm")
    T(ld, (470, 330), "Nazra", _load(["arialbd.ttf"], 84), TXT2, anchor="lm")
    T(ld, (1480, 190), "الكاميرا قبل ما تشوفك", _load(["arialbd.ttf"], 76), ROSE, anchor="rm")
    T(ld, (1480, 330), "كاميرات الرادار — عمّان", F_MED, TXT2, anchor="rm")
    lk.save(os.path.join(ASSET_DIR, "lockup.png"))
    return dst

# =============================
# copy length checks (honesty)
# =============================
def checks():
    name  = "Nazra · نظرة"
    subs  = "الكاميرا قبل ما تشوفك"
    keys  = "رادار,كاميرا,غرامة,مخالفة,سرعة,عمان,امتداد,شارع المطار,radar,jordan,amman,speed,camera"
    promo = "٩ امتدادات رادار و١٧٧ كاميرا بعمّان — تنبيه صوتي قبل الكاميرا، مش بعدها. مجاني، بدون اشتراك، وبدون إعلانات وقت القيادة."
    play_title = "Nazra نظرة — رادار عمّان"
    play_short = "تنبيه لكاميرات الرادار بعمّان قبل ما توصلها — مجاني بدون إعلانات."
    print("iOS name        :", len(name),  "<=30  ", len(name) <= 30)
    print("iOS subtitle    :", len(subs),  "<=30  ", len(subs) <= 30)
    print("iOS keywords    :", len(keys),  "<=100 ", len(keys) <= 100)
    print("iOS promo AR    :", len(promo), "<=170 ", len(promo) <= 170)
    print("Play title      :", len(play_title), "<=30  ", len(play_title) <= 30)
    print("Play short desc :", len(play_short), "<=80  ", len(play_short) <= 80)

if __name__ == "__main__":
    checks()
    shot1(); shot2(); shot3(); shot4(); shot5()
    print("icon ->", brand())
    print("screenshots:", sorted(os.listdir(SHOT_DIR)))
    print("assets:", sorted(os.listdir(ASSET_DIR)))
