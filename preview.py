# Turns public/index.html into a claude.ai artifact preview page: the same page without its document
# wrapper (the artifact host adds its own). Usage: python preview.py <out.html>
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, 'public', 'index.html'), encoding='utf-8').read()
start = s.index('<title>')
head_end = s.index('</head>')
body_start = s.index('<body>') + len('<body>')
body_end = s.rindex('</body>')
page = s[start:head_end] + s[body_start:body_end]
page = page.replace('<meta name="description"', '<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="description"', 1)
open(sys.argv[1], 'w', encoding='utf-8', newline='\n').write(page.strip() + '\n')
print('preview written', len(page))
