import hashlib, hmac, secrets, time, json, threading
from collections import defaultdict
from fastapi import HTTPException, Request
from .database import one

ROLES={
 'Patron':['dashboard','branches','sales','products','inventory','purchases','accounts','expenses','budget','employees','resources','reports','assistant','settings'],
 'Genel Müdür':['dashboard','branches','sales','products','inventory','purchases','accounts','expenses','budget','employees','resources','reports','assistant'],
 'Şube Müdürü':['dashboard','branches','sales','products','inventory','purchases','accounts','expenses','employees','resources','reports','assistant'],
 'Muhasebe':['dashboard','branches','accounts','expenses','budget','purchases','reports','assistant'],
 'Depo / Stok Sorumlusu':['branches','products','inventory','purchases','reports'],
 'Mutfak':['branches','products','inventory'],
 'Personel':['employees']}
def password_hash(password):
    if not isinstance(password,str) or not 10<=len(password)<=128: raise HTTPException(400,'Şifre 10–128 karakter olmalı.')
    salt=secrets.token_hex(16)
    key=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1)
    return salt+':'+key.hex()
def password_ok(password,stored):
    try:
        salt,digest=stored.split(':')
        key=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1)
        return hmac.compare_digest(key.hex(),digest)
    except (ValueError,TypeError): return False
def session_hash(token): return hashlib.sha256(token.encode()).hexdigest()
def authenticate(c,request:Request,mutation=False):
    token=request.cookies.get('mise_session','')
    user=one(c,'SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1',(session_hash(token),int(time.time())))
    if not user: raise HTTPException(401,'Çalışma alanınıza giriş yapın.')
    if mutation and not hmac.compare_digest(request.headers.get('X-CSRF-Token',''),user['csrf']):raise HTTPException(403,'Oturum doğrulaması başarısız. Sayfayı yenileyin.')
    return user
def public_user(u):return {k:u[k] for k in ['id','name','email','role','branch_id','must_change']}|{'permissions':effective_permissions(u)}
def effective_permissions(u):
    base={k:{'view':True,'create':True,'edit':True,'approve':True,'export':True,'reverse':True} for k in ROLES[u['role']]}
    if u['role']=='Personel':base={'employees':{'view':True}}
    for k,v in json.loads(u.get('permissions','{}')).items():
        if k in ROLES['Patron'] and isinstance(v,dict):base[k]={a:bool(v.get(a,False)) for a in ['view','create','edit','approve','export','reverse']}
    return base
def require_permission(u,module,action='view'):
    if u['must_change']:raise HTTPException(403,'Önce geçici şifrenizi değiştirin.')
    if not effective_permissions(u).get(module,{}).get(action,False):raise HTTPException(403,'Bu işlem için yetkiniz yok.')
def scoped_branch(c,u,branch,optional=False):
    if not branch:
        if u['branch_id']:return u['branch_id']
        if optional:return None
        raise HTTPException(400,'Bir şube seçin.')
    if u['branch_id'] and u['branch_id']!=branch:raise HTTPException(403,'Bu şubeye erişim yetkiniz yok.')
    if not one(c,'SELECT id FROM branches WHERE id=? AND tenant_id=?',(branch,u['tenant_id'])):raise HTTPException(404,'Şube bulunamadı.')
    return branch
def record(c,u,table,id,branch_scoped=True):
    allowed={'branches','products','materials','recipes','inventory','sales','accounts','expenses','entities','documents','users'}
    if table not in allowed:raise ValueError('Invalid table')
    r=one(c,f'SELECT * FROM {table} WHERE id=? AND tenant_id=?',(id,u['tenant_id']))
    if not r:raise HTTPException(404,'Kayıt bulunamadı.')
    if branch_scoped and u['branch_id'] and r.get('branch_id')!=u['branch_id']:raise HTTPException(403,'Bu kayda erişim yetkiniz yok.')
    return r
_limits=defaultdict(list);_lock=threading.Lock()
def rate_limit(key,limit=10,window=900):
    t=time.time()
    with _lock:
        _limits[key]=[x for x in _limits[key] if x>t-window]
        if len(_limits[key])>=limit:raise HTTPException(429,'Çok fazla deneme yapıldı. Bir süre sonra yeniden deneyin.')
        _limits[key].append(t)
