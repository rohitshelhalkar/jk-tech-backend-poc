# User Document Management API

A complete NestJS backend microservice for User Management + Document Management + Ingestion Control with role-based authentication, file upload capabilities, and integration with external ingestion services.

## Features

- **User Management**: Registration, authentication, role-based access control (Admin, Editor, Viewer)
- **Document Management**: File upload, metadata storage, download, CRUD operations
- **Ingestion Control**: Job tracking, mock ingestion service, external service integration
- **JWT Authentication**: Secure token-based authentication with role-based authorization
- **File Storage**: Local disk storage with metadata in PostgreSQL
- **API Documentation**: Swagger/OpenAPI documentation at `/api`
- **Testing**: Unit tests for core services
- **Containerized**: Docker and docker-compose for easy deployment

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **File Upload**: Multer for multipart form handling
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Local Development Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd user-document-management-api
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. **Database setup:**
```bash
# Start PostgreSQL (if not using Docker)
# Create database and run migrations
npx prisma migrate dev --name init
npx prisma db seed
```

4. **Start the development server:**
```bash
npm run start:dev
```

The application will be available at:
- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api

### Docker Setup

1. **Using Docker Compose (recommended):**
```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up --build
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - User logout

### User Management (Admin only)
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user role/status
- `DELETE /users/:id` - Delete user

### Documents
- `POST /documents` - Upload document (multipart form)
- `GET /documents` - List documents (with pagination)
- `GET /documents/:id` - Get document metadata
- `GET /documents/:id/download` - Download document file
- `PATCH /documents/:id` - Update document metadata (Admin/Editor)
- `DELETE /documents/:id` - Delete document (Admin/Editor)

### Ingestion
- `POST /ingest/trigger` - Trigger document ingestion (Admin/Editor)
- `GET /ingest/:jobId` - Get ingestion job status
- `GET /ingest` - List ingestion jobs with filters

## Default Users

The seed script creates three default users:

| Email | Password | Role | 
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| editor@example.com | editor123 | EDITOR |
| viewer@example.com | viewer123 | VIEWER |

## Testing

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/userdb` | PostgreSQL connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key` | JWT signing secret |
| `USE_MOCK_INGEST` | `true` | Use mock ingestion service |
| `NODE_ENV` | `development` | Application environment |
| `PORT` | `3000` | Application port |

## Role Permissions

| Role | Users | Documents | Ingestion |
|------|-------|-----------|-----------|
| **ADMIN** | Full CRUD | Full CRUD | Full access |
| **EDITOR** | Read only | Full CRUD | Can trigger & view |
| **VIEWER** | None | Read own only | Read own only |

## File Upload

- **Endpoint**: `POST /documents`
- **Content-Type**: `multipart/form-data`
- **Max file size**: 50MB
- **Storage**: Local disk (`./uploads/`)
- **Supported fields**: `file` (required), `title`, `description`

### Example curl:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=My Document" \
  -F "description=Document description" \
  http://localhost:3000/documents
```

## Ingestion Service

### Mock Ingestion (Default)

The application includes a mock ingestion service that:
- Simulates processing with 5-15 second delays
- Has 80% success rate (20% random failures for testing)
- Updates job status asynchronously
- Logs processing events

### Configuration

Set `USE_MOCK_INGEST=true` in `.env` to use the mock service.

### Replacing Mock with Real Python Service

To integrate with a real Python ingestion service:

1. **Set environment variables:**
```bash
USE_MOCK_INGEST=false
EXTERNAL_INGEST_URL=http://python-service:8000
EXTERNAL_INGEST_API_KEY=your-api-key
EXTERNAL_INGEST_TIMEOUT=30000
```

2. **Expected Python Service Contract:**

**Trigger Endpoint**: `POST /process`
```json
{
  "jobId": "cuid-job-id",
  "documentId": "cuid-document-id",
  "documentPath": "/app/uploads/filename.pdf",
  "metadata": {
    "title": "Document Title",
    "originalName": "document.pdf",
    "mimetype": "application/pdf",
    "size": 1024000
  }
}
```

**Response**: `202 Accepted`
```json
{
  "jobId": "cuid-job-id",
  "status": "accepted",
  "message": "Processing started"
}
```

**Status Update Callback**: The Python service should call back to update status:
`POST /ingest/webhook/status`
```json
{
  "jobId": "cuid-job-id",
  "status": "COMPLETED",  // or "FAILED"
  "errorMessage": null,   // or error details if failed
  "results": {            // optional processing results
    "extractedText": "...",
    "metadata": {...}
  }
}
```

3. **Authentication Options:**
- API Key in headers: `X-API-Key: your-api-key`
- Bearer token: `Authorization: Bearer token`
- Basic auth: `Authorization: Basic base64(user:pass)`

4. **Error Handling & Retries:**
The service wrapper in `IngestionService` can be extended to include:
- Retry logic with exponential backoff
- Circuit breaker pattern
- Dead letter queue for failed jobs
- Health checks and service discovery

5. **Example Python Integration Code:**

Update `src/ingestion/ingestion.service.ts`:
```typescript
private async callExternalIngestionService(jobId: string, documentId: string) {
  const document = await this.documentsService.findOne(documentId, { role: 'ADMIN' });
  
  const payload = {
    jobId,
    documentId,
    documentPath: document.filePath,
    metadata: {
      title: document.title,
      originalName: document.originalName,
      mimetype: document.mimetype,
      size: document.size,
    },
  };

  try {
    const response = await fetch(`${this.configService.get('EXTERNAL_INGEST_URL')}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.configService.get('EXTERNAL_INGEST_API_KEY'),
      },
      body: JSON.stringify(payload),
      timeout: this.configService.get<number>('EXTERNAL_INGEST_TIMEOUT'),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`External ingestion triggered for job ${jobId}:`, result);
  } catch (error) {
    console.error(`Failed to trigger external ingestion for job ${jobId}:`, error);
    await this.updateJobStatus(jobId, IngestionStatus.FAILED, error.message);
  }
}
```

## Postman Collection

### Authentication
```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Documents
```bash
# Upload document
curl -X POST http://localhost:3000/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=Test Document"

# List documents
curl -X GET "http://localhost:3000/documents?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Ingestion
```bash
# Trigger ingestion
curl -X POST http://localhost:3000/ingest/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"your-document-id"}'

# Check job status
curl -X GET http://localhost:3000/ingest/your-job-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── decorators/      # Custom decorators (roles)
│   ├── dto/             # Data transfer objects
│   ├── guards/          # Auth guards (JWT, local, roles)
│   ├── strategies/      # Passport strategies
│   └── auth.service.ts  # Auth business logic
├── documents/           # Document management
│   ├── dto/            # Document DTOs
│   └── documents.service.ts
├── users/              # User management
│   ├── dto/           # User DTOs
│   └── users.service.ts
├── ingestion/         # Ingestion control
│   ├── dto/          # Ingestion DTOs
│   ├── ingestion.service.ts
│   └── mock-ingestion.service.ts
├── prisma/           # Database service
│   └── prisma.service.ts
└── main.ts          # Application entry point

prisma/
├── schema.prisma    # Database schema
└── seed.ts         # Database seeding

uploads/            # File storage directory
```

## Production Deployment

1. **Environment Configuration:**
   - Set strong `JWT_SECRET`
   - Configure production database
   - Set `NODE_ENV=production`
   - Configure external ingestion service

2. **Database Migration:**
```bash
npx prisma migrate deploy
npx prisma db seed
```

3. **Security Considerations:**
   - Use HTTPS in production
   - Implement rate limiting
   - Set up proper CORS policies
   - Use environment-specific secrets
   - Regular security audits

4. **Monitoring:**
   - Add logging middleware
   - Implement health checks
   - Monitor file storage usage
   - Track ingestion job metrics

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please check:
1. API documentation at `/api` endpoint
2. Unit tests for usage examples
3. Configuration examples in `.env.example`