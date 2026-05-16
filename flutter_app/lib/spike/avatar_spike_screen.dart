import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

/// Phase-1 spike screen. THROWAWAY — not part of the real app flow.
///
/// Run it on its own with:
///   flutter run -t lib/spike/main_spike.dart
///
/// Pass criteria (see the on-screen log):
///   1. A 3D head renders in the WebView.
///   2. The log shows "JS▶ MORPHS(...)" — Flutter is receiving JS messages.
///   3. Tapping "Test lip-sync" makes the jaw track the sound.
///   4. Emotion buttons visibly change the face.
class AvatarSpikeScreen extends StatefulWidget {
  const AvatarSpikeScreen({super.key});

  @override
  State<AvatarSpikeScreen> createState() => _AvatarSpikeScreenState();
}

class _AvatarSpikeScreenState extends State<AvatarSpikeScreen> {
  late final WebViewController _controller;
  final List<String> _log = [];
  bool _pageLoaded = false;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF1A1430))
      ..addJavaScriptChannel(
        'FlutterBridge',
        onMessageReceived: (msg) => _addLog('JS▶ ${msg.message}'),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            _addLog('page loaded');
            if (mounted) setState(() => _pageLoaded = true);
          },
          onWebResourceError: (e) =>
              _addLog('WEBVIEW ERR: ${e.description} (${e.errorCode})'),
        ),
      )
      ..loadFlutterAsset('assets/spike/avatar.html');

    // Android: allow the AnalyserNode audio to start without a touch gesture
    // inside the WebView (the trigger is a Flutter button, not a DOM event).
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
    }
  }

  void _addLog(String s) {
    if (!mounted) return;
    setState(() {
      _log.insert(0, s);
      if (_log.length > 40) _log.removeLast();
    });
  }

  Future<void> _js(String code) async {
    try {
      await _controller.runJavaScript(code);
    } catch (e) {
      _addLog('runJavaScript ERR: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Avatar Spike — Phase 1'),
        backgroundColor: const Color(0xFF1A1430),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(flex: 4, child: WebViewWidget(controller: _controller)),
          Container(
            color: Colors.black,
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _btn('Test lip-sync', 'spikePlayTestAudio()'),
                _btn('Happy', "spikeSetEmotion('happy')"),
                _btn('Sad', "spikeSetEmotion('sad')"),
                _btn('Surprised', "spikeSetEmotion('surprised')"),
                _btn('Neutral', "spikeSetEmotion('neutral')"),
                _btn('List morphs', 'spikeListMorphs()'),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              color: const Color(0xFF0E0E0E),
              child: ListView(
                padding: const EdgeInsets.all(8),
                children: [
                  for (final line in _log)
                    Text(
                      line,
                      style: TextStyle(
                        color: line.contains('ERR')
                            ? Colors.redAccent
                            : Colors.greenAccent,
                        fontFamily: 'monospace',
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _btn(String label, String jsCall) => ElevatedButton(
        onPressed: _pageLoaded ? () => _js(jsCall) : null,
        child: Text(label),
      );
}
