<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * AcademicPeriodController - Manage academic periods
 * Handles school year + semester + period type (Midterm/Final Term) management
 */
class AcademicPeriodController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get all academic periods
     * GET /api/academic-periods?status=active&school_year=2025-2026
     */
    public function api_get_periods()
    {
        api_set_json_headers();

        // Check authorization
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $filters = [];
            
            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (!empty($_GET['school_year'])) {
                $filters['school_year'] = $_GET['school_year'];
            }
            if (!empty($_GET['semester'])) {
                $filters['semester'] = $_GET['semester'];
            }
            if (!empty($_GET['period_type'])) {
                $filters['period_type'] = $_GET['period_type'];
            }

            $periods = $this->AcademicPeriodModel->get_all($filters);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $periods,
                'count' => is_array($periods) ? count($periods) : 0
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get single academic period by ID
     * GET /api/academic-periods/{id}
     */
    public function api_get_period($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $period = $this->AcademicPeriodModel->get_period($id);

            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Academic period not found'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $period
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get the currently active academic period
     * GET /api/academic-periods/active
     */
    public function api_get_active()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $period = $this->AcademicPeriodModel->get_active_period();

            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'No active academic period set'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $period
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get grading context (current period info for grading)
     * GET /api/academic-periods/grading-context
     */
    public function api_get_grading_context()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $context = $this->AcademicPeriodModel->get_grading_context();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $context
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get subjects for current semester
     * GET /api/academic-periods/current-subjects
     */
    public function api_get_current_subjects()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $subjects = $this->AcademicPeriodModel->get_current_semester_subjects();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $subjects,
                'count' => is_array($subjects) ? count($subjects) : 0
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Create new academic period (admin only)
     * POST /api/academic-periods
     * Body: { school_year, semester, period_type, start_date, end_date, status? }
     */
    public function api_create_period()
    {
        api_set_json_headers();

        // Check authorization
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true);

            // Validation
            if (empty($data['school_year']) || empty($data['semester']) || 
                empty($data['period_type']) || empty($data['start_date']) || 
                empty($data['end_date'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: school_year, semester, period_type, start_date, end_date'
                ]);
                return;
            }

            // Validate semester enum
            $validSemesters = ['1st Semester', '2nd Semester', 'Summer'];
            if (!in_array($data['semester'], $validSemesters)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid semester. Must be: 1st Semester, 2nd Semester, or Summer'
                ]);
                return;
            }

            // Validate period_type enum
            $validPeriodTypes = ['Midterm', 'Final Term'];
            if (!in_array($data['period_type'], $validPeriodTypes)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid period_type. Must be: Midterm or Final Term'
                ]);
                return;
            }

            // Validate status enum
            $validStatuses = ['active', 'past', 'upcoming'];
            if (!empty($data['status']) && !in_array($data['status'], $validStatuses)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid status. Must be: active, past, or upcoming'
                ]);
                return;
            }

            // Prepare period data
            $periodData = [
                'school_year' => $data['school_year'],
                'semester' => $data['semester'],
                'period_type' => $data['period_type'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'status' => $data['status'] ?? 'upcoming'
            ];

            $newId = $this->AcademicPeriodModel->create($periodData);

            if ($newId) {
                $period = $this->AcademicPeriodModel->get_period($newId);
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Academic period created successfully',
                    'data' => $period
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create academic period'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Update academic period (admin only)
     * PUT /api/academic-periods/{id}
     */
    public function api_update_period($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $period = $this->AcademicPeriodModel->get_period($id);
            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Academic period not found'
                ]);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $updateData = [];

            // Only allow certain fields to be updated
            if (!empty($data['school_year'])) $updateData['school_year'] = $data['school_year'];
            if (!empty($data['semester'])) $updateData['semester'] = $data['semester'];
            if (!empty($data['period_type'])) $updateData['period_type'] = $data['period_type'];
            if (!empty($data['start_date'])) $updateData['start_date'] = $data['start_date'];
            if (!empty($data['end_date'])) $updateData['end_date'] = $data['end_date'];
            if (!empty($data['status'])) $updateData['status'] = $data['status'];

            // If caller is trying to set this period as active, use set_active
            // which ensures only one period is active at a time (it deactivates others).
            if (isset($updateData['status']) && $updateData['status'] === 'active') {
                $result = $this->AcademicPeriodModel->set_active($id);

                if ($result) {
                    $updated = $this->AcademicPeriodModel->get_period($id);
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Academic period set as active',
                        'data' => $updated
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to set period as active'
                    ]);
                }
                return;
            }

            $result = $this->AcademicPeriodModel->update($id, $updateData);

            // Some DB adapters return number of affected rows (0) when nothing changed.
            // Treat any non-false return as success.
            if ($result !== false) {
                $updated = $this->AcademicPeriodModel->get_period($id);
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Academic period updated successfully',
                    'data' => $updated
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update academic period'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Set a period as active (admin only)
     * POST /api/academic-periods/{id}/set-active
     */
    public function api_set_active($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $period = $this->AcademicPeriodModel->get_period($id);
            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Academic period not found'
                ]);
                return;
            }

            $result = $this->AcademicPeriodModel->set_active($id);

            if ($result) {
                $updated = $this->AcademicPeriodModel->get_period($id);
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Academic period set as active',
                    'data' => $updated
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to set period as active'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Delete academic period (admin only)
     * DELETE /api/academic-periods/{id}
     */
    public function api_delete_period($id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $period = $this->AcademicPeriodModel->get_period($id);
            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Academic period not found'
                ]);
                return;
            }

            // Prevent deletion of active period
            if ($period['status'] === 'active') {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot delete active academic period. Set another period as active first.'
                ]);
                return;
            }

            $result = $this->AcademicPeriodModel->delete($id);

            if ($result) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Academic period deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete academic period'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get statistics
     * GET /api/academic-periods/stats
     */
    public function api_get_stats()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $stats = $this->AcademicPeriodModel->get_stats();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $stats
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/academic-periods/active-public
     * Public endpoint: returns currently active academic period (no auth required)
     */
    public function api_get_active_public()
    {
        api_set_json_headers();

        try {
            $period = $this->AcademicPeriodModel->get_active_period();

            if (!$period) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'No active academic period set'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $period
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }
}

