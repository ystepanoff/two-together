#!/bin/bash

set -e

echo "Starting deployment..."


if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "Pulling latest Docker image..."
docker-compose pull

echo "Restarting services..."
docker-compose down
docker-compose up -d

echo "Running database migrations..."
for migration in database/migration-*.sql; do
    if [ -f "$migration" ]; then
        echo "Running $migration..."
        docker-compose exec -T postgres psql -U $POSTGRES_USER -d twotogether < "$migration" || true
    fi
done

echo "Checking container status..."
docker-compose ps

echo "Deployment completed successfully!"
