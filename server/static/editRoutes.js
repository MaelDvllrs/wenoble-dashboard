const express = require('express');
const editController = require('./editController');

const router = express.Router();

/**
 * POST /api/websites/:websiteId/edits
 * Save or update a single edit for a static website element
 */
router.post('/websites/:websiteId/edits', editController.saveEdit);

/**
 * POST /api/websites/:websiteId/edits/bulk
 * Save or update multiple edits at once
 */
router.post('/websites/:websiteId/edits/bulk', editController.saveEditsBulk);

/**
 * GET /api/websites/:websiteId/edits
 * Retrieve all edits for a specific page
 * Query params: page (required) - ex: ?page=/about
 */
router.get('/websites/:websiteId/edits', editController.getEdits);

/**
 * DELETE /api/websites/:websiteId/edits/:editId
 * Soft delete an edit
 */
router.delete('/websites/:websiteId/edits/:editId', editController.deleteEdit);

/**
 * GET /api/websites/:websiteId/pages
 * Get all pages that have edits for a website
 */
router.get('/websites/:websiteId/pages', editController.getEditedPages);

module.exports = router;
