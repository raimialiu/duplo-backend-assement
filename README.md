### Duplo Backend Assessment
This is a NestJS-based backend solution for Duplo assessment.

### Features
Order processing with dual database storage (PostgreSQL + MongoDB)
Credit score calculation
Tax authority API integration
Docker deployment support
Technical Stack
NestJS
PostgreSQL (Primary database)
MongoDB (Transaction logging)
TypeORM
Mongoose
Docker & Docker Compose
Getting Started
Prerequisites
Node.js 18+
Docker and Docker Compose
Git
Installation
Clone the repository:
git clone <repository-url>
Install dependencies:
npm install
Start the application using Docker:
docker-compose up -d
API Endpoints
Orders
POST /orders - Create a new order
GET /orders/business/:businessId - Get business order details
Credit Score
GET /credit-score/business/:businessId - Get business credit score
Testing
Run the tests using:

npm run test
Documentation
API documentation is available at /api-docs when running the application.

Error Handling
The application implements global error handling and includes:

Input validation
Database error handling
External API error handling
Retry mechanisms for the tax API
Security
Input validation
Rate limiting
CORS protection
Helmet security headers