import pool from "../db";

export const Get_Business_id = async (user_id: string) => {

    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );


    if (result.rows.length === 0) {
        throw new Error('User not associated with any business');
    } else {
        return result.rows[0].business_id;
    }
}


export function Get_business_id(user_id: string) {
    throw new Error('Function not implemented.');
}
