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
}
