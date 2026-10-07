<?php

namespace App\Http\Controllers;

use App\Models\SimulationSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SimulationController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $query = SimulationSession::query();
        if (! $request->user()->isTeacher()) {
            $query->where('user_id', $request->user()->id);
        }
        return response()->json([
            'stats' => [
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
                'experiments' => 3,
                'safety_items' => count($this->safetyRules()['rules']),
            ],
            'recent_sessions' => $query->latest()->limit(5)->get(),
        ]);
    }

    public function experiments(): JsonResponse
    {
        return response()->json([
            'experiments' => [
                [
                    'id' => 'orientation',
                    'number' => '01',
                    'title' => 'Laboratory orientation',
                    'description' => 'Learn the safety equipment, laboratory conduct, and emergency response workflow.',
                    'type' => 'guided briefing',
                    'duration' => '20 min',
                    'accent' => 'mint',
                ],
                [
                    'id' => 'lane-eynon',
                    'number' => '02',
                    'title' => 'Total sugar analysis',
                    'description' => 'Run a Lane-Eynon volumetric simulation with Fehling standardization and sample titration.',
                    'type' => 'calculation lab',
                    'duration' => '45 min',
                    'accent' => 'amber',
                ],
                [
                    'id' => 'ash',
                    'number' => '03',
                    'title' => 'Ash determination',
                    'description' => 'Calculate mineral residue from crucible and sample weights after controlled incineration.',
                    'type' => 'calculation lab',
                    'duration' => '35 min',
                    'accent' => 'coral',
                ],
            ],
        ]);
    }

    public function safetyRules(): array
    {
        return [
            'rules' => [
                'Wear a clean lab coat, safety glasses, and prescribed protective equipment.',
                'Do not eat, drink, smoke, or store food in chemical refrigerators.',
                'Label every chemical with its name, concentration, preparation date, and student name.',
                'Never pipette by mouth, sniff chemicals directly, or return reagents to stock bottles.',
                'Report accidents, broken apparatus, spills, and maintenance problems immediately.',
                'Use tongs and face or eye protection around hot crucibles, ovens, and furnaces.',
                'Autoclave biological material and dispose of broken glass in the designated bins.',
                'Know the location of emergency exits, phones, showers, eyewash, fire equipment, and first aid.',
            ],
        ];
    }

    public function laneEynon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_name' => ['nullable', 'string', 'max:120'],
            'sample_name' => ['required', 'string', 'max:120'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'aliquot' => ['required', 'numeric', 'gt:0'],
            'standard_factor' => ['required', 'numeric', 'gt:0'],
            'fehling_volume' => ['required', 'numeric', 'gt:0'],
            'sample_volume' => ['required', 'numeric', 'gt:0'],
            'spiked_sugar_percent' => ['nullable', 'numeric', 'min:0'],
            'sample_sugar_percent' => ['nullable', 'numeric', 'min:0'],
            'sugar_added_percent' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($data['sample_volume'] >= $data['fehling_volume']) {
            return response()->json(['message' => 'Sample titration volume must be lower than the Fehling standard volume.'], 422);
        }

        $totalSugar = (($data['fehling_volume'] - $data['sample_volume']) * $data['standard_factor'] * 250 * 100 * 100)
            / ($data['weight'] * $data['aliquot'] * 50);
        $recovery = null;
        if (($data['spiked_sugar_percent'] ?? 0) > 0 && ($data['sugar_added_percent'] ?? 0) > 0) {
            $recovery = (($data['spiked_sugar_percent'] - ($data['sample_sugar_percent'] ?? 0)) * 100) / $data['sugar_added_percent'];
        }

        $session = SimulationSession::create([
            'user_id' => $request->user()->id,
            'student_name' => $request->user()->name,
            'experiment' => 'lane-eynon',
            'sample_name' => $data['sample_name'],
            'status' => 'completed',
            'result' => round($totalSugar, 2),
            'unit' => 'g per 100 g',
            'payload' => $data,
        ]);

        return response()->json([
            'session' => $session,
            'result' => round($totalSugar, 2),
            'recovery' => $recovery === null ? null : round($recovery, 2),
            'accepted' => $recovery === null || ($recovery >= 80 && $recovery <= 110),
            'formula' => '((F - M) x I x 250 x 100 x 100) / (W x A x 50)',
        ], 201);
    }

    public function ash(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_name' => ['nullable', 'string', 'max:120'],
            'sample_name' => ['required', 'string', 'max:120'],
            'crucible_weight' => ['required', 'numeric', 'gt:0'],
            'sample_weight' => ['required', 'numeric', 'gt:0'],
            'ash_weight' => ['required', 'numeric', 'gt:0'],
        ]);

        if ($data['sample_weight'] <= $data['crucible_weight'] || $data['ash_weight'] < $data['crucible_weight']) {
            return response()->json(['message' => 'W2 must be greater than W1 and W3 cannot be below W1.'], 422);
        }

        $ash = (($data['ash_weight'] - $data['crucible_weight']) * 100)
            / ($data['sample_weight'] - $data['crucible_weight']);

        $session = SimulationSession::create([
            'user_id' => $request->user()->id,
            'student_name' => $request->user()->name,
            'experiment' => 'ash',
            'sample_name' => $data['sample_name'],
            'status' => 'completed',
            'result' => round($ash, 1),
            'unit' => 'g per 100 g',
            'payload' => $data,
        ]);

        return response()->json([
            'session' => $session,
            'result' => round($ash, 1),
            'accepted' => $ash >= 0,
            'formula' => '((W3 - W1) x 100) / (W2 - W1)',
        ], 201);
    }

    public function sessions(Request $request): JsonResponse
    {
        $query = SimulationSession::with('user')->latest();
        if (! $request->user()->isTeacher()) {
            $query->where('user_id', $request->user()->id);
        }
        return response()->json(['sessions' => $query->get()]);
    }

    public function teacherSessions(Request $request): JsonResponse
    {
        abort_unless($request->user()->isTeacher(), 403);

        return response()->json(['sessions' => SimulationSession::with('user')->latest()->get()]);
    }
}