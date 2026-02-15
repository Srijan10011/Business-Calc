import pool from '../db'; // adjust your pool import

// -----------------------

// -----------------------
// Get business categories
export const getBusinessCategories = async (business_id: string) => {
    const result = await pool.query(
        'SELECT * FROM cost_categories WHERE business_id = $1',
        [business_id]
    );
    return result.rows;
};

// -----------------------
// Add new cost category and allocation
export const addCostCategory = async (
    category: string,
    type: 'fixed' | 'variable',
    value: number,
    product_id: string,
    business_id: string
) => {
    // Validate product exists
    const productResult = await pool.query(
        'SELECT price FROM products WHERE product_id = $1',
        [product_id]
    );
    if (productResult.rows.length === 0) {
        throw new Error('Product not found');
    }

    const productPrice = (productResult.rows[0].price);

    // Check COGS limit
    const cogsResult = await pool.query(
        `SELECT COALESCE(SUM(amount_per_unit), 0) AS total_cogs
         FROM product_cost_allocation pca
         JOIN cost_categories cc ON pca.category_id = cc.category_id
         WHERE pca.product_id = $1 AND cc.business_id = $2`,
        [product_id, business_id]
    );

    const currentCogs = Number(cogsResult.rows[0].total_cogs);
    const newTotalCogs = currentCogs + Number(value);

    if (newTotalCogs > productPrice) {
        throw new Error('COGS value cannot surpass the product price');
    }

    const existingCategory = await pool.query(
        'SELECT category_id FROM cost_categories WHERE name = $1 AND business_id = $2',
        [category, business_id]
    );

    let category_id;
    if (existingCategory.rows.length > 0) {
        // Use existing category
        category_id = existingCategory.rows[0].category_id;
    } else {
        // Create new cost category
        const categoryResult = await pool.query(
            'INSERT INTO cost_categories (name, type, business_id) VALUES ($1, $2, $3) RETURNING category_id',
            [category, type, business_id]
        );
        category_id = categoryResult.rows[0].category_id;
    }

    // Create product cost allocation
    await pool.query(
        'INSERT INTO product_cost_allocation (product_id, category_id, amount_per_unit) VALUES ($1, $2, $3)',
        [product_id, category_id, value]
    );

    return { category_id };
};

// -----------------------
// Get product cost allocations
export const getProductCostAllocations = async (product_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT 
            pca.allocation_id, 
            pca.amount_per_unit AS value,   -- alias for frontend
            cc.name AS category,            -- alias for frontend
            cc.type
         FROM product_cost_allocation pca
         JOIN cost_categories cc ON pca.category_id = cc.category_id
         WHERE pca.product_id = $1 AND cc.business_id = $2`,
        [product_id, business_id]
    );
    return result.rows;
};

// -----------------------
// Update cost allocation
export const updateCostAllocation = async (allocation_id: string, value: number, business_id: string) => {
    // Get allocation info
    const allocationResult = await pool.query(
        `SELECT pca.product_id, pca.amount_per_unit AS current_value, p.price
         FROM product_cost_allocation pca
         JOIN products p ON pca.product_id = p.product_id
         WHERE pca.allocation_id = $1`,
        [allocation_id]
    );

    if (allocationResult.rows.length === 0) {
        throw new Error('Cost allocation not found');
    }

    const { product_id, price: productPrice } = allocationResult.rows[0];

    // Compute current total COGS excluding this allocation
    const cogsResult = await pool.query(
        `SELECT COALESCE(SUM(pca.amount_per_unit), 0) AS total_cogs
         FROM product_cost_allocation pca
         JOIN cost_categories cc ON pca.category_id = cc.category_id
         WHERE pca.product_id = $1 AND cc.business_id = $2 AND pca.allocation_id != $3`,
        [product_id, business_id, allocation_id]
    );

    const currentTotalCogs = (cogsResult.rows[0].total_cogs);
    const newTotalCogs = currentTotalCogs + (value);

    if (newTotalCogs > (productPrice)) {
        throw new Error('COGS value cannot surpass the product price');
    }

    // Update allocation
    const result = await pool.query(
        'UPDATE product_cost_allocation SET amount_per_unit = $1 WHERE allocation_id = $2 RETURNING *',
        [value, allocation_id]
    );

    if (result.rows.length === 0) {
        throw new Error('Cost allocation not found');
    }

    return result.rows[0];
};

// -----------------------
// Delete cost allocation
export const deleteCostAllocation = async (allocation_id: string) => {
    const result = await pool.query(
        'DELETE FROM product_cost_allocation WHERE allocation_id = $1 RETURNING *',
        [allocation_id]
    );

    return result.rows.length > 0;
};

// -----------------------
// Get COGS data for business
export const getCOGSData = async (business_id: string) => {
    const result = await pool.query(
        `SELECT 
            pca.allocation_id,
            pca.amount_per_unit AS value,   -- alias for frontend
            cc.name AS category,            -- alias for frontend
            cc.type
         FROM products p
         LEFT JOIN product_cost_allocation pca ON p.product_id = pca.product_id
         LEFT JOIN cost_categories cc ON pca.category_id = cc.category_id AND cc.business_id = $1
         ORDER BY p.product_id, cc.name`,
        [business_id]
    );

    return result.rows;
};
