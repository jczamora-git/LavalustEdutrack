<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * FinalGrades Model
 * Handles all final grades database operations
 */
class FinalGradesModel extends Model
{
    protected $table = 'final_grades';

    /**
     * Get final grades by filters
     */
    public function get_grades($filters = [])
    {
        $query = $this->db->table($this->table);

        if (!empty($filters['student_id'])) {
            $query = $query->where('student_id', $filters['student_id']);
        }
        if (!empty($filters['subject_id'])) {
            $query = $query->where('subject_id', $filters['subject_id']);
        }
        if (!empty($filters['academic_period_id'])) {
            $query = $query->where('academic_period_id', $filters['academic_period_id']);
        }

        return $query->order_by('created_at', 'DESC')->get_all();
    }

    /**
     * Get single final grade record
     */
    public function get_grade($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Check if grade exists for student/subject/period/term combo
     */
    public function grade_exists($student_id, $subject_id, $academic_period_id, $term)
    {
        return $this->db->table($this->table)
                        ->where('student_id', $student_id)
                        ->where('subject_id', $subject_id)
                        ->where('academic_period_id', $academic_period_id)
                        ->where('term', $term)
                        ->get();
    }

    /**
     * Create a new final grade record
     */
    public function create($data)
    {
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->table($this->table)
                        ->insert($data);
    }

    /**
     * Update final grade record
     */
    public function update($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($data);
    }

    /**
     * Update by student/subject/period/term combo
     */
    public function update_by_combo($student_id, $subject_id, $academic_period_id, $term, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');

        return $this->db->table($this->table)
                        ->where('student_id', $student_id)
                        ->where('subject_id', $subject_id)
                        ->where('academic_period_id', $academic_period_id)
                        ->where('term', $term)
                        ->update($data);
    }

    /**
     * Delete final grade record
     */
    public function delete($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->delete();
    }
}
?>
