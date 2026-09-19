<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class ImportBase44Data extends Command
{
    protected $signature = 'saqr:import-base44 {path=/root/saqr-data} {--with-user-data}';
    protected $description = 'Import Base44 CSV exports into Saqr entity_records';

    private array $userData = [
        'ActivityAttempt','ActivityLog','Certificate','CompassAttempt','LabLog',
        'LabProgress','LabReward','LessonProgress','Notification','RealLabCompletion',
        'RealLabSession','SpecializationEnrollment','TestAttempt','TrackEnrollment',
        'TrackInterest','UserBadge'
    ];

    public function handle(): int
    {
        $root = $this->argument('path');
        if (!is_dir($root)) {
            $this->error("Directory not found: {$root}");
            return self::FAILURE;
        }

        $files = [];
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root));
        foreach ($it as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'csv') {
                $files[] = $file->getPathname();
            }
        }
        sort($files);

        if (!$files) {
            $this->error('No CSV files found.');
            return self::FAILURE;
        }

        $total = 0;
        DB::beginTransaction();

        try {
            foreach ($files as $file) {
                $entity = preg_replace('/_export$/', '', pathinfo($file, PATHINFO_FILENAME));

                if (!$this->option('with-user-data') && in_array($entity, $this->userData, true)) {
                    $this->line("SKIP {$entity} (user data)");
                    continue;
                }

                $handle = fopen($file, 'r');
                if (!$handle) {
                    $this->warn("SKIP {$entity}: cannot open");
                    continue;
                }

                $headers = fgetcsv($handle);
                if (!$headers) {
                    fclose($handle);
                    $this->line("SKIP {$entity} (empty)");
                    continue;
                }

                $headers = array_map(fn ($h) => preg_replace('/^\xEF\xBB\xBF/', '', trim((string)$h)), $headers);
                $count = 0;

                while (($values = fgetcsv($handle)) !== false) {
                    if (count($values) === 1 && trim((string)$values[0]) === '') continue;
                    $values = array_pad($values, count($headers), '');
                    $row = array_combine($headers, array_slice($values, 0, count($headers)));
                    if (!$row) continue;

                    $sourceId = trim((string)($row['id'] ?? ''));
                    $id = $sourceId !== '' ? $sourceId : (string) Str::uuid();

                    $created = $this->dateValue($row['created_date'] ?? null);
                    $updated = $this->dateValue($row['updated_date'] ?? null);

                    unset($row['id'], $row['created_date'], $row['updated_date']);

                    DB::table('entity_records')->updateOrInsert(
                        ['id' => $id],
                        [
                            'entity' => $entity,
                            'data' => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                            'created_at' => $created,
                            'updated_at' => $updated,
                        ]
                    );
                    $count++;
                    $total++;
                }

                fclose($handle);
                $this->info("{$entity}: {$count}");
            }

            DB::commit();
            $this->newLine();
            $this->info("Import complete: {$total} records.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }

    private function dateValue(?string $value): string
    {
        if (!$value) return now()->format('Y-m-d H:i:s');
        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return now()->format('Y-m-d H:i:s');
        }
    }
}
