/// App configuration — injected at build time via --dart-define-from-file.
///
/// 로컬 개발:
///   1. dart_define.json.example → dart_define.json 복사 후 값 입력
///   2. flutter run --dart-define-from-file=dart_define.json
///      (VS Code 에서는 launch.json 이 자동으로 붙여줌)
class Config {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:8000/ws/chat',
  );

  static void validate() {
    if (supabaseUrl.isEmpty) {
      throw StateError(
        'SUPABASE_URL 이 설정되지 않았습니다.\n'
        'dart_define.json.example 을 복사해 dart_define.json 을 만들고\n'
        'flutter run --dart-define-from-file=dart_define.json 으로 실행하세요.',
      );
    }
    if (supabaseAnonKey.isEmpty) {
      throw StateError('SUPABASE_ANON_KEY 이 설정되지 않았습니다.');
    }
  }
}
