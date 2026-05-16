import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/chat_socket.dart';
import '../theme.dart';

const _languages = {'ko': '🇰🇷 한국어', 'ja': '🇯🇵 日本語'};

/// Free Style mode — an open, unstructured chat with the AI companion.
class FreeStyleScreen extends StatefulWidget {
  const FreeStyleScreen({super.key});

  @override
  State<FreeStyleScreen> createState() => _FreeStyleScreenState();
}

class _Msg {
  _Msg({required this.fromUser, required this.text});
  final bool fromUser;
  String text;
}

class _FreeStyleScreenState extends State<FreeStyleScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> _messages = [];

  ChatSocket? _socket;
  String _language = 'ko';
  bool _connected = false;
  bool _busy = false;
  bool _streaming = false;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  @override
  void dispose() {
    _socket?.close();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _connect() {
    final token =
        Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return;
    final socket = ChatSocket(token: token);
    socket.connect().listen(
      _onEvent,
      onError: (_) {
        if (mounted) {
          setState(() {
            _connected = false;
            _busy = false;
          });
        }
      },
    );
    _socket = socket;
    setState(() => _connected = true);
  }

  void _onEvent(ChatEvent event) {
    if (!mounted) return;
    setState(() {
      if (event.type == 'chunk') {
        if (_streaming &&
            _messages.isNotEmpty &&
            !_messages.last.fromUser) {
          _messages.last.text += event.text ?? '';
        } else {
          _messages.add(_Msg(fromUser: false, text: event.text ?? ''));
          _streaming = true;
        }
      } else if (event.type == 'done') {
        _busy = false;
        _streaming = false;
      } else if (event.type == 'error') {
        _busy = false;
        _streaming = false;
        _messages.add(_Msg(fromUser: false, text: '⚠️ ${event.text}'));
      }
    });
    _scrollToBottom();
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty || _busy || _socket == null) return;
    setState(() {
      _messages.add(_Msg(fromUser: true, text: text));
      _busy = true;
      _input.clear();
    });
    _socket!.send(text, _language, 'beginner');
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
    return SakuraScaffold(
      appBar: AppBar(
        title: const Text('Free Style'),
        actions: [
          for (final entry in _languages.entries)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: TextButton(
                onPressed: () => setState(() => _language = entry.key),
                child: Text(
                  entry.value,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: _language == entry.key
                        ? AppColors.purple
                        : AppColors.textLabel,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          _connected
                              ? 'Say anything — chat freely with your '
                                  'companion in ${_languages[_language]}.'
                              : 'Connecting…',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(14),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) => _bubble(_messages[i]),
                    ),
            ),
            _composer(),
          ],
        ),
      ),
    );
  }

  Widget _bubble(_Msg m) {
    return Align(
      alignment: m.fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          gradient: m.fromUser ? kAccentGradient : null,
          color: m.fromUser ? null : Colors.white.withValues(alpha: 0.92),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          m.text,
          style: TextStyle(
            color: m.fromUser ? Colors.white : AppColors.textDark,
            fontSize: 14,
            height: 1.35,
          ),
        ),
      ),
    );
  }

  Widget _composer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _input,
              enabled: _connected,
              decoration: InputDecoration(
                hintText: _connected ? 'Type a message…' : 'Connecting…',
                filled: true,
                fillColor: Colors.white,
                border: const OutlineInputBorder(),
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          GradientButton(
            label: _busy ? '…' : 'Send',
            onPressed: (_connected && !_busy) ? _send : null,
          ),
        ],
      ),
    );
  }
}
