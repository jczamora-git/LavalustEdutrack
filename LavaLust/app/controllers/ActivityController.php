<?php

/**
 * ActivityController - Manage activities and grades
 * Handles CRUD operations for activities and grade input/viewing for transparency
 */
class ActivityController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get all activities for a course
     * GET /api/activities?course_id=6&section_id=1&type=assignment&status=published
     */
    public function api_get_activities()
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
            
            if (!empty($_GET['course_id'])) {
                $filters['course_id'] = $_GET['course_id'];
            }
            if (!empty($_GET['section_id'])) {
                $filters['section_id'] = $_GET['section_id'];
            }
            if (!empty($_GET['type'])) {
                $filters['type'] = $_GET['type'];
            }
            if (!empty($_GET['grading_period'])) {
                $filters['grading_period'] = $_GET['grading_period'];
            }
            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (!empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            $activities = $this->ActivityModel->get_all($filters);

            // Enrich with grading stats
            if (is_array($activities)) {
                foreach ($activities as &$activity) {
                    $activity['grading_stats'] = $this->ActivityModel->get_grading_stats($activity['id']);
                }
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $activities,
                'count' => is_array($activities) ? count($activities) : 0
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
     * Get single activity by ID
     * GET /api/activities/{id}
     */
    public function api_get_activity($id)
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
            $activity = $this->ActivityModel->get_activity($id);

            if (!$activity) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Activity not found'
                ]);
                return;
            }

            // Enrich with grading stats
            $activity['grading_stats'] = $this->ActivityModel->get_grading_stats($activity['id']);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $activity
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
     * Create a new activity (teacher only)
     * POST /api/activities
     * Body: { course_id, title, type, max_score, due_at, section_id? }
     */
    public function api_create_activity()
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

        // Only teachers can create activities (adjust role check as needed)
        $userRole = $this->session->userdata('role');
        if ($userRole !== 'teacher' && $userRole !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Forbidden: only teachers/admins can create activities'
            ]);
            return;
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true);

            // Validation
            if (empty($data['course_id']) || empty($data['title']) || empty($data['type'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: course_id, title, type'
                ]);
                return;
            }

            // Prepare activity data
            $activityData = [
                'course_id' => $data['course_id'],
                'title' => $data['title'],
                'type' => $data['type'],
                'grading_period' => $data['grading_period'] ?? 'midterm',
                'max_score' => $data['max_score'] ?? 100,
                'due_at' => $data['due_at'] ?? null,
                'section_id' => $data['section_id'] ?? null,
            ];

            $newId = $this->ActivityModel->create($activityData);

            if ($newId) {
                $activity = $this->ActivityModel->get_activity($newId);
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Activity created successfully',
                    'data' => $activity
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create activity'
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
     * Update activity (teacher only)
     * PUT /api/activities/{id}
     */
    public function api_update_activity($id)
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

        $userRole = $this->session->userdata('role');
        if ($userRole !== 'teacher' && $userRole !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Forbidden: only teachers/admins can update activities'
            ]);
            return;
        }

        try {
            $activity = $this->ActivityModel->get_activity($id);
            if (!$activity) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Activity not found'
                ]);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $updateData = [];

            // Only allow certain fields to be updated
            if (!empty($data['title'])) $updateData['title'] = $data['title'];
            if (!empty($data['type'])) $updateData['type'] = $data['type'];
            if (!empty($data['grading_period'])) $updateData['grading_period'] = $data['grading_period'];
            if (isset($data['max_score'])) $updateData['max_score'] = $data['max_score'];
            if (isset($data['due_at'])) $updateData['due_at'] = $data['due_at'];

            $result = $this->ActivityModel->update($id, $updateData);

            if ($result) {
                $updated = $this->ActivityModel->get_activity($id);
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Activity updated successfully',
                    'data' => $updated
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update activity'
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
     * Delete activity (teacher/admin only)
     * DELETE /api/activities/{id}
     */
    public function api_delete_activity($id)
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

        $userRole = $this->session->userdata('role');
        if ($userRole !== 'teacher' && $userRole !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Forbidden'
            ]);
            return;
        }

        try {
            $activity = $this->ActivityModel->get_activity($id);
            if (!$activity) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Activity not found'
                ]);
                return;
            }

            $result = $this->ActivityModel->delete($id);

            if ($result) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Activity deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete activity'
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
     * Get grades for an activity (all students)
     * GET /api/activities/{id}/grades
     */
    public function api_get_activity_grades($activityId)
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
            $grades = $this->db->table('activity_grades')
                               ->where('activity_id', $activityId)
                               ->get_all();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $grades,
                'count' => is_array($grades) ? count($grades) : 0
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
     * Input / Update grade for a student on an activity (teacher only)
     * POST /api/activities/{id}/grades
     * Body: { student_id, grade, status }
     */
    public function api_set_grade($activityId)
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

        $userRole = $this->session->userdata('role');
        if ($userRole !== 'teacher' && $userRole !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Forbidden: only teachers/admins can input grades'
            ]);
            return;
        }

        try {
            $data = json_decode(file_get_contents('php://input'), true);

            // Validation
            if (empty($data['student_id'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required field: student_id'
                ]);
                return;
            }

            // Check if grade record exists
            $existing = $this->db->table('activity_grades')
                                 ->where('activity_id', $activityId)
                                 ->where('student_id', $data['student_id'])
                                 ->get();

            $gradeData = [
                'grade' => $data['grade'] ?? null,
                'status' => $data['status'] ?? 'Pending',
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            if ($existing) {
                // Update existing record
                $result = $this->db->table('activity_grades')
                                   ->where('activity_id', $activityId)
                                   ->where('student_id', $data['student_id'])
                                   ->update($gradeData);

                if ($result) {
                    $updated = $this->db->table('activity_grades')
                                        ->where('activity_id', $activityId)
                                        ->where('student_id', $data['student_id'])
                                        ->get();
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Grade updated successfully',
                        'data' => $updated
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to update grade'
                    ]);
                }
            } else {
                // Create new record
                $gradeData['activity_id'] = $activityId;
                $gradeData['student_id'] = $data['student_id'];
                $gradeData['created_at'] = date('Y-m-d H:i:s');

                $result = $this->db->table('activity_grades')
                                   ->insert($gradeData);

                if ($result) {
                    $created = $this->db->table('activity_grades')
                                        ->where('activity_id', $activityId)
                                        ->where('student_id', $data['student_id'])
                                        ->get();
                    http_response_code(201);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Grade created successfully',
                        'data' => $created
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to create grade'
                    ]);
                }
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }
}
