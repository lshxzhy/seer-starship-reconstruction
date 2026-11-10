"""Assemble the same scene as an embeddable fragment and a portable offline viewer."""
from html import escape
from pathlib import Path
from tempfile import NamedTemporaryFile


def publish_text(path, content):
    """Give an open viewer either the complete previous build or the new one."""
    output_file = NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False)
    temporary = Path(output_file.name)
    try:
        with output_file:
            output_file.write(content)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)

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
                population/'robot.js',population/'population.js',population/'player.js',
                population/'super-nono.js',population/'personal-flyer.js'])
scripts.extend([viewer/'finish.js',root/'src'/'ai'/'dialogue.js',viewer/'personal-flight.js',
                viewer/'boarding.js',viewer/'explore.js'])
source = '\n'.join(path.read_text('utf-8') for path in scripts)
publish_text(output/'seer-model.js',source)
layout = (work/'seer-layout.html').read_text('utf-8')
library = (work/'three-r128.min.js').read_text('utf-8').replace('</script','<\\/script')
fragment = layout + '\n<script>\n' + library + '\n</script>\n<script>\n' + source + '\n</script>\n'
publish_text(viz,fragment)

head = ('<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">')
style = (work / 'standalone.css').read_text(encoding='utf-8')
title = '<title>SEER · SE–A015 舰内漫游</title>'
notices = '\n\n'.join(path.read_text(encoding='utf-8') for path in
                     [root / 'LICENSE', root / 'licenses' / 'three-r128.txt'])
inner = f'{head}{title}<style>{style}</style><body>{fragment}</body></html>'
document = (f'{head}{title}<style>html,body,iframe{{margin:0;border:0;width:100%;height:100%;'
            'display:block;background:#101723}}</style><body>'
            '<iframe title="SEER 三维漫游" allowfullscreen '
            f'sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcdoc="{escape(inner, quote=True)}">'
            '</iframe><template id="licenses">' + escape(notices) + '</template></body></html>')
publish_text(output/'seer-starship.html',document)
