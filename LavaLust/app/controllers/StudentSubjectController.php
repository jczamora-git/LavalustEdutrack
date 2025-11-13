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
        if (empty($student_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'student_id is required']);
            return;
        }

        $data = $this->StudentSubjectModel->get_by_student($student_id);
        echo json_encode(['success' => true, 'data' => $data]);
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
}
