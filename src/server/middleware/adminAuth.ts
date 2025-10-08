import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import pool from '../db';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userResult.rows[0].is_admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
