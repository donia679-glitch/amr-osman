from PIL import Image, ImageOps
ph1=Image.open('/root/.claude/uploads/64b8a489-bbf5-5031-b6e2-a8f0120b3f86/4a20ca63-image.jpg').crop((150,280,1050,880))
ph2=Image.open('/root/.claude/uploads/64b8a489-bbf5-5031-b6e2-a8f0120b3f86/f4e6874c-image.jpg').crop((140,620,1140,1240))
def R(i):
    im=Image.open(f'lib/p55_{i}.png').convert('RGB'); bg=Image.new('RGB',im.size,im.getpixel((5,im.height//2)))
    from PIL import ImageChops
    diff=ImageChops.difference(im,bg).convert('L').point(lambda v:255 if v>18 else 0)
    w,h=im.size; diff=diff.crop((int(w*.08),int(h*.1),int(w*.92),int(h*.9)))
    bb=diff.getbbox(); x0,y0=int(w*.08),int(h*.1)
    return im.crop((x0+bb[0]-30,y0+bb[1]-30,x0+bb[2]+30,y0+bb[3]+30))
rows=[]
for ph,i in [(ph1,0),(ph2,1)]:
    r=R(i); H=460; ph=ph.resize((int(ph.width*H/ph.height),H)); r=r.resize((int(r.width*H/r.height),H))
    row=Image.new('RGB',(ph.width+r.width+12,H),'white'); row.paste(ph,(0,0)); row.paste(r,(ph.width+12,0)); rows.append(row)
W=max(r.width for r in rows); sheet=Image.new('RGB',(W,940),'white'); sheet.paste(rows[0],(0,0)); sheet.paste(rows[1],(0,476)); sheet.save('lib/p55_cmp.png'); print(sheet.size)
