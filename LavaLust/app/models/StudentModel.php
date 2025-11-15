<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Student Model
 * Handles all student-related database operations
 */
class StudentModel extends Model
{
    protected $table = 'students';

    /**
     * Get all students with user data (joined)
     */
    public function get_all($filters = [])
    {
    $query = $this->db->table($this->table)
              ->join('users', 'students.user_id = users.id')
              ->select('students.id, students.user_id, students.student_id, students.year_level, students.section_id, students.status, students.created_at, students.updated_at, users.email, users.first_name, users.last_name, users.phone, users.status as user_status');

        // Status filter
        if (!empty($filters['status'])) {
            $query = $query->where('users.status', $filters['status']);
        }

        // Year level filter
        if (!empty($filters['year_level'])) {
            $query = $query->where('students.year_level', $filters['year_level']);
        }

        // Section filter
        if (!empty($filters['section_id'])) {
            $query = $query->where('students.section_id', $filters['section_id']);
        }

        // Search by name, email, or student_id
        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query = $query->where_group_start();
            $query = $query->like('users.first_name', $search);
            $query = $query->or_like('users.last_name', $search);
            $query = $query->or_like('users.email', $search);
            $query = $query->or_like('students.student_id', $search);
            $query = $query->where_group_end();
        }

        $students = $query->order_by('students.created_at', 'DESC')->get_all();
        
        // If include_grades is requested, fetch grades for each student
        if (!empty($filters['include_grades']) && is_array($students)) {
            foreach ($students as &$student) {
                $student['grades'] = $this->get_student_grades($student['id']);
            }
        }
        
        return $students;
    }
    
    /**
     * Get all grades for a specific student
     */
    public function get_student_grades($studentId)
    {
        return $this->db->table('activity_grades')
                        ->where('student_id', $studentId)
                        ->get_all();
    }

    /**
     * Get single student with user data
     */
    public function get_student($id)
    {
    $result = $this->db->table($this->table)
               ->join('users', 'students.user_id = users.id')
               ->select('students.*, users.email, users.first_name, users.last_name, users.phone, users.status as user_status')
               ->where('students.id', $id)
               ->get();
        
        return $result;
    }

    /**
     * Get student by user_id
     */
    public function get_by_user_id($userId)
    {
        return $this->db->table($this->table)
                        ->where('user_id', $userId)
                        ->get();
    }

    /**
     * Check if student_id exists
     */
    public function student_id_exists($studentId, $excludeId = null)
    {
        $query = $this->db->table($this->table)
                          ->where('student_id', $studentId);

        if ($excludeId) {
            $query = $query->where('id', '!=', $excludeId);
        }

        $result = $query->get();
        return !empty($result);
    }

    /**
     * Get student stats
     */
    public function get_stats()
    {
        $total = $this->db->table($this->table)
                         ->select('COUNT(*) as count')
                         ->get();
    $active = $this->db->table($this->table)
              ->join('users', 'students.user_id = users.id')
                          ->select('COUNT(*) as count')
                          ->where('users.status', 'active')
                          ->get();

    $inactive = $this->db->table($this->table)
                ->join('users', 'students.user_id = users.id')
                            ->select('COUNT(*) as count')
                            ->where('users.status', 'inactive')
                            ->get();

        $byYear = $this->db->table($this->table)
                          ->select('students.year_level, COUNT(*) as count')
                          ->join('users', 'students.user_id = users.id')
                          ->where('users.status', 'active')
                          ->group_by('students.year_level')
                          ->get_all();

        return [
            'total' => $total['count'] ?? 0,
            'active' => $active['count'] ?? 0,
            'inactive' => $inactive['count'] ?? 0,
            'by_year_level' => $byYear,
        ];
    }

    /**
     * Update student record
     */
    public function update($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $result = $this->db->table($this->table)
                          ->where('id', $id)
                          ->update($data);
        
        return $result;
    }

    /**
     * Delete student and associated user
     */
    public function delete($id)
    {
        // Get the student record first
        $student = $this->get_student($id);
        
        if (!$student) {
            return false;
        }

        $user_id = $student['user_id'];

        try {
            // Start transaction
            $this->db->beginTransaction();

            // Delete student record
            $this->db->table($this->table)
                    ->where('id', $id)
                    ->delete();

            // Delete associated user
            $this->db->table('users')
                    ->where('id', $user_id)
                    ->delete();

            // Commit transaction
            $this->db->commit();

            return true;
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Get the last student_id for a given year (returns string or null)
     */
    public function get_last_student_id($year)
    {
        $pattern = 'MCC' . $year . '-%';

    $result = $this->db->table($this->table)
               ->select('student_id')
               ->like('student_id', $pattern)
               ->order_by('id', 'DESC')
               ->limit(1)
               ->get();

        return $result['student_id'] ?? null;
    }

    /**
     * Generate next student ID for a given year using pattern MCC{year}-{5digit}
     */
    public function generate_student_id($year)
    {
        $last = $this->get_last_student_id($year);
        $prefix = 'MCC' . $year . '-';

        if (!$last) {
            $next = 1;
        } else {
            // Extract numeric suffix
            $suffix = str_replace($prefix, '', $last);
            $num = intval($suffix);
            $next = $num + 1;
        }

        return $prefix . str_pad((string)$next, 5, '0', STR_PAD_LEFT);
    }
}
