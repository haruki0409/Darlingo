import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/message.dart';
import '../services/chat_socket.dart';

const _languages = {'ko': '🇰🇷 한국어', 'ja': '🇯🇵 日本語'};
const _levels = ['beginner', 'intermediate', 'advanced'];

/// The companion chat screen: streaming messages over a WebSocket.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<Message> _messages = [];

  ChatSocket? _socket;
  String _language = 'ko';
  String _level = 'beginner';
  bool _busy = false;

  /// Language/level lock once the conversation has started.
  bool get _started => _messages.isNotEmpty;

  @override
  void dispose() {
    _socket?.close();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _ensureSocket() {
    if (_socket != null) return;
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return;
    final socket = ChatSocket(token: token);
    socket.connect().listen(
      _onEvent,
      onError: (_) => setState(() => _busy = false),
    );
    _socket = socket;
  }

  void _onEvent(ChatEvent event) {
    setState(() {
      if (event.type == 'chunk') {
        final last = _messages.isNotEmpty ? _messages.last : null;
        if (last != null && last.role == Role.companion && last.streaming) {
          last.text += event.text!;
        } else {
          _messages.add(Message(
            role: Role.companion,
            text: event.text!,
            streaming: true,
          ));
        }
      } else if (event.type == 'done') {
        _busy = false;
        for (final m in _messages) {
          m.streaming = false;
        }
      } else if (event.type == 'error') {
        _busy = false;
        _messages.add(Message(
          role: Role.companion,
          text: '⚠️ ${event.text}',
        ));
      }
      // 'conversation' carries the conversation id; unused in Phase 1.
    });
    _scrollToBottom();
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    _ensureSocket();
    if (_socket == null) return;
    setState(() {
      _messages.add(Message(role: Role.user, text: text));
      _busy = true;
      _input.clear();
    });
    _socket!.send(text, _language, _level);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('LingoDarling'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => Supabase.instance.client.auth.signOut(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                DropdownButton<String>(
                  value: _language,
                  onChanged:
                      _started ? null : (v) => setState(() => _language = v!),
                  items: _languages.entries
                      .map((e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ))
                      .toList(),
                ),
                const SizedBox(width: 12),
                DropdownButton<String>(
                  value: _level,
                  onChanged:
                      _started ? null : (v) => setState(() => _level = v!),
                  items: _levels
                      .map((l) =>
                          DropdownMenuItem(value: l, child: Text(l)))
                      .toList(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'Pick a language and level, then say hello to your '
                        'companion. The settings lock once the chat starts.',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (context, i) => _bubble(_messages[i]),
                  ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    decoration: const InputDecoration(
                      hintText: 'Type a message…',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _busy ? null : _send,
                  child: const Text('Send'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bubble(Message m) {
    final isUser = m.role == Role.user;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: isUser ? Colors.indigo : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          m.streaming ? '${m.text} ▌' : m.text,
          style: TextStyle(color: isUser ? Colors.white : Colors.black87),
        ),
      ),
    );
  }
}
