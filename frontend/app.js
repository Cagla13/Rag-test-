$(document).ready(function() {

    $('input[name="kullaniciTipi"]').on('change', function() {
        if ($('#btnPersonel').is(':checked')) {
            $('#musteriNoKutusu').slideUp();
            $('#musteriNo').removeAttr('required').val('');
            $('#musteriNoUyari').hide();
        } else {
            $('#musteriNoKutusu').slideDown();
            $('#musteriNo').attr('required', 'required');
        }
    });

    
    $('#krediTutari').on('input', function() {
        var tutar = parseFloat($(this).val());
        if (tutar > 0) {
            $('#vadeKutusu').fadeIn();
        } else {
            $('#vadeKutusu').fadeOut();
        }
    });

    $('#musteriNo, #tckn').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

   
    $('#krediFormu').on('submit', function(e) {
        e.preventDefault(); 

        if ($('#btnMusteri').is(':checked') && $('#musteriNo').val().length < 8) {
            $('#musteriNo').focus();
            return;
        }

       
        $('#btnGonder').prop('disabled', true).text('İşleniyor...');

   
        $('#loadingDurumu').show();
        $('#sonucDurumu').hide();
        var sonucModal = new bootstrap.Modal(document.getElementById('sonucModal'));
        sonucModal.show();

        const formData = {
            kullanici_tipi: $('input[name="kullaniciTipi"]:checked').val(),
            musteri_no: $('#btnPersonel').is(':checked') ? "-" : $('#musteriNo').val(),
            tckn: $('#tckn').val(),
            ad: $('#ad').val(),
            soyad: $('#soyad').val(),
            aylik_gelir: parseFloat($('#gelir').val()),
            aylik_gider: parseFloat($('#gider').val()),
            basvurulan_kredi_tutari: parseFloat($('#krediTutari').val()),
            vade: parseInt($('#vade').val() || 12),
            aylik_taksit_tutari: parseFloat($('#krediTutari').val()) / parseInt($('#vade').val() || 12)
        };

        console.log("Yapay Zekaya İstek Gidiyor...", formData);

        fetch('http://127.0.0.1:8000/basvuru-degerlendir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Sunucu yanıt vermedi, Hata Kodu: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Yapay Zeka Cevabı Geldi:", data);
            yapayZekaKarariniGoster(data); 
        })
        .catch(error => {
            console.error('Fetch Hatası:', error);
            $('#loadingDurumu').hide();
            $('#sonucDurumu').show();
            $('#sonucIkonu').html('<h1 style="color: #dc3545; font-size: 4rem;">!</h1>');
            $('#sonucBaslik').text("Bağlantı Hatası").css("color", "#dc3545");
            $('#sonucMesaji').text("Sisteme ulaşılamadı. Lütfen konsolu (F12) kontrol edin.");
        })
        .finally(() => {
           
            $('#btnGonder').prop('disabled', false).text('Başvuruyu Tamamla ve Değerlendir');
        });
    });

    function yapayZekaKarariniGoster(data) {
    
        $('#loadingDurumu').hide();
        $('#sonucDurumu').show();

        if (data.durum === "Onaylandı") {
            $('#sonucIkonu').html('<h1 style="color: #198754; font-size: 4rem;">✓</h1>');
            $('#sonucBaslik').text("Başvuru Onaylandı").css("color", "#198754");
            $('#sonucMesaji').text(data.mesaj);
        } else if (data.durum === "Reddedildi") {
            $('#sonucIkonu').html('<h1 style="color: #dc3545; font-size: 4rem;">✗</h1>');
            $('#sonucBaslik').text("Başvuru Reddedildi").css("color", "#dc3545");
            $('#sonucMesaji').text(data.mesaj);
        } else {
            $('#sonucIkonu').html('<h1 style="color: #ffc107; font-size: 4rem;">⚠</h1>');
            $('#sonucBaslik').text("Sistemsel Hata").css("color", "#ffc107");
            $('#sonucMesaji').text(data.hata_detayi || data.mesaj);
        }
    }
});