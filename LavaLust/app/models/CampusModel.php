<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * CampusModel - simple CRUD for campus locations
 */
class CampusModel extends Model
{
    protected $table = 'campus'; // matches your DB table name

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get all campuses
     */
    public function get_all()
    {
        return $this->db->table($this->table)
                        ->order_by('id', 'DESC')
                        ->get_all();
    }

    /**
     * Get single campus
     */
    public function get_campus($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Create campus
     */
    public function create($data)
    {
        if (empty($data['name']) || empty($data['latitude']) || empty($data['longitude'])) {
            return false;
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->table($this->table)->insert($data);
    }

    /**
     * Update campus
     */
    public function update($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($data);
    }

    /**
     * Delete campus
     */
    public function delete($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->delete();
    }
}
