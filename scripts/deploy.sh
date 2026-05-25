#!/bin/bash

set -e

echo "Starting deployment..."


if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "Logging into GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

echo "Pulling latest Docker image..."
docker-compose pull app

echo "Restarting services..."
docker-compose down
docker-compose up -d

echo "Waiting for postgres to be ready..."
sleep 5

echo "Running database migrations..."

echo "Initialising migrations table..."
docker-compose exec -T postgres psql -U $POSTGRES_USER -d twotogether < "database/migration-000-init-migrations-table.sql" 2>&1 | grep -v "NOTICE" || true

for migration in $(ls database/migration-*.sql | sort -V); do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")

        already_applied=$(docker-compose exec -T postgres psql -U $POSTGRES_USER -d twotogether -tAc \
            "SELECT COUNT(*) FROM _migrations WHERE migration_name = '$migration_name'" 2>/dev/null || echo "0")

        if [ "$already_applied" = "0" ]; then
            echo "Running $migration_name..."
            if docker-compose exec -T postgres psql -U $POSTGRES_USER -d twotogether < "$migration" 2>&1 | grep -v "NOTICE"; then
                docker-compose exec -T postgres psql -U $POSTGRES_USER -d twotogether -c \
                    "INSERT INTO _migrations (migration_name) VALUES ('$migration_name') ON CONFLICT (migration_name) DO NOTHING" >/dev/null 2>&1
                echo "✓ $migration_name applied successfully"
            else
                echo "✗ $migration_name failed"
            fi
        else
            echo "⊘ $migration_name already applied, skipping"
        fi
    fi
done

echo "Renewing SSL certificate if needed..."
if docker-compose run --rm certbot renew --webroot -w /var/www/certbot --quiet; then
    docker-compose exec -T nginx nginx -s reload || true
    echo "✓ Certificate renewal check completed"
else
    echo "⚠ Certificate renewal check failed (continuing)"
fi

echo "Checking container status..."
docker-compose ps

echo "Deployment completed successfully!"
