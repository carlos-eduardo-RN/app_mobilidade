# VouDeMoto - Docker Development Guide

## 🚀 Quick Start

### Prerequisites
- Docker 24.0+
- Docker Compose 2.20+
- 4GB RAM minimum
- 10GB disk space

### Start All Services

```bash
# Clone repository
git clone https://github.com/voudemoto/backend.git
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### Service URLs
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MongoDB**: localhost:27017
- **NGINX**: http://localhost

## 📦 Services

### Backend API
```bash
# Rebuild and restart
docker-compose up -d --build backend

# View logs
docker-compose logs -f backend

# Execute commands inside container
docker-compose exec backend sh
docker-compose exec backend npm run test
```

### PostgreSQL
```bash
# Connect to database
docker-compose exec postgres psql -U voudemoto -d voudemoto

# Run migrations
docker-compose exec backend npm run migrate

# Seed database
docker-compose exec backend npm run seed

# Backup database
docker-compose exec postgres pg_dump -U voudemoto voudemoto > backup.sql

# Restore database
docker-compose exec -T postgres psql -U voudemoto voudemoto < backup.sql
```

### Redis
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli -a dev_password_change_in_production

# Monitor Redis commands
docker-compose exec redis redis-cli -a dev_password_change_in_production MONITOR

# Check keys
docker-compose exec redis redis-cli -a dev_password_change_in_production KEYS "*"

# Flush all data (WARNING: deletes everything)
docker-compose exec redis redis-cli -a dev_password_change_in_production FLUSHALL
```

### MongoDB
```bash
# Connect to MongoDB shell
docker-compose exec mongodb mongosh -u admin -p dev_password_change_in_production

# Show databases
docker-compose exec mongodb mongosh -u admin -p dev_password_change_in_production --eval "show dbs"

# Backup MongoDB
docker-compose exec mongodb mongodump --username admin --password dev_password_change_in_production --authenticationDatabase admin --out /backup

# Restore MongoDB
docker-compose exec mongodb mongorestore --username admin --password dev_password_change_in_production --authenticationDatabase admin /backup
```

### NGINX
```bash
# Test configuration
docker-compose exec nginx nginx -t

# Reload configuration
docker-compose exec nginx nginx -s reload

# View access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# View error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## 🛠️ Development Workflow

### Hot Reload Development
```bash
# Mount source code for hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# The backend service will restart on code changes
```

### Run Tests
```bash
# Run all tests
docker-compose exec backend npm test

# Run specific test file
docker-compose exec backend npm test -- ratings.test.ts

# Run tests with coverage
docker-compose exec backend npm run test:coverage

# Run tests in watch mode
docker-compose exec backend npm run test:watch
```

### Database Migrations
```bash
# Create new migration
docker-compose exec backend npm run migrate:create -- add_new_table

# Run migrations
docker-compose exec backend npm run migrate:up

# Rollback last migration
docker-compose exec backend npm run migrate:down

# Reset database (WARNING: deletes all data)
docker-compose exec backend npm run migrate:reset
```

### Code Quality
```bash
# Lint code
docker-compose exec backend npm run lint

# Format code
docker-compose exec backend npm run format

# Type check
docker-compose exec backend npm run type-check
```

## 🔧 Troubleshooting

### Services won't start
```bash
# Check if ports are already in use
netstat -an | grep "3000\|5432\|6379\|27017"

# Stop all services and remove volumes
docker-compose down -v

# Remove all containers and images
docker-compose down --rmi all -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Database connection issues
```bash
# Check if database is ready
docker-compose exec postgres pg_isready -U voudemoto

# Recreate database
docker-compose down postgres
docker volume rm backend_postgres_data
docker-compose up -d postgres

# Wait for database to be ready
docker-compose exec backend npm run wait-for-db
```

### Performance issues
```bash
# Check container resources
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > 4GB+

# Clean up unused containers and images
docker system prune -a

# Remove unused volumes
docker volume prune
```

### View container logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend

# Follow logs (real-time)
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 30m backend
```

## 📊 Monitoring

### Health Checks
```bash
# Check all services health
docker-compose ps

# Backend health
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready -U voudemoto

# Redis health
docker-compose exec redis redis-cli -a dev_password_change_in_production PING

# MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Resource Usage
```bash
# Real-time resource usage
docker stats

# Service resource limits
docker-compose exec backend cat /sys/fs/cgroup/memory/memory.limit_in_bytes
docker-compose exec backend cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us
```

## 🧹 Cleanup

### Stop Services
```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend

# Stop and remove containers
docker-compose down
```

### Remove Data
```bash
# Remove containers and volumes (WARNING: deletes all data)
docker-compose down -v

# Remove specific volume
docker volume rm backend_postgres_data

# List volumes
docker volume ls
```

### Clean System
```bash
# Remove unused containers, networks, images
docker system prune

# Remove all unused resources including volumes
docker system prune -a --volumes

# Check disk usage
docker system df
```

## 🔐 Security

### Change Default Passwords
```bash
# Edit .env file and change all passwords
nano .env

# Recreate services with new passwords
docker-compose down
docker-compose up -d
```

### SSL/TLS in Production
```bash
# Uncomment HTTPS server block in nginx.conf
# Add SSL certificates to nginx/certs/

# Obtain Let's Encrypt certificate
docker run -it --rm \
  -v /path/to/nginx/certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d voudemoto.com -d www.voudemoto.com

# Restart NGINX
docker-compose restart nginx
```

## 📝 Environment Variables

### Required Variables
- `POSTGRES_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `MONGO_PASSWORD`: MongoDB password
- `JWT_SECRET`: JWT secret (min 32 chars)
- `JWT_REFRESH_SECRET`: JWT refresh secret (min 32 chars)

### Optional Variables
- `STRIPE_SECRET_KEY`: Stripe API key
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `SENDGRID_API_KEY`: SendGrid API key
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `FACEBOOK_APP_ID`: Facebook OAuth app ID

## 🚀 Production Deployment

### Build Production Image
```bash
# Build optimized production image
docker build -t voudemoto/backend:latest .

# Tag with version
docker tag voudemoto/backend:latest voudemoto/backend:1.0.0

# Push to registry
docker push voudemoto/backend:latest
docker push voudemoto/backend:1.0.0
```

### Docker Swarm Deployment
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml voudemoto

# Check services
docker stack services voudemoto

# Scale service
docker service scale voudemoto_backend=3
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/voudemoto-backend

# Scale deployment
kubectl scale deployment voudemoto-backend --replicas=3
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [NGINX Docker Hub](https://hub.docker.com/_/nginx)

## 💡 Tips

1. **Always use `.env` file**: Never commit secrets to version control
2. **Regular backups**: Schedule automatic database backups
3. **Monitor logs**: Set up log aggregation (e.g., ELK stack)
4. **Resource limits**: Set memory and CPU limits in production
5. **Health checks**: Implement proper health check endpoints
6. **Graceful shutdown**: Handle SIGTERM signals properly
7. **Multi-stage builds**: Use multi-stage Dockerfiles to reduce image size
8. **Layer caching**: Order Dockerfile commands to maximize cache hits

---

**Last Updated**: January 2026  
**Version**: 1.0
