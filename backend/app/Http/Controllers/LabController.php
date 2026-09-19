<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request; use Illuminate\Support\Facades\Http;
class LabController extends Controller {
 private function call($method,$path,$body=[]){$base=rtrim(config('services.saqr_labs.url'),'/' );$key=config('services.saqr_labs.key');abort_unless($base&&$key,503,'Lab API is not configured');$h=Http::timeout(30)->withHeaders(['X-API-Key'=>$key]);$res=$h->{$method}($base.$path,$body);if(!$res->successful())abort(502,'Lab server error');return $res->json();}
 public function invoke(Request $r,$name){return match($name){'startRealLab','testStartLab'=>$this->start($r),'getRealLabStatus'=>$this->status($r),'stopRealLab','stopTestLab','adminStopLabSession'=>$this->stop($r),default=>response()->json(['error'=>"Function {$name} is not migrated yet"],501)};}
 private function start(Request $r){$lab=$r->input('lab_id')?:$r->input('template_id');$d=$this->call('post','/labs/start',['template_id'=>$lab,'lab_type'=>$lab,'lab_id'=>$lab,'user_id'=>(string)$r->user()->id,'duration_minutes'=>$r->input('duration_minutes',45)]);return ['session'=>['session_id'=>$d['session_id']??$d['id']??$d['lab_id']??'','status'=>($d['status']??'running')==='started'?'running':($d['status']??'running'),'desktop_url'=>$d['desktop_url']??$d['url']??'','target_ip'=>$d['target_ip']??$d['ip']??''],'poll_interval_seconds'=>15];}
 private function status(Request $r){$id=$r->input('session_id');abort_unless($id,422,'session_id required');return $this->call('get','/labs/'.urlencode($id));}
 private function stop(Request $r){$id=$r->input('session_id');abort_unless($id,422,'session_id required');return $this->call('delete','/labs/'.urlencode($id));}
}
