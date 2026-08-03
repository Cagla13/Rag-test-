$(document).ready(function() {

    
    $('.para-formati').on('input', function() {
        let temizSayi = $(this).val().replace(/\D/g, ''); 
        if (temizSayi !== '') {
            $(this).val(new Intl.NumberFormat('tr-TR').format(temizSayi));
        }
        vadeHesapla(); 
    });

   
    $('#musteriNo, #tckn').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

   
    function vadeHesapla() {
        let gelir = parseFloat($('#gelir').val().replace(/\./g, '')) || 0;
        let gider = parseFloat($('#gider').val().replace(/\./g, '')) || 0;
        let kredi = parseFloat($('#krediTutari').val().replace(/\./g, '')) || 0;

        let kalanButce = gelir - gider;
        let vadeKutusu = $('#vade');

        if (kredi > 0) {
            $('#vadeKutusu').fadeIn();
            vadeKutusu.empty(); 
            
            let oran = kalanButce / kredi;
            let onerilenVade = 36; 

            if (oran >= 0.8) {
                onerilenVade = 12;
            } else if (oran >= 0.5) {
                onerilenVade = 24;
            }

            const vadeSecenekleri = [12, 24, 36, 48, 60];
            vadeSecenekleri.forEach(v => {
                let etiket = `${v} Ay`; 
                let seciliMi = v === onerilenVade ? 'selected' : '';
                vadeKutusu.append(`<option value="${v}" ${seciliMi}>${etiket}</option>`);
            });

        } else {
            $('#vadeKutusu').fadeOut();
        }
    }

    const sonucModalNesnesi = new bootstrap.Modal(document.getElementById('sonucModal'));

    
    $('#krediFormu').on('submit', function(e) {
        e.preventDefault(); 

        
        if ($('#musteriNo').val().length < 8) {
            alert("Müşteri numarası en az 8 haneli olmalıdır.");
            $('#musteriNo').focus();
            return;
        }

        
        if ($('#tckn').val().length !== 11) {
            alert("T.C. Kimlik Numarası tam 11 haneli olmalıdır.");
            $('#tckn').focus();
            return;
        }

        $('#btnGonder').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Yapay Zeka İnceliyor...');
        $('#loadingDurumu').show();
        $('#sonucDurumu').hide();
        sonucModalNesnesi.show();

        const temizGelir = parseFloat($('#gelir').val().replace(/\./g, '')) || 0;
        const temizGider = parseFloat($('#gider').val().replace(/\./g, '')) || 0;
        const temizKredi = parseFloat($('#krediTutari').val().replace(/\./g, '')) || 0;
        const secilenVade = parseInt($('#vade').val() || 12);

       
        const formData = {
            kullanici_tipi: "Müşteri",
            musteri_no: $('#musteriNo').val(),
            personel_no: "-", 
            tckn: $('#tckn').val(),
            ad: $('#ad').val(),
            soyad: $('#soyad').val(),
            aylik_gelir: temizGelir,
            aylik_gider: temizGider,
            basvurulan_kredi_tutari: temizKredi,
            vade: secilenVade,
            aylik_taksit_tutari: temizKredi / secilenVade
        };

        fetch('http://127.0.0.1:8000/basvuru-degerlendir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) throw new Error("Sunucu Yanıt Vermedi!");
            return response.json();
        })
        .then(data => {
            yapayZekaKarariniGoster(data, formData); 
        })
        .catch(error => {
            $('#loadingDurumu').hide();
            $('#sonucDurumu').show();
            $('#sonucIkonu').html('<h1 style="color: #dc3545; font-size: 5rem;"><i class="fa-solid fa-triangle-exclamation"></i></h1>');
            $('#sonucBaslik').text("Bağlantı Hatası").css("color", "#dc3545");
            $('#sonucMesaji').text("Sisteme ulaşılamadı. Arka ucun çalıştığından emin olun.");
            $('#aiHesaplamaDetayi').hide();
        })
        .finally(() => {
            $('#btnGonder').prop('disabled', false).html('<i class="fa-solid fa-microchip fs-4"></i> <span>Başvuruyu Tamamla ve Değerlendir</span>');
        });
    });

    
    function yapayZekaKarariniGoster(data, orijinalData) {
        $('#loadingDurumu').hide();
        $('#sonucDurumu').fadeIn();
        $('#aiHesaplamaDetayi').show();

        const analiz = data.ai_analiz_sonucu || {};
        const tip = analiz.kullanici_tipi || orijinalData.kullanici_tipi;
        const carpan = 3;  
        
        let detayHTML = `
            <li><strong>AI Tespit Edilen Statü:</strong> ${tip} (Kredi Çarpanı: ${carpan}x)</li>
            <li><strong>AI Tespit Edilen Maaş:</strong> ${analiz.aylik_gelir || orijinalData.aylik_gelir} TL</li>
            <li><strong>Talep Edilen Kredi:</strong> ${analiz.basvurulan_kredi_tutari || orijinalData.basvurulan_kredi_tutari} TL</li>
        `;
        $('#aiDetayListesi').html(detayHTML);

    
        if (data.durum === "Onaylandı") {
            $('#sonucIkonu').html('<h1 style="color: #198754; font-size: 5rem;"><i class="fa-solid fa-circle-check"></i></h1>');
            $('#sonucBaslik').text("BAŞVURUNUZ ONAYA GÖNDERİLMİŞTİR!").css("color", "#198754");
            $('#sonucMesaji').html(`<strong>Tebrikler!</strong> ${data.mesaj || ''}`);
        } else if (data.durum === "Reddedildi") {
            $('#sonucIkonu').html('<h1 style="color: #dc3545; font-size: 5rem;"><i class="fa-solid fa-circle-xmark"></i></h1>');
            $('#sonucBaslik').text("İPTAL EDİLDİ").css("color", "#dc3545");
            $('#sonucMesaji').html(`<strong>Maalesef onaylanamadı:</strong> <br> ${data.mesaj || ''}`);
        } else if (data.durum === "Hata") {
            $('#sonucIkonu').html('<h1 style="color: #ffc107; font-size: 5rem;"><i class="fa-solid fa-triangle-exclamation"></i></h1>');
            $('#sonucBaslik').text("SİSTEMSEL HATA").css("color", "#ffc107");
            $('#sonucMesaji').html(`<strong>İşlem tamamlanamadı:</strong> <br> ${data.hata_detayi || data.mesaj}`);
            $('#aiHesaplamaDetayi').hide();
        } else {
            $('#sonucIkonu').html('<h1 style="color: #6c757d; font-size: 5rem;"><i class="fa-solid fa-circle-question"></i></h1>');
            $('#sonucBaslik').text("BİLİNMEYEN YANIT").css("color", "#6c757d");
            $('#sonucMesaji').html(`Sistemden beklenen formatta yanıt alınamadı.`);
        }
    }
});