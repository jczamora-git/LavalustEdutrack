<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class TeacherAssignmentController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->call->model('TeacherSubjectModel');
        $this->call->model('SubjectModel');
        $this->call->model('SectionModel');
        $this->call->library('session');
    }

    private function set_json_headers()
    {
        $allowed_origins = [
            'http://localhost:5174',
            'http://localhost:3000',
            'http://localhost:5173'
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
        }

        header('Content-Type: application/json');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
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
        $this->set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $teacher_id = $data['teacher_id'] ?? null;
            $assigned = $data['assignedCourses'] ?? [];

            if (empty($teacher_id) || !is_array($assigned)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'teacher_id and assignedCourses are required']);
                return;
            }

            // Process each assigned course
            foreach ($assigned as $ac) {
                $courseCode = $ac['course'] ?? '';
                $sections = $ac['sections'] ?? [];

                if (empty($courseCode)) continue;

                // find subject
                $subject = $this->SubjectModel->find_by_course_code($courseCode);
                if (empty($subject) || empty($subject['id'])) continue;

                $subject_id = $subject['id'];

                // create or get teacher_subject
                $ts_id = $this->TeacherSubjectModel->create_assignment($teacher_id, $subject_id);
                if (!$ts_id) continue;

                // resolve section ids
                $section_ids = [];
                foreach ($sections as $sname) {
                    $s = $this->SectionModel->find_by_name($sname);
                    if (!empty($s) && isset($s['id'])) {
                        $section_ids[] = $s['id'];
                    }
                }

                // add sections
                $this->TeacherSubjectModel->add_sections($ts_id, $section_ids);
            }

            echo json_encode(['success' => true, 'message' => 'Assignments processed']);
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
        $this->set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $assignments = $this->TeacherSubjectModel->get_assignments_by_teacher($teacher_id);
            echo json_encode(['success' => true, 'assignments' => $assignments]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}
