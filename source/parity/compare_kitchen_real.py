#!/usr/bin/env python3
"""Compare two kitchen recorder outputs (fake vs real SketchUp). usage: a.json b.json [-v N]"""
import json, sys, collections
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
verbose = int(sys.argv[sys.argv.index('-v') + 1]) if '-v' in sys.argv else 5
bi = {c['name']: c for c in b['cases']}
TOL = 2e-6

def diff(x, y, path):
    if isinstance(x, float) or isinstance(y, float):
        if isinstance(x, (int, float)) and isinstance(y, (int, float)) and abs(x - y) <= TOL * max(1, abs(x), abs(y)):
            return None
        return (path, x, y)
    if type(x) != type(y): return (path, x, y)
    if isinstance(x, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y: return (path + [k], x.get(k, '<missing>'), y.get(k, '<missing>'))
            d = diff(x[k], y[k], path + [k])
            if d: return d
        return None
    if isinstance(x, list):
        n = min(len(x), len(y))
        for i in range(n):
            d = diff(x[i], y[i], path + [i])
            if d: return d
        if len(x) != len(y): return (path + ['len'], len(x), len(y))
        return None
    return None if x == y else (path, x, y)

match = 0; bad = []; cat = collections.Counter()
for c in a['cases']:
    o = bi.get(c['name'])
    if o is None: bad.append((c['name'], 'missing in b', '', '')); continue
    d = None
    for k in ['ok', 'error', 'unit', 'joint_sets', 'hardware', 'labels', 'assembly_marks', 'divider_marks', 'groups', 'parts', 'log']:
        if k == 'parts' and c.get('parts') is not None and o.get('parts') is not None:
            if len(c['parts']) != len(o['parts']):
                d = (['parts', 'len'], len(c['parts']), len(o['parts']), [p['name'] for p in c['parts']], [p['name'] for p in o['parts']]); break
        d = diff(c.get(k), o.get(k), [k])
        if d: break
    if d:
        bad.append((c['name'],) + tuple(d)); cat[(d[0][0], str(d[0][-1]) if d[0][0] != 'parts' else str(d[0][2:]) )] += 1
    else: match += 1
print('match', match, 'mismatch', len(bad))
for k, v in cat.most_common(25): print('  ', v, k)
for x in bad[:verbose]:
    s = json.dumps(x, ensure_ascii=False)
    print(s[:1500])
