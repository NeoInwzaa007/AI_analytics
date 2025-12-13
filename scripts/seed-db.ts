import { Client } from 'pg';

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ai_dashboard',
});

async function seed() {
    await client.connect();

    // Create tables
    await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      product_id INTEGER REFERENCES products(id),
      amount DECIMAL(10, 2) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Clean up
    await client.query('TRUNCATE TABLE sales, products, customers RESTART IDENTITY CASCADE');

    // Insert mock data
    await client.query(`
    INSERT INTO customers (name, email) VALUES
    ('Alice Johnson', 'alice@example.com'),
    ('Bob Smith', 'bob@example.com'),
    ('Charlie Brown', 'charlie@example.com');
  `);

    await client.query(`
    INSERT INTO products (name, price) VALUES
    ('AI Subscription Basic', 29.99),
    ('AI Subscription Pro', 99.99),
    ('Enterprise License', 499.00);
  `);

    await client.query(`
    INSERT INTO sales (customer_id, product_id, amount, date) VALUES
    (1, 1, 29.99, NOW() - INTERVAL '2 days'),
    (2, 2, 99.99, NOW() - INTERVAL '1 day'),
    (3, 3, 499.00, NOW());
  `);

    console.log('Database seeded successfully');
    await client.end();
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
