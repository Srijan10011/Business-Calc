import pool from '../db';

export const getCustomersByBusiness = async (business_id: string) => {
    const result = await pool.query(
        `SELECT 
            ci.customer_id as id,
            ci.customer_id,
            ci.name,
            ci.phone,
            ci.email,
            ci.address,
            ci.created_at,
            COALESCE(cph.total_purchase, 0) as total_purchases,
            COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
            cph.last_purchase
        FROM customers_info ci
        INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
        LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
        WHERE bc.business_id = $1
        ORDER BY ci.created_at DESC`,
        [business_id]
    );

    return result.rows;
};
export const getCustomerPaymentsByBusiness = async (customerId: string, businessId: string) => {
    const result = await pool.query(
        `SELECT 
            si.created_at as payment_date,
            si.total_amount as amount,
            si.type as payment_type,
            'Sale Payment' as payment_source
        FROM sales s
        INNER JOIN sales_info si ON s.sale_id = si.sale_id
        WHERE s.customer_id = $1 
        AND s.business_id = $2 
        AND si.type IN ('Cash', 'bank')
        
        UNION ALL
        
        SELECT 
            p.created_at as payment_date,
            p.amount,
            'Debit Payment' as payment_type,
            'Installment' as payment_source
        FROM payments p
        INNER JOIN sales s ON p.sale_id = s.sale_id
        WHERE s.customer_id = $1 
        AND s.business_id = $2
        
        ORDER BY payment_date DESC`,
        [customerId, businessId]
    );

    return result.rows;
};

export const getCustomerById = async (customer_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT 
            ci.customer_id,
            ci.name,
            ci.phone,
            ci.email,
            ci.created_at,
            COALESCE(cph.total_purchase, 0) as total_purchases,
            COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
            cph.last_purchase
        FROM customers_info ci
        INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
        LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
        WHERE bc.business_id = $1 AND ci.customer_id = $2`,
        [business_id, customer_id]
    );

    return result;
};

export const getCustomerSales = async (customer_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT 
            s.id,
            s.total_amount,
            s.payment_type,
            s.created_at,
            si.quantity,
            si.rate,
            p.name as product_name
        FROM sales s
        INNER JOIN sale_items si ON s.id = si.sale_id
        INNER JOIN products p ON si.product_id = p.id
        WHERE s.customer_id = $1 AND s.business_id = $2
        ORDER BY s.created_at DESC`,
        [customer_id, business_id]
    );

    return result.rows;
};

export const addCustomer = async (
    name: string,
    phone: string,
    email: string | null,
    address: string | null,
    business_id: string
) => {
    const customerResult = await pool.query(
        'INSERT INTO customers_info (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING customer_id, name, phone, email, address, created_at',
        [name, phone, email || null, address || null]
    );

    const customer_id = customerResult.rows[0].customer_id;

    await pool.query(
        'INSERT INTO business_customers (customer_id, business_id) VALUES ($1, $2)',
        [customer_id, business_id]
    );

    return customerResult.rows[0];
};


