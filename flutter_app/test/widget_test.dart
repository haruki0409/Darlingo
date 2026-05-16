import 'package:flutter_test/flutter_test.dart';

import 'package:lingo_darling/models/message.dart';

void main() {
  test('streamed companion tokens append to the message text', () {
    final message = Message(
      role: Role.companion,
      text: '안녕',
      streaming: true,
    );

    // Simulate two streamed chunks arriving over the WebSocket.
    message.text += '하세요';
    message.text += '!';

    expect(message.text, '안녕하세요!');
    expect(message.role, Role.companion);

    message.streaming = false;
    expect(message.streaming, isFalse);
  });
}
