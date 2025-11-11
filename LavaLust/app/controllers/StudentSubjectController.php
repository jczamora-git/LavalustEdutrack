<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class StudentSubjectController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->library('session');
    }

    private function is_admin()
    {
        return $this->session->userdata('logged_in') === true &&
               $this->session->userdata('role') === 'admin';
    }

    /**
     * GET /api/student-subjects?student_id=123
     * GET /api/student-subjects?year_level=1st%20Year (for global assignments)
     */
    public function api_get()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        $student_id = $this->input->get('student_id');
        $year_level = $this->input->get('year_level');

        if (!empty($student_id)) {
            // Single student assignments
            $data = $this->StudentSubjectModel->get_by_student($student_id);
            echo json_encode(['success' => true, 'data' => $data]);
            return;
        }

        if (!empty($year_level)) {
            // Global year level assignments
            $data = $this->StudentSubjectModel->get_by_year_level($year_level);
            echo json_encode(['success' => true, 'data' => $data]);
            return;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'student_id or year_level is required']);
    }

    /**
     * POST /api/student-subjects
     * body: { student_id, subject_id }
     */
    public function api_create()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        $payload = $this->input->json(true);
        $student_id = $payload['student_id'] ?? null;
        $subject_id = $payload['subject_id'] ?? null;

        if (empty($student_id) || empty($subject_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'student_id and subject_id are required']);
            return;
        }

        $res = $this->StudentSubjectModel->create($student_id, $subject_id);
        if ($res === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to create enrollment']);
            return;
        }

        echo json_encode(['success' => true, 'id' => $res]);
    }

    /**
     * POST /api/student-subjects/delete
     * body: { id } or { student_id, subject_id }
     */
    public function api_delete()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        $payload = $this->input->json(true);
        $id = $payload['id'] ?? null;
        $student_id = $payload['student_id'] ?? null;
        $subject_id = $payload['subject_id'] ?? null;

        if (empty($id) && (empty($student_id) || empty($subject_id))) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id or (student_id and subject_id) required']);
            return;
        }

        $ok = $this->StudentSubjectModel->delete_mapping($id, $student_id, $subject_id);
        if ($ok) {
            echo json_encode(['success' => true]);
            return;
        }

        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete mapping']);
    }

    /**
     * POST /api/student-subjects/assign-to-year
     * body: { subject_id, year_level }
     * Assigns subject to all students in the year level
     */
    public function assign_to_year()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        $payload = $this->input->json(true);
        $subject_id = $payload['subject_id'] ?? null;
        $year_level = $payload['year_level'] ?? null;

        if (empty($subject_id) || empty($year_level)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'subject_id and year_level are required']);
            return;
        }

        $count = $this->StudentSubjectModel->assign_to_year_level($subject_id, $year_level);
        if ($count === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to assign subject to year level']);
            return;
        }

        echo json_encode(['success' => true, 'count' => $count]);
    }

    /**
     * POST /api/student-subjects/unassign-from-year
     * body: { subject_id, year_level }
     * Removes subject from all students in the year level
     */
    public function unassign_from_year()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        $payload = $this->input->json(true);
        $subject_id = $payload['subject_id'] ?? null;
        $year_level = $payload['year_level'] ?? null;

        if (empty($subject_id) || empty($year_level)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'subject_id and year_level are required']);
            return;
        }

        $count = $this->StudentSubjectModel->unassign_from_year_level($subject_id, $year_level);
        if ($count === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to unassign subject from year level']);
            return;
        }

        echo json_encode(['success' => true, 'count' => $count]);
    }
}
