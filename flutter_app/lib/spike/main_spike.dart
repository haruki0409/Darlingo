// Phase-1 spike entrypoint. THROWAWAY — isolated from the real app.
//
//   flutter run -t lib/spike/main_spike.dart
//
// This does NOT import lib/main.dart or any app code, so it cannot affect the
// production app. Delete lib/spike/ once Phase 1 is signed off.
import 'package:flutter/material.dart';

import 'avatar_spike_screen.dart';

void main() {
  runApp(
    const MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Avatar Spike',
      home: AvatarSpikeScreen(),
    ),
  );
}
