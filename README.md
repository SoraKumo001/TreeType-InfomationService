# tree-type-infomation-service

ツリー型情報掲載システム

## ターゲット

- Node.js + PostgreSQL9.5以降

## 更新履歴

- 2019/06/24 1.0.0 初期バージョン

## 使い方

- 各種コンパイル

```.sh
npm run build-jwf
npm run build-public
npm run build-app
```

- 実行

```.sh
npm start
```

- pm2で実行する場合

```.sh
pm2 start
```

- 確認

```.sh
http://localhost:8080/
```

## ポート番号の変更やUNIXドメインソケットを使用する場合  

```.sh
src/app/index.ts  
```

を変更して、  

```.sh
npm run build-app  
```

で再コンパイルしてください  

## nginxから使用する場合

```sample.conf
//pm2でマルチプロセスを使う場合は最後の数字を加算したものを追加
upstream TreeType-InfomationService{
    server unix:/配置バス/dist/sock/app.sock.0;
}

server {
    listen 443 ssl http2;
    server_name  ドメイン名;
    index index.html index.htm;
    charset UTF-8;
    client_max_body_size 100M;

    ssl_certificate /sslキーのパス/fullchain.pem;
    ssl_certificate_key //sslキーのパス/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets on;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    gzip on;
    gzip_types text/html text/css image/svg+xml application/javascript application/json;
    http2_push_preload on;

    location ~ /\. {
        return 404;
    }

    #最後にスラッシュを付けない(リモートパス部分が存在しないなら、そもそも記述不要)
    location /リモートパス {
        alias /配置バス/dist/public/;
    }
    #最後にスラッシュを付ける(location_pathを設定しないとサーバプッシュに失敗する)
    location = /リモートパス/ {
        proxy_pass http://TreeType-InfomationService/;
        proxy_set_header location_path /リモートパス;
    }
}
```

## ライセンス

- [MIT License](https://opensource.org/licenses/mit-license.php)
