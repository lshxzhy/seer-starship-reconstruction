"""Assemble the same scene as an embeddable fragment and a portable offline viewer."""
from html import escape
from pathlib import Path

root = Path(__file__).resolve().parent.parent
work = root / 'work'
output = root / 'outputs'
viz = work / 'seer-fragment.html'
output.mkdir(exist_ok=True)
viewer = root / 'src' / 'viewer'
habitat = root / 'src' / 'habitat'
population = root / 'src' / 'population'
scripts = [viewer/'start.js', viewer/'orbit-sky.js', viewer/'lighting.js', work/'livery.js', viewer/'primitives.js']
scripts.extend(work/name for name in ('hull-next.js','bridge-and-pod.js','machinery.js','scene-finish.js'))
scripts.extend([habitat/'exterior-scale.js', work/'interior.js', habitat/'registry.js', habitat/'kit.js'])
scripts.extend(habitat/name for name in ('engineering.js','science.js','civic.js','crew.js'))
scripts.extend([population/'berths.js',habitat/'installation.js',habitat/'layout-record.js',
                population/'robot.js',population/'population.js',population/'player.js'])
scripts.extend([viewer/'finish.js',viewer/'boarding.js',viewer/'explore.js'])
source = '\n'.join(path.read_text('utf-8') for path in scripts)
(output/'seer-model.js').write_text(source,'utf-8')
layout = (work/'seer-layout.html').read_text('utf-8')
library = (work/'three-r128.min.js').read_text('utf-8').replace('</script','<\\/script')
fragment = layout + '\n<script>\n' + library + '\n</script>\n<script>\n' + source + '\n</script>\n'
viz.write_text(fragment, encoding='utf-8')

head = ('<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">')
style = (work / 'standalone.css').read_text(encoding='utf-8')
title = '<title>赛尔号 · SE–A015 舰内漫游</title>'
notices = '\n\n'.join(path.read_text(encoding='utf-8') for path in
                     [root / 'LICENSE', root / 'licenses' / 'three-r128.txt'])
inner = f'{head}{title}<style>{style}</style><body>{fragment}</body></html>'
document = (f'{head}{title}<style>html,body,iframe{{margin:0;border:0;width:100%;height:100%;'
            'display:block;background:#101723}}</style><body>'
            f'<iframe title="赛尔号三维漫游" allowfullscreen sandbox="allow-scripts" srcdoc="{escape(inner, quote=True)}">'
            '</iframe><template id="licenses">' + escape(notices) + '</template></body></html>')
(output / 'seer-starship.html').write_text(document, encoding='utf-8')
