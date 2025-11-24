<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * AttendanceModel - CRUD + helpers for attendance records
 */
class AttendanceModel extends Model
{
    protected $table = 'attendance';

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Create an attendance record
     * $data should contain at least: student_id, teacher_id, course_id, status
     */
    public function create($data)
    {
        $now = date('Y-m-d H:i:s');
        $data['created_at'] = $now;
        $data['updated_at'] = $now;

        return $this->db->table($this->table)->insert($data);
    }

    /**
     * Get attendance records by student id (most recent first)
     */
    public function get_by_student($studentId)
    {
        return $this->db->table($this->table)
                        ->where('student_id', $studentId)
                        ->order_by('created_at', 'DESC')
                        ->get_all();
    }

    /**
     * Get attendance records for a course optionally filtered by teacher and date
     * $date should be 'Y-m-d' string; if null, defaults to today
     */
    public function get_by_course_teacher_date($courseId, $teacherId = null, $date = null)
    {
        if (!$date) {
            $date = date('Y-m-d');
        }

        $start = $date . ' 00:00:00';
        $end = date('Y-m-d 00:00:00', strtotime($date . ' +1 day'));

        $query = $this->db->table($this->table)
                    ->where('course_id', $courseId)
                    ->where('created_at >=', $start)
                    ->where('created_at <', $end);

        if ($teacherId) {
            $query = $query->where('teacher_id', $teacherId);
        }

        return $query->order_by('created_at', 'DESC')->get_all();
    }

    /**
     * Simple helper to delete (soft or hard as needed)
     */
    public function delete($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->delete();
    }
}
