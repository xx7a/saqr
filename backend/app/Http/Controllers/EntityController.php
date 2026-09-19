<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EntityController extends Controller
{
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
        return DB::table('entity_records')->where('entity', $e);
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

    public function index(Request $r, $e)
    {
        $q = $this->applySort($this->q($e), $r->query('sort', '-created_date'));
        return $q->limit(min((int)$r->query('limit', 100), 1000))->get()->map(fn($x) => $this->out($x));
    }

    public function filter(Request $r, $e)
    {
        $q = $this->q($e);
        foreach (($r->input('filters') ?: []) as $k => $v) {
            $q->whereRaw($this->jsonExpr((string)$k) . ' = ?', [(string)$v]);
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
        $id = (string) Str::uuid();
        DB::table('entity_records')->insert([
            'id' => $id, 'entity' => $e, 'data' => json_encode($r->all()),
            'created_at' => now(), 'updated_at' => now()
        ]);
        return $this->show($e, $id);
    }

    public function update(Request $r, $e, $id)
    {
        $row = $this->q($e)->where('id', $id)->first();
        abort_unless($row, 404);
        $data = array_merge(json_decode($row->data, true) ?: [], $r->all());
        $this->q($e)->where('id', $id)->update(['data' => json_encode($data), 'updated_at' => now()]);
        return $this->show($e, $id);
    }

    public function destroy($e, $id)
    {
        $this->q($e)->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function deleteMany(Request $r, $e)
    {
        $q = $this->q($e);
        foreach (($r->input('filters') ?: []) as $k => $v) {
            $q->whereRaw($this->jsonExpr((string)$k) . ' = ?', [(string)$v]);
        }
        return ['deleted' => $q->delete()];
    }

    public function bulk(Request $r, $e)
    {
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
