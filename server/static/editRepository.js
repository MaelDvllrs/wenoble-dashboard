const { supabaseServerAdmin } = require('../supabase');

/**
 * Repository layer for static website edits
 * Uses Supabase for data persistence
 */
class EditRepository {
  constructor() {
    this.tableName = 'website_edits';
  }

  /**
   * Create a new edit
   */
  async create(editData) {
    const supabase = supabaseServerAdmin();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        website_id: editData.websiteId,
        page_path: editData.pagePath,
        element_path: editData.elementPath,
        edit_type: editData.editType,
        value: editData.value,
        created_at: editData.createdAt || new Date().toISOString(),
        updated_at: editData.updatedAt || new Date().toISOString(),
        deleted_at: editData.deletedAt || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating edit:', error);
      throw error;
    }

    // Convertir snake_case en camelCase pour la réponse
    return this.mapToEdit(data);
  }

  /**
   * Update an existing edit
   */
  async update(editId, updates) {
    const supabase = supabaseServerAdmin();
    
    const updateData = {};
    if (updates.editType) updateData.edit_type = updates.editType;
    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.updatedAt) updateData.updated_at = updates.updatedAt.toISOString();
    if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt ? updates.deletedAt.toISOString() : null;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', editId)
      .select()
      .single();

    if (error) {
      console.error('Error updating edit:', error);
      return null;
    }

    return this.mapToEdit(data);
  }

  /**
   * Find an edit by ID
   */
  async findById(editId) {
    const supabase = supabaseServerAdmin();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', editId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error finding edit by ID:', error);
      throw error;
    }

    return this.mapToEdit(data);
  }

  /**
   * Find an edit by websiteId, pagePath, and elementPath
   * Used to check if an edit already exists
   */
  async findByPath(websiteId, pagePath, elementPath) {
    const supabase = supabaseServerAdmin();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('website_id', websiteId)
      .eq('page_path', pagePath)
      .eq('element_path', elementPath)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error finding edit by path:', error);
      throw error;
    }

    return this.mapToEdit(data);
  }

  /**
   * Find all edits for a specific page
   */
  async findByPage(websiteId, pagePath) {
    const supabase = supabaseServerAdmin();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('website_id', websiteId)
      .eq('page_path', pagePath)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error finding edits by page:', error);
      throw error;
    }

    return data.map(edit => this.mapToEdit(edit));
  }

  /**
   * Find all edits for a website
   */
  async findByWebsite(websiteId) {
    const supabase = supabaseServerAdmin();
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('website_id', websiteId)
      .is('deleted_at', null)
      .order('page_path', { ascending: true });

    if (error) {
      console.error('Error finding edits by website:', error);
      throw error;
    }

    return data.map(edit => this.mapToEdit(edit));
  }

  /**
   * Delete an edit (soft delete)
   */
  async delete(editId) {
    const supabase = supabaseServerAdmin();
    
    const { error } = await supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', editId);

    if (error) {
      console.error('Error deleting edit:', error);
      return false;
    }

    return true;
  }

  /**
   * Helper: Convert snake_case database fields to camelCase
   */
  mapToEdit(dbEdit) {
    if (!dbEdit) return null;
    
    return {
      id: dbEdit.id,
      websiteId: dbEdit.website_id,
      pagePath: dbEdit.page_path,
      elementPath: dbEdit.element_path,
      editType: dbEdit.edit_type,
      value: dbEdit.value,
      createdAt: new Date(dbEdit.created_at),
      updatedAt: new Date(dbEdit.updated_at),
      deletedAt: dbEdit.deleted_at ? new Date(dbEdit.deleted_at) : null
    };
  }
}

module.exports = new EditRepository();

/**
 * SQL Implementation Example:
 * 
 * CREATE TABLE website_edits (
 *   id INT PRIMARY KEY AUTO_INCREMENT,
 *   website_id VARCHAR(255) NOT NULL,
 *   page_path VARCHAR(500) NOT NULL,
 *   element_path TEXT NOT NULL,
 *   edit_type ENUM('text', 'image') NOT NULL,
 *   value TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   deleted_at TIMESTAMP NULL,
 *   INDEX idx_website_page (website_id, page_path),
 *   UNIQUE KEY unique_edit (website_id, page_path, element_path(255))
 * );
 * 
 * async create(editData) {
 *   const [result] = await db.query(
 *     `INSERT INTO website_edits (website_id, page_path, element_path, edit_type, value, created_at, updated_at)
 *      VALUES (?, ?, ?, ?, ?, ?, ?)`,
 *     [editData.websiteId, editData.pagePath, editData.elementPath, 
 *      editData.editType, editData.value, editData.createdAt, editData.updatedAt]
 *   );
 *   return { id: result.insertId, ...editData };
 * }
 * 
 * async findByPath(websiteId, pagePath, elementPath) {
 *   const [rows] = await db.query(
 *     `SELECT * FROM website_edits 
 *      WHERE website_id = ? AND page_path = ? AND element_path = ?
 *      LIMIT 1`,
 *     [websiteId, pagePath, elementPath]
 *   );
 *   return rows[0] || null;
 * }
 */
