<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EntityController extends Controller
{
    private const ADMIN_WRITE_ENTITIES = [
        'Track','Subject','Lesson','Question','LessonActivity','Specialization',
        'CompassQuestion','CourseResource','FAQ','Announcement','Assignment',
        'Lab','RealLab','LabSettings','SiteSettings','Testimonial','FinalProject',
    ];

    private const USER_OWNED_ENTITIES = [
        'LessonProgress','TrackEnrollment','SpecializationEnrollment','CompassAttempt',
        'TestAttempt','ActivityAttempt','LabProgress','RealLabCompletion',
        'Notification','FinalExamAttempt',
    ];

    private const SERVER_ONLY_ENTITIES = [
        'Certificate','LabReward','RealLabSession','LabLog','ActivityLog','UserBadge',
    ];

    private function guardWrite(Request $r, string $entity): void
    {
        $role = (string)($r->user()->role ?? 'student');
        if ($role === 'admin') return;
        abort_if(in_array($entity, self::ADMIN_WRITE_ENTITIES, true), 403, 'Admin access required');
        abort_if(in_array($entity, self::SERVER_ONLY_ENTITIES, true), 403, 'This record is managed by the server');
    }

    private function sanitizeOwned(Request $r, string $entity, array $data): array
    {
        if (($r->user()->role ?? 'student') === 'admin') return $data;
        if (in_array($entity, self::USER_OWNED_ENTITIES, true)) {
            $data['user_id'] = $r->user()->id;
        }
        return $data;
    }
    private function out($r)
    {
        if (!$r) return null;
        $d = json_decode($r->data, true) ?: [];
        return array_merge($d, [
            'id' => $r->id,
            'created_date' => $r->created_at,
            'updated_date' => $r->updated_at,
        ]);
    }

    private function q($e)
    {
        $q = DB::table('entity_records')->where('entity', $e);

        // Ignore malformed imported record IDs. Valid Base44 IDs are 24 hex chars;
        // records created by the self-hosted app use UUIDs.
        if (DB::connection()->getDriverName() === 'sqlite') {
            $q->where(function ($ids) {
                $ids->where(function ($base44) {
                    $base44->whereRaw('length(id) = 24')
                        ->whereRaw("lower(id) NOT GLOB '*[^0-9a-f]*'");
                })->orWhere(function ($uuid) {
                    $uuid->whereRaw('length(id) = 36')
                        ->whereRaw("id GLOB '????????-????-????-????-????????????'");
                });
            });
        }

        return $q;
    }

    private function jsonExpr(string $field): string
    {
        abort_unless(preg_match('/^[A-Za-z0-9_]+$/', $field), 400, 'Invalid field');
        $driver = DB::connection()->getDriverName();
        return $driver === 'sqlite'
            ? "json_extract(data, '$.{$field}')"
            : "JSON_UNQUOTE(JSON_EXTRACT(data, '$.{$field}'))";
    }

    private function applySort($q, string $sort)
    {
        $dir = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-');
        if (in_array($field, ['created_date', 'updated_date'], true)) {
            return $q->orderBy($field === 'created_date' ? 'created_at' : 'updated_at', $dir);
        }
        return $q->orderByRaw($this->jsonExpr($field) . " {$dir}");
    }

    private function filterValue($value)
    {
        // SQLite JSON1 preserves scalar types. Keep numbers numeric so Laravel
        // user IDs (integers) match JSON user_id values created after migration.
        if (is_bool($value)) return $value ? 1 : 0;
        if (is_int($value) || is_float($value) || $value === null) return $value;
        return (string) $value;
    }

    public function index(Request $r, $e)
    {
        if ($e === 'User') {
            abort_unless(($r->user()->role ?? '') === 'admin', 403);
            return DB::table('users')->orderBy('created_at', 'desc')->limit(min((int)$r->query('limit', 100), 1000))->get()
                ->map(fn($u) => [
                    'id' => $u->id, 'email' => $u->email, 'full_name' => $u->name,
                    'role' => $u->role ?? 'student', 'created_date' => $u->created_at, 'updated_date' => $u->updated_at,
                ]);
        }
        $q = $this->applySort($this->q($e), $r->query('sort', '-created_date'));
        return $q->limit(min((int)$r->query('limit', 100), 1000))->get()->map(fn($x) => $this->out($x));
    }

    public function filter(Request $r, $e)
    {
        $q = $this->q($e);
        foreach (($r->input('filters') ?: []) as $k => $v) {
            $q->whereRaw($this->jsonExpr((string)$k) . ' = ?', [$this->filterValue($v)]);
        }
        $q = $this->applySort($q, $r->input('sort', '-created_date'));
        return $q->limit(min((int)$r->input('limit', 100), 1000))->get()->map(fn($x) => $this->out($x));
    }

    public function show($e, $id)
    {
        return response()->json($this->out($this->q($e)->where('id', $id)->first()) ?? abort(404));
    }

    public function store(Request $r, $e)
    {
        $this->guardWrite($r, $e);
        $payload = $this->sanitizeOwned($r, $e, $r->all());
        $id = (string) Str::uuid();
        DB::table('entity_records')->insert([
            'id' => $id, 'entity' => $e, 'data' => json_encode($payload),
            'created_at' => now(), 'updated_at' => now()
        ]);
        return $this->show($e, $id);
    }

    public function update(Request $r, $e, $id)
    {
        $this->guardWrite($r, $e);
        $row = $this->q($e)->where('id', $id)->first();
        abort_unless($row, 404);
        $existing = json_decode($row->data, true) ?: [];
        if (($r->user()->role ?? 'student') !== 'admin' && in_array($e, self::USER_OWNED_ENTITIES, true)) {
            abort_unless((string)($existing['user_id'] ?? '') === (string)$r->user()->id, 403);
        }
        $data = array_merge($existing, $this->sanitizeOwned($r, $e, $r->all()));
        $this->q($e)->where('id', $id)->update(['data' => json_encode($data), 'updated_at' => now()]);
        return $this->show($e, $id);
    }

    public function destroy(Request $r, $e, $id)
    {
        $this->guardWrite($r, $e);
        $row = $this->q($e)->where('id', $id)->first();
        abort_unless($row, 404);
        $data = json_decode($row->data, true) ?: [];
        if (($r->user()->role ?? 'student') !== 'admin' && in_array($e, self::USER_OWNED_ENTITIES, true)) {
            abort_unless((string)($data['user_id'] ?? '') === (string)$r->user()->id, 403);
        }
        $this->q($e)->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function deleteMany(Request $r, $e)
    {
        $this->guardWrite($r, $e);
        abort_unless(($r->user()->role ?? 'student') === 'admin', 403, 'Bulk delete requires admin access');
        $q = $this->q($e);
        foreach (($r->input('filters') ?: []) as $k => $v) {
            $q->whereRaw($this->jsonExpr((string)$k) . ' = ?', [(string)$v]);
        }
        return ['deleted' => $q->delete()];
    }

    public function bulk(Request $r, $e)
    {
        $this->guardWrite($r, $e);
        abort_unless(($r->user()->role ?? 'student') === 'admin', 403, 'Bulk create requires admin access');
        $out = [];
        foreach ($r->input('rows', []) as $row) {
            $id = (string) Str::uuid();
            DB::table('entity_records')->insert([
                'id' => $id, 'entity' => $e, 'data' => json_encode($row),
                'created_at' => now(), 'updated_at' => now()
            ]);
            $out[] = $this->out($this->q($e)->where('id', $id)->first());
        }
        return $out;
    }
}
