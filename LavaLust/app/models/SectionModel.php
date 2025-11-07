<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Section Model
 * Handles sections table operations
 */
class SectionModel extends Model
{
    protected $table = 'sections';

    /**
     * Get all sections
     */
    public function get_all($filters = [])
    {
        $query = $this->db->table($this->table)
                          ->select('id, name, description, status, created_at, updated_at');

        if (!empty($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        // Exact description filter (useful for degree/program grouping)
        if (!empty($filters['description'])) {
            $query = $query->where('description', $filters['description']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query = $query->where_group_start();
            $query = $query->like('name', $search);
            $query = $query->or_like('description', $search);
            $query = $query->where_group_end();
        }

        return $query->order_by('created_at', 'DESC')->get_all();
    }

    /**
     * Get a single section by id
     */
    public function get_section($id)
    {
        return $this->db->table($this->table)
                        ->select('id, name, description, status, created_at, updated_at')
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Find section by id (alias)
     */
    public function find_by_id($id)
    {
        return $this->get_section($id);
    }

    /**
     * Find section by name
     */
    public function find_by_name($name)
    {
        return $this->db->table($this->table)
                        ->select('id, name, description, status, created_at, updated_at')
                        ->where('name', $name)
                        ->get();
    }

    /**
     * Check if a section name exists (optionally excluding an id)
     */
    public function name_exists($name, $excludeId = null)
    {
        $query = $this->db->table($this->table)
                          ->where('name', $name);

        if ($excludeId) {
            $query = $query->where('id', '!=', $excludeId);
        }

        $result = $query->get();
        return !empty($result);
    }

    /**
     * Create a new section
     * Returns inserted id or false
     */
    public function create($data)
    {
        $now = date('Y-m-d H:i:s');
        $insert = [
            'name' => $data['name'] ?? '',
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_at' => $now,
            'updated_at' => $now
        ];

        $result = $this->db->table($this->table)->insert($insert);

        // Some DB layers return boolean, others return inserted id
        if ($result === false) {
            return false;
        }

        if (is_int($result)) {
            return $result;
        }

        // Try to fetch last insert id if available
        return $this->db->insert_id() ?? true;
    }

    /**
     * Update section
     */
    public function update_section($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');

        $updateData = [];
        $allowed = ['name', 'description', 'status', 'updated_at'];
        foreach ($data as $k => $v) {
            if (in_array($k, $allowed)) {
                $updateData[$k] = $v;
            }
        }

        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($updateData);
    }

    /**
     * Delete section (soft delete by setting status to inactive)
     */
    public function delete_section($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update(['status' => 'inactive', 'updated_at' => date('Y-m-d H:i:s')]);
    }

    /**
     * Get all sections with their year level assignments
     * Returns sections grouped by year level
     */
    public function get_all_with_year_levels()
    {
        // Get all sections
        $sections = $this->get_all();

        // Get all year level mappings
        $mappings = $this->db->table('year_level_sections yls')
                             ->select('yls.section_id, yls.year_level_id, yl.name as year_level_name')
                             ->left_join('year_levels yl', 'yl.id = yls.year_level_id')
                             ->get_all();

        // Create a map of section_id => array of year levels
        $yearLevelMap = [];
        foreach ($mappings as $mapping) {
            $sectionId = $mapping['section_id'];
            if (!isset($yearLevelMap[$sectionId])) {
                $yearLevelMap[$sectionId] = [];
            }
            $yearLevelMap[$sectionId][] = [
                'year_level_id' => $mapping['year_level_id'],
                'year_level_name' => $mapping['year_level_name']
            ];
        }

        // Add year levels to each section
        foreach ($sections as &$section) {
            $section['year_levels'] = $yearLevelMap[$section['id']] ?? [];
        }

        return $sections;
    }

    /**
     * Get sections available (not assigned) to a specific year level
     */
    public function get_unassigned_for_year_level($yearLevelId)
    {
        return $this->db->table($this->table . ' s')
                        ->select('s.id, s.name, s.description, s.status')
                        ->where('s.status', 'active')
                        ->where_not_in('s.id', function($query) use ($yearLevelId) {
                            return $query->table('year_level_sections')
                                        ->select('section_id')
                                        ->where('year_level_id', $yearLevelId);
                        })
                        ->order_by('s.name', 'ASC')
                        ->get_all();
    }
}
