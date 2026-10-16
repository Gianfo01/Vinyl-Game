import re,sys
out=sys.argv[1]; d=sys.argv[2] if len(sys.argv)>2 else 'dist-single'
html=open(d+'/index.html').read()
def js(m):
    src=re.search(r'src="([^"]+)"',m.group(0)).group(1)
    code=open(d+'/'+src.lstrip('./')).read().replace('</script','<\\/script')
    return '<script type="module">'+code+'</script>'
def css(m):
    href=re.search(r'href="([^"]+)"',m.group(0)).group(1)
    return '<style>'+open(d+'/'+href.lstrip('./')).read()+'</style>'
html=re.sub(r'<script[^>]*type="module"[^>]*src="[^"]+"[^>]*></script>',js,html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="[^"]+"[^>]*>',css,html)
html=re.sub(r'<link[^>]*rel="modulepreload"[^>]*>','',html)
open(out,'w').write(html)
print(len(html), 'src=' in html and re.findall(r'(?:src|href)="\./assets[^"]*"',html)[:5])
