import re
def norm(n):
    if re.search(r'Andr\S{0,2}\s+Williams', n or ''): return 'AWilliams'
    n = re.sub(r',?\s*Jr\.?$', '', n.strip()).strip(' ,.:')
    return n.split()[-1].strip(' ,.:') if n.split() else n
