#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "Initialising SSL certificates for $DOMAIN..."

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

echo "Starting temporary nginx for ACME challenge..."
docker run -d --name nginx-temp \
    -p 80:80 \
    -v "$(pwd)/nginx/nginx-temp.conf:/etc/nginx/nginx.conf:ro" \
    -v twotogether_certbot-data:/var/www/certbot \
    nginx:alpine

sleep 5

echo "Obtaining SSL certificate from Let's Encrypt..."
docker run --rm \
    -v twotogether_certbot-data:/var/www/certbot \
    -v twotogether_letsencrypt:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal \
    -d $DOMAIN

echo "Cleaning up temporary nginx..."
docker stop nginx-temp
docker rm nginx-temp

echo "Updating nginx configuration..."
sed -i.bak "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.conf
rm nginx/nginx.conf.bak

echo "Starting full application stack..."
docker-compose up -d

echo "SSL certificate obtained successfully!"
echo "Your site should now be available at https://$DOMAIN"
