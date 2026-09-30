import os, json, time, secrets, sqlite3, logging, io, zipfile
from pathlib import Path
from contextlib import asynccontextmanager
from xml.sax.saxutils import escape
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import connect,init_db,uid,now,rows,one,insert,audit,DATA_DIR
from .security import authenticate,public_user,require_permission,password_hash,password_ok,session_hash,rate_limit,effective_permissions
from .operations import execute,text,day,record

logger=logging.getLogger('restopusula')
ALLOWED_ORIGINS=os.environ.get('MISE_ALLOWED_ORIGINS','http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000').split(',')
SECURE_COOKIE=os.environ.get('MISE_SECURE_COOKIE','0')=='1'
@asynccontextmanager
async def lifespan(app):init_db();yield
app=FastAPI(title='RestoPusula API',version='0.1.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=ALLOWED_ORIGINS,allow_credentials=True,allow_methods=['GET','POST'],allow_headers=['Content-Type','X-CSRF-Token'])
@app.middleware('http')
async def guard(request,call_next):
    origin=request.headers.get('origin')
    if request.method not in ['GET','HEAD','OPTIONS'] and origin and origin not in ALLOWED_ORIGINS:return JSONResponse({'detail':'İstek kaynağına izin verilmiyor.'},status_code=403)
    size=request.headers.get('content-length','0')
    try:too_large=int(size)>12*1024*1024
    except ValueError:too_large=True
    if too_large:return JSONResponse({'detail':'Dosya veya istek çok büyük.'},status_code=413)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff';response.headers['Referrer-Policy']='same-origin';response.headers['X-Frame-Options']='DENY'
    if request.url.path.startswith('/api'):response.headers['Cache-Control']='no-store'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    return response

def make_session(c,user,response):
    token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
    c.execute('DELETE FROM sessions WHERE expires_at<?',(int(time.time()),))
    insert(c,'sessions',dict(token_hash=session_hash(token),user_id=user['id'],csrf=csrf,expires_at=int(time.time())+12*3600))
    response.set_cookie('mise_session',token,httponly=True,samesite='lax',secure=SECURE_COOKIE,max_age=12*3600,path='/')
    return {'user':public_user(user),'csrf':csrf}
@app.get('/api/health')
def health():return {'status':'ok','version':'0.1.0'}
@app.post('/api/auth/register')
def register(p:dict,request:Request,response:Response):
    rate_limit('register:'+str(request.client.host),20,3600)
    email=text(p.get('email'),'E-posta').lower()
    if '@' not in email:raise HTTPException(400,'Geçerli bir e-posta girin.')
    hashed=password_hash(p.get('password'));name=text(p.get('name'));company=text(p.get('company'),'İşletme adı')
    with connect() as c:
        c.execute('BEGIN IMMEDIATE')
        if one(c,'SELECT id FROM users WHERE email=?',(email,)):raise HTTPException(409,'Bu e-posta için hesap mevcut. Giriş yapın.')
        tenant=uid();insert(c,'tenants',dict(id=tenant,name=company,sector='Restoran',created_at=now()))
        u=dict(id=uid(),tenant_id=tenant,email=email,name=name,password_hash=hashed,role='Patron',branch_id=None,permissions='{}',must_change=0,active=1,created_at=now());insert(c,'users',u);audit(c,u,'register','İşletme çalışma alanı oluşturuldu')
        return make_session(c,u,response)
@app.post('/api/auth/login')
def login(p:dict,request:Request,response:Response):
    email=text(p.get('email'),'E-posta').lower();rate_limit('login:'+str(request.client.host)+':'+email)
    if not isinstance(p.get('password'),str) or len(p['password'])>128:raise HTTPException(401,'E-posta veya şifre hatalı.')
    with connect() as c:
        u=one(c,'SELECT * FROM users WHERE email=? AND active=1',(email,))
        dummy='0'*32+':'+'0'*128
        if not password_ok(p['password'],u['password_hash'] if u else dummy):raise HTTPException(401,'E-posta veya şifre hatalı.')
        if not u:raise HTTPException(401,'E-posta veya şifre hatalı.')
        audit(c,u,'login','Oturum açıldı');return make_session(c,u,response)
@app.get('/api/auth/me')
def me(request:Request):
    with connect() as c:
        u=authenticate(c,request);return {'user':public_user(u),'csrf':u['csrf']}
@app.post('/api/auth/logout')
def logout(request:Request,response:Response):
    with connect() as c:
        u=authenticate(c,request,True);c.execute('DELETE FROM sessions WHERE token_hash=?',(session_hash(request.cookies.get('mise_session','')),));audit(c,u,'logout','Oturum kapatıldı')
    response.delete_cookie('mise_session',path='/');return {'message':'Oturum kapatıldı.'}
@app.post('/api/auth/password')
def change_password(p:dict,request:Request,response:Response):
    with connect() as c:
        u=authenticate(c,request,True)
        if not password_ok(p.get('current',''),u['password_hash']):raise HTTPException(400,'Mevcut şifre hatalı.')
        h=password_hash(p.get('password'));c.execute('UPDATE users SET password_hash=?,must_change=0 WHERE id=?',(h,u['id']));c.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],));u['must_change']=0;audit(c,u,'password','Şifre değiştirildi');return make_session(c,u,response)

def state(c,u):
    perms=effective_permissions(u);tenant=u['tenant_id'];branch=u['branch_id'];params=(tenant,branch) if branch else (tenant,);scope='tenant_id=?'+(' AND branch_id=?' if branch else '')
    def get(table,module,scoped=True,order='created_at DESC'):
        if not perms.get(module,{}).get('view'):return []
        s=scope if scoped else 'tenant_id=?';a=params if scoped else (tenant,)
        return rows(c,f'SELECT * FROM {table} WHERE {s} ORDER BY {order}',a)
    branches=rows(c,'SELECT * FROM branches WHERE tenant_id=?'+(' AND id=?' if branch else '')+' ORDER BY name',params)
    products=get('products','products',False);materials=get('materials','inventory',False)
    if perms.get('sales',{}).get('view') and not products:products=rows(c,'SELECT * FROM products WHERE tenant_id=? ORDER BY name',(tenant,))
    allowed_kinds={'supplier':'purchases','purchase':'purchases','table':'sales','order':'sales','employee':'employees','attendance':'employees','budget':'budget','vehicle':'resources','fuel':'resources','utility':'resources'}
    entities=[]
    for e in rows(c,'SELECT * FROM entities WHERE '+scope+' ORDER BY created_at DESC',params):
        if perms.get(allowed_kinds.get(e['kind'],''),{}).get('view'):entities.append(e)
    # Tenant-wide supplier master data also remains visible to scoped procurement staff.
    if branch and perms.get('purchases',{}).get('view'):entities+=rows(c,"SELECT * FROM entities WHERE tenant_id=? AND branch_id IS NULL AND kind='supplier'",(tenant,))
    if u['role']=='Personel':
        own=[e for e in entities if e['kind']=='employee' and json.loads(e['data']).get('email','').lower()==u['email']];ids={e['id'] for e in own};entities=own+[e for e in entities if e['kind']=='attendance' and json.loads(e['data']).get('employee_id') in ids]
    sales=get('sales','sales');sale_ids={s['id'] for s in sales};sale_items=[s for s in rows(c,'SELECT * FROM sale_items WHERE tenant_id=?',(tenant,)) if s['sale_id'] in sale_ids]
    # Dashboard access alone never grants raw financial-module access.
    result=dict(tenant=one(c,'SELECT * FROM tenants WHERE id=?',(tenant,)),role=u['role'],user=public_user(u),branches=branches,products=products,materials=materials,recipes=get('recipes','products',False,order='id'),inventory=get('inventory','inventory',order='id'),moves=get('moves','inventory'),sales=sales,saleItems=sale_items,accounts=get('accounts','accounts'),ledger=get('ledger','accounts'),expenses=get('expenses','expenses'),entities=entities,members=[],audit=[],documents=get('documents','expenses'))
    if perms.get('budget',{}).get('view') and not result['expenses']:result['expenses']=get('expenses','budget')
    if u['role']=='Patron':result['members']=[public_user(x) for x in rows(c,'SELECT * FROM users WHERE tenant_id=? ORDER BY name',(tenant,))];result['audit']=rows(c,'SELECT * FROM audit_logs WHERE tenant_id=? ORDER BY created_at DESC LIMIT 250',(tenant,))
    return result
@app.get('/api/state')
def get_state(request:Request):
    with connect() as c:
        u=authenticate(c,request)
        if u['must_change']:raise HTTPException(403,'Önce geçici şifrenizi değiştirin.')
        return state(c,u)
@app.post('/api/action')
def action(p:dict,request:Request):
    try:
        with connect() as c:
            c.execute('BEGIN IMMEDIATE');u=authenticate(c,request,True);return execute(c,u,p)
    except sqlite3.IntegrityError as e:
        logger.info('Integrity constraint rejected an operation: %s',str(e).split(':')[0])
        raise HTTPException(409,'Aynı kayıt zaten var veya işlem veri kurallarıyla uyuşmuyor. İşlem kaydedilmedi.')
    except HTTPException:raise
    except Exception:
        logger.exception('Operation failed');raise HTTPException(500,'İşlem kaydedilemedi. Girdiğiniz bilgiler korunuyor; yeniden deneyin.')

@app.post('/api/documents')
async def upload_document(request:Request,branch_id:str=Form(...),record_id:str=Form(''),file:UploadFile=File(...)):
    from .security import scoped_branch
    allowed={'application/pdf':b'%PDF','image/png':b'\x89PNG','image/jpeg':b'\xff\xd8\xff'}
    payload=await file.read(10*1024*1024+1)
    if len(payload)>10*1024*1024:raise HTTPException(413,'Belge en fazla 10 MB olabilir.')
    if file.content_type not in allowed or not payload.startswith(allowed[file.content_type]):raise HTTPException(400,'Yalnızca geçerli PDF, PNG veya JPEG yükleyin.')
    with connect() as c:
        u=authenticate(c,request,True);require_permission(u,'expenses','create');b=scoped_branch(c,u,branch_id)
        if record_id:
            expense=record(c,u,'expenses',record_id)
            if expense['branch_id']!=b:raise HTTPException(400,'Belge ve gider aynı şubeye ait olmalı.')
        id=uid();folder=DATA_DIR/'documents';folder.mkdir(exist_ok=True)
        path=folder/id;path.write_bytes(payload)
        try:insert(c,'documents',dict(id=id,tenant_id=u['tenant_id'],branch_id=b,name=Path(file.filename or 'belge').name[:200],mime=file.content_type,size=len(payload),record_id=record_id or None,created_at=now()));audit(c,u,'document','Belge yüklendi',b)
        except Exception:path.unlink(missing_ok=True);raise
    return {'id':id,'message':'Belge yüklendi.'}
@app.get('/api/documents/{id}')
def download_document(id:str,request:Request):
    with connect() as c:
        u=authenticate(c,request);require_permission(u,'expenses');r=record(c,u,'documents',id)
    path=DATA_DIR/'documents'/r['id']
    if not path.is_file():raise HTTPException(404,'Belge dosyası bulunamadı.')
    return FileResponse(path,media_type=r['mime'],filename=r['name'])

def xlsx(headers,data):
    def col(n):
        s=''
        while n:n,r=divmod(n-1,26);s=chr(65+r)+s
        return s
    out=[]
    for i,r in enumerate([headers]+data,1):
        cells=[]
        for j,v in enumerate(r,1):
            ref=col(j)+str(i)
            if isinstance(v,(int,float)):cells.append(f'<c r="{ref}" s="{2 if isinstance(v,float) else 0}"><v>{v}</v></c>')
            else:
                value='—' if v is None else str(v)
                # inlineStr prevents spreadsheet formula execution from user text.
                safe=''.join(ch for ch in value if ord(ch)>=32 or ch in '\t\n\r')
                cells.append(f'<c r="{ref}" s="{1 if i==1 else 0}" t="inlineStr"><is><t xml:space="preserve">{escape(safe)}</t></is></c>')
        out.append(f'<row r="{i}">{"".join(cells)}</row>')
    content_types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
    workbook='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rapor" sheetId="1" r:id="rId1"/></sheets></workbook>'
    rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    workbook_rels='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    styles='<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0"/><xf fontId="1" applyFont="1"/><xf fontId="0" numFmtId="4" applyNumberFormat="1"/></cellXfs></styleSheet>'
    sheet=f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="{max(1,len(headers))}" width="24" customWidth="1"/></cols><sheetData>{"".join(out)}</sheetData></worksheet>'
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
        for name,content in {'[Content_Types].xml':content_types,'_rels/.rels':rels,'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':workbook_rels,'xl/styles.xml':styles,'xl/worksheets/sheet1.xml':sheet}.items():z.writestr(name,content.encode('utf-8'))
    return buf.getvalue()
@app.get('/api/export')
def export(request:Request,kind:str='sales',start:str='2000-01-01',end:str='2100-12-31',branch_id:str='all'):
    with connect() as c:
        u=authenticate(c,request);require_permission(u,'reports','export');d=state(c,u);day(start);day(end)
        if start>end:raise HTTPException(400,'Başlangıç tarihi bitişten sonra olamaz.')
        bnames={b['id']:b['name'] for b in d['branches']}
        if branch_id!='all' and branch_id not in bnames:raise HTTPException(403,'Şubeye erişim yetkiniz yok.')
        def scope(r):return (branch_id=='all' or r['branch_id']==branch_id) and start<=r.get('date',start)<=end
        if kind=='sales':
            require_permission(u,'sales','export');headers=['Tarih','Şube','Satış no','Kanal','Ödeme','KDV dahil ciro (TL)','KDV hariç ciro (TL)','Maliyet (TL)','Durum'];data=[[r['date'],bnames.get(r['branch_id']),r['id'],r['channel'],r['payment'],r['total_cents']/100,r['net_cents']/100,r['cost_cents']/100 if r['cost_cents'] is not None else None,r['status']] for r in d['sales'] if scope(r)]
        elif kind=='expenses':
            require_permission(u,'expenses','export');headers=['Tarih','Şube','Açıklama','Kategori','Tür','Tutar (TL)','KDV hariç (TL)','Vade','Durum'];data=[[r['date'],bnames.get(r['branch_id']),r['name'],r['category'],r['kind'],r['amount_cents']/100,r['net_cents']/100,r['due_date'],r['status']] for r in d['expenses'] if scope(r)]
        elif kind=='inventory':
            require_permission(u,'inventory','export');mat={x['id']:x for x in d['materials']};headers=['Şube','Malzeme','Miktar','Birim','Birim maliyet (TL)','Minimum stok'];data=[[bnames.get(r['branch_id']),mat[r['material_id']]['name'],r['quantity'],mat[r['material_id']]['unit'],mat[r['material_id']]['cost_cents']/100 if mat[r['material_id']]['cost_cents'] is not None else None,mat[r['material_id']]['min_stock']] for r in d['inventory'] if scope(r)]
        elif kind=='ledger':
            require_permission(u,'accounts','export');accounts={a['id']:a['name'] for a in d['accounts']};headers=['Tarih','Şube','Hesap','Tutar (TL)','Tür','Açıklama'];data=[[r['date'],bnames.get(r['branch_id']),accounts.get(r['account_id']),r['amount_cents']/100,r['kind'],r['note']] for r in d['ledger'] if scope(r)]
        else:raise HTTPException(400,'Rapor türü tanınmadı.')
        audit(c,u,'export',f'{kind} Excel raporu dışa aktarıldı')
        payload=xlsx(headers,data)
    return Response(payload,media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers={'Content-Disposition':f'attachment; filename="restopusula-{kind}-{start}.xlsx"'})
@app.get('/api/backup')
def tenant_backup(request:Request):
    with connect() as c:
        u=authenticate(c,request)
        if u['role']!='Patron':raise HTTPException(403,'Yalnızca işletme sahibi yedek dışa aktarabilir.')
        require_permission(u,'settings','export');d=state(c,u);audit(c,u,'backup','İşletme verileri JSON olarak dışa aktarıldı')
    # Only this tenant's records; never expose other tenants or session/password material.
    return Response(json.dumps({'version':1,'exported_at':now(),'data':d},ensure_ascii=False,indent=2).encode(),media_type='application/json',headers={'Content-Disposition':'attachment; filename="restopusula-isletme-yedegi.json"'})

FRONTEND=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if FRONTEND.exists():app.mount('/',StaticFiles(directory=FRONTEND,html=True),name='frontend')
