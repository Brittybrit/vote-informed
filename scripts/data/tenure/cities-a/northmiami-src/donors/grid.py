import cv2,numpy as np,subprocess,sys,json,os
PSM='7'
HFRAC=0.15
def cells(path):
  im=cv2.imread(path,0); bw=cv2.adaptiveThreshold(255-im,255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY,15,-2)
  h,w=bw.shape
  hor=cv2.morphologyEx(bw,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(w//20,1)))
  ver=cv2.morphologyEx(bw,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(1,h//25)))
  def lines(m,axis,minlen):
    s=(m>0).sum(axis=axis); idx=np.where(s>minlen)[0]; out=[]
    for i in idx:
      if not out or i-out[-1][-1]>4: out.append([i])
      else: out[-1].append(i)
    return [int(np.mean(g)) for g in out]
  ys=lines(hor,1,w*HFRAC); xs=lines(ver,0,h*0.1)
  return im,xs,ys
import os
TMP='/tmp/claude-0/-home-claude/f40c5f76-146a-51f1-882f-463b3b5aaac6/scratchpad/nmw/_c%d.png'%os.getpid()
def ocr(img):
  cv2.imwrite(TMP,img)
  r=subprocess.run(['tesseract',TMP,'-','--psm',PSM],capture_output=True,text=True,errors='ignore').stdout
  return r.strip()
def table(path):
  im,xs,ys=cells(path)
  rows=[]
  for a,b in zip(ys,ys[1:]):
    if b-a<20: continue
    row=[]
    for c,d in zip(xs,xs[1:]):
      if d-c<15: continue
      cell=im[a+4:b-3,c+4:d-3]
      if cell.size==0 or (cell<128).sum()<15: row.append(''); continue
      cell=cv2.resize(cell,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
      row.append(ocr(cell))
    rows.append(row)
  return xs,ys,rows
if __name__=='__main__':
  xs,ys,rows=table(sys.argv[1]); print(len(xs),len(ys))
  for r in rows: print(' | '.join(r))
