<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Teacher Model
 * Handles all teacher-related database operations
 */
class TeacherModel extends Model
{
    protected $table = 'teachers';
    
    /**
     * Get all teachers with user data (joined)
     */
    public function get_all($filters = [])
    {
      $query = $this->db->table($this->table)
          ->join('users', 'teachers.user_id = users.id')
                  ->select('teachers.id, teachers.user_id, teachers.employee_id, teachers.status, teachers.status_updated_at, teachers.created_at, teachers.updated_at, users.email, users.first_name, users.last_name, users.phone, users.status as user_status');

        // Status filter
        if (!empty($filters['status'])) {
            $query = $query->where('users.status', $filters['status']);
        }

        // Search by name, email, or employee_id
        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            // Use where_group_start for OR conditions
            $query = $query->where_group_start();
            $query = $query->like('users.first_name', $search);
            $query = $query->or_like('users.last_name', $search);
            $query = $query->or_like('users.email', $search);
            $query = $query->or_like('teachers.employee_id', $search);
            $query = $query->where_group_end();
        }

        // Department filter
        if (!empty($filters['department'])) {
            $query = $query->where('teachers.department', $filters['department']);
        }

    return $query->order_by('teachers.created_at', 'DESC')->get_all();
    }

    /**
     * Get single teacher with user data
     */
    public function get_teacher($id)
    {
    $result = $this->db->table($this->table)
           ->join('users', 'teachers.user_id = users.id')
               ->select('teachers.*, users.email, users.first_name, users.last_name, users.phone, users.status as user_status')
               ->where('teachers.id', $id)
               ->get();
        
        return $result;
    }

    /**
     * Get teacher by user_id
     */
    public function get_by_user_id($userId)
    {
        return $this->db->table($this->table)
                        ->where('user_id', $userId)
                        ->get();
    }

    /**
     * Check if employee_id exists
     */
    public function employee_id_exists($employeeId, $excludeId = null)
    {
        $query = $this->db->table($this->table)
                          ->where('employee_id', $employeeId);

        if ($excludeId) {
            $query = $query->where('id', '!=', $excludeId);
        }

        $result = $query->get();
        return !empty($result);
    }

    /**
     * Get teacher stats
     */
    public function get_stats()
    {
        $total = $this->db->table($this->table)
                         ->select('COUNT(*) as count')
                         ->get();

    $active = $this->db->table($this->table)
              ->join('users', 'teachers.user_id = users.id')
                          ->select('COUNT(*) as count')
                          ->where('users.status', 'active')
                          ->get();

    $inactive = $this->db->table($this->table)
                ->join('users', 'teachers.user_id = users.id')
                            ->select('COUNT(*) as count')
                            ->where('users.status', 'inactive')
                            ->get();

        return [
            'total' => $total['count'] ?? 0,
            'active' => $active['count'] ?? 0,
            'inactive' => $inactive['count'] ?? 0,
        ];
    }

    /**
     * Find teacher by ID (alias for get_teacher)
     */
    public function find_by_id($id)
    {
        return $this->get_teacher($id);
    }

    /**
     * Check if email exists (for the associated user)
     */
    public function email_exists($email, $excludeTeacherId = null)
    {
        $query = $this->db->table('users')
                          ->join('teachers', 'users.id = teachers.user_id')
                          ->where('users.email', $email);

        if ($excludeTeacherId) {
            $query = $query->where('teachers.id', '!=', $excludeTeacherId);
        }

        $result = $query->get();
        return !empty($result);
    }

    /**
     * Get assigned courses for a teacher
     * Returns array of assigned courses with sections
     */
    public function get_assigned_courses($teacherId)
    {
        // Get all teacher_subjects for this teacher
        $assignments = $this->db->table('teacher_subjects')
                                ->select('teacher_subjects.id as teacher_subject_id, teacher_subjects.subject_id')
                                ->where('teacher_subjects.teacher_id', $teacherId)
                                ->get_all();

        if (empty($assignments)) {
            return [];
        }

        $result = [];
        foreach ($assignments as $a) {
            // Get subject details
            $subject = $this->db->table('subjects')
                              ->select('id, course_code, course_name, credits, category, year_level, semester')
                              ->where('id', $a['subject_id'])
                              ->get();

            if (empty($subject)) continue;

            // Get sections for this assignment
            $sections = $this->db->table('teacher_subject_sections')
                              ->join('sections', 'teacher_subject_sections.section_id = sections.id')
                              ->select('sections.id, sections.name, sections.description')
                              ->where('teacher_subject_sections.teacher_subject_id', $a['teacher_subject_id'])
                              ->get_all();

            $section_names = [];
            foreach ($sections as $s) {
                $section_names[] = $s['name'];
            }

            $result[] = [
                'course' => $subject['course_code'],
                'title' => $subject['course_name'],
                'units' => $subject['credits'],
                'sections' => $section_names,
                'yearLevel' => $subject['year_level'],
                'teacher_subject_id' => $a['teacher_subject_id']
            ];
        }

        return $result;
    }

    /**
     * Update teacher record
     */
    public function update_teacher($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        // Separate teacher data from user data
        $teacherData = [];
        $userData = [];

        // Teacher-specific fields
        $teacher_fields = ['employee_id', 'hire_date', 'department', 'specialization', 'updated_at', 'deleted_at'];
        foreach ($data as $key => $value) {
            if (in_array($key, $teacher_fields)) {
                $teacherData[$key] = $value;
            }
        }

        // User-specific fields
        $user_fields = ['first_name', 'last_name', 'email', 'phone', 'status'];
        foreach ($data as $key => $value) {
            if (in_array($key, $user_fields)) {
                $userData[$key] = $value;
            }
        }

        // Get the teacher to find the user_id
        $teacher = $this->get_teacher($id);
        if (!$teacher) {
            return false;
        }

        try {
            $this->db->beginTransaction();

            // Update teacher record
            if (!empty($teacherData)) {
                $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($teacherData);
            }

            // Update user record
            if (!empty($userData)) {
                $this->db->table('users')
                        ->where('id', $teacher['user_id'])
                        ->update($userData);
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Soft delete teacher (set deleted_at timestamp)
     */
    public function delete_teacher($id)
    {
        $result = $this->db->table($this->table)
                          ->where('id', $id)
                          ->update([
                              'deleted_at' => date('Y-m-d H:i:s')
                          ]);
        
        return $result;
    }

    /**
     * Get teacher counts (for stats)
     */
    public function get_teacher_counts()
    {
        return $this->get_stats();
    }

    /**
     * Get the last employee_id for a given year (returns string or null)
     */
    public function get_last_employee_id($year)
    {
        $pattern = 'EMP' . $year . '-%';

    $result = $this->db->table($this->table)
               ->select('employee_id')
               ->like('employee_id', $pattern)
               ->order_by('id', 'DESC')
               ->limit(1)
               ->get();

        return $result['employee_id'] ?? null;
    }

    /**
     * Assign course to teacher with sections
     * @param int $teacherId
     * @param string $courseCode Subject course_code
     * @param string $sections Comma-separated section names (e.g., "F1,F2,F3")
     */
    public function assign_course($teacherId, $courseCode, $sections)
    {
        // Find subject by course_code
        $subject = $this->db->table('subjects')
                           ->select('id')
                           ->where('course_code', $courseCode)
                           ->get();

        if (empty($subject) || empty($subject['id'])) {
            return false;
        }

        $subject_id = $subject['id'];

        // Create or get teacher_subject assignment
        $ts_assignment = $this->db->table('teacher_subjects')
                                  ->select('id')
                                  ->where('teacher_id', $teacherId)
                                  ->where('subject_id', $subject_id)
                                  ->get();

        if (!empty($ts_assignment) && isset($ts_assignment['id'])) {
            $ts_id = $ts_assignment['id'];
        } else {
            // Insert new teacher_subject
            $now = date('Y-m-d H:i:s');
            $insert_result = $this->db->table('teacher_subjects')->insert([
                'teacher_id' => $teacherId,
                'subject_id' => $subject_id,
                'created_at' => $now,
                'updated_at' => $now
            ]);

            if (!$insert_result) {
                return false;
            }

            $ts_id = $this->db->insert_id();
        }

        // Clear existing sections for this assignment
        $this->db->table('teacher_subject_sections')
                ->where('teacher_subject_id', $ts_id)
                ->delete();

        // Parse and add sections
        if (!empty($sections)) {
            $section_names = explode(',', $sections);
            foreach ($section_names as $sname) {
                $sname = trim($sname);
                if (empty($sname)) continue;

                // Find section by name
                $section_row = $this->db->table('sections')
                                       ->select('id')
                                       ->where('name', $sname)
                                       ->get();

                if (!empty($section_row) && isset($section_row['id'])) {
                    $this->db->table('teacher_subject_sections')->insert([
                        'teacher_subject_id' => $ts_id,
                        'section_id' => $section_row['id'],
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
        }

        return true;
    }

    /**
     * Remove course assignment from teacher
     * Deletes teacher_subject record and related section links
     */
    public function remove_course_assignment($teacherId, $courseCode)
    {
        // Find subject by course_code
        $subject = $this->db->table('subjects')
                           ->select('id')
                           ->where('course_code', $courseCode)
                           ->get();

        if (empty($subject) || empty($subject['id'])) {
            return false;
        }

        $subject_id = $subject['id'];

        // Find teacher_subject assignment
        $ts_assignment = $this->db->table('teacher_subjects')
                                  ->select('id')
                                  ->where('teacher_id', $teacherId)
                                  ->where('subject_id', $subject_id)
                                  ->get();

        if (empty($ts_assignment) || !isset($ts_assignment['id'])) {
            return true; // Already removed
        }

        $ts_id = $ts_assignment['id'];

        // Delete section links first (foreign key cascade should handle this, but explicit is better)
        $this->db->table('teacher_subject_sections')
                ->where('teacher_subject_id', $ts_id)
                ->delete();

        // Delete teacher_subject assignment
        $result = $this->db->table('teacher_subjects')
                          ->where('id', $ts_id)
                          ->delete();

        return $result;
    }
}
