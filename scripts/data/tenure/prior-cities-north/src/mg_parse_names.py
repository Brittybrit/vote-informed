import re
def norm(n):
    n = re.sub(r',?\s*Jr\.?$', '', n.strip()).strip(' ,.:')
    return n.split()[-1].strip(' ,.:') if n.split() else n
