import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';

const router = Router();

// GET /api/campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, order, limit } = req.query;
    const pool = await getDbPool();
    let query = 'SELECT * FROM campaigns WHERE 1=1';

    // Handle status filter - use parameterized query for security
    const request = pool.request();
    if (status) {
      request.input('status', sql.NVarChar, status);
      query += ' AND status = @status';
    }

    // Handle order parameter(s) - Express parses ?order=x&order=y as an array
    let orderClauses: string[] = [];
    if (order) {
      // Convert to array if single value
      const orderParams = Array.isArray(order) ? order : [order];
      
      for (const orderParam of orderParams) {
        if (typeof orderParam === 'string' && orderParam.includes('.')) {
          const parts = orderParam.split('.');
          if (parts.length === 2) {
            const [column, direction] = parts;
            // Sanitize column name - only allow alphanumeric and underscore
            const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');
            const safeDirection = direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
            
            // Validate column name exists in campaigns table
            const validColumns = ['id', 'title', 'description', 'goal_amount', 'current_amount', 
                                 'image_url', 'status', 'created_at', 'updated_at', 'is_featured', 
                                 'receiving_wallet_address', 'platform_fee_address', 'platform_fee_amount'];
            
            if (safeColumn && validColumns.includes(safeColumn)) {
              orderClauses.push(`${safeColumn} ${safeDirection}`);
            }
          }
        }
      }
    }
    
    // Add ORDER BY clause
    if (orderClauses.length > 0) {
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    } else {
      // Default ordering
      query += ' ORDER BY is_featured DESC, created_at DESC';
    }

    // Handle limit
    if (limit) {
      const limitNum = parseInt(String(limit), 10);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 1000) {
        query += ` OFFSET 0 ROWS FETCH NEXT ${limitNum} ROWS ONLY`;
      }
    }

    // Remove console.log in production to reduce noise
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executing campaigns query:', query.replace(/\s+/g, ' ').trim());
    }
    const result = await request.query(query);

    res.json({ data: result.recordset });
  } catch (error) {
    console.error('Get campaigns error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Request query params:', req.query);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch campaigns',
      code: 'FETCH_ERROR',
      details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
});

// POST /api/campaigns
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      goal_amount,
      image_url,
      status,
      is_featured,
      receiving_wallet_address,
      platform_fee_address,
      platform_fee_amount,
    } = req.body;

    if (!title || !goal_amount) {
      return res.status(400).json({
        message: 'Title and goal_amount are required',
        code: 'MISSING_FIELDS',
      });
    }

    const pool = await getDbPool();
    const id = require('crypto').randomUUID();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('goal_amount', sql.NVarChar, goal_amount)
      .input('current_amount', sql.NVarChar, '0')
      .input('image_url', sql.NVarChar, image_url || null)
      .input('status', sql.NVarChar, status || 'active')
      .input('is_featured', sql.Bit, is_featured || false)
      .input('receiving_wallet_address', sql.NVarChar, receiving_wallet_address || null)
      .input('platform_fee_address', sql.NVarChar, platform_fee_address || null)
      .input('platform_fee_amount', sql.NVarChar, platform_fee_amount || null)
      .query(`
        INSERT INTO campaigns (
          id, title, description, goal_amount, current_amount,
          image_url, status, is_featured, receiving_wallet_address,
          platform_fee_address, platform_fee_amount
        )
        VALUES (
          @id, @title, @description, @goal_amount, @current_amount,
          @image_url, @status, @is_featured, @receiving_wallet_address,
          @platform_fee_address, @platform_fee_amount
        )
      `);

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM campaigns WHERE id = @id');

    // Return as array to match Supabase format
    res.status(201).json({ data: [result.recordset[0]] });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to create campaign',
      code: 'CREATE_ERROR',
    });
  }
});

// PATCH /api/campaigns?id=uuid
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'Campaign ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (req.body.title) {
      request.input('title', sql.NVarChar, req.body.title);
      updates.push('title = @title');
    }
    if (req.body.description !== undefined) {
      request.input('description', sql.NVarChar(sql.MAX), req.body.description);
      updates.push('description = @description');
    }
    if (req.body.status) {
      request.input('status', sql.NVarChar, req.body.status);
      updates.push('status = @status');
    }
    if (req.body.is_featured !== undefined) {
      request.input('is_featured', sql.Bit, req.body.is_featured);
      updates.push('is_featured = @is_featured');
    }
    if (req.body.receiving_wallet_address) {
      request.input('receiving_wallet_address', sql.NVarChar, req.body.receiving_wallet_address);
      updates.push('receiving_wallet_address = @receiving_wallet_address');
    }
    if (req.body.platform_fee_address !== undefined) {
      request.input('platform_fee_address', sql.NVarChar, req.body.platform_fee_address || null);
      updates.push('platform_fee_address = @platform_fee_address');
    }
    if (req.body.platform_fee_amount !== undefined) {
      request.input('platform_fee_amount', sql.NVarChar, req.body.platform_fee_amount || null);
      updates.push('platform_fee_amount = @platform_fee_amount');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'No fields to update',
        code: 'NO_UPDATES',
      });
    }

    updates.push('updated_at = GETUTCDATE()');

    await request.query(`
      UPDATE campaigns
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = await request.query('SELECT * FROM campaigns WHERE id = @id');
    res.json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update campaign',
      code: 'UPDATE_ERROR',
    });
  }
});

// DELETE /api/campaigns?id=uuid
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'Campaign ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM campaigns WHERE id = @id');

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to delete campaign',
      code: 'DELETE_ERROR',
    });
  }
});

export { router as campaignsRoutes };

