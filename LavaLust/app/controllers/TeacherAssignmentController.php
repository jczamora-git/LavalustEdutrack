<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class TeacherAssignmentController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }


    private function is_admin()
    {
        return $this->session->userdata('logged_in') === true && 
               $this->session->userdata('role') === 'admin';
    }

    /**
     * POST /api/teacher-assignments
     * Payload: { teacher_id: int, assignedCourses: [{ course: 'ENG001', sections: ['F2','F3'] }, ...] }
     */
    public function api_assign_subjects()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $teacher_id = $data['teacher_id'] ?? null;
            // accept multiple payload keys for flexibility
            $assigned = $data['assignedCourses'] ?? $data['assignments'] ?? $data['assign'] ?? [];

            if (empty($teacher_id) || !is_array($assigned)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'teacher_id and assignments are required']);
                return;
            }

            $processed = [];

            // Start transaction for atomic processing
            if (method_exists($this->db, 'beginTransaction')) {
                $this->db->beginTransaction();
            }

            // Process each assigned course/assignment
            foreach ($assigned as $ac) {
                $courseCode = $ac['course'] ?? $ac['course_code'] ?? $ac['courseCode'] ?? '';
                $sections = $ac['sections'] ?? [];
                $year_level = $ac['year_level'] ?? $ac['yearLevel'] ?? null;

                if (empty($courseCode)) {
                    // skip malformed entry but include notice
                    $processed[] = ['error' => 'missing course_code', 'input' => $ac];
                    continue;
                }

                // find subject by course code
                $subject = $this->SubjectModel->find_by_course_code($courseCode);
                if (empty($subject) || empty($subject['id'])) {
                    $processed[] = ['course_code' => $courseCode, 'error' => 'subject not found'];
                    continue;
                }

                $subject_id = $subject['id'];

                // create or get teacher_subject
                $ts_id = $this->TeacherSubjectModel->create_assignment($teacher_id, $subject_id);
                if (!$ts_id) {
                    $processed[] = ['subject_id' => $subject_id, 'course_code' => $courseCode, 'error' => 'failed to create teacher_subject'];
                    continue;
                }

                // resolve section ids and names
                $section_ids = [];
                $section_names = [];
                foreach ($sections as $sname) {
                    $s = $this->SectionModel->find_by_name($sname);
                    if (!empty($s) && isset($s['id'])) {
                        $section_ids[] = $s['id'];
                        $section_names[] = $s['name'];
                    }
                }

                // synchronize sections (add missing, remove deselected)
                if (method_exists($this->TeacherSubjectModel, 'set_sections')) {
                    $this->TeacherSubjectModel->set_sections($ts_id, $section_ids);
                } else {
                    // fallback to additive behavior
                    $this->TeacherSubjectModel->add_sections($ts_id, $section_ids);
                }

                $processed[] = [
                    'subject_id' => $subject_id,
                    'course_code' => $subject['course_code'] ?? $courseCode,
                    'year_level' => $year_level,
                    'sections' => $section_names
                ];
            }

            // Commit transaction if available
            if (method_exists($this->db, 'commit')) {
                $this->db->commit();
            }

            echo json_encode(['success' => true, 'message' => 'Assignments processed', 'assignments' => $processed]);
        } catch (Exception $e) {
            // Rollback if transaction available
            if (method_exists($this->db, 'rollback')) {
                $this->db->rollback();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/teacher-assignments/remove-section
     * Body: { teacher_subject_id: int, section_id: int }
     */
    public function api_remove_section()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $ts_id = $data['teacher_subject_id'] ?? null;
            $section_id = $data['section_id'] ?? null;

            if (empty($ts_id) || empty($section_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'teacher_subject_id and section_id required']);
                return;
            }

            $ok = $this->TeacherSubjectModel->remove_section($ts_id, $section_id);
            if ($ok) {
                echo json_encode(['success' => true, 'message' => 'Section removed']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to remove section']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/teacher-assignments/remove-assignment
     * Body: { teacher_subject_id: int } or { teacher_id: int, subject_code: string }
     * Removes the teacher_subject assignment entirely (and linked sections).
     */
    public function api_remove_assignment()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $ts_id = $data['teacher_subject_id'] ?? null;
            if (empty($ts_id)) {
                // allow removal by teacher_id + subject_code as fallback
                $teacher_id = $data['teacher_id'] ?? null;
                $course_code = $data['course_code'] ?? $data['subject_code'] ?? null;
                if (empty($teacher_id) || empty($course_code)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'teacher_subject_id or (teacher_id and course_code) required']);
                    return;
                }

                // find teacher_subject id
                $subject = $this->SubjectModel->find_by_course_code($course_code);
                if (empty($subject) || empty($subject['id'])) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Subject not found']);
                    return;
                }
                $ts = $this->db->table('teacher_subjects')
                               ->select('id')
                               ->where('teacher_id', $teacher_id)
                               ->where('subject_id', $subject['id'])
                               ->get();
                if (empty($ts) || empty($ts['id'])) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Assignment not found']);
                    return;
                }
                $ts_id = $ts['id'];
            }

            $ok = $this->TeacherSubjectModel->delete_assignment($ts_id);
            if ($ok) {
                echo json_encode(['success' => true, 'message' => 'Assignment removed']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to remove assignment']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/teacher-assignments/by-teacher/{teacher_id}
     */
    public function api_get_by_teacher($teacher_id)
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $assignments = $this->TeacherSubjectModel->get_assignments_by_teacher($teacher_id);

            // Normalize response for frontend compatibility. Provide both the
            // raw assignments and a simplified `assigned_courses` array that
            // the UI expects: { id, course_code, course_name, sections: [names], year_level }
            $assigned_courses = [];
            foreach ($assignments as $a) {
                $subject = $a['subject'] ?? [];
                $sections = $a['sections'] ?? [];

                // Build sections with id, name and students_count (if available)
                $section_objs = [];
                foreach ($sections as $s) {
                    if (is_array($s) && isset($s['id'])) {
                        $sid = $s['id'];
                        $sname = $s['name'] ?? null;
                    } else if (is_array($s) && isset($s['name'])) {
                        $sid = $s['section_id'] ?? null;
                        $sname = $s['name'];
                    } else if (is_string($s)) {
                        $sid = null;
                        $sname = $s;
                    } else {
                        $sid = null;
                        $sname = null;
                    }

                    $students_count = null;
                    if (!empty($sid)) {
                        // Try to count students for this section (optionally filtering by year if available)
                        try {
                            $q = $this->db->table('students')->select('COUNT(*) as count')->where('section_id', $sid);
                            if (!empty($subject['year_level'])) {
                                $q = $q->where('year_level', $subject['year_level']);
                            }
                            $c = $q->get();
                            $students_count = isset($c['count']) ? intval($c['count']) : 0;
                        } catch (Exception $e) {
                            $students_count = null;
                        }
                    }

                    $section_objs[] = [
                        'id' => $sid,
                        'name' => $sname,
                        'students_count' => $students_count
                    ];
                }

                $assigned_courses[] = [
                    'id' => isset($a['teacher_subject_id']) ? $a['teacher_subject_id'] : null,
                    'teacher_subject_id' => isset($a['teacher_subject_id']) ? $a['teacher_subject_id'] : null,
                    'course_code' => $subject['course_code'] ?? $subject['code'] ?? null,
                    'course_name' => $subject['course_name'] ?? $subject['title'] ?? null,
                    'subject_id' => $subject['id'] ?? null,
                    'sections' => $section_objs,
                    'year_level' => $subject['year_level'] ?? null,
                ];
            }

            echo json_encode(['success' => true, 'assignments' => $assignments, 'assigned_courses' => $assigned_courses]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/teacher-assignments/my
     * Returns assignments for the logged-in teacher. Admins may optionally
     * pass ?teacher_id= to fetch a specific teacher's assignments.
     */
    public function api_get_mine()
    {
         api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            return;
        }

        try {
            $role = $this->session->userdata('role');

            // Admin may request other teacher's assignments via query param
            if ($role === 'admin' && !empty($_GET['teacher_id'])) {
                $teacher_id = intval($_GET['teacher_id']);
            } else {
                // For teacher role, resolve teacher by session user_id
                $user_id = $this->session->userdata('user_id');
                $teacher = $this->TeacherModel->get_by_user_id($user_id);
                if (empty($teacher) || empty($teacher['id'])) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Teacher profile not found for current user']);
                    return;
                }
                $teacher_id = $teacher['id'];
            }

            $assignments = $this->TeacherSubjectModel->get_assignments_by_teacher($teacher_id);

            // Normalize similar to api_get_by_teacher
            $assigned_courses = [];
            foreach ($assignments as $a) {
                $subject = $a['subject'] ?? [];
                $sections = $a['sections'] ?? [];

                $section_objs = [];
                foreach ($sections as $s) {
                    if (is_array($s) && isset($s['id'])) {
                        $sid = $s['id'];
                        $sname = $s['name'] ?? null;
                    } else if (is_array($s) && isset($s['name'])) {
                        $sid = $s['section_id'] ?? null;
                        $sname = $s['name'];
                    } else if (is_string($s)) {
                        $sid = null;
                        $sname = $s;
                    } else {
                        $sid = null;
                        $sname = null;
                    }

                    $students_count = null;
                    if (!empty($sid)) {
                        try {
                            $q = $this->db->table('students')->select('COUNT(*) as count')->where('section_id', $sid);
                            if (!empty($subject['year_level'])) {
                                $q = $q->where('year_level', $subject['year_level']);
                            }
                            $c = $q->get();
                            $students_count = isset($c['count']) ? intval($c['count']) : 0;
                        } catch (Exception $e) {
                            $students_count = null;
                        }
                    }

                    $section_objs[] = [
                        'id' => $sid,
                        'name' => $sname,
                        'students_count' => $students_count
                    ];
                }

                $assigned_courses[] = [
                    'id' => isset($a['teacher_subject_id']) ? $a['teacher_subject_id'] : null,
                    'teacher_subject_id' => isset($a['teacher_subject_id']) ? $a['teacher_subject_id'] : null,
                    'course_code' => $subject['course_code'] ?? $subject['code'] ?? null,
                    'course_name' => $subject['course_name'] ?? $subject['title'] ?? null,
                    'subject_id' => $subject['id'] ?? null,
                    'sections' => $section_objs,
                    'year_level' => $subject['year_level'] ?? null,
                ];
            }

            echo json_encode(['success' => true, 'assignments' => $assignments, 'assigned_courses' => $assigned_courses]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/teacher-assignments
     * Optional query: ?subject_code=COURSECODE
     */
    public function api_get_all()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            // Support single subject_code or multiple comma-separated subject_codes
            $subject_code = $_GET['subject_code'] ?? null;
            $subject_codes = null;
            if (!empty($_GET['subject_codes'])) {
                // parse comma-separated list
                $subject_codes = array_map('trim', explode(',', $_GET['subject_codes']));
            } elseif (!empty($subject_code)) {
                $subject_codes = $subject_code;
            }

            $assignments = $this->TeacherSubjectModel->get_all_assignments($subject_codes);
            echo json_encode(['success' => true, 'assignments' => $assignments]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/teacher-assignments/for-student
     * Student-accessible endpoint: returns teacher assignments for a given section and optional subject
     * Query params: section_id (required), subject_id (optional)
     */
    public function api_get_for_student()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            return;
        }

        try {
            $section_id = $_GET['section_id'] ?? null;
            $subject_id = $_GET['subject_id'] ?? null;

            if (empty($section_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'section_id is required']);
                return;
            }

            // Fetch all assignments and filter by section_id and optional subject_id
            $all_assignments = $this->TeacherSubjectModel->get_all_assignments(null);
            $filtered = [];

            foreach ($all_assignments as $a) {
                $sections = $a['sections'] ?? [];
                $matches_section = false;

                // Check if section_id matches
                foreach ($sections as $s) {
                    $sid = null;
                    if (is_array($s) && isset($s['id'])) {
                        $sid = $s['id'];
                    } elseif (is_array($s) && isset($s['section_id'])) {
                        $sid = $s['section_id'];
                    }

                    if ($sid && (int)$sid === (int)$section_id) {
                        $matches_section = true;
                        break;
                    }
                }

                if (!$matches_section) continue;

                // Optional: filter by subject_id
                if (!empty($subject_id)) {
                    $a_subject_id = $a['subject_id'] ?? ($a['subject']['id'] ?? null);
                    if ($a_subject_id && (int)$a_subject_id !== (int)$subject_id) {
                        continue;
                    }
                }

                $filtered[] = $a;
            }

            echo json_encode(['success' => true, 'assignments' => $filtered, 'count' => count($filtered)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}

