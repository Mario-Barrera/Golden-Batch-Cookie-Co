-- Users table (registered accounts)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (char_length(TRIM(name)) BETWEEN 1 AND 100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT NOT NULL CHECK (char_length(TRIM(address)) >= 1),
    phone TEXT NOT NULL CHECK (char_length(TRIM(phone)) >= 1),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'admin')) DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP     -- postgreSQL automatically generates the timestamp
);

-- Products table
--(8,2) means: up to 8 total digits, and 2 after the decimal
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    image_key VARCHAR(255),
    star_rating DECIMAL(2,1) DEFAULT 0 CHECK (star_rating >= 0 AND star_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
-- ON DELETE CASCADE means: if a user is deleted, all their orders are automatically deleted too
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
        status IN ('Pending','Confirmed','Preparing','Ready for Pickup','Out for Delivery','Completed','Cancelled','Refunded')
    ),
    total_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    fulfillment_method VARCHAR(20) NOT NULL CHECK (fulfillment_method IN ('Pickup','Delivery')),
    delivery_partner VARCHAR(20) CHECK (delivery_partner IS NULL OR delivery_partner IN ('UberEats','DoorDash','Grubhub')),
    delivery_reference VARCHAR(100),
    delivery_status VARCHAR(50) DEFAULT 'Not applicable' CHECK (
        delivery_status IN ('Picked up by driver','Out for delivery','Delivered','Cancelled','Not applicable')
    ),
    estimated_delivery TIMESTAMP,
    pickup_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create index on user_id to speed up queries filtering by user
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Order items table
-- Creates a table to store individual items inside an order
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index to speed up queries fetching all items in a specific order
-- Create index to improve performance when querying by product (e.g., sales stats or inventory tracking)
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Reviews table
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT NOT NULL CHECK (char_length(review) BETWEEN 1 AND 1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id) -- One review per user per product
);

-- Review comments table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    comment TEXT NOT NULL CHECK (char_length(TRIM(comment)) <= 1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, review_id)  -- One comment per user per review
);

-- To fetch all comments for a specific review
CREATE INDEX idx_comments_review_id ON comments(review_id);

-- To fetch all comments made by a specific user (e.g., user profile)
CREATE INDEX idx_comments_user_id ON comments(user_id);

CREATE TABLE catering_requests (
    request_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    pie_types TEXT[], -- use array to store multiple pie types
    guest_count VARCHAR(50),
    signage_idea VARCHAR(10),
    event_date DATE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table: stores payment details for each order
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Pending','Completed','Cancelled','Failed','Refunded')),
    method VARCHAR(20) NOT NULL CHECK (method IN ('Credit','Debit')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This table stores: JWT tokens that have been revoked so they cannot be used again
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
