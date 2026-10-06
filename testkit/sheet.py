from PIL import Image, ImageChops, ImageDraw, ImageFont
import sys
n=int(sys.argv[1]); out=sys.argv[2]
cells=[]
for i in range(n):
    im=Image.open(f'new10/r_{i}.png').convert('RGB'); w,h=im.size
    sub=im.crop((int(w*.1),int(h*.12),int(w*.9),int(h*.92)))
    bg=Image.new('RGB',sub.size,sub.getpixel((3,sub.height//2)))
    m=ImageChops.difference(sub,bg).convert('L').point(lambda v:255 if v>20 else 0); bb=m.getbbox()
    c=sub.crop((max(0,bb[0]-40),max(0,bb[1]-40),min(sub.width,bb[2]+40),min(sub.height,bb[3]+40)))
    sc=min(560/c.width,420/c.height); c=c.resize((int(c.width*sc),int(c.height*sc)))
    cell=Image.new('RGB',(580,450),(238,236,230)); cell.paste(c,((580-c.width)//2,(450-c.height)//2+10))
    d=ImageDraw.Draw(cell)
    try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',40)
    except Exception: f=None
    d.ellipse((14,14,74,74),fill=(18,63,35)); d.text((44,44),str(i+1),fill='white',font=f,anchor='mm')
    cells.append(cell)
cols=2 if n<=4 else 3
rows=(n+cols-1)//cols
S=Image.new('RGB',(cols*590+10,rows*460+10),'white')
for i,c in enumerate(cells): S.paste(c,(10+(i%cols)*590,10+(i//cols)*460))
S.save(out); print(S.size)
