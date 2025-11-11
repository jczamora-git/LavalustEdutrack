<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * StudentSubject Model
 * Handles student enrollments (student_subjects table)
 */
class StudentSubjectModel extends Model
{
    protected $table = 'student_subjects';

    /**
     * Create student_subject link if not exists. Returns inserted id or existing id, or false on failure
     */
    public function create($student_id, $subject_id)
    {
        if (empty($student_id) || empty($subject_id)) return false;

        // check if exists
        $exists = $this->db->table($this->table)
                         ->select('id')
                         ->where('student_id', $student_id)
                         ->where('subject_id', $subject_id)
                         ->get();

        if (!empty($exists) && isset($exists['id'])) return $exists['id'];

        $now = date('Y-m-d H:i:s');
        $res = $this->db->table($this->table)->insert([
            'student_id' => $student_id,
            'subject_id' => $subject_id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($res === false) return false;
        if (is_int($res)) return $res;
        return $this->db->insert_id() ?? true;
    }

    /**
     * Delete mapping by id or by student_id+subject_id
     */
    public function delete_mapping($id = null, $student_id = null, $subject_id = null)
    {
        try {
            $q = $this->db->table($this->table);
            if (!empty($id)) {
                return $q->where('id', $id)->delete();
            }
            if (!empty($student_id) && !empty($subject_id)) {
                return $q->where('student_id', $student_id)->where('subject_id', $subject_id)->delete();
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get enrolled subjects for a student
     */
    public function get_by_student($student_id)
    {
        if (empty($student_id)) return [];

        $rows = $this->db->table($this->table . ' ss')
                  ->select('ss.id as student_subject_id, s.id as subject_id, s.course_code, s.course_name, s.credits, s.year_level')
                  ->join('subjects s', 'ss.subject_id = s.id')
                  ->where('ss.student_id', $student_id)
                  ->get_all();

        return $rows ?: [];
    }
}
