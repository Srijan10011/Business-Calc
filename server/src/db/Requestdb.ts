import pool from '../db';

export const getPendingRequests = async (business_id: string) => {
  const result = await pool.query(
    `SELECT ur.request_id, ur.user_id, ur.business_id, ur.status, ur.requested_at,
            u.name, u.email
     FROM user_requests ur
     JOIN users u ON ur.user_id = u.user_id
     WHERE ur.business_id = $1 AND ur.status = 'pending'
     ORDER BY ur.requested_at DESC`,
    [business_id]
  );
  return result.rows;
};

export const getRequestDetails = async (request_id: number, business_id: string) => {
  const result = await pool.query(
    'SELECT user_id, business_id FROM user_requests WHERE request_id = $1 AND business_id = $2 AND status = $3',
    [request_id, business_id, 'pending']
  );
  return result.rows[0] || null;
};

export const checkUserBusinessStatus = async (user_id: string) => {
  const businessCheck = await pool.query(
    'SELECT business_id FROM business_users WHERE user_id = $1',
    [user_id]
  );

  if (businessCheck.rows.length > 0) {
    return { status: 'approved', hasAccess: true, business_id: businessCheck.rows[0].business_id };
  }

  const requestCheck = await pool.query(
    'SELECT status FROM user_requests WHERE user_id = $1 AND status = $2',
    [user_id, 'pending']
  );

  if (requestCheck.rows.length > 0) {
    return { status: 'pending', hasAccess: false };
  }

  return { status: 'none', hasAccess: false };
};

export const getBusinessIdForUser = async (user_id: string) => {
  const result = await pool.query(
    'SELECT business_id FROM business_users WHERE user_id = $1',
    [user_id]
  );

  return result.rows[0]?.business_id || null;
};

// Approve request
export const approveRequest = async (request_id: string, role_id: string) => {
  const result = await pool.query(
    'UPDATE user_requests SET status = $1, role_id = $2 WHERE request_id = $3 RETURNING *',
    ['approved', role_id, request_id]
  );
  return result.rows[0] || null;
};

// Reject request
export const rejectRequest = async (request_id: number) => {
  const result = await pool.query(
    'UPDATE user_requests SET status = $1 WHERE request_id = $2 RETURNING *',
    ['rejected', request_id]
  );
  return result.rows[0] || null;
};
