<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Year Level Section Model
 * Handles year_level_sections linking table operations
 */
class YearLevelSectionModel extends Model
{
    protected $table = 'year_level_sections';

    /**
     * Get all sections assigned to a specific year level
     * Returns section details with year level mapping
     */
    public function get_sections_by_year_level($yearLevelId)
    {
        return $this->db->table($this->table . ' yls')
                        ->select('s.id, s.name, s.description, s.status, yls.year_level_id')
                        ->left_join('sections s', 's.id = yls.section_id')
                        ->where('yls.year_level_id', $yearLevelId)
                        ->order_by('s.name', 'ASC')
                        ->get_all();
    }

    /**
     * Get all year level to section mappings
     * Returns array with year_level_id, section_id, and full details
     */
    public function get_all_mappings()
    {
        return $this->db->table($this->table . ' yls')
                        ->select('yls.year_level_id, yls.section_id, s.name as section_name, yl.name as year_level_name')
                        ->left_join('sections s', 's.id = yls.section_id')
                        ->left_join('year_levels yl', 'yl.id = yls.year_level_id')
                        ->order_by('yls.year_level_id', 'ASC')
                        ->order_by('s.name', 'ASC')
                        ->get_all();
    }

    /**
     * Get year levels for a specific section
     */
    public function get_year_levels_by_section($sectionId)
    {
        return $this->db->table($this->table . ' yls')
                        ->select('yl.id, yl.name, yl.`order`')
                        ->left_join('year_levels yl', 'yl.id = yls.year_level_id')
                        ->where('yls.section_id', $sectionId)
                        ->order_by('yl.`order`', 'ASC')
                        ->get_all();
    }

    /**
     * Check if a section is already assigned to a year level
     */
    public function is_assigned($yearLevelId, $sectionId)
    {
        $result = $this->db->table($this->table)
                           ->where('year_level_id', $yearLevelId)
                           ->where('section_id', $sectionId)
                           ->get();
        return !empty($result);
    }

    /**
     * Assign a section to a year level
     * Returns true on success, false on failure
     */
    public function assign($yearLevelId, $sectionId)
    {
        // Check if already assigned
        if ($this->is_assigned($yearLevelId, $sectionId)) {
            return false; // Already assigned
        }

        $insert = [
            'year_level_id' => $yearLevelId,
            'section_id' => $sectionId
        ];

        return $this->db->table($this->table)->insert($insert);
    }

    /**
     * Unassign a section from a year level
     */
    public function unassign($yearLevelId, $sectionId)
    {
        return $this->db->table($this->table)
                        ->where('year_level_id', $yearLevelId)
                        ->where('section_id', $sectionId)
                        ->delete();
    }

    /**
     * Remove all year level assignments for a specific section
     */
    public function unassign_all_for_section($sectionId)
    {
        return $this->db->table($this->table)
                        ->where('section_id', $sectionId)
                        ->delete();
    }

    /**
     * Bulk assign multiple sections to a year level
     * $sectionIds: array of section ids
     */
    public function bulk_assign($yearLevelId, $sectionIds)
    {
        if (empty($sectionIds)) {
            return true;
        }

        $success = true;
        foreach ($sectionIds as $sectionId) {
            if (!$this->is_assigned($yearLevelId, $sectionId)) {
                $result = $this->assign($yearLevelId, $sectionId);
                if (!$result) {
                    $success = false;
                }
            }
        }
        return $success;
    }

    /**
     * Replace all assignments for a year level with new ones
     * Useful for bulk updates
     */
    public function replace_assignments($yearLevelId, $sectionIds)
    {
        // First, remove all existing assignments for this year level
        $this->db->table($this->table)
                 ->where('year_level_id', $yearLevelId)
                 ->delete();

        // Then add new assignments
        if (empty($sectionIds)) {
            return true;
        }

        return $this->bulk_assign($yearLevelId, $sectionIds);
    }
}
