<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');
/**
 * ------------------------------------------------------------------
 * LavaLust - an opensource lightweight PHP MVC Framework
 * ------------------------------------------------------------------
 *
 * MIT License
 *
 * Copyright (c) 2020 Ronald M. Marasigan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @package LavaLust
 * @author Ronald M. Marasigan <ronald.marasigan@yahoo.com>
 * @since Version 1
 * @link https://github.com/ronmarasigan/LavaLust
 * @license https://opensource.org/licenses/MIT MIT License
 */

/*
| -------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------
| Here is where you can register web routes for your application.
|
|
*/

$router->get('/', 'Welcome::index');

// Auth Routes (Both API and Web)
$router->match('/auth/login', 'UserController::login', ['GET', 'POST']);
$router->match('/auth/register', 'UserController::register', ['GET', 'POST']);
$router->get('/auth/logout', 'UserController::logout');

// API Routes - Authentication
$router->post('/api/auth/register', 'UserController::api_register');
$router->post('/api/auth/login', 'UserController::api_login');
$router->post('/api/auth/logout', 'UserController::api_logout');
$router->get('/api/auth/me', 'UserController::me');
$router->get('/api/auth/check', 'UserController::check');

// API Routes - User Management (Admin only)
$router->get('/api/users', 'UserController::api_get_users');
$router->get('/api/users/{id}', 'UserController::api_get_user')->where_number('id');
$router->post('/api/users', 'UserController::api_create_user');
$router->put('/api/users/{id}', 'UserController::api_update_user')->where_number('id');
$router->delete('/api/users/{id}', 'UserController::api_delete_user')->where_number('id');

// API Routes - Teacher Management (Admin only)
$router->get('/api/teachers', 'TeacherController::api_get_teachers');
$router->get('/api/teachers/stats', 'TeacherController::api_teacher_stats');
$router->get('/api/teachers/last-id', 'TeacherController::api_get_last_id');
$router->get('/api/teachers/{id}', 'TeacherController::api_get_teacher')->where_number('id');
$router->post('/api/teachers', 'TeacherController::api_create_teacher');
$router->put('/api/teachers/{id}', 'TeacherController::api_update_teacher')->where_number('id');
$router->delete('/api/teachers/{id}', 'TeacherController::api_delete_teacher')->where_number('id');

// API Routes - Student Management (Admin only)
$router->get('/api/students', 'StudentController::api_get_students');
$router->get('/api/students/stats', 'StudentController::api_get_stats');
$router->get('/api/students/last-id', 'StudentController::api_get_last_id');
$router->get('/api/students/by-user/{user_id}', 'StudentController::api_get_by_user_id')->where_number('user_id');
$router->get('/api/students/{id}', 'StudentController::api_get_student')->where_number('id');
$router->post('/api/students', 'StudentController::api_create_student');
$router->get('/api/students/export', 'StudentController::api_export_students');
$router->post('/api/students/import', 'StudentController::api_import_students');
$router->put('/api/students/{id}', 'StudentController::api_update_student')->where_number('id');
$router->delete('/api/students/{id}', 'StudentController::api_delete_student')->where_number('id');

// Tools / Utilities
$router->get('/tools/generate-students', 'Tools::generate_students');

// API Routes - Sections (Admin only)
$router->get('/api/sections', 'SectionController::api_get_sections');
$router->get('/api/sections/{id}', 'SectionController::api_get_section')->where_number('id');
$router->post('/api/sections', 'SectionController::api_create_section');
$router->post('/api/sections/with-year-level', 'SectionController::api_create_section_with_year_level');
$router->put('/api/sections/{id}', 'SectionController::api_update_section')->where_number('id');
$router->delete('/api/sections/{id}', 'SectionController::api_delete_section')->where_number('id');

// API Routes - Year Levels (Admin only)
$router->get('/api/year-levels', 'SectionController::api_get_year_levels');
$router->get('/api/year-levels/{id}/sections', 'SectionController::api_get_year_level_sections')->where_number('id');

// API Routes - Year Level Sections (Admin only)
$router->get('/api/year-level-sections', 'SectionController::api_get_all_year_level_sections');
$router->post('/api/year-levels/{yearLevelId}/sections/{sectionId}', 'SectionController::api_assign_section_to_year_level')->where_number(['yearLevelId', 'sectionId']);
$router->delete('/api/year-levels/{yearLevelId}/sections/{sectionId}', 'SectionController::api_unassign_section_from_year_level')->where_number(['yearLevelId', 'sectionId']);

// API Routes - Subjects (Admin only)
$router->get('/api/subjects', 'SubjectController::api_get_subjects');
$router->get('/api/subjects/{id}', 'SubjectController::api_get_subject')->where_number('id');
$router->post('/api/subjects', 'SubjectController::api_create_subject');
$router->put('/api/subjects/{id}', 'SubjectController::api_update_subject')->where_number('id');
$router->delete('/api/subjects/{id}', 'SubjectController::api_delete_subject')->where_number('id');

// API Routes - Teacher Assignments (Admin only)
$router->post('/api/teacher-assignments', 'TeacherAssignmentController::api_assign_subjects');
$router->get('/api/teacher-assignments/my', 'TeacherAssignmentController::api_get_mine');
$router->get('/api/teacher-assignments/by-teacher/{teacher_id}', 'TeacherAssignmentController::api_get_by_teacher')->where_number('teacher_id');
$router->get('/api/teacher-assignments', 'TeacherAssignmentController::api_get_all');
// Remove a single teacher_subject -> section mapping
$router->post('/api/teacher-assignments/remove-section', 'TeacherAssignmentController::api_remove_section');
// Remove an entire teacher_subject assignment
$router->post('/api/teacher-assignments/remove-assignment', 'TeacherAssignmentController::api_remove_assignment');

// API Routes - Student Subjects (Enrollments)
$router->get('/api/student-subjects', 'StudentSubjectController::api_get');
$router->post('/api/student-subjects', 'StudentSubjectController::api_create');
$router->post('/api/student-subjects/delete', 'StudentSubjectController::api_delete');

// API Routes - Activities (Grade Transparency)
$router->get('/api/activities', 'ActivityController::api_get_activities');
$router->get('/api/activities/{id}', 'ActivityController::api_get_activity')->where_number('id');
$router->post('/api/activities', 'ActivityController::api_create_activity');
$router->put('/api/activities/{id}', 'ActivityController::api_update_activity')->where_number('id');
$router->delete('/api/activities/{id}', 'ActivityController::api_delete_activity')->where_number('id');
$router->get('/api/activities/{id}/grades', 'ActivityController::api_get_activity_grades')->where_number('id');
$router->post('/api/activities/{id}/grades', 'ActivityController::api_set_grade')->where_number('id');
// Bulk upsert grades for an activity (teacher/admin only)
$router->post('/api/activities/{id}/grades/bulk', 'ActivityController::api_set_grades_bulk')->where_number('id');