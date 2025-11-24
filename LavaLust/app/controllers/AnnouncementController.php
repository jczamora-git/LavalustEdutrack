<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AnnouncementController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->call->model('AnnouncementModel');
        $this->call->library('session');
    }

    // GET /api/announcements
    public function api_get_announcements()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $filters = [];
            if (!empty($_GET['audience'])) $filters['audience'] = $_GET['audience'];
            if (!empty($_GET['status'])) $filters['status'] = $_GET['status'];
            if (!empty($_GET['search'])) $filters['search'] = $_GET['search'];

            $list = $this->AnnouncementModel->get_all($filters);

            http_response_code(200);
            echo json_encode(['success' => true, 'data' => $list, 'count' => is_array($list) ? count($list) : 0]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
        }
    }

    // GET /api/announcements/{id}
    public function api_get_announcement($id)
    {
        api_set_json_headers();
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $ann = $this->AnnouncementModel->get_announcement($id);
            if (!$ann) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Announcement not found']);
                return;
            }
            echo json_encode(['success' => true, 'data' => $ann]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
        }
    }

    // POST /api/announcements
    public function api_create_announcement()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: admin only']);
            return;
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['title']) || empty($data['message'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Title and message are required']);
                return;
            }

            $data['created_by'] = $this->session->userdata('user_id') ?? null;
            $newId = $this->AnnouncementModel->create($data);

            if ($newId) {
                $created = $this->AnnouncementModel->get_announcement($newId);
                http_response_code(201);
                echo json_encode(['success' => true, 'message' => 'Announcement created', 'data' => $created]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create announcement']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
        }
    }

    // PUT /api/announcements/{id}
    public function api_update_announcement($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: admin only']);
            return;
        }

        try {
            $existing = $this->AnnouncementModel->get_announcement($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Announcement not found']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $res = $this->AnnouncementModel->update_announcement($id, $data);
            if ($res) {
                $updated = $this->AnnouncementModel->get_announcement($id);
                echo json_encode(['success' => true, 'message' => 'Announcement updated', 'data' => $updated]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update announcement']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
        }
    }

    // DELETE /api/announcements/{id}
    public function api_delete_announcement($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: admin only']);
            return;
        }

        try {
            $existing = $this->AnnouncementModel->get_announcement($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Announcement not found']);
                return;
            }

            $res = $this->AnnouncementModel->delete_announcement($id);
            if ($res) {
                echo json_encode(['success' => true, 'message' => 'Announcement archived']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to archive announcement']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: '.$e->getMessage()]);
        }
    }
}
