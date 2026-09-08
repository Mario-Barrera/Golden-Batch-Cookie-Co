# Golden Batch Cookie Co.

Golden Batch Cookie Co. is a full-stack e-commerce web application for a cookie business. The project combines a vanilla JavaScript frontend with a Node.js/Express backend, PostgreSQL persistence, Stripe payments, JWT authentication, email workflows, and customer review/comment features.

The application was built as a portfolio project to demonstrate end-to-end web development, including authentication, authorization, relational database design, payment processing, server-side validation, and client/server integration.

## Features

### Customer Accounts

- Customer registration and login
- JWT-based authentication with one-hour token expiration
- bcrypt password hashing
- Authenticated profile viewing and editing
- Password changes that require the current password
- Prevention of reusing the current password
- Account deactivation support
- Authentication-aware navigation and account links

### Password Recovery

- Forgot-password email workflow
- Cryptographically generated reset tokens
- SHA-256 token hashes stored in PostgreSQL instead of raw reset tokens
- One-hour reset-token expiration
- Single-use password reset flow
- Transactional password updates
- Generic forgot-password responses to reduce account-enumeration risk

### Online Ordering

- Product catalog loaded dynamically from PostgreSQL
- Client-side shopping cart
- Quantity controls and order subtotal calculation
- Authenticated ordering
- Customer order history
- Order-item details joined with product data
- Customer cancellation of pending orders

### Stripe Payments

- Stripe.js and Stripe Payment Element integration
- Server-created Stripe PaymentIntents
- Product prices retrieved from PostgreSQL instead of trusting browser-supplied prices
- Server-side order-total calculation
- Server-side Stripe payment verification
- Payment ownership verification using Stripe metadata
- Verification that the Stripe payment amount matches the database-calculated order total
- Duplicate payment/order protection using Stripe transaction IDs
- PostgreSQL transactions for saving orders, order items, and payment records together
- Rollback protection if order persistence fails

### Reviews

- Public customer review browsing
- Optional review filtering by product
- Authenticated review creation
- 1–5 star ratings
- Review text validation
- Personal review management
- Owner-or-admin authorization for editing and deleting reviews
- Database-enforced one-review-per-user-per-product rule

### Comments

- Public comments attached to reviews
- Authenticated comment creation
- Personal comment management
- Comment editing and deletion restricted to the comment owner
- Prevention of commenting on your own review
- Prevention of duplicate comments by the same user on the same review
- Database-enforced one-comment-per-user-per-review rule

### Catering and Email

- Catering request form
- Automated catering confirmation emails
- Automated welcome emails after account registration
- Password-reset emails
- Shared Nodemailer SMTP transporter
- Email configuration stored in environment variables

### Admin API

Admin-protected user-management endpoints support:

- Viewing users
- Viewing individual user accounts
- Updating user information
- Changing roles between `customer` and `admin`
- Soft-deactivating user accounts

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- Browser `localStorage`
- Stripe.js
- Font Awesome
- Google Fonts

### Backend

- Node.js
- Express 5
- PostgreSQL
- `pg`
- JSON Web Tokens (`jsonwebtoken`)
- bcrypt
- Stripe Node SDK
- Nodemailer
- Winston

### Development Dependencies

- Vitest
- Supertest

Automated project tests are not currently included. Vitest and Supertest remain available for future API test coverage.

## Project Architecture

```text
Golden-Batch-Cookie-Co/
├── db/
│   ├── client.js
│   ├── schema.sql
│   └── seed.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
│   └── *.html
├── routes/
│   ├── auth.js
│   ├── catering.js
│   ├── checkout.js
│   ├── comments.js
│   ├── forgot-password.js
│   ├── manage-profile.js
│   ├── orders.js
│   ├── products.js
│   ├── reset-password.js
│   ├── reviews.js
│   └── users.js
├── utils/
│   ├── logger.js
│   ├── mailer.js
│   ├── passwordValidator.js
│   └── sendWelcomeEmail.js
├── app.js
├── server.js
├── package.json
└── README.md
```

`app.js` configures Express middleware, static-file serving, API routes, the health endpoint, 404 handling, and centralized error handling.

`server.js` is responsible only for starting the HTTP server. Keeping application configuration separate from server startup makes the application easier to maintain and test.

## Database Design

Primary application tables include:

- `users`
- `password_reset_tokens`
- `products`
- `orders`
- `order_items`
- `payments`
- `reviews`
- `comments`

### Main Relationships

```text
users
├── password_reset_tokens
├── orders
│   ├── order_items ── products
│   └── payments
├── reviews ── products
│   └── comments
└── comments
```

The schema uses:

- Primary keys
- Foreign keys
- `UNIQUE` constraints
- `CHECK` constraints
- Database indexes
- `ON DELETE CASCADE` where appropriate

Examples of database-enforced integrity include:

- Unique customer email addresses
- Valid `customer` / `admin` roles
- Valid order and payment statuses
- Review ratings restricted to 1–5
- One review per user per product
- One comment per user per review
- Unique Stripe transaction IDs
- Positive order-item quantities

## Security and Data Integrity

Several parts of the application are designed so that important business rules are enforced on the server rather than trusted to the browser.

### Authentication

Protected routes use Bearer JWTs. Authentication middleware:

1. Reads the token from the `Authorization` header.
2. Verifies the JWT signature and expiration.
3. Looks up the user in PostgreSQL.
4. Confirms the account is still active.
5. Uses the current database role for authorization.

### Password Security

- Passwords are hashed with bcrypt.
- Password strength rules are centralized in a shared validator.
- Password changes require verification of the current password.
- Password reset tokens are randomly generated.
- Only SHA-256 hashes of reset tokens are stored in PostgreSQL.
- Reset tokens expire after one hour and are removed after successful use.

### Payment Integrity

The browser does not determine the authoritative order price.

The backend:

1. Receives product IDs and quantities.
2. Retrieves current product prices from PostgreSQL.
3. Calculates the total server-side.
4. Creates the Stripe PaymentIntent.
5. Retrieves the completed PaymentIntent directly from Stripe.
6. Recalculates the order using PostgreSQL prices.
7. Confirms the amount paid matches the calculated order total.
8. Saves the order, line items, and payment inside one PostgreSQL transaction.

### SQL and Error Handling

- PostgreSQL queries use parameterized values.
- Routes forward application errors to centralized Express error middleware.
- Winston records application logs and writes error-level messages to `error.log`.
- `.env` and `error.log` are excluded from Git.

## API Overview

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a customer |
| `POST` | `/api/auth/login` | Log in |
| `GET` | `/api/auth/me` | Get authenticated user data |
| `POST` | `/api/auth/forgot-password` | Request a password-reset email |
| `POST` | `/api/auth/reset-password` | Reset a password using a valid token |

### Users

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/users/me` | Get the logged-in user's profile |
| `PATCH` | `/api/users/me` | Update the logged-in user's profile |
| `PATCH` | `/api/users/me/password` | Change the logged-in user's password |
| `GET` | `/api/users` | List users — admin only |
| `GET` | `/api/users/:id` | Get one user — admin only |
| `PATCH` | `/api/users/:id` | Update one user — admin only |
| `PATCH` | `/api/users/:id/role` | Change a user's role — admin only |
| `DELETE` | `/api/users/:id` | Soft-deactivate a user — admin only |

### Products

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/products` | Return the product catalog |

### Orders

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/orders/my-orders` | Return the logged-in customer's orders |
| `PATCH` | `/api/orders/:id/cancel` | Cancel a pending order owned by the logged-in customer |

### Checkout

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/checkout/config` | Return the Stripe publishable key |
| `POST` | `/api/checkout/create-payment-intent` | Validate the cart and create a Stripe PaymentIntent |
| `POST` | `/api/checkout/verify-payment` | Verify Stripe payment and persist the order |

### Reviews

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/reviews` | List reviews |
| `GET` | `/api/reviews/me` | List the logged-in user's reviews |
| `GET` | `/api/reviews/:reviewId` | Get one review |
| `POST` | `/api/reviews` | Create a review |
| `PATCH` | `/api/reviews/:id` | Edit a review — owner or admin |
| `DELETE` | `/api/reviews/:id` | Delete a review — owner or admin |

### Comments

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/comments` | List comments |
| `GET` | `/api/comments/me` | List the logged-in user's comments |
| `POST` | `/api/comments` | Create a comment |
| `PATCH` | `/api/comments/:id` | Edit an owned comment |
| `DELETE` | `/api/comments/:id` | Delete an owned comment |

### Catering

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/catering` | Submit a catering request and send a confirmation email |

### Application Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Basic application health check |

## Getting Started

### Prerequisites

Install or configure:

- Node.js
- npm
- PostgreSQL
- A Stripe test account for payment testing
- SMTP credentials for email functionality

### 1. Clone the Repository

```bash
git clone https://github.com/Mario-Barrera/Golden-Batch-Cookie-Co.git
cd Golden-Batch-Cookie-Co
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create the PostgreSQL Database

Example:

```bash
createdb golden_batch_cookie_co
```

Then apply the schema:

```bash
psql -d golden_batch_cookie_co -f db/schema.sql
```

Adjust the PostgreSQL username, host, or port arguments as needed for your local environment.

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Example:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=golden_batch_cookie_co
DB_USER=postgres
DB_PASSWORD=your_database_password

JWT_SECRET=your_jwt_secret

APP_URL=http://localhost:3000

STRIPE_SECRET_KEY=your_stripe_test_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_test_publishable_key

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your_smtp_username
EMAIL_PASSWORD=your_smtp_password
MAIL_FROM=your_sender_email
```

Do not commit `.env` to source control.

### 5. Seed Development Data

```bash
npm run seed
```

> **Warning:** The seed script truncates application tables, restarts identity sequences, and inserts development data. Do not run it against a database containing data you need to preserve.

### 6. Start the Application

```bash
npm start
```

By default, the application runs on:

```text
http://localhost:3000
```

unless another `PORT` value is supplied.

## npm Scripts

```bash
npm start
```

Starts the Express server.

```bash
npm run seed
```

Resets and seeds the PostgreSQL development database.

```bash
npm test
```

Starts Vitest. Project-owned automated tests have not yet been added.

## Environment and Secret Management

Sensitive values are loaded from `.env`, including:

- PostgreSQL credentials
- JWT secret
- Stripe keys
- SMTP credentials

The repository's `.gitignore` excludes:

```text
node_modules/
.env
error.log
```

## Future Improvements

Potential improvements include:

- Add automated API tests with Vitest and Supertest
- Add dedicated pickup-time selection and scheduling
- Persist a canonical pending order/cart before payment so the exact cart contents are bound to the Stripe PaymentIntent
- Add a dedicated admin interface for backend user-management features
- Expand payment/refund administration
- Add deployment and CI/CD automation

## Project Status

Golden Batch Cookie Co. is feature-complete as a portfolio project. The application demonstrates a complete customer journey from account creation through ordering, payment, account management, and post-purchase reviews and comments.

## Author

**Mario B.**

## License

This project is licensed under the ISC License.
