import pool from '../db';

export const addProduct = async (
    name: string,
    price: number,
    stock: number,
    business_id: string
) => {
    const productResult = await pool.query(
        'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING product_id, name, price, stock, created_at',
        [name, price, stock]
    );

    const product_id = productResult.rows[0].product_id;

    await pool.query(
        'INSERT INTO products_business (product_id, business_id) VALUES ($1, $2)',
        [product_id, business_id]
    );

    return productResult.rows[0];
};

export const getProductsByBusiness = async (business_id: string) => {
    const result = await pool.query(
        `SELECT 
            p.product_id as id,
            p.product_id,
            p.name,
            p.price,
            p.stock,
            p.created_at
        FROM products p
        INNER JOIN products_business pb ON p.product_id = pb.product_id
        LEFT JOIN removed_products rp ON p.product_id = rp.original_product_id
        WHERE pb.business_id = $1 AND rp.removed_product_id IS NULL
        ORDER BY p.created_at DESC`,
        [business_id]
    );

    return result.rows;
};

export const getProductById = async (product_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT 
            p.product_id as id,
            p.product_id,
            p.name,
            p.price,
            p.stock,
            p.created_at
        FROM products p
        INNER JOIN products_business pb ON p.product_id = pb.product_id
        LEFT JOIN removed_products rp ON p.product_id = rp.original_product_id
        WHERE pb.business_id = $1 AND p.product_id = $2 AND rp.removed_product_id IS NULL`,
        [business_id, product_id]
    );

    return result.rows[0] || null;
};

export const addStockToProduct = async (
    product_id: string,
    stock: number,
    business_id: string
) => {
    const result = await pool.query(
        `UPDATE products SET stock = stock + $1 
         WHERE product_id = $2 
         AND product_id IN (
             SELECT product_id FROM products_business WHERE business_id = $3
         )
         RETURNING *`,
        [stock, product_id, business_id]
    );

    return result.rows[0] || null;
};

export const getProductWithCostAllocations = async (product_id: string) => {
    const result = await pool.query(
        `SELECT 
            p.*,
            ca.allocation_id,
            ca.cost_amount,
            ca.allocation_date,
            ca.notes as allocation_notes
        FROM products p
        LEFT JOIN cost_allocations ca ON p.product_id = ca.product_id
        WHERE p.product_id = $1`,
        [product_id]
    );

    return result.rows;
};

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );

    if (result.rows.length === 0) {
        throw new Error('User not associated with any business');
    }

    return result.rows[0].business_id;
};
