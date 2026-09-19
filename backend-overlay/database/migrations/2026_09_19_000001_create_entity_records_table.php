<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('entity_records', function(Blueprint $t){ $t->uuid('id')->primary(); $t->string('entity',80)->index(); $t->json('data'); $t->timestamps(); $t->index(['entity','created_at']); }); } public function down(): void { Schema::dropIfExists('entity_records'); } };
