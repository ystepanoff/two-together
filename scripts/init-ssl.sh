#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "Initializing SSL certificates for $DOMAIN..."

mkdir -p nginx/ssl
cat > nginx/nginx-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF

docker-compose up -d nginx

sleep 5

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

sed -i.bak "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.conf
rm nginx/nginx.conf.bak

docker-compose down
docker-compose up -d

echo "SSL certificate obtained successfully!"
echo "Your site should now be available at https://$DOMAIN"
