/// App configuration, supplied at build time via --dart-define.
///
/// Example:
///   flutter run \
///     --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///     --dart-define=SUPABASE_ANON_KEY=your_anon_key \
///     --dart-define=WS_URL=ws://localhost:8000/ws/chat
class Config {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Backend chat WebSocket endpoint.
  static const wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:8000/ws/chat',
  );
}
