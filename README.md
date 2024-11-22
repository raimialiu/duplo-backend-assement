### Duplo Backend Assessment
This is a NestJS-based backend solution for Duplo assessment.

### Features
1. Order processing with dual database storage (PostgreSQL + MongoDB)

1.  Credit score calculation

1.  Tax authority API integration

1.  Docker deployment support

### Technical Stack
1.  NestJS
1.  PostgreSQL (Primary database)
1.  MongoDB (Transaction logging)
1.  TypeORM
1.  Mongoose
1.  Docker & Docker Compose



##  Getting Started
### Prerequisites
1.  Node.js 18+
1.  Docker and Docker Compose
1.  Git


##  Installation
1.  Clone the repository:
      ``` git clone <repository-url> ```


1.  Install dependencies:
      ``` npm install ```

1.  Start the application using Docker:
      ``` docker-compose up -d ```


### API Endpoints
# Orders
1.  POST /orders - Create a new order

1.  GET /orders/business/:businessId - Get business order details


# Credit Score

1.  GET /credit-score/business/:businessId - Get business credit score

# Testing
Run the tests using:

  ``` npm run test ```
  

### Documentation
