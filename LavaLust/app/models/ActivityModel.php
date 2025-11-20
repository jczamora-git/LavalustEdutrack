<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Activity Model
 * Handles all activity (assignment/quiz/exam/project/lab) related database operations
 */
class ActivityModel extends Model
{
    protected $table = 'activities';

    /**
     * Get all activities for a course with optional filters
     */
    public function get_all($filters = [])
    {
        $query = $this->db->table($this->table);

        // Course filter (required)
        if (!empty($filters['course_id'])) {
            $query = $query->where('course_id', $filters['course_id']);
        }

        // Section filter (optional)
        if (!empty($filters['section_id'])) {
            $query = $query->where('section_id', $filters['section_id']);
        }

        // Type filter (optional)
        if (!empty($filters['type'])) {
            $query = $query->where('type', $filters['type']);
        }

        // Academic period filter (optional) - filter by specific academic period
        if (!empty($filters['academic_period_id'])) {
            $query = $query->where('academic_period_id', $filters['academic_period_id']);
        }

        // Search by title (optional)
        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query = $query->like('title', $search);
        }

        // Status filter (optional)
        if (!empty($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        return $query->order_by('due_at', 'ASC')->get_all();
    }

    /**
     * Get single activity by ID
     */
    public function get_activity($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Create a new activity
     */
    public function create($data)
    {
        $data['created_at'] = date('Y-m-d H:i:s');
        
        return $this->db->table($this->table)
                        ->insert($data);
    }

    /**
     * Update activity record
     */
    public function update($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($data);
    }

    /**
     * Delete activity (cascades to activity_grades due to FK)
     */
    public function delete($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->delete();
    }

    /**
     * Get grading statistics for an activity
     */
    public function get_grading_stats($activityId)
    {
        $graded = $this->db->table('activity_grades')
                           ->where('activity_id', $activityId)
                           ->where('grade IS NOT NULL')
                           ->select('COUNT(*) as count')
                           ->get();

        $total = $this->db->table('activity_grades')
                          ->where('activity_id', $activityId)
                          ->select('COUNT(*) as count')
                          ->get();

        $graded_count = $graded['count'] ?? 0;
        $total_count = $total['count'] ?? 0;
        $percentage = $total_count > 0 ? round(($graded_count / $total_count) * 100, 2) : 0;

        return [
            'total' => $total_count,
            'graded' => $graded_count,
            'pending' => $total_count - $graded_count,
            'percentage_graded' => $percentage,
        ];
    }
}
