import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import * as Business_pool from '../db/Business_pool';

export const addProduct = async (req: Request, res: Response) => {
    try {
        const { name, price, stock } = req.body;
        const business_id = req.businessId;
        
        if (!name || price === undefined || stock === undefined) {
            return res.status(400).json({ message: 'Missing required fields: name, price, stock' });
        }

        if (parseFloat(price) < 0) {
            return res.status(400).json({ message: 'Price cannot be negative' });
        }

        if (parseInt(stock) < 0) {
            return res.status(400).json({ message: 'Stock cannot be negative' });
        }

        // Insert into products table
        const productResult = await pool.query(
            'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING product_id, name, price, stock, created_at',
            [name, price, stock]
        );

        const product_id = productResult.rows[0].product_id;

        // Link product to business in products_business table
        await pool.query(
            'INSERT INTO products_business (product_id, business_id) VALUES ($1, $2)',
            [product_id, business_id]
        );

        res.status(201).json(productResult.rows[0]);
    } catch (error: any) {
        logger.error('Error adding product:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;

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

        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const business_id = req.businessId;

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
            [business_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error fetching product:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addStock = async (req: Request, res: Response) => {
    try {
        const { product_id, stock } = req.body;
        const business_id = req.businessId;

        if (!product_id || stock === undefined) {
            return res.status(400).json({ message: 'Missing required fields: product_id, stock' });
        }

        // Update stock for product that belongs to user's business
        const result = await pool.query(
            `UPDATE products SET stock = stock + $1 
             WHERE product_id = $2 
             AND product_id IN (
                 SELECT product_id FROM products_business WHERE business_id = $3
             )
             RETURNING *`,
            [stock, product_id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error adding stock:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
