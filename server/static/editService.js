const editRepository = require('./editRepository');

/**
 * Service layer for static website edits
 * Contains business logic and orchestrates repository calls
 */
class EditService {
  /**
   * Save or update a single edit
   * If an edit exists for the same websiteId + pagePath + elementPath, update it
   * Otherwise, create a new edit
   */
  async saveEdit(editData) {
    const { websiteId, pagePath, elementPath, editType, value } = editData;

    // Check if edit already exists
    const existingEdit = await editRepository.findByPath(
      websiteId, 
      pagePath, 
      elementPath
    );

    if (existingEdit) {
      // Update existing edit
      return await editRepository.update(existingEdit.id, {
        editType,
        value,
        updatedAt: new Date()
      });
    } else {
      // Create new edit
      return await editRepository.create({
        websiteId,
        pagePath,
        elementPath,
        editType,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      });
    }
  }

  /**
   * Save multiple edits at once
   * Uses the same upsert logic as saveEdit
   */
  async saveEditsBulk(editsArray) {
    const savedEdits = [];

    // Process each edit sequentially to maintain consistency
    for (const editData of editsArray) {
      const savedEdit = await this.saveEdit(editData);
      savedEdits.push(savedEdit);
    }

    return savedEdits;
  }

  /**
   * Retrieve all non-deleted edits for a specific page
   * Sorted by creation date (oldest first)
   */
  async getEditsByPage(websiteId, pagePath) {
    const edits = await editRepository.findByPage(websiteId, pagePath);
    
    // Filter out soft-deleted edits
    const activeEdits = edits.filter(edit => !edit.deletedAt);
    
    // Sort by creation date
    activeEdits.sort((a, b) => a.createdAt - b.createdAt);
    
    return activeEdits;
  }

  /**
   * Soft delete an edit
   * Sets deletedAt timestamp instead of removing from database
   */
  async deleteEdit(websiteId, editId) {
    const edit = await editRepository.findById(editId);

    if (!edit || edit.websiteId !== websiteId) {
      return null;
    }

    // Soft delete by setting deletedAt
    return await editRepository.update(editId, {
      deletedAt: new Date()
    });
  }

  /**
   * Get all unique page paths that have edits for a website
   */
  async getEditedPages(websiteId) {
    const edits = await editRepository.findByWebsite(websiteId);
    
    // Filter active edits and extract unique page paths
    const activeEdits = edits.filter(edit => !edit.deletedAt);
    const uniquePages = [...new Set(activeEdits.map(edit => edit.pagePath))];
    
    return uniquePages.sort();
  }

  /**
   * Get all edits for a website (including all pages)
   */
  async getAllEditsForWebsite(websiteId) {
    const edits = await editRepository.findByWebsite(websiteId);
    
    // Filter out soft-deleted edits
    const activeEdits = edits.filter(edit => !edit.deletedAt);
    
    // Sort by page path, then by creation date
    activeEdits.sort((a, b) => {
      if (a.pagePath !== b.pagePath) {
        return a.pagePath.localeCompare(b.pagePath);
      }
      return a.createdAt - b.createdAt;
    });
    
    return activeEdits;
  }
}

module.exports = new EditService();
