"""Turkish captions for human-readable output; never change persisted codes."""
LABELS = {
    'completed': 'Tamamlandı', 'pending': 'Ödeme bekliyor', 'paid': 'Ödendi',
    'reversed': 'Ters kayıt', 'open': 'Açık',
    'expense': 'İşletme gideri', 'purchase': 'Alış faturası', 'tax': 'Mali yükümlülük',
    'sale': 'Satış tahsilatı', 'sale_reversal': 'Satış iadesi',
    'expense_reversal': 'Gider ters kaydı', 'in': 'Giriş', 'out': 'Çıkış',
    'opening': 'Açılış', 'count': 'Sayım', 'cash_count': 'Kasa sayım farkı',
    'waste': 'Fire', 'transfer': 'Transfer', 'transfer_in': 'Gelen transfer',
    'transfer_out': 'Giden transfer', 'sales': 'Satış', 'expenses': 'Gider',
    'inventory': 'Stok', 'ledger': 'Hesap', 'Online sipariş': 'İnternet siparişi',
}
def code_label(value):
    return LABELS.get(value, value)
def role_label(value):
    return 'İşletme sahibi' if value == 'Patron' else value
def note_label(value):
    return 'Tarife göre malzeme tüketimi' if value == 'Reçete tüketimi' else value
