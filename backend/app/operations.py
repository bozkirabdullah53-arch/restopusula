"""Transactional business operations. Money is stored in integer kuruş.

All ownership and branch checks run on the server. A single SQLite write
transaction covers the sale, recipe depletion, payments and audit entry.
"""
import json, hashlib, sqlite3
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import date, datetime
from fastapi import HTTPException
from .database import uid, now, insert, one, rows, audit
from .security import record, scoped_branch, require_permission, password_hash, ROLES
from .presentation import code_label, role_label

def text(v,field='Ad',required=True,max_len=250):
    if not isinstance(v,str) or len(v.strip())>max_len or (required and not v.strip()):raise HTTPException(400,f'{field} geçerli olmalı (en fazla {max_len} karakter).')
    return v.strip()
def number(v,field='Miktar',minimum=0,maximum=1000000):
    try:n=Decimal(str(v))
    except (InvalidOperation,ValueError,TypeError):raise HTTPException(400,f'{field} sayısal olmalı.')
    if not n.is_finite() or n<minimum or n>maximum:raise HTTPException(400,f'{field} {minimum}–{maximum} aralığında olmalı.')
    return n
def cents(v,field='Tutar',minimum=0):
    n=number(v,field,minimum,1000000000)
    if n.as_tuple().exponent < -2:raise HTTPException(400,f'{field} en fazla iki ondalık basamak içermeli.')
    return int((n*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
def quantity(v,minimum=Decimal('0.000001')):return float(number(v,'Miktar',minimum).quantize(Decimal('.000001'),rounding=ROUND_HALF_UP))
def money_round(v):return int(Decimal(str(v)).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
def day(v):
    try:
        d=date.fromisoformat(v)
        if d.isoformat()!=v or not 2000<=d.year<=2100:raise ValueError()
        return v
    except (ValueError,TypeError):raise HTTPException(400,'Geçerli bir tarih girin.')
def choice(v,options,field='Seçim'):
    if v not in options:raise HTTPException(400,f'{field} geçerli değil.')
    return v
def vat(v):
    n=number(v,'KDV oranı',0,100)
    if n!=n.to_integral_value():raise HTTPException(400,'KDV oranını tam sayı olarak girin.')
    return int(n)
def base(u,b=None):return dict(id=uid(),tenant_id=u['tenant_id'],branch_id=b,created_at=now())
def inventory_change(c,u,b,material_id,delta,kind,reason,date_value,ref=None,cost=None):
    record(c,u,'materials',material_id,False)
    r=one(c,'SELECT * FROM inventory WHERE branch_id=? AND material_id=? AND tenant_id=?',(b,material_id,u['tenant_id']))
    before=Decimal(str(r['quantity'] if r else 0));after=before+Decimal(str(delta))
    if after<0:raise HTTPException(409,'Stok yetersiz. İşlem kaydedilmedi.')
    if r:c.execute('UPDATE inventory SET quantity=? WHERE id=?',(float(after),r['id']))
    else:insert(c,'inventory',dict(id=uid(),tenant_id=u['tenant_id'],branch_id=b,material_id=material_id,quantity=float(after)))
    insert(c,'moves',base(u,b)|dict(material_id=material_id,kind=kind,quantity=delta,cost_cents=cost,reason=reason,date=date_value,ref_id=ref))
def ledger_entry(c,u,account,amount,kind,date_value,ref=None,note=''):
    a=record(c,u,'accounts',account)
    insert(c,'ledger',base(u,a['branch_id'])|dict(account_id=a['id'],amount_cents=amount,kind=kind,date=date_value,ref_id=ref,note=note))
def entity(c,u,kind,name,data,b=None):
    r=base(u,b)|dict(kind=kind,name=name,data=json.dumps(data,ensure_ascii=False))
    insert(c,'entities',r);return r['id']
def update_entity(c,r,data):c.execute('UPDATE entities SET data=? WHERE id=?',(json.dumps(data,ensure_ascii=False),r['id']))
def get_entity(c,u,id,kind):
    r=record(c,u,'entities',id,kind!='supplier')
    if r['kind']!=kind:raise HTTPException(400,'Kayıt türü uyuşmuyor.')
    return r,json.loads(r['data'])
def create_expense(c,u,p,b):
    amount=cents(p.get('amount'),minimum=Decimal('.01'));rate=vat(p.get('vat_rate',0));net=money_round(Decimal(amount)/(1+Decimal(rate)/100))
    kind=choice(p.get('kind','expense'),['expense','purchase','tax'])
    status=choice(p.get('status','pending'),['pending','paid']);account=p.get('account_id') or None
    if status=='paid':
        a=record(c,u,'accounts',account)
        if a['branch_id']!=b:raise HTTPException(400,'Ödeme hesabı aynı şubeye ait olmalı.')
    supplier=p.get('supplier_id') or None
    if supplier:get_entity(c,u,supplier,'supplier')
    r=base(u,b)|dict(name=text(p.get('name')),category=text(p.get('category')),kind=kind,amount_cents=amount,net_cents=net,vat_rate=rate,date=day(p.get('date')),due_date=day(p['due_date']) if p.get('due_date') else None,status=status,account_id=account,supplier_id=supplier,note=text(p.get('note',''),'Not',False,2000))
    insert(c,'expenses',r)
    if status=='paid':ledger_entry(c,u,account,-amount,'expense',r['date'],r['id'],r['name'])
    return r['id']

MODULES={'branch':'branches','product':'products','recipe':'products','material':'inventory','move':'inventory','sale':'sales','reverse_sale':'sales','table':'sales','table_status':'sales','order':'sales','account':'accounts','account_tx':'accounts','expense':'expenses','pay_expense':'expenses','reverse_expense':'expenses','supplier':'purchases','purchase':'purchases','purchase_status':'purchases','employee':'employees','attendance':'employees','budget':'budget','tax':'budget','vehicle':'resources','fuel':'resources','utility':'resources','member':'settings','company':'settings'}

def execute(c,u,p):
    action=p.get('action');module=MODULES.get(action)
    if not module:raise HTTPException(400,'İşlem tanınmadı.')
    permission='reverse' if action.startswith('reverse_') else 'approve' if action in ['pay_expense','purchase_status'] else 'edit' if action in ['table_status','company'] else 'create'
    require_permission(u,module,permission)
    key=text(p.get('request_id'),'İşlem anahtarı',max_len=100)
    digest=hashlib.sha256(json.dumps(p,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    old=one(c,'SELECT * FROM commands WHERE tenant_id=? AND id=?',(u['tenant_id'],key))
    if old:
        if old['body_hash']!=digest:raise HTTPException(409,'Bu işlem anahtarı başka bir kayıt için kullanılmış.')
        return json.loads(old['result'])
    b=scoped_branch(c,u,p.get('branch_id'),optional=action in ['branch','product','recipe','supplier','member','company'])
    id=None;desc=''
    if action=='company':
        if u['role']!='Patron':raise HTTPException(403,'Yalnızca işletme sahibi düzenleyebilir.')
        name=text(p.get('name'));c.execute('UPDATE tenants SET name=?,sector=? WHERE id=?',(name,text(p.get('sector','Restoran')),u['tenant_id']));id=u['tenant_id'];desc=f'İşletme bilgisi güncellendi: {name}'
    elif action=='branch':
        if u['branch_id']:raise HTTPException(403,'Şube ekleme yetkiniz yok.')
        r=dict(id=uid(),tenant_id=u['tenant_id'],name=text(p.get('name')),address=text(p.get('address',''),'Adres',False,500),phone=text(p.get('phone',''),'Telefon',False),manager=text(p.get('manager',''),'Müdür',False),tax_no=text(p.get('tax_no',''),'Vergi no',False),created_at=now());insert(c,'branches',r);id=r['id'];desc=f'Şube eklendi: {r["name"]}'
    elif action=='product':
        r=dict(id=uid(),tenant_id=u['tenant_id'],name=text(p.get('name')),category=text(p.get('category')),price_cents=cents(p.get('price'),'Satış fiyatı'),vat_rate=vat(p.get('vat_rate')),created_at=now());insert(c,'products',r);id=r['id'];desc=f'Ürün eklendi: {r["name"]}'
    elif action=='recipe':
        prod=record(c,u,'products',p.get('product_id'),False);mat=record(c,u,'materials',p.get('material_id'),False);q=quantity(p.get('quantity'))
        old=one(c,'SELECT * FROM recipes WHERE product_id=? AND material_id=?',(prod['id'],mat['id']))
        if old:c.execute('UPDATE recipes SET quantity=? WHERE id=?',(q,old['id']));id=old['id']
        else:
            id=uid();insert(c,'recipes',dict(id=id,tenant_id=u['tenant_id'],product_id=prod['id'],material_id=mat['id'],quantity=q))
        desc=f'{prod["name"]} ürün tarifine {q} {mat["unit"]} {mat["name"]} kaydedildi'
    elif action=='material':
        r=dict(id=uid(),tenant_id=u['tenant_id'],name=text(p.get('name')),unit=choice(p.get('unit'),['kg','g','L','mL','adet','kasa','koli','paket']),cost_cents=cents(p['cost'],'Birim maliyet') if p.get('cost') not in [None,''] else None,min_stock=quantity(p.get('min_stock',0),0),created_at=now());insert(c,'materials',r);id=r['id'];q=quantity(p.get('quantity',0),0)
        inventory_change(c,u,b,id,q,'opening','Açılış stoğu',day(p.get('date')),id,r['cost_cents']);desc=f'Malzeme eklendi: {r["name"]}; açılış {q} {r["unit"]}'
    elif action=='move':
        mat=record(c,u,'materials',p.get('material_id'),False);kind=choice(p.get('kind'),['in','waste','count','transfer']);q=quantity(p.get('quantity'),0 if kind=='count' else Decimal('.000001'));reason=text(p.get('reason',''),'Açıklama',kind in ['waste','count'],500);date_value=day(p.get('date'));id=uid()
        if kind=='count':
            stock=one(c,'SELECT quantity FROM inventory WHERE branch_id=? AND material_id=?',(b,mat['id']));delta=float(Decimal(str(q))-Decimal(str(stock['quantity'] if stock else 0)))
            inventory_change(c,u,b,mat['id'],delta,'count',reason,date_value,id)
        elif kind=='transfer':
            target=scoped_branch(c,u,p.get('target_branch_id'))
            if target==b:raise HTTPException(400,'Gönderen ve alan şube farklı olmalı.')
            inventory_change(c,u,b,mat['id'],-q,'transfer_out',reason,date_value,id);inventory_change(c,u,target,mat['id'],q,'transfer_in',reason,date_value,id)
        else:
            cost=cents(p['cost'],'Birim maliyet') if p.get('cost') not in [None,''] else mat['cost_cents']
            if kind=='in' and cost is not None:
                total=one(c,'SELECT COALESCE(SUM(quantity),0) AS q FROM inventory WHERE material_id=?',(mat['id'],))['q']
                avg=None if total>0 and mat['cost_cents'] is None else money_round((Decimal(str(total))*Decimal(mat['cost_cents'] or 0)+Decimal(str(q))*cost)/(Decimal(str(total))+Decimal(str(q))))
                c.execute('UPDATE materials SET cost_cents=? WHERE id=?',(avg,mat['id']))
            inventory_change(c,u,b,mat['id'],q if kind=='in' else -q,kind,reason,date_value,id,cost)
        desc=f'{mat["name"]}: {code_label(kind).lower()} işlemi, {q} {mat["unit"]}'
    elif action=='account':
        r=base(u,b)|dict(name=text(p.get('name')),type=choice(p.get('type'),['cash','bank','pos']),opening_cents=cents(p.get('opening'),'Açılış bakiyesi',-1000000000));insert(c,'accounts',r);id=r['id'];desc=f'Hesap eklendi: {r["name"]}'
    elif action=='account_tx':
        a=record(c,u,'accounts',p.get('account_id'));b=a['branch_id'];kind=choice(p.get('kind'),['in','out','transfer','count']);amount=cents(p.get('amount'),minimum=0 if kind=='count' else Decimal('.01'));date_value=day(p.get('date'));note=text(p.get('note'),'Açıklama',max_len=500);id=uid()
        if kind=='transfer':
            target=record(c,u,'accounts',p.get('target_account_id'))
            if target['id']==a['id']:raise HTTPException(400,'Hesaplar farklı olmalı.')
            ledger_entry(c,u,a['id'],-amount,'transfer_out',date_value,id,note);ledger_entry(c,u,target['id'],amount,'transfer_in',date_value,id,note)
        elif kind=='count':
            expected=a['opening_cents']+one(c,'SELECT COALESCE(SUM(amount_cents),0) AS n FROM ledger WHERE account_id=?',(a['id'],))['n'];delta=amount-expected
            ledger_entry(c,u,a['id'],delta,'cash_count',date_value,id,f'{note} | Beklenen: {expected/100:.2f} TL; gerçek: {amount/100:.2f} TL; fark: {delta/100:.2f} TL')
        else:ledger_entry(c,u,a['id'],amount if kind=='in' else -amount,kind,date_value,id,note)
        desc=f'{a["name"]}: {code_label(kind).lower()} işlemi ({amount/100:.2f} TL)'
    elif action=='sale':
        lines=p.get('items')
        if not isinstance(lines,list) or not 1<=len(lines)<=100:raise HTTPException(400,'1–100 satış kalemi ekleyin.')
        validated=[];total=0;cost_total=0;has_cost=True;consumption={}
        for item in lines:
            pr=record(c,u,'products',item.get('product_id'),False);q=quantity(item.get('quantity'));gross=money_round(Decimal(pr['price_cents'])*Decimal(str(q)));cost=0
            recipe=rows(c,'SELECT r.*,m.cost_cents FROM recipes r JOIN materials m ON m.id=r.material_id WHERE r.product_id=?',(pr['id'],))
            known=bool(recipe)
            for ri in recipe:
                used=Decimal(str(q))*Decimal(str(ri['quantity']));consumption[ri['material_id']]=consumption.get(ri['material_id'],Decimal(0))+used
                if ri['cost_cents'] is None:known=False
                else:cost+=money_round(Decimal(ri['cost_cents'])*used)
            validated.append((pr,q,gross,cost if known else None));total+=gross;cost_total+=cost;has_cost=has_cost and known
        discount=cents(p.get('discount',0),'İskonto')
        if discount>total:raise HTTPException(400,'İskonto satış tutarını aşamaz.')
        net=0;used_discount=0
        for i,(pr,q,gross,co) in enumerate(validated):
            part=discount-used_discount if i==len(validated)-1 else (discount*gross//total if total else 0);used_discount+=part
            net+=money_round(Decimal(gross-part)/(1+Decimal(pr['vat_rate'])/100))
        total-=discount;payments=p.get('payments')
        if not isinstance(payments,list) or not 1<=len(payments)<=10:raise HTTPException(400,'Bir ödeme hesabı seçin.')
        confirmed=[]
        for pay in payments:
            a=record(c,u,'accounts',pay.get('account_id'))
            if a['branch_id']!=b:raise HTTPException(400,'Tahsilat hesapları satış şubesine ait olmalı.')
            amount=cents(pay.get('amount'),'Tahsilat');confirmed.append((a,amount))
        if sum(v for a,v in confirmed)!=total:raise HTTPException(400,'Ödeme toplamı adisyon toplamıyla eşleşmiyor.')
        table=p.get('table_id') or None
        if table:
            tr,td=get_entity(c,u,table,'table')
            if tr['branch_id']!=b:raise HTTPException(400,'Masa ve satış şubesi uyuşmuyor.')
        date_value=day(p.get('date'));id=uid();r=base(u,b)|dict(id=id,table_id=table,channel=choice(p.get('channel'),['Masa','Paket servis','Gel-al','Online sipariş']),payment='Bölünmüş ödeme' if len(confirmed)>1 else {'cash':'Nakit','bank':'Havale/EFT','pos':'Kart'}[confirmed[0][0]['type']],account_id=confirmed[0][0]['id'] if len(confirmed)==1 else None,total_cents=total,net_cents=net,cost_cents=cost_total if has_cost else None,discount_cents=discount,status='completed',date=date_value,user_id=u['id']);insert(c,'sales',r)
        for pr,q,gross,co in validated:insert(c,'sale_items',dict(id=uid(),tenant_id=u['tenant_id'],sale_id=id,product_id=pr['id'],name=pr['name'],quantity=q,price_cents=pr['price_cents'],vat_rate=pr['vat_rate'],cost_cents=co))
        for mat,q in consumption.items():
            material=record(c,u,'materials',mat,False)
            inventory_change(c,u,b,mat,-float(q),'sale','Tarife göre malzeme tüketimi',date_value,id,material['cost_cents'])
        for a,amount in confirmed:ledger_entry(c,u,a['id'],amount,'sale',date_value,id,'Satış tahsilatı')
        if table:
            td['status']='Temizlik bekliyor';update_entity(c,tr,td)
            for o in rows(c,"SELECT * FROM entities WHERE tenant_id=? AND branch_id=? AND kind='order'",(u['tenant_id'],b)):
                od=json.loads(o['data'])
                if od.get('table_id')==table and od.get('status')=='open':od['status']='completed';od['sale_id']=id;update_entity(c,o,od)
        desc=f'Satış kaydedildi: {total/100:.2f} TL; {len(validated)} kalem'
    elif action=='reverse_sale':
        r=record(c,u,'sales',p.get('id'));b=r['branch_id'];reason=text(p.get('reason'),'İade nedeni')
        if r['status']=='reversed':raise HTTPException(409,'Satış zaten ters kayıtla kapatılmış.')
        id=r['id'];date_value=day(p.get('date'))
        for m in rows(c,"SELECT * FROM moves WHERE tenant_id=? AND ref_id=? AND kind='sale'",(u['tenant_id'],id)):
            mat=record(c,u,'materials',m['material_id'],False);total=one(c,'SELECT COALESCE(SUM(quantity),0) AS q FROM inventory WHERE material_id=?',(mat['id'],))['q'];returned=-m['quantity']
            avg=None if m['cost_cents'] is None or (total>0 and mat['cost_cents'] is None) else money_round((Decimal(str(total))*Decimal(mat['cost_cents'] or 0)+Decimal(str(returned))*m['cost_cents'])/(Decimal(str(total))+Decimal(str(returned))))
            c.execute('UPDATE materials SET cost_cents=? WHERE id=?',(avg,mat['id']));inventory_change(c,u,b,m['material_id'],returned,'sale_reversal',reason,date_value,id,m['cost_cents'])
        for l in rows(c,"SELECT * FROM ledger WHERE tenant_id=? AND ref_id=? AND kind='sale'",(u['tenant_id'],id)):ledger_entry(c,u,l['account_id'],-l['amount_cents'],'sale_reversal',date_value,id,reason)
        c.execute("UPDATE sales SET status='reversed' WHERE id=?",(id,));desc=f'Satış ters kaydı: {reason}'
    elif action=='table':
        name=text(p.get('name'));id=entity(c,u,'table',name,dict(capacity=int(number(p.get('capacity',4),'Kapasite',1,100)),zone=text(p.get('zone','Salon')),status='Boş'),b);desc=f'Masa eklendi: {name}'
    elif action=='table_status':
        r,d=get_entity(c,u,p.get('id'),'table');b=r['branch_id'];d['status']=choice(p.get('status'),['Boş','Dolu','Rezerve','Hesap bekliyor','Temizlik bekliyor']);update_entity(c,r,d);id=r['id'];desc=f'{r["name"]} masa durumu: {d["status"]}'
    elif action=='order':
        tr,td=get_entity(c,u,p.get('table_id'),'table');b=tr['branch_id'];items=p.get('items',[])
        if not isinstance(items,list) or not 1<=len(items)<=100:raise HTTPException(400,'Adisyona en az bir ürün ekleyin.')
        for i in items:record(c,u,'products',i.get('product_id'),False);i['quantity']=quantity(i.get('quantity'))
        data=dict(table_id=tr['id'],items=items,status='open',date=day(p.get('date')))
        existing=next((e for e in rows(c,"SELECT * FROM entities WHERE tenant_id=? AND branch_id=? AND kind='order'",(u['tenant_id'],b)) if json.loads(e['data']).get('table_id')==tr['id'] and json.loads(e['data']).get('status')=='open'),None)
        if existing:update_entity(c,existing,data);id=existing['id']
        else:id=entity(c,u,'order',tr['name']+' adisyonu',data,b)
        td['status']='Dolu';update_entity(c,tr,td);desc=f'{tr["name"]} adisyonu kaydedildi'
    elif action in ['expense','tax']:
        if action=='tax':p={**p,'kind':'tax','category':text(p.get('category','Vergi'))}
        id=create_expense(c,u,p,b);desc=f'Gider / yükümlülük kaydedildi: {p["name"]}'
    elif action in ['pay_expense','reverse_expense']:
        r=record(c,u,'expenses',p.get('id'));b=r['branch_id'];id=r['id'];date_value=day(p.get('date'))
        if action=='pay_expense':
            if r['status']!='pending':raise HTTPException(409,'Yalnızca bekleyen ödemeler kapatılabilir.')
            a=record(c,u,'accounts',p.get('account_id'))
            if a['branch_id']!=b:raise HTTPException(400,'Ödeme hesabı aynı şubede olmalı.')
            ledger_entry(c,u,a['id'],-r['amount_cents'],'expense',date_value,id,r['name']);c.execute("UPDATE expenses SET status='paid',account_id=? WHERE id=?",(a['id'],id));desc=f'{r["name"]}: ödeme yapıldı'
        else:
            if r['status']=='reversed':raise HTTPException(409,'Kayıt zaten iptal edilmiş.')
            reason=text(p.get('reason'),'İptal nedeni')
            for l in rows(c,"SELECT * FROM ledger WHERE tenant_id=? AND ref_id=? AND kind='expense'",(u['tenant_id'],id)):ledger_entry(c,u,l['account_id'],-l['amount_cents'],'expense_reversal',date_value,id,reason)
            c.execute("UPDATE expenses SET status='reversed' WHERE id=?",(id,));desc=f'{r["name"]}: ters kayıt ({reason})'
    elif action=='supplier':
        name=text(p.get('name'));id=entity(c,u,'supplier',name,dict(category=text(p.get('category')),phone=text(p.get('phone',''),'Telefon',False),email=text(p.get('email',''),'E-posta',False),tax_no=text(p.get('tax_no',''),'Vergi no',False)),None);desc=f'Tedarikçi eklendi: {name}'
    elif action=='purchase':
        s,sd=get_entity(c,u,p.get('supplier_id'),'supplier');m=record(c,u,'materials',p.get('material_id'),False);q=quantity(p.get('quantity'));cost=cents(p.get('cost'),'Teklif birim fiyatı');id=entity(c,u,'purchase',m['name'],dict(supplier_id=s['id'],material_id=m['id'],quantity=q,unit=m['unit'],cost_cents=cost,total_cents=money_round(Decimal(str(q))*cost),date=day(p.get('date')),status='Talep',note=text(p.get('note',''),'Not',False,1000)),b);desc=f'Satın alma talebi: {q} {m["unit"]} {m["name"]}'
    elif action=='purchase_status':
        r,d=get_entity(c,u,p.get('id'),'purchase');b=r['branch_id'];target=p.get('status');steps=['Talep','Onaylandı','Sipariş verildi','Teslim alındı','Faturalandı','Ödendi']
        if target not in steps or steps.index(target)!=steps.index(d['status'])+1:raise HTTPException(400,'Satın alma aşamaları sırayla ilerlemeli.')
        if target=='Teslim alındı':
            m=record(c,u,'materials',d['material_id'],False);q=d['quantity'];cost=d['cost_cents'];total=one(c,'SELECT COALESCE(SUM(quantity),0) AS q FROM inventory WHERE material_id=?',(m['id'],))['q'];avg=None if total>0 and m['cost_cents'] is None else money_round((Decimal(str(total))*Decimal(m['cost_cents'] or 0)+Decimal(str(q))*cost)/(Decimal(str(total))+Decimal(str(q))))
            c.execute('UPDATE materials SET cost_cents=? WHERE id=?',(avg,m['id']));inventory_change(c,u,b,m['id'],q,'purchase','Satın alma teslimatı',day(p.get('date')),r['id'],cost)
        if target=='Faturalandı':
            e=record(c,u,'expenses',p.get('expense_id'))
            if e['kind']!='purchase' or e['branch_id']!=b or e['supplier_id']!=d['supplier_id'] or e['status']=='reversed':raise HTTPException(400,'Aynı şube ve tedarikçiye ait alış faturası seçin.')
            d['expense_id']=e['id']
        if target=='Ödendi':
            e=record(c,u,'expenses',d.get('expense_id'))
            if e['status']!='paid':raise HTTPException(400,'Önce faturanın ödemesini kaydedin.')
        d['status']=target;update_entity(c,r,d);id=r['id'];desc=f'{r["name"]} satın alma durumu: {target}'
    elif action=='employee':
        name=text(p.get('name'));email=text(p.get('email',''),'E-posta',False);id=entity(c,u,'employee',name,dict(email=email,title=text(p.get('title')),start_date=day(p.get('start_date')),salary_cents=cents(p.get('salary'),'Aylık ücret'),phone=text(p.get('phone',''),'Telefon',False),active=True),b);desc=f'Personel eklendi: {name}'
    elif action=='attendance':
        e,ed=get_entity(c,u,p.get('employee_id'),'employee');b=e['branch_id'];status=choice(p.get('status'),['Çalıştı','İzin','Devamsızlık']);hours=float(number(p.get('hours',0),'Çalışma saati',0,24));planned=float(number(p.get('planned',0),'Planlanan saat',0,24));date_value=day(p.get('date'))
        if status!='Çalıştı' and hours!=0:raise HTTPException(400,'İzin veya devamsızlıkta çalışma saati sıfır olmalı.')
        for r in rows(c,"SELECT data FROM entities WHERE tenant_id=? AND kind='attendance' AND branch_id=?",(u['tenant_id'],b)):
            rd=json.loads(r['data'])
            if rd['employee_id']==e['id'] and rd['date']==date_value:raise HTTPException(409,'Bu personel ve gün için puantaj zaten var.')
        id=entity(c,u,'attendance',e['name'],dict(employee_id=e['id'],status=status,hours=hours,planned=planned,extra=max(0,hours-planned),date=date_value),b);desc=f'{e["name"]}: puantaj {date_value}, {hours} saat'
    elif action=='budget':
        m=text(p.get('month'),'Ay')
        try:day(m+'-01')
        except HTTPException:raise HTTPException(400,'Ay YYYY-AA biçiminde olmalı.')
        category=text(p.get('category'));id=entity(c,u,'budget',category,dict(category=category,month=m,amount_cents=cents(p.get('amount'),minimum=Decimal('.01'))),b);desc=f'{category}: {m} bütçesi eklendi'
    elif action=='vehicle':
        name=text(p.get('name'),'Plaka');id=entity(c,u,'vehicle',name,dict(brand=text(p.get('brand')),model=text(p.get('model')),year=int(number(p.get('year'),'Model yılı',1980,2100)),km=float(number(p.get('km'),'Kilometre',0,10000000)),fuel=choice(p.get('fuel'),['Dizel','Benzin','LPG','Elektrik']),insurance_date=day(p['insurance_date']) if p.get('insurance_date') else None,inspection_date=day(p['inspection_date']) if p.get('inspection_date') else None),b);desc=f'Araç eklendi: {name}'
    elif action=='fuel':
        v,vd=get_entity(c,u,p.get('vehicle_id'),'vehicle');b=v['branch_id'];km=float(number(p.get('km'),'Kilometre',0,10000000));liters=float(number(p.get('liters'),'Litre',Decimal('.001'),1000))
        if km<=vd['km']:raise HTTPException(400,'Yeni kilometre son kilometreden büyük olmalı.')
        amount=cents(p.get('amount'),minimum=Decimal('.01'));consumption=liters/(km-vd['km'])*100;expense=create_expense(c,u,dict(name=v['name']+' yakıt',category='Yakıt',amount=amount/100,vat_rate=p.get('vat_rate',0),date=p.get('date'),status='pending'),b);id=entity(c,u,'fuel',v['name'],dict(vehicle_id=v['id'],km=km,liters=liters,amount_cents=amount,consumption=consumption,date=day(p.get('date')),expense_id=expense),b);vd['km']=km;update_entity(c,v,vd);desc=f'{v["name"]}: yakıt kaydı ({consumption:.2f} L/100 km; dolumlar arasında tam depo varsayımı)'
    elif action=='utility':
        kind=choice(p.get('kind'),['Elektrik','Su','Doğalgaz']);first=float(number(p.get('first'),'İlk sayaç',0,1000000000));last=float(number(p.get('last'),'Son sayaç',0,1000000000))
        if last<first:raise HTTPException(400,'Son sayaç ilk sayaçtan küçük olamaz.')
        amount=cents(p.get('amount'),minimum=Decimal('.01'));expense=create_expense(c,u,dict(name=kind+' faturası',category=kind,amount=amount/100,vat_rate=p.get('vat_rate',0),date=p.get('date'),due_date=p.get('due_date'),status='pending'),b);id=entity(c,u,'utility',kind,dict(kind=kind,first=first,last=last,consumption=last-first,amount_cents=amount,unit='m³' if kind in ['Su','Doğalgaz'] else 'kWh',date=day(p.get('date')),expense_id=expense),b);desc=f'{kind}: sayaç ve fatura kaydı'
    elif action=='member':
        if u['role']!='Patron':raise HTTPException(403,'Yalnızca işletme sahibi kullanıcı ekleyebilir.')
        email=text(p.get('email'),'E-posta').lower()
        if '@' not in email:raise HTTPException(400,'Geçerli bir e-posta girin.')
        role=choice(p.get('role'),list(ROLES));mb=scoped_branch(c,u,p.get('member_branch_id'),optional=True)
        if role in ['Şube Müdürü','Personel'] and not mb:raise HTTPException(400,'Bu rol için şube seçin.')
        permissions=p.get('permissions',{})
        if not isinstance(permissions,dict):raise HTTPException(400,'İzinler geçerli değil.')
        allowed={k:{a:bool(v.get(a,False)) for a in ['view','create','edit','approve','export','reverse']} for k,v in permissions.items() if k in ROLES['Patron'] and isinstance(v,dict)}
        r=dict(id=uid(),tenant_id=u['tenant_id'],email=email,name=text(p.get('name')),password_hash=password_hash(p.get('password')),role=role,branch_id=mb,permissions=json.dumps(allowed),must_change=1,active=1,created_at=now());insert(c,'users',r);id=r['id'];desc=f'Kullanıcı eklendi: {r["name"]}, {role_label(role)}'
    audit(c,u,action,desc,b)
    result={'id':id,'message':'İşlem kaydedildi.'};insert(c,'commands',dict(tenant_id=u['tenant_id'],id=key,body_hash=digest,result=json.dumps(result)))
    return result
