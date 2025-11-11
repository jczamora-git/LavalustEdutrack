<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Subject Model
 * Handles subjects table operations
 */
class SubjectModel extends Model
{
    protected $table = 'subjects';

    /**
     * Get all subjects with optional filters
     */
    public function get_all($filters = [])
    {
    $query = $this->db->table($this->table)
              ->select('id, course_code, course_name, credits, category, year_level, semester, status, created_at, updated_at');

        if (!empty($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        if (!empty($filters['category'])) {
            $query = $query->where('category', $filters['category']);
        }

        if (!empty($filters['year_level'])) {
            $query = $query->where('year_level', $filters['year_level']);
        }

        if (!empty($filters['semester'])) {
            $query = $query->where('semester', $filters['semester']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query = $query->where_group_start();
            $query = $query->like('course_code', $search);
            $query = $query->or_like('course_name', $search);
            // description column removed from subjects table; search only course_code and course_name
            $query = $query->where_group_end();
        }

        return $query->order_by('course_code', 'ASC')->get_all();
    }

    /**
     * Get a single subject by id
     */
    public function get_subject($id)
    {
    return $this->db->table($this->table)
            ->select('id, course_code, course_name, credits, category, year_level, semester, status, created_at, updated_at')
            ->where('id', $id)
            ->get();
    }

    public function find_by_id($id)
    {
        return $this->get_subject($id);
    }

    /**
     * Find subject by course_code
     */
    public function find_by_course_code($code)
    {
    return $this->db->table($this->table)
            ->select('id, course_code, course_name, credits, category, year_level, semester, status, created_at, updated_at')
            ->where('course_code', $code)
            ->get();
    }

    /**
     * Check if course_code exists (optionally excluding an id)
     */
    public function course_code_exists($code, $excludeId = null)
    {
        $query = $this->db->table($this->table)
                          ->where('course_code', $code);

        if ($excludeId) {
            $query = $query->where('id', '!=', $excludeId);
        }

        $result = $query->get();
        return !empty($result);
    }

    /**
     * Create a new subject
     */
    public function create($data)
    {
        $now = date('Y-m-d H:i:s');
        $insert = [
            'course_code' => $data['course_code'] ?? '',
            'course_name' => $data['course_name'] ?? '',
            // description removed from subjects table
            'credits' => $data['credits'] ?? 3,
            'category' => $data['category'] ?? 'Major',
            'year_level' => $data['year_level'] ?? '1st Year',
            'semester' => $data['semester'] ?? '1st Semester',
            'status' => $data['status'] ?? 'active',
            'created_at' => $now,
            'updated_at' => $now
        ];

        $result = $this->db->table($this->table)->insert($insert);

        if ($result === false) {
            return false;
        }

        if (is_int($result)) {
            return $result;
        }

        return $this->db->insert_id() ?? true;
    }

    /**
     * Update subject
     */
    public function update_subject($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');

    $allowed = ['course_code','course_name','credits','category','year_level','semester','status','updated_at'];
        $updateData = [];
        foreach ($data as $k => $v) {
            if (in_array($k, $allowed)) {
                $updateData[$k] = $v;
            }
        }

        return $this->db->table($this->table)->where('id', $id)->update($updateData);
    }

    /**
     * Delete subject (soft delete by setting status to inactive)
     */
    public function delete_subject($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update(['status' => 'inactive', 'updated_at' => date('Y-m-d H:i:s')]);
    }
}
