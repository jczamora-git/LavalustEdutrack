<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Year Level Model
 * Handles year_levels table operations
 */
class YearLevelModel extends Model
{
    protected $table = 'year_levels';

    /**
     * Get all year levels ordered by order field
     */
    public function get_all()
    {
        return $this->db->table($this->table)
                        ->select('id, name, `order`')
                        ->order_by('`order`', 'ASC')
                        ->get_all();
    }

    /**
     * Get a single year level by id
     */
    public function find_by_id($id)
    {
        return $this->db->table($this->table)
                        ->select('id, name, `order`')
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Get a year level by name
     */
    public function find_by_name($name)
    {
        return $this->db->table($this->table)
                        ->select('id, name, `order`')
                        ->where('name', $name)
                        ->get();
    }
}
