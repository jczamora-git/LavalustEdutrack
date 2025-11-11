<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * TeacherSubject Model
 * Handles assignments of teachers to subjects and their sections
 */
class TeacherSubjectModel extends Model
{
    protected $table = 'teacher_subjects';

    /**
     * Create or return existing teacher_subject assignment
     * Returns teacher_subjects.id on success or false
     */
    public function create_assignment($teacher_id, $subject_id)
    {
        // Check if exists
        $existing = $this->db->table($this->table)
                         ->select('id')
                         ->where('teacher_id', $teacher_id)
                         ->where('subject_id', $subject_id)
                         ->get();

        if (!empty($existing) && isset($existing['id'])) {
            return $existing['id'];
        }

        $now = date('Y-m-d H:i:s');
        $insert = [
            'teacher_id' => $teacher_id,
            'subject_id' => $subject_id,
            'created_at' => $now,
            'updated_at' => $now
        ];

        $res = $this->db->table($this->table)->insert($insert);

        if ($res === false) return false;
        if (is_int($res)) return $res;
        return $this->db->insert_id() ?? true;
    }

    /**
     * Add section links for a teacher_subject assignment
     * Accepts array of section_ids. Returns true on success.
     */
    public function add_sections($teacher_subject_id, array $section_ids)
    {
        if (empty($section_ids)) return true;

        foreach ($section_ids as $section_id) {
            // check existing
            $exists = $this->db->table('teacher_subject_sections')
                             ->select('id')
                             ->where('teacher_subject_id', $teacher_subject_id)
                             ->where('section_id', $section_id)
                             ->get();

            if (!empty($exists)) continue;

            $this->db->table('teacher_subject_sections')->insert([
                'teacher_subject_id' => $teacher_subject_id,
                'section_id' => $section_id,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        }

        return true;
    }

    /**
     * Synchronize the sections for a teacher_subject assignment.
     * Ensures that only the provided section_ids exist for the given teacher_subject_id.
     * This method will insert missing links and delete links that are no longer present.
     * Returns true on success.
     */
    public function set_sections($teacher_subject_id, array $section_ids)
    {
        // Normalize unique ints
        $section_ids = array_values(array_filter(array_map('intval', $section_ids)));

        // Get existing section ids
        $existingRows = $this->db->table('teacher_subject_sections')
                              ->select('section_id')
                              ->where('teacher_subject_id', $teacher_subject_id)
                              ->get_all();

        $existing = [];
        foreach ($existingRows as $r) {
            if (isset($r['section_id'])) $existing[] = (int)$r['section_id'];
        }

        $toAdd = array_values(array_diff($section_ids, $existing));
        $toRemove = array_values(array_diff($existing, $section_ids));

        // Delete removed links
        if (!empty($toRemove)) {
            $this->db->table('teacher_subject_sections')
                     ->where('teacher_subject_id', $teacher_subject_id)
                     ->where_in('section_id', $toRemove)
                     ->delete();
        }

        // Insert missing links
        if (!empty($toAdd)) {
            foreach ($toAdd as $section_id) {
                // double-check not exists (defensive)
                $exists = $this->db->table('teacher_subject_sections')
                                 ->select('id')
                                 ->where('teacher_subject_id', $teacher_subject_id)
                                 ->where('section_id', $section_id)
                                 ->get();

                if (!empty($exists)) continue;

                $this->db->table('teacher_subject_sections')->insert([
                    'teacher_subject_id' => $teacher_subject_id,
                    'section_id' => $section_id,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }

        return true;
    }

    /**
     * Remove a single section link for a teacher_subject assignment.
     * Returns true on success.
     */
    public function remove_section($teacher_subject_id, $section_id)
    {
        if (empty($teacher_subject_id) || empty($section_id)) return false;

        return $this->db->table('teacher_subject_sections')
                    ->where('teacher_subject_id', $teacher_subject_id)
                    ->where('section_id', $section_id)
                    ->delete();
    }

    /**
     * Delete a teacher_subject assignment and its linked sections.
     * Returns true on success.
     */
    public function delete_assignment($teacher_subject_id)
    {
        if (empty($teacher_subject_id)) return false;

        // Deleting the teacher_subjects row should cascade to teacher_subject_sections
        // if the FK is defined with ON DELETE CASCADE. We'll delete sections explicitly
        // as a safe fallback.
        try {
            // remove linked section rows first (safe)
            $this->db->table('teacher_subject_sections')
                     ->where('teacher_subject_id', $teacher_subject_id)
                     ->delete();

            // then remove the teacher_subject record
            return $this->db->table($this->table)
                        ->where('id', $teacher_subject_id)
                        ->delete();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get assignments for a teacher and include subject and sections
     * Returns array: [{ teacher_subject_id, subject: {...}, sections: [{id,name}] }, ...]
     */
    public function get_assignments_by_teacher($teacher_id)
    {
        // Get assignments
        $assignments = $this->db->table($this->table)
                              ->select('teacher_subjects.id as teacher_subject_id, teacher_subjects.subject_id')
                              ->where('teacher_subjects.teacher_id', $teacher_id)
                              ->get_all();

        $result = [];
        if (empty($assignments)) return [];

        foreach ($assignments as $a) {
            $subject = $this->db->table('subjects')
                              ->select('id, course_code, course_name, credits, category, year_level, semester')
                              ->where('id', $a['subject_id'])
                              ->get();

            $sections = $this->db->table('teacher_subject_sections')
                              ->join('sections', 'teacher_subject_sections.section_id = sections.id')
                              ->select('sections.id, sections.name')
                              ->where('teacher_subject_sections.teacher_subject_id', $a['teacher_subject_id'])
                              ->get_all();

            $result[] = [
                'teacher_subject_id' => $a['teacher_subject_id'],
                'subject' => $subject,
                'sections' => $sections
            ];
        }

        return $result;
    }

    /**
     * Get all assignments optionally filtered by subject course_code.
     * Returns array similar to get_assignments_by_teacher but includes teacher info.
     */
    public function get_all_assignments($subject_codes = null)
    {
        $query = $this->db->table('teacher_subjects ts')
                       ->select('ts.id as teacher_subject_id, ts.subject_id, ts.teacher_id')
                       ->join('subjects s', 'ts.subject_id = s.id')
                       ->join('teachers t', 'ts.teacher_id = t.id')
                       ->join('users u', 't.user_id = u.id')
                       ->select('s.id as subject_id, s.course_code, s.course_name, s.credits, s.year_level')
                       ->select('t.id as teacher_id, u.first_name, u.last_name');

        // subject_codes can be either a single string or an array of codes
        if (!empty($subject_codes) && is_array($subject_codes) && count($subject_codes) > 0) {
            // Normalize codes (remove spaces and uppercase) to tolerate variations like "ITC 111" vs "ITC111"
            $normalized = array_map(function($c) {
                return strtoupper(str_replace(' ', '', trim($c)));
            }, $subject_codes);

            // Use a raw query for multiple codes to ensure proper parameter binding
            $placeholders = implode(',', array_fill(0, count($normalized), '?'));
            // Compare against normalized course_code (remove spaces and uppercase) in SQL
            $sql = "SELECT ts.id as teacher_subject_id, ts.subject_id, ts.teacher_id, s.id as subject_id, s.course_code, s.course_name, s.credits, s.year_level, t.id as teacher_id, u.first_name, u.last_name
                    FROM teacher_subjects ts
                    JOIN subjects s ON ts.subject_id = s.id
                    JOIN teachers t ON ts.teacher_id = t.id
                    JOIN users u ON t.user_id = u.id
                    WHERE UPPER(REPLACE(s.course_code, ' ', '')) IN ($placeholders)";

            $stmt = $this->db->raw($sql, $normalized);
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            if (!empty($subject_codes)) {
                $query = $query->where('s.course_code', $subject_codes);
            }
            $assignments = $query->get_all();
        }

        $result = [];
        if (empty($assignments)) return [];

        foreach ($assignments as $a) {
            $subject = [
                'id' => $a['subject_id'],
                'course_code' => $a['course_code'],
                'course_name' => $a['course_name'],
                'credits' => $a['credits'] ?? null,
                'year_level' => $a['year_level'] ?? null,
            ];

            $sections = $this->db->table('teacher_subject_sections')
                              ->join('sections', 'teacher_subject_sections.section_id = sections.id')
                              ->select('sections.id, sections.name')
                              ->where('teacher_subject_sections.teacher_subject_id', $a['teacher_subject_id'])
                              ->get_all();

            $teacher = [
                'id' => $a['teacher_id'],
                'first_name' => $a['first_name'],
                'last_name' => $a['last_name']
            ];

            $result[] = [
                'teacher_subject_id' => $a['teacher_subject_id'],
                'teacher_id' => $a['teacher_id'],
                'teacher' => $teacher,
                'subject' => $subject,
                'sections' => $sections
            ];
        }

        return $result;
    }
}
