<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function register(Request $r)
    {
        $v = $r->validate([
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'full_name' => 'nullable|string'
        ]);

        $u = User::create([
            'name' => $v['full_name'] ?? $v['email'],
            'email' => $v['email'],
            'password' => Hash::make($v['password'])
        ]);

        return [
            'token' => $u->createToken('saqr')->plainTextToken,
            'user' => $u
        ];
    }

    public function login(Request $r)
    {
        $v = $r->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $u = User::where('email', $v['email'])->first();

        abort_unless(
            $u && Hash::check($v['password'], $u->password),
            401,
            'Invalid credentials'
        );

        return [
            'token' => $u->createToken('saqr')->plainTextToken,
            'user' => $u
        ];
    }

    public function googleRedirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function googleCallback()
    {
        $google = Socialite::driver('google')->stateless()->user();

        $u = User::where('email', $google->getEmail())->first();

        if (!$u) {
            $u = User::create([
                'name' => $google->getName() ?: $google->getEmail(),
                'email' => $google->getEmail(),
                'password' => Hash::make(bin2hex(random_bytes(32)))
            ]);
        }

        $token = $u->createToken('saqr')->plainTextToken;

        return redirect(
            'https://test.saqr5.com/post-login?token=' .
            urlencode($token)
        );
    }

    public function me(Request $r)
    {
        $u = $r->user();

        return array_merge($u->toArray(), [
            'full_name' => $u->name,
            'role' => $u->role ?? 'student'
        ]);
    }

    public function update(Request $r)
    {
        $u = $r->user();

        if ($r->has('full_name')) {
            $u->name = $r->full_name;
        }

        $u->save();

        return $this->me($r);
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()?->delete();

        return ['success' => true];
    }
}
