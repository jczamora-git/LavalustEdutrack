<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SectionController extends Controller
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
     * GET /api/sections
     */
    public function api_get_sections()
    {
        api_set_json_headers();

        // Only admin should list sections
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $filters = [];
            if (isset($_GET['status']) && !empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            // Allow exact description filter to fetch program/degree-specific sections
            if (isset($_GET['description']) && strlen(trim($_GET['description'])) > 0) {
                $filters['description'] = $_GET['description'];
            }

            $sections = $this->SectionModel->get_all($filters);

            echo json_encode([
                'success' => true,
                'sections' => $sections,
                'count' => count($sections)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/sections/{id}
     */
    public function api_get_section($id)
    {
        api_set_json_headers();

        // Allow any authenticated user to view a single section (students need this)
        if ($this->session->userdata('logged_in') !== true) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Login required.']);
            return;
        }

        try {
            $section = $this->SectionModel->find_by_id($id);
            if (!$section) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Section not found']);
                return;
            }

            echo json_encode(['success' => true, 'section' => $section]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/sections
     */
    public function api_create_section()
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

            $name = trim($data['name'] ?? '');
            $description = $data['description'] ?? '';
            $status = $data['status'] ?? 'active';

            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Section name is required']);
                return;
            }

            if ($this->SectionModel->name_exists($name)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Section name already exists']);
                return;
            }

            $sectionId = $this->SectionModel->create(['name' => $name, 'description' => $description, 'status' => $status]);

            if (!$sectionId) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create section']);
                return;
            }

            $section = $this->SectionModel->find_by_id($sectionId);

            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Section created', 'section' => $section]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/sections/{id}
     */
    public function api_update_section($id)
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $existing = $this->SectionModel->find_by_id($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Section not found']);
                return;
            }

            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $name = isset($data['name']) ? trim($data['name']) : $existing['name'];
            $description = $data['description'] ?? $existing['description'];
            $status = $data['status'] ?? $existing['status'];

            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Section name is required']);
                return;
            }

            if ($name !== $existing['name'] && $this->SectionModel->name_exists($name, $id)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Section name already exists']);
                return;
            }

            $updated = $this->SectionModel->update_section($id, ['name' => $name, 'description' => $description, 'status' => $status]);

            if (!$updated) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update section']);
                return;
            }

            $section = $this->SectionModel->find_by_id($id);
            echo json_encode(['success' => true, 'message' => 'Section updated', 'section' => $section]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/sections/{id}
     */
    public function api_delete_section($id)
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $existing = $this->SectionModel->find_by_id($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Section not found']);
                return;
            }

            $deleted = $this->SectionModel->delete_section($id);

            if ($deleted) {
                echo json_encode(['success' => true, 'message' => 'Section deleted']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to delete section']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/year-levels
     * Get all year levels
     */
    public function api_get_year_levels()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $yearLevels = $this->YearLevelModel->get_all();

            echo json_encode([
                'success' => true,
                'year_levels' => $yearLevels,
                'count' => count($yearLevels)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/year-levels/{id}/sections
     * Get all sections assigned to a specific year level
     */
    public function api_get_year_level_sections($yearLevelId)
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $yearLevel = $this->YearLevelModel->find_by_id($yearLevelId);
            if (!$yearLevel) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Year level not found']);
                return;
            }

            $sections = $this->YearLevelSectionModel->get_sections_by_year_level($yearLevelId);

            echo json_encode([
                'success' => true,
                'year_level' => $yearLevel,
                'sections' => $sections,
                'count' => count($sections)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/year-level-sections
     * Get all year level to section mappings
     */
    public function api_get_all_year_level_sections()
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $mappings = $this->YearLevelSectionModel->get_all_mappings();

            // Organize by year level
            $organized = [];
            foreach ($mappings as $mapping) {
                $yearLevelName = $mapping['year_level_name'];
                if (!isset($organized[$yearLevelName])) {
                    $organized[$yearLevelName] = [];
                }
                $organized[$yearLevelName][] = $mapping['section_name'];
            }

            echo json_encode([
                'success' => true,
                'mappings' => $mappings,
                'organized' => $organized
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/year-levels/{yearLevelId}/sections/{sectionId}
     * Assign a section to a year level
     */
    public function api_assign_section_to_year_level($yearLevelId, $sectionId)
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            // Validate year level exists
            $yearLevel = $this->YearLevelModel->find_by_id($yearLevelId);
            if (!$yearLevel) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Year level not found']);
                return;
            }

            // Validate section exists
            $section = $this->SectionModel->find_by_id($sectionId);
            if (!$section) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Section not found']);
                return;
            }

            // Check if already assigned
            if ($this->YearLevelSectionModel->is_assigned($yearLevelId, $sectionId)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Section is already assigned to this year level']);
                return;
            }

            // Assign
            $result = $this->YearLevelSectionModel->assign($yearLevelId, $sectionId);

            if ($result) {
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Section assigned to year level',
                    'year_level' => $yearLevel,
                    'section' => $section
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to assign section']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/year-levels/{yearLevelId}/sections/{sectionId}
     * Unassign a section from a year level
     */
    public function api_unassign_section_from_year_level($yearLevelId, $sectionId)
    {
        api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            // Check if assigned
            if (!$this->YearLevelSectionModel->is_assigned($yearLevelId, $sectionId)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Section is not assigned to this year level']);
                return;
            }

            // Unassign
            $result = $this->YearLevelSectionModel->unassign($yearLevelId, $sectionId);

            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Section unassigned from year level']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to unassign section']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/sections/with-year-level
     * Create a section and optionally assign it to a year level
     */
    public function api_create_section_with_year_level()
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

            $name = trim($data['name'] ?? '');
            $description = $data['description'] ?? '';
            $status = $data['status'] ?? 'active';
            $yearLevelId = $data['year_level_id'] ?? null;

            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Section name is required']);
                return;
            }

            if ($this->SectionModel->name_exists($name)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Section name already exists']);
                return;
            }

            // Create the section
            $sectionId = $this->SectionModel->create([
                'name' => $name,
                'description' => $description,
                'status' => $status
            ]);

            if (!$sectionId) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create section']);
                return;
            }

            $section = $this->SectionModel->find_by_id($sectionId);

            // If year level specified, assign it
            if ($yearLevelId) {
                $yearLevel = $this->YearLevelModel->find_by_id($yearLevelId);
                if ($yearLevel) {
                    $this->YearLevelSectionModel->assign($yearLevelId, $sectionId);
                    $section['assigned_year_level'] = $yearLevel;
                }
            }

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Section created' . ($yearLevelId ? ' and assigned to year level' : ''),
                'section' => $section
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}
