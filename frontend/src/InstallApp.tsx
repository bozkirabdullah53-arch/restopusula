import { useEffect, useState } from "react";
import { Download, MonitorSmartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./install.css";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
const dismissalKey = "restopusula.install.dismissed-until";
const week = 7 * 24 * 60 * 60 * 1000;

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
function shouldOffer() {
  try { return Number(window.localStorage.getItem(dismissalKey) || 0) <= Date.now(); }
  catch { return true; }
}

function instructions() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return [
    "Bu sayfayı Safari’de açın ve Paylaş düğmesine dokunun.",
    "Ana Ekrana Ekle seçeneğini seçin. Görünmüyorsa paylaşım listesini aşağı kaydırın.",
    "Varsa Uygulama Olarak Aç seçeneğini açık tutun ve Ekle’ye dokunun.",
  ];
  if (/Android/i.test(ua)) return [
    "Bu sayfayı Chrome’da açın ve sağ üstteki üç nokta menüsüne dokunun.",
    "Uygulamayı yükle veya Ana ekrana ekle seçeneğini seçin.",
    "Yükle / Ekle düğmesiyle onaylayın. RestoPusula simgesi ana ekranınızda görünür.",
  ];
  if (/Macintosh|Mac OS X/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) return [
    "Safari’nin Dosya menüsünü açın.",
    "Dock’a Ekle seçeneğini seçin (macOS Sonoma ve sonrası).",
    "Adını RestoPusula olarak bırakıp Ekle’ye tıklayın.",
  ];
  return [
    "Chrome veya Edge’de adres çubuğundaki uygulama yükleme simgesine tıklayın; tarayıcı menüsündeki Uygulamayı yükle seçeneğini de kullanabilirsiniz.",
    "Yükle’ye tıklayın. Varsa masaüstü kısayolu oluşturma seçeneğini işaretleyin.",
    "Yükleme seçeneği görünmüyorsa tarayıcı menüsünde Kısayol oluştur’u kullanın veya Chrome / Edge ile yeniden açın.",
  ];
}

export default function InstallApp() {
  const [installed, setInstalled] = useState(isInstalled);
  const [offer, setOffer] = useState(shouldOffer);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const filePreview = window.location.protocol === "file:";

  useEffect(() => {
    if (filePreview) return;
    const mode = window.matchMedia("(display-mode: standalone)");
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const syncMode = () => setInstalled(isInstalled());
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
      setOpen(false);
      setOffer(false);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    mode.addEventListener("change", syncMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
      mode.removeEventListener("change", syncMode);
    };
  }, [filePreview]);

  function dismiss() {
    setOffer(false);
    try { window.localStorage.setItem(dismissalKey, String(Date.now() + week)); }
    catch { /* Private browsing must not prevent using the application. */ }
  }
  async function install() {
    if (!prompt) { setMessage(""); setOpen(true); return; }
    const event = prompt;
    setPrompt(null); // A browser installation event can be used only once.
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") dismiss();
    } catch {
      setMessage("Yükleme penceresi açılamadı. Aşağıdaki adımlarla kısayol ekleyebilirsiniz.");
      setOpen(true);
    } finally { setBusy(false); }
  }

  if (installed || filePreview) return null;
  return (
    <section className="install-area" aria-label="Uygulama kısayolu">
      {offer ? (
        <div className="install-offer" aria-label="Uygulama kısayolu önerisi">
          <MonitorSmartphone aria-hidden="true" size={24} />
          <div className="install-copy">
            <strong>RestoPusula’ya tek dokunuşla ulaşın</strong>
            <p>Masaüstünüze veya telefonunuzun ana ekranına uygulama kısayolu ekleyin.</p>
          </div>
          <div className="install-actions">
            <Button onClick={install} disabled={busy}><Download size={16} aria-hidden="true" />{prompt ? "Uygulamayı yükle" : "Kısayol ekle"}</Button>
            <Button variant="ghost" onClick={dismiss} aria-label="Daha sonra"><X size={18} aria-hidden="true" /><span>Daha sonra</span></Button>
          </div>
        </div>
      ) : (
        <Button className="install-reopen" variant="ghost" onClick={install} disabled={busy}><Download size={15} aria-hidden="true" />{prompt ? "Uygulamayı yükle" : "Kısayol ekle"}</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="install-dialog">
          <DialogHeader>
            <DialogTitle>RestoPusula kısayolunu ekleyin</DialogTitle>
            <DialogDescription>Bu cihazda kısayol oluşturmak için aşağıdaki adımları izleyin.</DialogDescription>
          </DialogHeader>
          {message && <p role="status">{message}</p>}
          <ol>{instructions().map(step => <li key={step}>{step}</li>)}</ol>
          <p className="install-note">Kısayol bu uygulamayı açar. İşlemleriniz için internet bağlantısı gerekir.</p>
          {prompt && <Button onClick={install} disabled={busy}>Uygulamayı yükle</Button>}
          <Button variant="outline" onClick={() => setOpen(false)}>Tamam</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
