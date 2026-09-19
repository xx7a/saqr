<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class LabController extends Controller
{
    public function invoke(Request $r, $name)
    {
        return match ($name) {
            'checkSpecializationEligibility' => $this->eligibility($r),
            'enrollInSpecialization' => $this->enrollSpecialization($r),
            'submitCompassAttempt' => $this->submitCompass($r),
            'awardLabPoints' => $this->awardLabPoints($r),
            'issueCertificate' => $this->issueCertificate($r),
            'submitRealLabFlag' => $this->submitRealLabFlag($r),
            'startRealLab', 'testStartLab' => $this->start($r),
            'getRealLabStatus' => $this->status($r),
            'stopRealLab', 'stopTestLab', 'adminStopLabSession' => $this->stop($r),
            default => response()->json(['error' => "Function {$name} is not migrated yet"], 501),
        };
    }

    private function rows(string $entity, array $filters = []): array
    {
        return DB::table('entity_records')->where('entity', $entity)->get()
            ->map(function ($row) {
                $data = json_decode($row->data, true) ?: [];
                return array_merge($data, ['id' => $row->id, 'created_date' => $row->created_at, 'updated_date' => $row->updated_at]);
            })
            ->filter(function ($row) use ($filters) {
                foreach ($filters as $key => $value) {
                    if (($row[$key] ?? null) != $value) return false;
                }
                return true;
            })->values()->all();
    }

    private function one(string $entity, array $filters = []): ?array
    {
        return $this->rows($entity, $filters)[0] ?? null;
    }

    private function createEntity(string $entity, array $data): array
    {
        $id = (string) Str::uuid();
        DB::table('entity_records')->insert([
            'id' => $id, 'entity' => $entity,
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return array_merge($data, ['id' => $id, 'created_date' => now()->toISOString(), 'updated_date' => now()->toISOString()]);
    }

    private function updateEntity(string $id, array $changes): ?array
    {
        $row = DB::table('entity_records')->where('id', $id)->first();
        if (!$row) return null;
        $data = array_merge(json_decode($row->data, true) ?: [], $changes);
        DB::table('entity_records')->where('id', $id)->update([
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at' => now(),
        ]);
        return array_merge($data, ['id' => $id]);
    }

    private function eligibility(Request $r): array
    {
        $userId = $r->user()->id;
        $tracks = array_values(array_filter($this->rows('Track'), fn($t) => ($t['track_type'] ?? '') === 'foundation' && ($t['availability_status'] ?? '') === 'available'));
        $allProgress = $this->rows('LessonProgress', ['user_id' => $userId]);
        $foundationTracks = [];
        $missing = [];
        $eligible = count($tracks) > 0;

        foreach ($tracks as $track) {
            $lessons = array_values(array_filter($this->rows('Lesson'), fn($l) =>
                ($l['track_id'] ?? null) === $track['id'] && ($l['is_published'] ?? false) == true
            ));
            $completedIds = [];
            foreach ($allProgress as $p) if (($p['status'] ?? '') === 'completed') $completedIds[(string)($p['lesson_id'] ?? '')] = true;
            $done = count(array_filter($lessons, fn($l) => isset($completedIds[$l['id']])));
            $complete = count($lessons) > 0 && $done === count($lessons);
            if (!$complete) $eligible = false;

            foreach ($lessons as $lesson) {
                if (!isset($completedIds[$lesson['id']])) {
                    $missing[] = [
                        'type' => 'lesson', 'id' => $lesson['id'],
                        'title' => $lesson['title'] ?? $lesson['title_en'] ?? 'Lesson',
                        'link' => '/lesson/'.$lesson['id'],
                    ];
                }
            }

            $foundationTracks[] = [
                'id' => $track['id'], 'name' => $track['name'] ?? $track['name_en'] ?? 'Track',
                'isComplete' => $complete, 'lessonsCompleted' => $done, 'lessonsTotal' => count($lessons),
                'testsPassed' => 0, 'testsTotal' => 0,
            ];
        }

        return [
            'eligible' => $eligible,
            'foundationTracks' => $foundationTracks,
            'missingRequirements' => $missing,
            'existingEnrollment' => $this->one('SpecializationEnrollment', ['user_id' => $userId]),
        ];
    }

    private function enrollSpecialization(Request $r): array
    {
        $specId = (string) $r->input('specialization_id');
        abort_unless($specId, 422, 'specialization_id required');
        $userId = $r->user()->id;
        $existing = $this->one('SpecializationEnrollment', ['user_id' => $userId]);
        if ($existing) return ['already_enrolled' => true, 'enrollment' => $existing];

        $eligibility = $this->eligibility($r);
        if (!$eligibility['eligible']) return ['error' => 'Foundation track is not complete'];

        $spec = $this->one('Specialization', ['id' => $specId]);
        abort_unless($spec && ($spec['availability_status'] ?? '') === 'available', 404, 'Specialization unavailable');

        $enrollment = $this->createEntity('SpecializationEnrollment', [
            'progress_percent' => 0, 'specialization_id' => $specId,
            'specialization_name' => $spec['name_ar'] ?? $spec['name_en'] ?? '',
            'user_id' => $userId, 'enrolled_date' => now()->toISOString(), 'status' => 'active',
        ]);
        return ['enrollment' => $enrollment];
    }

    private function submitCompass(Request $r): array
    {
        $userId = $r->user()->id;
        if (!$this->eligibility($r)['eligible']) return ['error' => 'Foundation track is not complete', 'totalMissing' => 1];

        $questions = $this->rows('CompassQuestion', ['is_published' => true]);
        $byId = [];
        foreach ($questions as $q) $byId[$q['id']] = $q;
        $answers = [];
        $scores = [];

        foreach ((array)$r->input('answers', []) as $answer) {
            $q = $byId[$answer['question_id'] ?? ''] ?? null;
            if (!$q) continue;
            $specId = (string)($q['specialization_id'] ?? '');
            if (!isset($scores[$specId])) $scores[$specId] = ['total' => 0, 'correct' => 0, 'specialization_id' => $specId, 'specialization_name' => $q['specialization_name'] ?? ''];
            $correct = (string)($answer['selected_option_id'] ?? '') === (string)($q['correct_option_id'] ?? '');
            $scores[$specId]['total']++;
            if ($correct) $scores[$specId]['correct']++;
            $answers[] = ['specialization_id' => $specId, 'question_id' => $q['id'], 'selected_option_id' => $answer['selected_option_id'] ?? null, 'is_correct' => $correct];
        }

        $scoreRows = array_values(array_map(function($s) {
            $s['percent'] = $s['total'] ? (int)round(($s['correct'] / $s['total']) * 100) : 0;
            return $s;
        }, $scores));
        usort($scoreRows, fn($a,$b) => $b['percent'] <=> $a['percent']);
        $top = $scoreRows[0]['percent'] ?? 0;
        $ties = array_values(array_filter($scoreRows, fn($s) => $s['percent'] === $top));
        $recommended = count($ties) === 1 ? $ties[0] : null;

        $attempt = $this->createEntity('CompassAttempt', [
            'is_weak' => $top < 50, 'submitted_date' => now()->toISOString(),
            'tied_spec_names' => array_column($ties, 'specialization_name'),
            'recommended_spec_name' => $recommended['specialization_name'] ?? '',
            'user_id' => $userId, 'scores_by_spec' => $scoreRows,
            'answers' => $answers, 'recommended_spec_id' => $recommended['specialization_id'] ?? '',
            'tied_spec_ids' => array_column($ties, 'specialization_id'),
            'started_date' => now()->toISOString(), 'status' => 'submitted',
        ]);

        return [
            'attempt_id' => $attempt['id'], 'scores_by_spec' => $scoreRows,
            'recommended_spec_id' => $recommended['specialization_id'] ?? null,
            'recommended_spec_name' => $recommended['specialization_name'] ?? null,
            'tied_spec_ids' => array_column($ties, 'specialization_id'),
            'tied_spec_names' => array_column($ties, 'specialization_name'),
            'is_weak' => $top < 50,
        ];
    }

    private function awardLabPoints(Request $r): array
    {
        $userId = $r->user()->id;
        $labId = (string)$r->input('lab_id');
        $existing = $this->one('LabReward', ['user_id' => $userId, 'lab_id' => $labId]);
        if ($existing) return ['already_awarded' => true, 'points' => (int)($existing['points_awarded'] ?? 0)];

        $progress = $this->one('LabProgress', ['user_id' => $userId, 'lab_id' => $labId]);
        abort_unless($progress && ($progress['status'] ?? '') === 'completed', 422, 'Lab is not completed');
        $lab = $this->one('Lab', ['id' => $labId]);
        $points = (int)($lab['points'] ?? $progress['points_earned'] ?? 0);
        $this->createEntity('LabReward', [
            'lab_title' => $lab['title'] ?? '', 'awarded_date' => now()->toISOString(),
            'user_id' => $userId, 'lab_id' => $labId, 'points_awarded' => $points,
        ]);
        return ['awarded' => true, 'points' => $points];
    }

    private function issueCertificate(Request $r): array
    {
        $userId = $r->user()->id;
        $trackId = $r->input('track_id');
        $specId = $r->input('specialization_id');
        abort_unless($trackId || $specId, 422, 'track_id or specialization_id required');

        $filters = ['user_id' => $userId];
        if ($trackId) $filters['track_id'] = $trackId; else $filters['specialization_id'] = $specId;
        $existing = $this->one('Certificate', $filters);
        if ($existing) return ['certificate' => $existing, 'already_exists' => true];

        $lessons = array_values(array_filter($this->rows('Lesson'), fn($l) =>
            ($l['is_published'] ?? false) == true &&
            ($trackId ? (($l['track_id'] ?? null) === $trackId) : (($l['specialization_id'] ?? null) === $specId))
        ));
        $progress = $this->rows('LessonProgress', ['user_id' => $userId]);
        $done = [];
        foreach ($progress as $p) if (($p['status'] ?? '') === 'completed') $done[$p['lesson_id'] ?? ''] = true;
        $complete = count($lessons) > 0 && count(array_filter($lessons, fn($l) => isset($done[$l['id']]))) === count($lessons);
        if (!$complete) return ['error' => 'Complete all lessons before issuing the certificate'];

        $target = $trackId ? $this->one('Track', ['id' => $trackId]) : $this->one('Specialization', ['id' => $specId]);
        $cert = $this->createEntity('Certificate', [
            'specialization_id' => $specId ?: '', 'specialization_name' => $specId ? ($target['name_ar'] ?? $target['name_en'] ?? '') : '',
            'issue_date' => now()->toISOString(), 'user_id' => $userId, 'user_name' => $r->user()->name,
            'track_id' => $trackId ?: '', 'is_valid' => true, 'certificate_type' => $trackId ? 'foundation' : 'specialization',
            'verification_code' => 'SAQR-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4)),
            'track_name' => $trackId ? ($target['name'] ?? $target['name_en'] ?? '') : '',
        ]);
        return ['certificate' => $cert, 'already_exists' => false];
    }

    private function submitRealLabFlag(Request $r): array
    {
        $userId = $r->user()->id;
        $labId = (string)$r->input('lab_id');
        $flag = trim((string)$r->input('flag'));
        $lab = $this->one('RealLab', ['id' => $labId]);
        abort_unless($lab, 404, 'Lab not found');

        $existing = $this->one('RealLabCompletion', ['user_id' => $userId, 'lab_id' => $labId]);
        if ($existing) return ['correct' => true, 'already_completed' => true, 'points_awarded' => (int)($existing['points_awarded'] ?? 0)];
        if (!hash_equals((string)($lab['correct_flag'] ?? ''), $flag)) return ['correct' => false];

        $points = (int)($lab['points'] ?? 0);
        $this->createEntity('RealLabCompletion', [
            'lab_title' => $lab['title'] ?? '', 'flag_submitted' => $flag, 'user_id' => $userId,
            'lab_id' => $labId, 'points_awarded' => $points, 'completed_date' => now()->toISOString(),
        ]);
        return ['correct' => true, 'already_completed' => false, 'points_awarded' => $points];
    }

    private function call($method, $path, $body = [])
    {
        $base = rtrim((string)config('services.saqr_labs.url'), '/');
        $key = config('services.saqr_labs.key');
        abort_unless($base && $key, 503, 'Lab API is not configured');
        $h = Http::timeout(30)->withHeaders(['X-API-Key' => $key]);
        $res = $h->{$method}($base.$path, $body);
        if (!$res->successful()) abort(502, 'Lab server error');
        return $res->json();
    }

    private function start(Request $r): array
    {
        $labId = (string)($r->input('lab_id') ?: $r->input('template_id'));
        $lab = $this->one('RealLab', ['id' => $labId]);
        abort_unless($lab, 404, 'Lab not found');

        $existing = $this->one('RealLabSession', ['user_id' => $r->user()->id, 'status' => 'running']);
        if ($existing) return ['active_lab_id' => $existing['lab_id'] ?? null];

        $backendType = $lab['backend_lab_type'] ?? $labId;
        $d = $this->call('post', '/start-lab', [
            'template_id' => $backendType, 'lab_type' => $backendType, 'lab_id' => $backendType,
            'user_id' => (string)$r->user()->id, 'duration_minutes' => $r->input('duration_minutes', $lab['estimated_minutes'] ?? 45),
        ]);

        $sessionId = $d['session_id'] ?? $d['id'] ?? $d['lab_id'] ?? '';
        $session = $this->createEntity('RealLabSession', [
            'lab_title' => $lab['title'] ?? '', 'desktop_url' => $d['desktop_url'] ?? $d['url'] ?? '',
            'expires_at' => now()->addMinutes((int)($lab['estimated_minutes'] ?? 45))->toISOString(),
            'user_id' => $r->user()->id, 'target_ip' => $d['target_ip'] ?? $d['ip'] ?? '',
            'session_id' => $sessionId, 'started_at' => now()->toISOString(), 'stopped_at' => '',
            'lab_id' => $labId, 'status' => (($d['status'] ?? 'running') === 'started' ? 'running' : ($d['status'] ?? 'running')),
        ]);
        return ['session' => $session, 'poll_interval_seconds' => 15];
    }

    private function sessionFromRequest(Request $r): ?array
    {
        $recordId = $r->input('session_record_id');
        if ($recordId) return $this->one('RealLabSession', ['id' => $recordId]);
        $sessionId = $r->input('session_id');
        return $sessionId ? $this->one('RealLabSession', ['session_id' => $sessionId]) : null;
    }

    private function status(Request $r): array
    {
        $session = $this->sessionFromRequest($r);
        abort_unless($session && ($session['user_id'] ?? null) == $r->user()->id, 404, 'Session not found');
        try {
            $remote = $this->call('get', '/lab/'.urlencode($session['session_id']));
            $status = (($remote['status'] ?? $session['status']) === 'started') ? 'running' : ($remote['status'] ?? $session['status']);
            $session = $this->updateEntity($session['id'], [
                'status' => $status, 'desktop_url' => $remote['desktop_url'] ?? $remote['url'] ?? $session['desktop_url'],
                'target_ip' => $remote['target_ip'] ?? $remote['ip'] ?? $session['target_ip'],
            ]);
            return ['session' => $session, 'api_offline' => false];
        } catch (\Throwable $e) {
            return ['session' => $session, 'api_offline' => true];
        }
    }

    private function stop(Request $r): array
    {
        $session = $this->sessionFromRequest($r);
        abort_unless($session, 404, 'Session not found');
        abort_unless(($session['user_id'] ?? null) == $r->user()->id || ($r->user()->role ?? '') === 'admin', 403);
        try { $this->call('delete', '/lab/'.urlencode($session['session_id'])); } catch (\Throwable $e) {}
        $session = $this->updateEntity($session['id'], ['status' => 'stopped', 'stopped_at' => now()->toISOString()]);
        return ['success' => true, 'session' => $session];
    }
}
