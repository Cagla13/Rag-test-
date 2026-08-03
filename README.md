# Akıllı Kredi Karar Motoru (AI Credit Decision Engine)

Bu proje, kredi başvuru verilerini yapılandırılmış PDF belgelerine dönüştüren ve **RAG (Retrieval-Augmented Generation)** benzeri bir yaklaşımla yerel yapay zeka modellerini kullanarak bu belgeleri analiz eden akıllı bir finansal karar motorudur.

##  Projenin Gelişim Süreci ve Mimari

Proje başlangıçta hızlı konsept ispatı (PoC) amacıyla **tek bir dosya (single-file)** üzerinde geliştirilmiş monolitik bir yapıdaydı. API, yapay zeka iş mantığı ve ön yüz statik sunumu aynı dosya üzerinden yönetiliyordu. 

Daha sonra projenin ölçeklenebilirliğini artırmak, Docker ortamında bağımsız servisler olarak çalışmasını sağlamak ve temiz kod (clean code) prensiplerine uymak amacıyla modern bir klasör mimarisine taşınmıştır:

*   **`frontend/`**: Kullanıcı arayüzü (HTML, JS, Bootstrap). Form validasyonları, dinamik vade hesaplama ve API istekleri (fetch) burada yönetilir.
*   **`backend/`**: FastAPI sunucusu. RAG süreçleri, LangChain entegrasyonu, PDF oluşturma/okuma ve iş kuralları burada koşar.
*   **`basvurular/`**: Sistem tarafından üretilen başvuru belgelerinin fiziksel olarak saklandığı dizindir.

##  Çalışma Mantığı ve RAG Akışı

Sistem, geleneksel veritabanı sorguları yerine belgeler üzerinden bağlamsal analiz (contextual analysis) yapar:

1.  **Veri Girişi & Belge Üretimi:** Kullanıcı arayüzden form verilerini gönderir. FastAPI bu verileri alarak `FPDF` kütüphanesi ile resmi bir "Kredi Başvuru Formu (PDF)" oluşturur.
2.  **Veri Okuma (Retrieval):** Oluşturulan dosya `PyMuPDF (fitz)` ile taranır ve belgedeki metin (context) yapısal olarak dışarı çıkarılır.
3.  **Yapay Zeka Analizi (Generation):** Çıkarılan bağlam metni, LangChain üzerinden yerel **Ollama (llama3.2:1b)** modeline özel bir prompt ile aktarılır. LLM belgedeki verileri analiz ederek geriye katı kurallı bir JSON objesi döndürür (Kullanıcı tipi, gelir, gider tespiti).
4.  **İş Kuralları & Karar:** AI tarafından doğrulanıp JSON olarak dönen veriler; risk çarpanları, gelir-gider dengesi ve yasal limit kontrollerinden geçirilir.
5.  **Sonuç:** Çıkan onay/ret kararı, hem arayüze JSON formatında döndürülür hem de orijinal PDF belgesinin sonuna damgalanır.

##  Kurulum ve Çalıştırma

Proje konteynerize edilmiş olup, tüm gereksinimler Docker üzerinden otomatik ayağa kalkar.

### Gereksinimler
*   Docker ve Docker Compose

### Adımlar
1. Proje dizininde terminali açın.
2. Aşağıdaki komut ile imajları inşa edip servisleri başlatın:
   ```bash
   docker-compose up --build
