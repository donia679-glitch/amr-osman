"""Copy the 3D libraries the app uses into apps/ipad/vendor (only the modules it can reach) and apply
NOVERA's small patch to the path tracer. Both the claude.ai artifact and the installable app load them from there.
Usage: python3 tools/vendor.py"""
import os, re, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "apps/ipad")
SP = os.environ.get("VENDOR", "/tmp/claude-0/-home-claude/64b8a489-bbf5-5031-b6e2-a8f0120b3f86/scratchpad")
V = os.path.join(APP, "vendor")
for d in ["three", "three-mesh-bvh", "three-gpu-pathtracer"]:
    shutil.rmtree(os.path.join(V, d), ignore_errors=True)
os.makedirs(os.path.join(V, "three/build"), exist_ok=True)
shutil.copy(os.path.join(SP, "three/repo/build/three.module.js"), os.path.join(V, "three/build/"))
for d in ["controls", "environments", "geometries", "postprocessing", "shaders", "lights", "math", "utils", "exporters"]:
    shutil.copytree(os.path.join(SP, "three/repo/examples/jsm", d), os.path.join(V, "three/examples/jsm", d))
os.makedirs(os.path.join(V, "three/examples/jsm/libs"), exist_ok=True)
shutil.copy(os.path.join(SP, "three/repo/examples/jsm/libs/fflate.module.js"), os.path.join(V, "three/examples/jsm/libs/"))
shutil.copytree(os.path.join(SP, "bvh078/src"), os.path.join(V, "three-mesh-bvh/src"), ignore=shutil.ignore_patterns("*.d.ts", "*.template.js"))
shutil.copytree(os.path.join(SP, "gpt_v0.0.23/src"), os.path.join(V, "three-gpu-pathtracer/src"), ignore=shutil.ignore_patterns("*.d.ts"))

# NOVERA patch: a "matte" surface is invisible to the camera but still reflects and bounces light —
# the walls cut away in front of the camera keep showing up in mirrors, glossy fronts and the floor.
p = os.path.join(V, "three-gpu-pathtracer/src/materials/pathtracing/PhysicalPathTracingMaterial.js")
s = open(p, encoding="utf-8").read()
old = """						if ( material.matte && state.firstRay ) {

							gl_FragColor = vec4( 0.0 );
							break;

						}"""
new = """						if ( material.matte && state.firstRay ) {

							// NOVERA: pass straight through (cut-away wall) — the camera sees what is behind it
							ray.origin = stepRayOrigin( ray.origin, ray.direction, - surfaceHit.faceNormal, surfaceHit.dist );
							i -= 1;
							continue;

						}"""
assert old in s, "patch target not found"
open(p, "w", encoding="utf-8").write(s.replace(old, new))

MAP = {"three": "vendor/three/build/three.module.js", "three/addons/": "vendor/three/examples/jsm/", "three/examples/jsm/": "vendor/three/examples/jsm/",
       "three-mesh-bvh": "vendor/three-mesh-bvh/src/index.js", "three-gpu-pathtracer": "vendor/three-gpu-pathtracer/src/index.js"}
def resolve(spec, frm):
    if spec.startswith("."): return os.path.normpath(os.path.join(os.path.dirname(frm), spec)).replace(os.sep, "/")
    if spec in MAP: return MAP[spec]
    for k, v in MAP.items():
        if k.endswith("/") and spec.startswith(k): return v + spec[len(k):]
IMP = re.compile(r"""(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)""")
seen, stack = set(), [f for f in os.listdir(APP) if f.endswith(".js")]
while stack:
    f = stack.pop()
    fp = os.path.join(APP, f)
    if f in seen or not os.path.exists(fp): continue
    seen.add(f)
    for m in IMP.finditer(open(fp, encoding="utf-8").read()):
        r = resolve(m.group(1) or m.group(2), f)
        if r: stack.append(r)
n = 0
for dp, _, fs in os.walk(V):
    for f in fs:
        rel = os.path.relpath(os.path.join(dp, f), APP).replace(os.sep, "/")
        if rel.endswith(".js") and rel not in seen and rel != "vendor/qrcode.js": os.remove(os.path.join(dp, f))
        else: n += 1
for dp, _, _ in sorted(os.walk(V), reverse=True):
    if not os.listdir(dp): os.rmdir(dp)
print(n, "vendor files")
