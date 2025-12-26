const editService = require('./editService');
const imageUploadService = require('./imageUploadService');

/**
 * Controller for static website edits
 * Handles HTTP request/response logic
 */
class EditController {
  /**
   * Save or update a single edit
   * POST /api/websites/:websiteId/edits
   */
  async saveEdit(req, res) {
    try {
      const { websiteId } = req.params;
      const { pagePath, elementPath, editType, value } = req.body;

      // Input validation
      if (!pagePath || typeof pagePath !== 'string') {
        return res.status(400).json({ 
          error: 'pagePath is required and must be a string' 
        });
      }

      if (!elementPath || typeof elementPath !== 'string') {
        return res.status(400).json({ 
          error: 'elementPath is required and must be a string' 
        });
      }

      if (!editType || !['text', 'image'].includes(editType)) {
        return res.status(400).json({ 
          error: 'editType is required and must be "text" or "image"' 
        });
      }

      if (value === undefined || value === null) {
        return res.status(400).json({ 
          error: 'value is required' 
        });
      }

      // If image type, upload to Supabase Storage
      let finalValue = String(value);
      
      if (editType === 'image') {
        // Check if it's base64 data that needs uploading
        if (value.startsWith('data:image/') || (!value.startsWith('http://') && !value.startsWith('https://'))) {
          try {
            finalValue = await imageUploadService.uploadImage(value, websiteId, pagePath);
          } catch (uploadError) {
            return res.status(500).json({
              error: 'Failed to upload image',
              message: uploadError.message
            });
          }
        }
      }

      // Create edit object
      const editData = {
        websiteId,
        pagePath,
        elementPath,
        editType,
        value: finalValue
      };

      // Save via service
      const savedEdit = await editService.saveEdit(editData);

      res.status(200).json({
        success: true,
        data: savedEdit
      });

    } catch (error) {
      console.error('Error saving edit:', error);
      res.status(500).json({ 
        error: 'Failed to save edit',
        message: error.message 
      });
    }
  }

  /**
   * Save multiple edits at once
   * POST /api/websites/:websiteId/edits/bulk
   */
  async saveEditsBulk(req, res) {
    console.log('Received bulk edits request:', req.body);
    try {
      const { websiteId } = req.params;
      const { edits } = req.body;

      // Validate bulk array
      if (!Array.isArray(edits)) {
        return res.status(400).json({ 
          error: 'edits must be an array' 
        });
      }

      if (edits.length === 0) {
        return res.status(400).json({ 
          error: 'edits array cannot be empty' 
        });
      }

      // Validate each edit
      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];
        
        if (!edit.pagePath || typeof edit.pagePath !== 'string') {
          return res.status(400).json({ 
            error: `Edit at index ${i}: pagePath is required and must be a string` 
          });
        }

        if (!edit.elementPath || typeof edit.elementPath !== 'string') {
          return res.status(400).json({ 
            error: `Edit at index ${i}: elementPath is required and must be a string` 
          });
        }

        if (!edit.editType || !['text', 'image'].includes(edit.editType)) {
          return res.status(400).json({ 
            error: `Edit at index ${i}: editType must be "text" or "image"` 
          });
        }

        if (edit.value === undefined || edit.value === null) {
          return res.status(400).json({ 
            error: `Edit at index ${i}: value is required` 
          });
        }
      }

      // Upload images to Supabase Storage
      const editsToSave = await Promise.all(edits.map(async (edit) => {
        let finalValue = String(edit.value);

        // If image type, upload to Supabase Storage
        if (edit.editType === 'image') {
          // Check if it's base64 data that needs uploading
          if (edit.value.startsWith('data:image/') || (!edit.value.startsWith('http://') && !edit.value.startsWith('https://'))) {
            try {
              finalValue = await imageUploadService.uploadImage(edit.value, websiteId, edit.pagePath);
            } catch (uploadError) {
              console.error(`Failed to upload image for ${edit.elementPath}:`, uploadError);
              throw uploadError;
            }
          }
        }

        return {
          websiteId,
          pagePath: edit.pagePath,
          elementPath: edit.elementPath,
          editType: edit.editType,
          value: finalValue
        };
      }));

      // Save via service
      const savedEdits = await editService.saveEditsBulk(editsToSave);

      res.status(200).json({
        success: true,
        count: savedEdits.length,
        data: savedEdits
      });

    } catch (error) {
      console.error('Error saving bulk edits:', error);
      res.status(500).json({ 
        error: 'Failed to save bulk edits',
        message: error.message 
      });
    }
  }

  /**
   * Get all edits for a specific page
   * GET /api/websites/:websiteId/edits?page=/about
   */
  async getEdits(req, res) {
    try {
      const { websiteId } = req.params;
      const { page } = req.query;

      // Validate page parameter
      if (!page || typeof page !== 'string') {
        return res.status(400).json({ 
          error: 'page query parameter is required and must be a string' 
        });
      }

      // Retrieve edits via service
      const edits = await editService.getEditsByPage(websiteId, page);

      res.status(200).json({
        success: true,
        count: edits.length,
        data: edits
      });

    } catch (error) {
      console.error('Error retrieving edits:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve edits',
        message: error.message 
      });
    }
  }

  /**
   * Soft delete an edit
   * DELETE /api/websites/:websiteId/edits/:editId
   */
  async deleteEdit(req, res) {
    try {
      const { websiteId, editId } = req.params;

      // Delete via service
      const deleted = await editService.deleteEdit(websiteId, editId);

      if (!deleted) {
        return res.status(404).json({ 
          error: 'Edit not found' 
        });
      }

      res.status(200).json({
        success: true,
        message: 'Edit deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting edit:', error);
      res.status(500).json({ 
        error: 'Failed to delete edit',
        message: error.message 
      });
    }
  }

  /**
   * Get all pages that have edits for a website
   * GET /api/websites/:websiteId/pages
   */
  async getEditedPages(req, res) {
    try {
      const { websiteId } = req.params;

      // Retrieve pages via service
      const pages = await editService.getEditedPages(websiteId);

      res.status(200).json({
        success: true,
        count: pages.length,
        data: pages
      });

    } catch (error) {
      console.error('Error retrieving edited pages:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve edited pages',
        message: error.message 
      });
    }
  }
}

module.exports = new EditController();
