import tempfile,uuid,unittest,json,io,zipfile,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app import database
from app.main import app
from app.security import _limits

class BusinessFlows(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();database.DATA_DIR=Path(self.temp.name);database.DB_PATH=database.DATA_DIR/'test.sqlite3';_limits.clear();self.ctx=TestClient(app);self.client=self.ctx.__enter__()
  r=self.client.post('/api/auth/register',json={'name':'Test sahibi','company':'Test işletmesi','email':'owner@example.test','password':'ExamplePass123!'});self.assertEqual(r.status_code,200,r.text);self.csrf=r.json()['csrf']
  self.branch=self.action('branch',name='Test Şube 1')['id'];self.other=self.action('branch',name='Test Şube 2')['id']
  self.account=self.action('account',branch_id=self.branch,name='Test kasa',type='cash',opening='1000')['id']
  self.mat=self.action('material',branch_id=self.branch,name='Levrek test',unit='kg',cost='250',quantity='4',min_stock='1',date='2026-09-30')['id']
  self.product=self.action('product',name='Test porsiyon',category='Balık',price='500',vat_rate='10')['id'];self.action('recipe',product_id=self.product,material_id=self.mat,quantity='0.4')
 def tearDown(self):self.ctx.__exit__(None,None,None);self.temp.cleanup()
 def post(self,p,client=None,csrf=None):return (client or self.client).post('/api/action',json={'request_id':str(uuid.uuid4()),**p},headers={'X-CSRF-Token':csrf or self.csrf})
 def action(self,a,**kw):
  r=self.post({'action':a,**kw});self.assertEqual(r.status_code,200,r.text);return r.json()
 def data(self):return self.client.get('/api/state').json()
 def sale(self,q='2',**kw):return {'action':'sale','branch_id':self.branch,'channel':'Masa','date':'2026-09-30','discount':'0','items':[{'product_id':self.product,'quantity':q}],'payments':[{'account_id':self.account,'amount':str(float(q)*500)}],**kw}
 def test_sale_recipe_cash_and_reversal(self):
  r=self.post(self.sale());self.assertEqual(r.status_code,200,r.text);id=r.json()['id'];d=self.data();self.assertEqual(d['sales'][0]['total_cents'],100000);self.assertEqual(d['sales'][0]['net_cents'],90909);self.assertEqual(d['sales'][0]['cost_cents'],20000);self.assertAlmostEqual(d['inventory'][0]['quantity'],3.2);self.assertEqual(sum(l['amount_cents'] for l in d['ledger']),100000)
  self.action('reverse_sale',id=id,branch_id=self.branch,reason='Test iadesi',date='2026-09-30');d=self.data();self.assertEqual(d['sales'][0]['status'],'reversed');self.assertAlmostEqual(d['inventory'][0]['quantity'],4);self.assertEqual(sum(l['amount_cents'] for l in d['ledger']),0)
  self.assertEqual(self.post({'action':'reverse_sale','id':id,'branch_id':self.branch,'reason':'Tekrar','date':'2026-09-30'}).status_code,409)
 def test_oversell_rolls_back_everything(self):
  r=self.post(self.sale('11'));self.assertEqual(r.status_code,409,r.text);d=self.data();self.assertEqual(d['sales'],[]);self.assertEqual(d['saleItems'],[]);self.assertEqual(d['ledger'],[]);self.assertEqual(d['inventory'][0]['quantity'],4)
 def test_idempotency_no_double_sale(self):
  p={'request_id':str(uuid.uuid4()),**self.sale()};r=self.post(p);r2=self.post(p);self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json(),r2.json());self.assertEqual(len(self.data()['sales']),1)
  changed={**p,'discount':'1','payments':[{'account_id':self.account,'amount':'999'}]};self.assertEqual(self.post(changed).status_code,409)
 def test_missing_cost_stays_unknown(self):
  mat=self.action('material',branch_id=self.branch,name='Maliyeti eksik',unit='kg',quantity='10',min_stock='1',date='2026-09-30')['id'];pr=self.action('product',name='Bilinmeyen maliyetli ürün',category='Balık',price='100',vat_rate='10')['id'];self.action('recipe',product_id=pr,material_id=mat,quantity='1');self.action('move',branch_id=self.branch,material_id=mat,kind='in',quantity='2',cost='30',reason='Alış',date='2026-09-30')
  self.assertIsNone(next(m for m in self.data()['materials'] if m['id']==mat)['cost_cents']);p=self.sale('1',items=[{'product_id':pr,'quantity':'1'}],payments=[{'account_id':self.account,'amount':'100'}]);r=self.post(p);self.assertEqual(r.status_code,200,r.text);self.assertIsNone(self.data()['sales'][0]['cost_cents'])
 def test_pay_expense_no_double_count_and_reverse(self):
  id=self.action('expense',branch_id=self.branch,name='Test kira',category='Kira',kind='expense',amount='1100',vat_rate='10',date='2026-09-30',due_date='2026-10-01',status='pending')['id'];self.assertEqual(len(self.data()['ledger']),0)
  self.action('pay_expense',branch_id=self.branch,id=id,account_id=self.account,date='2026-09-30');self.assertEqual(len(self.data()['expenses']),1);self.assertEqual(sum(l['amount_cents'] for l in self.data()['ledger']),-110000)
  self.assertEqual(self.post({'action':'pay_expense','branch_id':self.branch,'id':id,'account_id':self.account,'date':'2026-09-30'}).status_code,409)
  self.action('reverse_expense',branch_id=self.branch,id=id,reason='Test düzeltme',date='2026-09-30');self.assertEqual(sum(l['amount_cents'] for l in self.data()['ledger']),0)
 def test_csrf_tenant_and_branch_boundaries(self):
  self.assertEqual(self.client.post('/api/action',json={'action':'branch','name':'Yetkisiz','request_id':str(uuid.uuid4())}).status_code,403)
  self.action('member',name='Test müdürü',email='manager@example.test',password='ManagerPass123!',role='Şube Müdürü',member_branch_id=self.branch)
  with TestClient(app) as manager:
   a=manager.post('/api/auth/login',json={'email':'manager@example.test','password':'ManagerPass123!'}).json();csrf=a['csrf'];self.assertEqual(manager.get('/api/state').status_code,403)
   a=manager.post('/api/auth/password',json={'current':'ManagerPass123!','password':'ManagerNewPass123!'},headers={'X-CSRF-Token':csrf});self.assertEqual(a.status_code,200,a.text);csrf=a.json()['csrf'];d=manager.get('/api/state').json();self.assertEqual(len(d['branches']),1)
   r=self.post({'action':'account','branch_id':self.other,'name':'Wrong branch','type':'cash','opening':'0'},manager,csrf);self.assertEqual(r.status_code,403,r.text)
  with TestClient(app) as other:
   a=other.post('/api/auth/register',json={'name':'Other owner','company':'Other tenant','email':'other@example.test','password':'OtherPass123!'}).json();d=other.get('/api/state').json();self.assertEqual(d['products'],[]);self.assertEqual(d['branches'],[])
   r=self.post(self.sale(),other,a['csrf']);self.assertEqual(r.status_code,404,r.text)
 def test_stock_transfer_conserves_inventory(self):
  self.action('move',branch_id=self.branch,target_branch_id=self.other,material_id=self.mat,kind='transfer',quantity='1.25',reason='Test transfer',date='2026-09-30');d=self.data();self.assertEqual(sum(i['quantity'] for i in d['inventory']),4);self.assertEqual(len([m for m in d['moves'] if m['kind'].startswith('transfer')]),2)
 def test_excel_export_is_valid_and_not_formula(self):
  self.action('expense',branch_id=self.branch,name='=SUM(A1:A2)',category='Diğer',amount='100',vat_rate='0',date='2026-09-30',status='pending')
  r=self.client.get('/api/export?kind=expenses&start=2026-09-01&end=2026-09-30');self.assertEqual(r.status_code,200,r.text)
  with zipfile.ZipFile(io.BytesIO(r.content)) as z:
   from xml.etree import ElementTree
   for n in z.namelist():ElementTree.fromstring(z.read(n))
   xml=z.read('xl/worksheets/sheet1.xml').decode();self.assertIn('=SUM(A1:A2)',xml);self.assertNotIn('<f>',xml)

 def test_turkish_export_captions_keep_stored_codes(self):
  self.action('sale',branch_id=self.branch,channel='Online sipariş',date='2026-09-30',discount='0',items=[{'product_id':self.product,'quantity':'1'}],payments=[{'account_id':self.account,'amount':'500'}])
  self.action('expense',branch_id=self.branch,name='Test gider',category='Diğer',kind='expense',amount='100',vat_rate='0',date='2026-09-30',status='pending')
  def captions(kind):
   response=self.client.get(f'/api/export?kind={kind}&start=2026-09-01&end=2026-09-30')
   self.assertEqual(response.status_code,200,response.text)
   with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
    from xml.etree import ElementTree
    root=ElementTree.fromstring(archive.read('xl/worksheets/sheet1.xml'))
    return [node.text for node in root.iter() if node.tag.endswith('}t')]
  sales=captions('sales');expenses=captions('expenses');ledger=captions('ledger')
  self.assertIn('Tamamlandı',sales);self.assertIn('İnternet siparişi',sales)
  self.assertIn('Ödeme bekliyor',expenses);self.assertIn('İşletme gideri',expenses)
  self.assertIn('Satış tahsilatı',ledger)
  for raw in ['completed','pending','expense','sale']:
   self.assertNotIn(raw,sales+expenses+ledger)
  data=self.data()
  self.assertEqual(data['sales'][0]['status'],'completed')
  self.assertEqual(data['sales'][0]['channel'],'Online sipariş')
  self.assertEqual(data['expenses'][0]['status'],'pending')
  self.assertEqual(data['expenses'][0]['kind'],'expense')

if __name__=='__main__':unittest.main(verbosity=2)
