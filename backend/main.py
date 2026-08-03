import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fpdf import FPDF
import fitz  # PyMuPDF
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

app = FastAPI(title="Akıllı Kredi Karar Motoru API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class KrediBasvuruFormu(BaseModel):
    kullanici_tipi: str 
    musteri_no: str
    personel_no: str 
    ad: str
    soyad: str
    tckn: str
    aylik_gelir: float
    aylik_gider: float  
    basvurulan_kredi_tutari: float
    vade: int
    aylik_taksit_tutari: float


def tr_to_en(metin: str) -> str:
    if not isinstance(metin, str):
        metin = str(metin)
    tr_harfler = "ğüşıöçĞÜŞİÖÇ"
    en_harfler = "gusiocGUSIOC"
    tablo = str.maketrans(tr_harfler, en_harfler)
    return metin.translate(tablo)


def basvuru_pdf_olustur(data: KrediBasvuruFormu, dosya_yolu: str, sonuc: str = None, mesaj: str = None):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    pdf.cell(200, 10, txt="KREDI BASVURU FORMU", ln=True, align='C')
    pdf.cell(200, 10, txt="-"*50, ln=True, align='C')
    
    pdf.cell(200, 10, txt=f"Kullanici Tipi: {tr_to_en(data.kullanici_tipi)}", ln=True)
    pdf.cell(200, 10, txt=f"Musteri No: {tr_to_en(data.musteri_no)} (Personel: {tr_to_en(data.personel_no)})", ln=True)
    pdf.cell(200, 10, txt=f"Ad Soyad: {tr_to_en(data.ad)} {tr_to_en(data.soyad)}", ln=True)
    pdf.cell(200, 10, txt=f"TCKN: {tr_to_en(data.tckn)}", ln=True)
    pdf.cell(200, 10, txt=f"Aylik Gelir: {data.aylik_gelir} TL", ln=True)
    pdf.cell(200, 10, txt=f"Aylik Gider: {data.aylik_gider} TL", ln=True)
    pdf.cell(200, 10, txt=f"Kredi Tutari: {data.basvurulan_kredi_tutari} TL", ln=True)
    pdf.cell(200, 10, txt=f"Vade: {data.vade} Ay", ln=True)
    pdf.cell(200, 10, txt=f"Aylik Taksit: {data.aylik_taksit_tutari} TL", ln=True)
    
    if sonuc and mesaj:
        pdf.cell(200, 10, txt="", ln=True)
        pdf.cell(200, 10, txt="-"*50, ln=True, align='C')
        pdf.set_font("Arial", 'B', 14)
        pdf.cell(200, 10, txt=f"YAPAY ZEKA KARARI: {tr_to_en(sonuc).upper()}", ln=True)
        pdf.set_font("Arial", size=12)
        pdf.multi_cell(0, 10, txt=f"Detay: {tr_to_en(mesaj)}")
        
    pdf.output(dosya_yolu)

@app.post("/api/v1/kredi-degerlendir")
async def kredi_basvurusu_degerlendir(form_data: KrediBasvuruFormu):
    print("\n--- YENİ BAŞVURU İSTEĞİ GELDİ ---")
    
    try:
        os.makedirs("basvurular", exist_ok=True)
        pdf_yolu = f"basvurular/{form_data.tckn}_basvuru.pdf"
        
      
        basvuru_pdf_olustur(form_data, pdf_yolu)
        
       
        pdf_document = fitz.open(pdf_yolu)
        pdf_metni = ""
        for page_num in range(len(pdf_document)):
            pdf_metni += pdf_document.load_page(page_num).get_text()
            
        
        llm = ChatOllama(
            model="llama3.2:1b", 
            temperature=0, 
            format="json",
            base_url="http://host.docker.internal:11434"
        )
        
        prompt = ChatPromptTemplate.from_template("""
        Aşağıdaki metin bir kredi başvuru formudur. Lütfen metni analiz et ve aşağıdaki bilgileri 
        kesinlikle sadece geçerli bir JSON formatında çıkar. Değerler kesinlikle sayı (float/int) olmalıdır, metin (string) veya 'TL' ibaresi içermemelidir:
        "kullanici_tipi", "aylik_gelir", "aylik_gider", "basvurulan_kredi_tutari", "aylik_taksit_tutari"
        
        Metin: {context}
        """)
        
        chain = prompt | llm | JsonOutputParser()
        ai_verileri = chain.invoke({"context": pdf_metni})

        ai_tip = str(ai_verileri.get("kullanici_tipi", form_data.kullanici_tipi))
        
        def guvenli_float(deger):
            try:
                if isinstance(deger, str):
                    deger = ''.join(c for c in deger if c.isdigit() or c == '.')
                return float(deger) if deger else 0.0
            except ValueError:
                return 0.0

        ai_gelir = guvenli_float(ai_verileri.get("aylik_gelir", form_data.aylik_gelir))
        ai_gider = guvenli_float(ai_verileri.get("aylik_gider", form_data.aylik_gider))
        ai_kredi = guvenli_float(ai_verileri.get("basvurulan_kredi_tutari", form_data.basvurulan_kredi_tutari))
        ai_taksit = guvenli_float(ai_verileri.get("aylik_taksit_tutari", form_data.aylik_taksit_tutari))
        
        
        kredi_ust_limit_carpani = 5 if form_data.kullanici_tipi.lower() == "personel" else 3
        max_kredi_limiti = ai_gelir * kredi_ust_limit_carpani

        if ai_kredi > max_kredi_limiti:
            sonuc = "Reddedildi"
            mesaj = f"Kredi reddedildi. {ai_tip} statüsündeki kullanıcılar, maaşlarının en fazla {kredi_ust_limit_carpani} katı kadar ({max_kredi_limiti} TL) kredi kullanabilir."
        elif ai_gelir <= (ai_gider + ai_taksit):
            sonuc = "Reddedildi"
            mesaj = "Kredi reddedildi. Aylık maaşınız, mevcut giderleriniz ve yeni kredi taksitinizin toplamını karşılamak için yetersiz."
        else:
            sonuc = "Onaylandı"
            mesaj = "Yapay zeka kontrolleri başarılı. Gelir/gider dengesi ve risk skoru uygun, kredi onaylandı."
            
        print(f">>> KARAR MOTORU SONUCU: {sonuc} | Mesaj: {mesaj}")
        
       
        basvuru_pdf_olustur(form_data, pdf_yolu, sonuc=sonuc, mesaj=mesaj)

        return {
            "durum": sonuc,
            "mesaj": mesaj,
            "ai_analiz_sonucu": ai_verileri,
            "kaydedilen_dosya": pdf_yolu
        }
        
    except Exception as e:
        hata_mesaji = f"Sistemsel Hata: {str(e)}"
        print(f">>> KARAR MOTORU HATASI: {hata_mesaji}")
        return {
            "durum": "Hata",
            "mesaj": "İşlem sırasında bir hata oluştu, lütfen arayüzden tekrar deneyin.",
            "hata_detayi": hata_mesaji
        }


@app.get("/")
async def ana_sayfa():
    return FileResponse('../frontend/index.html')

app.mount("/", StaticFiles(directory="."), name="static")