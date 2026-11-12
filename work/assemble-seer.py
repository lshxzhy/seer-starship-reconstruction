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
ship = root / 'src' / 'ship'
habitat = root / 'src' / 'habitat'
population = root / 'src' / 'population'
spirits = root / 'src' / 'spirits'
scripts = [viewer/'start.js', spirits/'challenges.js', viewer/'orbit-sky.js', viewer/'lighting.js', ship/'livery.js', viewer/'primitives.js']
scripts.extend(ship/name for name in ('hull-next.js','bridge-and-pod.js','machinery.js','scene-finish.js'))
scripts.extend([habitat/'exterior-scale.js', ship/'interior.js', habitat/'registry.js', habitat/'kit.js'])
scripts.extend(habitat/name for name in ('engineering.js','science.js','transporter.js','civic.js','crew.js'))
scripts.extend([population/'berths.js',habitat/'lift-plant.js',habitat/'installation.js',habitat/'layout-record.js',
                population/'robot.js',population/'population.js',population/'mining-drill.js',population/'player.js',
                population/'super-nono.js',population/'personal-flyer.js'])
scripts.extend([viewer/'finish.js',root/'src'/'ai'/'dialogue.js',viewer/'personal-flight.js',
                viewer/'locker-record.js',viewer/'pilot-locker.js',viewer/'wayfinding.js',viewer/'ship-map.js',
                viewer/'inventory.js',viewer/'exchange.js',viewer/'flight-deck.js',viewer/'lift-ride.js',
                viewer/'boarding.js',root/'src'/'galaxy'/'klose-safari.js',root/'src'/'galaxy'/'klose-creatures.js',root/'src'/'galaxy'/'klose-scenery.js',root/'src'/'galaxy'/'klose-surface.js',
                root/'src'/'galaxy'/'klose-map.js',root/'src'/'galaxy'/'landing-shuttle.js',root/'src'/'galaxy'/'shuttle-flight.js',
                root/'src'/'galaxy'/'ocean-ecology.js',root/'src'/'galaxy'/'ocean-surface.js',root/'src'/'galaxy'/'pano-system.js',
                root/'src'/'galaxy'/'voyage-scale.js',root/'src'/'galaxy'/'pano-transfer.js',root/'src'/'galaxy'/'carrier-dock.js',root/'src'/'galaxy'/'expedition.js'])
scripts.extend(spirits/name for name in ('catalog.json','safari-rules.js','system.js','safari-figures.js','wetland-evolutions.js','partner-figures.js','escort.js','field-tool.js','portrait-stage.js','storage.js','widget-records.js','save-transfer.js','safari-terminal.js','terminal.js'))
scripts.append(viewer/'explore.js')
def script_source(path):
    raw = path.read_text('utf-8')
    if path == spirits/'catalog.json':
        return '/* spirit-catalog:start */\nconst SEER_SPIRIT_DATA = '+raw.strip().replace('<',r'\u003c')+';\n/* spirit-catalog:end */'
    return raw
source = '\n'.join(script_source(path) for path in scripts)
layout = (work/'seer-layout.html').read_text('utf-8') + '<style>' + (viewer/'flight-deck.css').read_text('utf-8') + (spirits/'terminal.css').read_text('utf-8') + '</style>'
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
            '<iframe name="seer-portable" title="SEER 三维漫游" allowfullscreen '
            f'sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" srcdoc="{escape(inner, quote=True)}">'
            '</iframe><script>' + (spirits/'storage.js').read_text('utf-8') + '\n' + '\n'.join((viewer/name).read_text('utf-8') for name in
                                           ('locker-record.js','pilot-locker.js','offline-locker-host.js')) +
            '</script><template id="licenses">' + escape(notices) + '</template></body></html>')
publish_text(output/'seer-starship.html',document)
