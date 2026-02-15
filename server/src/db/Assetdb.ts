import pool from '../db';


export const getAssets = async (business_id: string) => {
    const result = await pool.query(
        `SELECT cc.name, fca.total_cost, fca.recovered, fca.asset_idd as id
         FROM fixed_cost_assets fca
         JOIN cost_categories cc ON fca.cateogory_id = cc.category_id
         WHERE cc.business_id = $1`,
        [business_id]
    );

    const assets = result.rows.map(asset => {
        const remaining = asset.total_cost - asset.recovered;
        const progress = (asset.recovered / asset.total_cost) * 100;
        const status = progress >= 100 ? 'Retired' : 'Active';

        return {
            id: asset.id,
            name: asset.name,
            cost: parseFloat(asset.total_cost),
            recovered: parseFloat(asset.recovered),
            remaining,
            progress,
            status
        };
    });

    return assets;
};

export const createAsset = async (
    name: string,
    category: string,
    totalCost: number,
    business_id: string
) => {
    const categoryResult = await pool.query(
        'INSERT INTO cost_categories (name, type, business_id) VALUES ($1, $2, $3) RETURNING category_id',
        [name, category, business_id]
    );

    const categoryId = categoryResult.rows[0].category_id;

    await pool.query(
        'INSERT INTO fixed_cost_assets (cateogory_id, total_cost, recovered) VALUES ($1, $2, $3)',
        [categoryId, totalCost, 0]
    );

    return { message: 'Asset created successfully' };
};


