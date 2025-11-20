<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * CampusController - Manage campus locations
 */
class CampusController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * GET /api/campuses
     */
    public function api_get_campuses()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $campuses = $this->CampusModel->get_all();
            http_response_code(200);
            echo json_encode(['success' => true, 'data' => $campuses]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/campuses/{id}
     */
    public function api_get_campus($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $campus = $this->CampusModel->get_campus($id);
            if (!$campus) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Campus not found']);
                return;
            }
            http_response_code(200);
            echo json_encode(['success' => true, 'data' => $campus]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/campuses
     */
    public function api_create_campus()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['name']) || !isset($data['latitude']) || !isset($data['longitude'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing required fields: name, latitude, longitude']);
                return;
            }

            $insert = [
                'name' => $data['name'],
                'address' => $data['address'] ?? null,
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'geo_radius_m' => $data['geo_radius_m'] ?? 50,
            ];

            $newId = $this->CampusModel->create($insert);

            if ($newId) {
                $created = $this->CampusModel->get_campus($newId);
                http_response_code(201);
                echo json_encode(['success' => true, 'message' => 'Campus created', 'data' => $created]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create campus']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/campuses/{id}
     */
    public function api_update_campus($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $campus = $this->CampusModel->get_campus($id);
            if (!$campus) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Campus not found']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $update = [];
            if (isset($data['name'])) $update['name'] = $data['name'];
            if (array_key_exists('address', $data)) $update['address'] = $data['address'];
            if (isset($data['latitude'])) $update['latitude'] = $data['latitude'];
            if (isset($data['longitude'])) $update['longitude'] = $data['longitude'];
            if (isset($data['geo_radius_m'])) $update['geo_radius_m'] = $data['geo_radius_m'];

            if (empty($update)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No data to update']);
                return;
            }

            $result = $this->CampusModel->update($id, $update);
            if ($result !== false) {
                $updated = $this->CampusModel->get_campus($id);
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Campus updated', 'data' => $updated]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update campus']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/campuses/{id}
     */
    public function api_delete_campus($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $campus = $this->CampusModel->get_campus($id);
            if (!$campus) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Campus not found']);
                return;
            }

            $result = $this->CampusModel->delete($id);
            if ($result) {
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Campus deleted']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to delete campus']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}
