-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    category VARCHAR(100),
    rating DECIMAL(2,1),
    commission_rate INTEGER,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active'
);

-- Menus table
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    image_url TEXT
);

-- Delivery Persons table
CREATE TABLE IF NOT EXISTS delivery_persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active'
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    hotel_id INTEGER REFERENCES hotels(id),
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'placed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO hotels (name, address, category, rating, commission_rate, image_url, status) VALUES
('Spice Garden', '123 Curry Lane', 'Indian', 4.5, 15, 'https://picsum.photos/seed/spice/400/300', 'active'),
('Pizza Palace', '456 Dough St', 'Italian', 4.2, 12, 'https://picsum.photos/seed/pizza/400/300', 'active'),
('Dunder Subs', '789 Paper Rd', 'Fast Food', 3.8, 10, 'https://picsum.photos/seed/subs/400/300', 'active'),
('Grand Hyatt Hotel', 'Bandra West, Mumbai', 'Luxury', 4.8, 20, 'https://picsum.photos/seed/hyatt/400/300', 'active'),
('Marriott International', 'Juhu, Mumbai', 'Luxury', 4.5, 18, 'https://picsum.photos/seed/marriott/400/300', 'active');

INSERT INTO menus (hotel_id, name, description, price, category, image_url) VALUES
(1, 'Chicken Tikka', 'Grilled spiced chicken', 12.50, 'Starters', 'https://picsum.photos/seed/tikka/200/200'),
(1, 'Butter Chicken', 'Creamy tomato gravy chicken', 15.00, 'Main Course', 'https://picsum.photos/seed/butter/200/200'),
(2, 'Margherita Pizza', 'Classic cheese and tomato', 10.00, 'Main Course', 'https://picsum.photos/seed/margherita/200/200'),
(4, 'Wagyu Beef Sliders', 'Set of 3 with truffle mayo', 1950.00, 'Starters', 'https://picsum.photos/seed/wagyu/200/200'),
(4, 'Truffle Mushroom Risotto', 'Italian arborio rice with seasonal truffle', 2600.00, 'Main Course', 'https://picsum.photos/seed/risotto/200/200');

INSERT INTO delivery_persons (name, mobile, status) VALUES
('Rajesh Kumar', '+91 98765 43210', 'active'),
('Sunil Verma', '+91 98765 43211', 'busy'),
('Vikram Singh', '+91 98765 43212', 'offline'),
('Rohan Gupta', '+91 98765 43213', 'active');

INSERT INTO orders (order_number, hotel_id, customer_name, amount, status) VALUES
('#KL-9821', 1, 'Rahul Sharma', 42.50, 'delivered'),
('#KL-9822', 2, 'Anjali Gupta', 28.90, 'in-transit'),
('#KL-9823', 3, 'Arjun Singh', 15.20, 'preparing');
