<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * AnnouncementModel - simple CRUD for announcements table
 */
class AnnouncementModel extends Model
{
    protected $table = 'announcements';

    public function get_all($filters = [])
    {
        $query = $this->db->table($this->table)
            ->select('id, title, message, audience, status, published_at, starts_at, ends_at, created_by, created_at, updated_at');

        if (!empty($filters['audience'])) {
            $query = $query->where('audience', $filters['audience']);
        }

        if (!empty($filters['status'])) {
            $query = $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $s = '%' . $filters['search'] . '%';
            $query = $query->where_group_start();
            $query = $query->like('title', $s);
            $query = $query->or_like('message', $s);
            $query = $query->where_group_end();
        }

        return $query->order_by('published_at', 'DESC')->get_all();
    }

    public function get_announcement($id)
    {
        return $this->db->table($this->table)
            ->select('id, title, message, audience, status, published_at, starts_at, ends_at, created_by, created_at, updated_at')
            ->where('id', $id)
            ->get();
    }

    public function create($data)
    {
        $now = date('Y-m-d H:i:s');
        $insert = [
            'title' => $data['title'] ?? '',
            'message' => $data['message'] ?? '',
            'audience' => $data['audience'] ?? 'all',
            'status' => $data['status'] ?? 'active',
            'published_at' => $data['published_at'] ?? $now,
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'created_by' => $data['created_by'] ?? null,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $res = $this->db->table($this->table)->insert($insert);
        if ($res === false) return false;
        if (is_int($res)) return $res;
        return $this->db->insert_id() ?? true;
    }

    public function update_announcement($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        $allowed = ['title','message','audience','status','published_at','starts_at','ends_at','updated_at'];
        $update = [];
        foreach ($data as $k => $v) {
            if (in_array($k, $allowed)) $update[$k] = $v;
        }
        return $this->db->table($this->table)->where('id', $id)->update($update);
    }

    public function delete_announcement($id)
    {
        // soft delete: mark as archived
        return $this->db->table($this->table)->where('id', $id)->update(['status' => 'archived', 'updated_at' => date('Y-m-d H:i:s')]);
    }
}
