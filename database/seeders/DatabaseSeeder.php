<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        User::updateOrCreate(
            ['email' => 'teacher@sugarlab.test'],
            ['name' => 'Sugar Lab Teacher', 'password' => 'password', 'role' => 'teacher'],
        );

        $teacher = User::updateOrCreate(
            ['email' => 'kide@gmail.com'],
            ['name' => 'kide', 'password' => '123456789', 'role' => 'teacher'],
        );

        \App\Models\Teacher::updateOrCreate(
            ['user_id' => $teacher->id],
            ['username' => 'kide', 'email' => 'kide@gmail.com'],
        );
    }
}
