#!/usr/bin/env python3
"""Hero wideo do scroll-scrubbingu, złożone z REALNYCH zdjęć warsztatu (bez API).
Zamiennik kroku 2 skilla creating-oneshot-landing-pages, gdy nie ma GEMINI_API_KEY.
Trzy sceny = trzy fazy typografii: wejście -> praca -> powrót.
Uruchom z katalogu shadow-work/:  python3 oneshot/build-hero.py
"""
import subprocess, sys

SCENES = [("bieszczady-niebo.webp", "in"),    # wejście — ciemne niebo
          ("warsztat-3103.webp",    "out"),   # praca — nocna sala procesowa
          ("michniowiec-rytual.webp","in")]   # powrót — świeca, kadzidło
FPS, D, XF, W, H, CRF = 30, 132, 1.2, 1600, 900, 27

args, fc = [], []
for i, (f, dirn) in enumerate(SCENES):
    # POJEDYNCZA klatka na wejściu — zoompan mnoży d przez każdą klatkę źródła
    args += ["-loop", "1", "-framerate", "1", "-t", "1", "-i", "photos/" + f]
    z = "min(zoom+0.0011,1.15)" if dirn == "in" else "if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0011))"
    fc.append(f"[{i}:v]scale={W*2}:-2:flags=lanczos,crop={W*2}:{H*2}:(iw-{W*2})/2:(ih-{H*2})/2,"
              f"zoompan=z='{z}':d={D}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
              f"eq=saturation=0.80:contrast=1.07:brightness=-0.015,vignette=PI/4.4,"
              f"setpts=PTS-STARTPTS,format=yuv420p[s{i}]")
fc.append(f"[s0][s1]xfade=transition=fade:duration={XF}:offset={D/FPS-XF:.3f}[x1]")
fc.append(f"[x1][s2]xfade=transition=fade:duration={XF}:offset={2*(D/FPS)-2*XF:.3f}[out]")

# -g 1 = każda klatka kluczowa; bez tego currentTime skacze i scrub się zacina
r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", ";".join(fc),
                    "-map", "[out]", "-c:v", "libx264", "-crf", str(CRF), "-preset", "slow",
                    "-g", "1", "-keyint_min", "1", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-an", "oneshot/assets/hero.mp4"],
                   capture_output=True, text=True)
print(r.stderr[-500:] or "hero.mp4 OK")
sys.exit(r.returncode)
