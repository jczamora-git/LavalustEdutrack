<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * AcademicPeriod Model
 * Handles academic period tracking (school year + semester + period type)
 */
class AcademicPeriodModel extends Model
{
    protected $table = 'academic_periods';

    /**
     * Get all academic periods with optional filters
     */
    public function get_all($filters = [])
    {
        $query = $this->db->table($this->table);

        // Status filter
        if (!empty($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        // School year filter
        if (!empty($filters['school_year'])) {
            $query = $query->where('school_year', $filters['school_year']);
        }

        // Semester filter
        if (!empty($filters['semester'])) {
            $query = $query->where('semester', $filters['semester']);
        }

        // Period type filter
        if (!empty($filters['period_type'])) {
            $query = $query->where('period_type', $filters['period_type']);
        }

        return $query->order_by('start_date', 'DESC')->get_all();
    }

    /**
     * Get single academic period by ID
     */
    public function get_period($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get();
    }

    /**
     * Get the currently active academic period
     * Returns the period with status='active'
     */
    public function get_active_period()
    {
        return $this->db->table($this->table)
                        ->where('status', 'active')
                        ->get();
    }

    /**
     * Get current semester (active academic period's semester)
     * Returns '1st Semester', '2nd Semester', or 'Summer'
     */
    public function get_current_semester()
    {
        $active = $this->get_active_period();
        return $active ? $active['semester'] : null;
    }

    /**
     * Get current period type (Midterm or Final Term)
     * Returns 'Midterm' or 'Final Term'
     */
    public function get_current_period_type()
    {
        $active = $this->get_active_period();
        return $active ? $active['period_type'] : null;
    }

    /**
     * Get current school year
     * Returns string like '2024-2025'
     */
    public function get_current_school_year()
    {
        $active = $this->get_active_period();
        return $active ? $active['school_year'] : null;
    }

    /**
     * Check if a specific semester is currently active
     */
    public function is_semester_active($semester)
    {
        $active = $this->get_active_period();
        return $active && $active['semester'] === $semester;
    }

    /**
     * Create a new academic period
     */
    public function create($data)
    {
        // Validate required fields
        if (empty($data['school_year']) || empty($data['semester']) || 
            empty($data['period_type']) || empty($data['start_date']) || 
            empty($data['end_date'])) {
            return false;
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        return $this->db->table($this->table)->insert($data);
    }

    /**
     * Update academic period
     */
    public function update($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($data);
    }

    /**
     * Delete academic period
     */
    public function delete($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->delete();
    }

    /**
     * Set a period as active (and deactivate others)
     */
    public function set_active($id)
    {
        try {
            // Start transaction using whichever API the DB wrapper exposes
            $usedTx = null;
            if (method_exists($this->db, 'transaction')) {
                $this->db->transaction();
                $usedTx = 'transaction';
            } elseif (method_exists($this->db, 'beginTransaction')) {
                $this->db->beginTransaction();
                $usedTx = 'beginTransaction';
            }

            // Deactivate all periods
            $this->db->table($this->table)
                     ->update(['status' => 'past']);

            // Activate the selected period
            $this->db->table($this->table)
                     ->where('id', $id)
                     ->update(['status' => 'active']);

            // Commit transaction if we started one
            if ($usedTx === 'transaction' && method_exists($this->db, 'commit')) {
                $this->db->commit();
            } elseif ($usedTx === 'beginTransaction' && method_exists($this->db, 'commit')) {
                // Database wrapper exposes commit() which calls underlying PDO::commit()
                $this->db->commit();
            }

            return true;
        } catch (Exception $e) {
            // Attempt rollback using available method names
            if (method_exists($this->db, 'roll_back')) {
                $this->db->roll_back();
            } elseif (method_exists($this->db, 'rollback')) {
                $this->db->rollback();
            } elseif (method_exists($this->db, 'rollBack')) {
                $this->db->rollBack();
            }

            return false;
        }
    }

    /**
     * Get subjects relevant to current semester
     * Returns subjects that match the current active semester
     */
    public function get_current_semester_subjects()
    {
        $currentSemester = $this->get_current_semester();
        
        if (!$currentSemester) {
            return [];
        }

        return $this->db->table('subjects')
                        ->where('semester', $currentSemester)
                        ->order_by('year_level, course_code', 'ASC')
                        ->get_all();
    }

    /**
     * Get activities for current academic period
     * Returns activities linked to the active academic period
     */
    public function get_current_period_activities($course_id = null)
    {
        $activePeriod = $this->get_active_period();
        
        if (!$activePeriod) {
            return [];
        }

        $query = $this->db->table('activities')
                          ->where('academic_period_id', $activePeriod['id']);

        if ($course_id) {
            $query = $query->where('course_id', $course_id);
        }

        return $query->order_by('due_at', 'ASC')->get_all();
    }

    /**
     * Get teacher assignments for current semester
     * Returns teacher_subjects filtered by current semester (via subject.semester)
     */
    public function get_current_semester_assignments($teacher_id = null)
    {
        $activePeriod = $this->get_active_period();
        
        if (!$activePeriod) {
            return [];
        }

        $query = $this->db->table('teacher_subjects ts')
                          ->join('subjects s', 'ts.subject_id = s.id')
                          ->select('ts.*, s.course_code, s.course_name, s.semester, s.year_level')
                          ->where('s.semester', $activePeriod['semester']);

        if ($teacher_id) {
            $query = $query->where('ts.teacher_id', $teacher_id);
        }

        return $query->get_all();
    }

    /**
     * Check if system should allow grading based on current period
     * Returns array with allowed status and current period info
     */
    public function get_grading_context()
    {
        $active = $this->get_active_period();
        
        if (!$active) {
            return [
                'allowed' => false,
                'message' => 'No active academic period set',
                'current_period' => null
            ];
        }

        return [
            'allowed' => true,
            'current_period' => [
                'id' => $active['id'],
                'school_year' => $active['school_year'],
                'semester' => $active['semester'],
                'period_type' => $active['period_type'],
                'start_date' => $active['start_date'],
                'end_date' => $active['end_date']
            ],
            'message' => "Current period: {$active['school_year']} {$active['semester']} - {$active['period_type']}"
        ];
    }

    /**
     * Get statistics about academic periods
     */
    public function get_stats()
    {
        $total = $this->db->table($this->table)
                         ->select('COUNT(*) as count')
                         ->get();

        $active = $this->db->table($this->table)
                           ->where('status', 'active')
                           ->select('COUNT(*) as count')
                           ->get();

        $upcoming = $this->db->table($this->table)
                             ->where('status', 'upcoming')
                             ->select('COUNT(*) as count')
                             ->get();

        $past = $this->db->table($this->table)
                        ->where('status', 'past')
                        ->select('COUNT(*) as count')
                        ->get();

        return [
            'total' => $total['count'] ?? 0,
            'active' => $active['count'] ?? 0,
            'upcoming' => $upcoming['count'] ?? 0,
            'past' => $past['count'] ?? 0
        ];
    }
}
