enum Role { user, companion }

/// A single chat message. [text] and [streaming] are mutable so companion
/// tokens can be appended as they arrive over the WebSocket.
class Message {
  Message({
    required this.role,
    required this.text,
    this.streaming = false,
  });

  final Role role;
  String text;
  bool streaming;
}
