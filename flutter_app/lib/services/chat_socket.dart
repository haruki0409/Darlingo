import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config.dart';

/// An event streamed back from the backend chat WebSocket.
class ChatEvent {
  ChatEvent.chunk(this.text)
      : type = 'chunk',
        conversationId = null;
  ChatEvent.done()
      : type = 'done',
        text = null,
        conversationId = null;
  ChatEvent.conversation(this.conversationId)
      : type = 'conversation',
        text = null;
  ChatEvent.error(this.text)
      : type = 'error',
        conversationId = null;

  final String type;
  final String? text;
  final String? conversationId;
}

/// Wraps the chat WebSocket: connect, send messages, receive [ChatEvent]s.
///
/// The Supabase JWT is passed as a query param because browsers cannot set
/// headers on WebSocket connections.
class ChatSocket {
  ChatSocket({required this.token, this.conversationId});

  final String token;
  final String? conversationId;
  WebSocketChannel? _channel;

  Stream<ChatEvent> connect() {
    var url = '${Config.wsUrl}?token=$token';
    if (conversationId != null) {
      url += '&conversation_id=$conversationId';
    }
    final channel = WebSocketChannel.connect(Uri.parse(url));
    _channel = channel;

    return channel.stream.map((raw) {
      final data = jsonDecode(raw as String) as Map<String, dynamic>;
      return switch (data['type']) {
        'conversation' => ChatEvent.conversation(data['id'] as String),
        'chunk' => ChatEvent.chunk(data['text'] as String),
        'done' => ChatEvent.done(),
        _ => ChatEvent.error(data['text'] as String? ?? 'Unknown error'),
      };
    });
  }

  void send(String message, String language, String level) {
    _channel?.sink.add(jsonEncode({
      'message': message,
      'language': language,
      'level': level,
    }));
  }

  void close() {
    _channel?.sink.close();
  }
}
