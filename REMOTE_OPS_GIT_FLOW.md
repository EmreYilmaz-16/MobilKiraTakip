# Remote Ops Git Flow

Bu akisin amaci, sunucuda elle uygulanmis runtime hotfix'leri git uzerinden temiz ve tekrar edilebilir bir commit setine donusturmektir.

## Kapsam

- Sunucu yolu: `/home/pbs/docker-stack/MobilKiraTakip`
- Hedef: remote ortamda elde degistirilmis dosyalari git ile izlenir hale getirmek
- Commit siniri: sadece production stabilizasyonuna ait dosyalar

## Commit Siniri

Remote ops commit'ine sadece bu tur dosyalar girmeli:

- `backend/src/app.js`
- `nginx/nginx.conf`
- gerekli ise deployment tarafinda degisen kucuk compose/runtime dosyalari

Asagidaki genis feature seti bu commit'e karismamali:

- organization yonetimi
- yeni controller ve route dosyalari
- frontend organization ekranlari
- pazarlama veya dokumantasyon dosyalari

## Uygulama Akisi

1. Sunucuda repo durumunu netlestir.
2. Sadece runtime hotfix dosyalarinin diff'ini ayristir.
3. Gerekirse gecici bir branch'te remote commit'i olustur.
4. Ayni diff'i local repoda esle ve kalici hale getir.
5. Test et, sonra deployment'i git kaynakli hale getir.

## Komut Akisi

```bash
cd /home/pbs/docker-stack/MobilKiraTakip
git status --short
git diff -- backend/src/app.js nginx/nginx.conf docker-compose.yml
git switch -c ops/remote-runtime-stabilization
git add backend/src/app.js nginx/nginx.conf docker-compose.yml
git commit -m "ops: capture remote runtime stabilization"
```

Eger `docker-compose.yml` remote'da degismediyse staging'e dahil edilmemeli.

## Local Esleme

Remote commit olustuktan sonra local tarafta ayni dosya seti su commit siniriyla tutulmali:

- local stabilizasyon commit'i: compose migration + proxy/health stabilizasyonu
- remote ops commit'i: sunucuda elle uygulanmis runtime hotfix'lerin git'e alinmasi

Remote diff local'e birebir alinacaksa:

```bash
git show --stat HEAD
git show HEAD -- backend/src/app.js nginx/nginx.conf docker-compose.yml
```

Bu cikti local repodaki ilgili dosyalarla karsilastirilip fark varsa ayni degisiklik local commit'e degil, ops commit zincirine alinmali.

## Dogrulama

Remote commit hazirlandiktan sonra sunucuda su kontroller zorunlu:

```bash
docker compose config
docker compose up -d --build backend nginx
curl -I http://127.0.0.1:9080/health
curl -s http://127.0.0.1:9080/api/v1/health
```

Beklenen sonuc:

- `/health` 200
- `/api/v1/health` 200
- login akisi nginx uzerinden calisiyor

## Not

Remote sunucuda dogrudan yapilan degisiklikler kalici kaynak olmamali. Hedef, sunucudaki diff'i tek seferlik toparlayip sonraki deploy'lari sadece git commit'lerinden uretmektir.