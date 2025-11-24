<?php

/**
 * AttendanceController - Manage student attendance
 * Handles QR code validation and attendance record insertion
 */
class AttendanceController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Calculate distance between two geographic coordinates using Haversine formula
     * Returns distance in meters
     */
    private function haversineDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earth_radius = 6371000; // meters
        
        $lat1_rad = deg2rad($lat1);
        $lon1_rad = deg2rad($lon1);
        $lat2_rad = deg2rad($lat2);
        $lon2_rad = deg2rad($lon2);
        
        $dlat = $lat2_rad - $lat1_rad;
        $dlon = $lon2_rad - $lon1_rad;
        
        $a = sin($dlat / 2) * sin($dlat / 2) +
             cos($lat1_rad) * cos($lat2_rad) *
             sin($dlon / 2) * sin($dlon / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earth_radius * $c;
    }

    /**
     * Mark attendance by scanning a student QR code
     * POST /api/attendance/mark
     * 
     * Expected payload:
     * {
     *   "student_id": <int>,
     *   "teacher_id": <int>,
     *   "course_id": <int>,
     *   "campus_id": <int>,
     *   "qr_payload": {
     *     "type": "attendance",
     *     "student_id": <int>,
     *     "ts": <timestamp_ms>,
     *     "location": { "lat": <float>, "lng": <float> },
     *     "expires_at": <timestamp_ms>
     *   },
     *   "teacher_location": { "lat": <float>, "lng": <float> },
     *   "dev_mode": <bool> (optional, skip location validation)
     * }
     */
    public function api_mark_attendance()
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
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);

            if (!$data) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid JSON payload'
                ]);
                return;
            }

            // Validate required fields
            $student_id = $data['student_id'] ?? null;
            $teacher_id = $data['teacher_id'] ?? null;
            $course_id = $data['course_id'] ?? null;
            $campus_id = $data['campus_id'] ?? null;
            $qr_payload = $data['qr_payload'] ?? null;
            $dev_mode = $data['dev_mode'] ?? false;

            if (!$student_id || !$teacher_id || !$course_id || !$campus_id) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: student_id, teacher_id, course_id, campus_id'
                ]);
                return;
            }

            // Validate QR payload structure
            if (!$qr_payload || !isset($qr_payload['type']) || !isset($qr_payload['expires_at'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid QR payload structure'
                ]);
                return;
            }

            $current_time_ms = intval(microtime(true) * 1000);
            $expires_at_ms = intval($qr_payload['expires_at']);

            // Check QR expiry (5 minute validity)
            if ($current_time_ms > $expires_at_ms) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'QR code has expired',
                    'expired_at' => $expires_at_ms,
                    'current_time' => $current_time_ms
                ]);
                return;
            }

            // Default status is 'present'
            $status = 'present';

            // Check location proximity (unless in dev mode)
            if (!$dev_mode && isset($qr_payload['location'])) {
                $student_location = $qr_payload['location'];
                $student_lat = floatval($student_location['lat'] ?? 0);
                $student_lng = floatval($student_location['lng'] ?? 0);

                // Fetch campus details
                $campus = $this->db->table('campus')->where('id', $campus_id)->first();
                
                if ($campus) {
                    $campus_lat = floatval($campus->latitude);
                    $campus_lng = floatval($campus->longitude);
                    $radius_m = intval($campus->geo_radius_m);

                    // Calculate distance using Haversine formula
                    $distance = $this->haversineDistance(
                        $campus_lat,
                        $campus_lng,
                        $student_lat,
                        $student_lng
                    );

                    // Check if student is within campus radius
                    if ($distance > $radius_m) {
                        $status = 'out_of_range';
                    }
                }
            }

            // Insert attendance record
            $attendance = [
                'student_id' => $student_id,
                'teacher_id' => $teacher_id,
                'course_id' => $course_id,
                'status' => $status,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $inserted_id = $this->db->table('attendance')->insert($attendance);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Attendance marked successfully',
                'attendance_id' => $inserted_id,
                'status' => $status,
                'timestamp' => date('Y-m-d H:i:s')
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
     * Get attendance records for a student
     * GET /api/attendance/student/{student_id}
     */
    public function api_get_student_attendance($student_id)
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
            // Join with students and users to return readable student info
            $records = $this->db->table('attendance')
                ->select('attendance.*, students.student_id as student_code, users.first_name, users.last_name')
                ->join('students', 'students.user_id = attendance.student_id')
                ->join('users', 'users.id = attendance.student_id')
                ->where('attendance.student_id', $student_id)
                ->order_by('attendance.created_at', 'DESC')
                ->get_all();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $records
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
     * Get attendance records for a course
     * GET /api/attendance/course/{course_id}?teacher_id={teacher_id}
     * Optional filter: teacher_id to get only records for a specific teacher
     */
    public function api_get_course_attendance($course_id)
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
            $teacher_id = isset($_GET['teacher_id']) ? intval($_GET['teacher_id']) : null;
            $date = isset($_GET['date']) ? trim($_GET['date']) : null;

            // Start from attendance and join student info so frontend can display name and student code
            $query = $this->db->table('attendance')
                ->select('attendance.*, students.student_id as student_code, users.first_name, users.last_name')
                ->join('students', 'students.user_id = attendance.student_id')
                ->join('users', 'users.id = attendance.student_id')
                ->where('attendance.course_id', $course_id);

            // Filter by teacher_id if provided
            if ($teacher_id) {
                $query->where('teacher_id', $teacher_id);
            }

            // If a date is provided (YYYY-MM-DD), filter records for that date
            if ($date) {
                $start = $date . ' 00:00:00';
                $end = date('Y-m-d 00:00:00', strtotime($date . ' +1 day'));
                $query->where('created_at >=', $start)->where('created_at <', $end);
            }

            $records = $query->order_by('created_at', 'DESC')->get_all();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $records
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
