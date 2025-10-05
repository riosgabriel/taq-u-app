# TAQ-U App

A TypeScript application with Prisma ORM and PostgreSQL database, containerized with Docker.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

## Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@db:5432/taq_u_app?schema=public"

# PostgreSQL Environment Variables
POSTGRES_DB=taq_u_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Application Configuration
NODE_ENV=development
PORT=3000

# Prisma Configuration
PRISMA_GENERATE_DATAPROXY=true
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# Stop services
docker-compose down
```

### 3. Access the Application

- **API**: http://localhost:3000/api
- **Database**: localhost:5432 (postgres/taq_u_app)

## Development

### Local Development (without Docker)

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up the database:
   ```bash
   pnpm db:deploy
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build the application
- `pnpm db:deploy` - Deploy database migrations
- `pnpm docker:up` - Start Docker services
- `pnpm docker:down` - Stop Docker services
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Docker Configuration

The Docker Compose setup includes:

- **PostgreSQL 16.3**: Database with health checks
- **Node.js 20**: Application container with hot reload
- **Volume mounts**: For development with live code changes
- **Environment variables**: Configurable via `.env` file

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/taq_u_app?schema=public` | Database connection string |
| `POSTGRES_DB` | `taq_u_app` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `NODE_ENV` | `development` | Node.js environment |
| `PORT` | `3000` | Application port |
| `PRISMA_GENERATE_DATAPROXY` | `true` | Prisma configuration |

## Database Schema

The application uses Prisma ORM with the following main entities:

- **Customer**: Customer information
- **DeliveryOrder**: Delivery orders
- **Route**: Delivery routes
- **Package**: Package details
- **Payment**: Payment information
- **Location**: Geographic locations
- **Carrier**: Delivery carriers

## API Endpoints

- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create a new customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

## Troubleshooting

### Database Connection Issues

1. Ensure the `.env` file exists and contains the correct `DATABASE_URL`
2. Check that PostgreSQL container is running: `docker-compose ps`
3. Verify database health: `docker-compose logs db`

### Port Conflicts

If port 3000 or 5432 are already in use, modify the `.env` file:

```bash
PORT=3001  # Change application port
```

### Prisma Issues

1. Regenerate Prisma client:
   ```bash
   docker-compose exec app pnpm prisma generate
   ```

2. Reset database:
   ```bash
   docker-compose exec app pnpm prisma migrate reset
   ```

## License

MIT 