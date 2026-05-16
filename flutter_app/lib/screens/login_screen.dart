import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  late final AnimationController _heartCtrl;

  @override
  void initState() {
    super.initState();
    _heartCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  Future<void> _submit({required bool signUp}) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = Supabase.instance.client.auth;
      if (signUp) {
        await auth.signUp(email: _email.text.trim(), password: _password.text);
      } else {
        await auth.signInWithPassword(
          email: _email.text.trim(),
          password: _password.text,
        );
      }
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _heartCtrl.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 벚꽃 그라디언트 배경
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFE4F0), // 연한 벚꽃
                  Color(0xFFFFD6E8), // 핑크
                  Color(0xFFE8D5F2), // 라일락
                  Color(0xFFD4E4FF), // 연하늘
                ],
              ),
            ),
          ),
          // 떠다니는 장식 (사쿠라/한글)
          const Positioned(
            top: 60,
            left: 24,
            child: _FloatingChar('桜', Color(0xFFFF9EC7), 28),
          ),
          const Positioned(
            top: 110,
            right: 32,
            child: _FloatingChar('💕', null, 24),
          ),
          const Positioned(
            top: 220,
            left: 16,
            child: _FloatingChar('사', Color(0xFFC89BEE), 22),
          ),
          const Positioned(
            bottom: 140,
            right: 20,
            child: _FloatingChar('恋', Color(0xFFFF8FB8), 26),
          ),
          const Positioned(
            bottom: 80,
            left: 28,
            child: _FloatingChar('랑', Color(0xFFB089E6), 24),
          ),
          // 메인 콘텐츠
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 380),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 24),
                      // 두근거리는 하트 아바타
                      ScaleTransition(
                        scale: Tween(begin: 0.95, end: 1.05).animate(
                          CurvedAnimation(
                              parent: _heartCtrl, curve: Curves.easeInOut),
                        ),
                        child: Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFF7AAD), Color(0xFFB565E8)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFFF7AAD).withOpacity(0.5),
                                blurRadius: 28,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.favorite_rounded,
                            color: Colors.white,
                            size: 48,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      // 앱 이름
                      ShaderMask(
                        shaderCallback: (b) => const LinearGradient(
                          colors: [Color(0xFFFF6BA0), Color(0xFFA94BE0)],
                        ).createShader(b),
                        child: const Text(
                          'LingoDarling',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.8,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // 한일 교차 태그라인
                      const Text(
                        '두근두근 ・ ドキドキ',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFB066C9),
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '연애로 배우는 한국어 × 일본어',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8A6A9E),
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 32),
                      // 로그인 카드
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.78),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.9),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFB565E8).withOpacity(0.15),
                              blurRadius: 30,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(bottom: 18, left: 4),
                              child: Text(
                                '어서와요 ♡ お帰りなさい',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF5C3A6E),
                                ),
                              ),
                            ),
                            _buildField(
                              controller: _email,
                              label: '이메일 / メール',
                              icon: Icons.mail_rounded,
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 14),
                            _buildField(
                              controller: _password,
                              label: '비밀번호 / パスワード',
                              icon: Icons.lock_rounded,
                              obscure: true,
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFE0E8),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.sentiment_dissatisfied_rounded,
                                        color: Color(0xFFD64C7A), size: 18),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style: const TextStyle(
                                          color: Color(0xFFB83968),
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 22),
                            // 로그인 버튼
                            GestureDetector(
                              onTap:
                                  _busy ? null : () => _submit(signUp: false),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                height: 54,
                                decoration: BoxDecoration(
                                  gradient: _busy
                                      ? null
                                      : const LinearGradient(
                                          colors: [
                                            Color(0xFFFF6BA0),
                                            Color(0xFFA94BE0),
                                          ],
                                          begin: Alignment.centerLeft,
                                          end: Alignment.centerRight,
                                        ),
                                  color: _busy ? const Color(0xFFE8DFF0) : null,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: _busy
                                      ? null
                                      : [
                                          BoxShadow(
                                            color: const Color(0xFFFF6BA0)
                                                .withOpacity(0.4),
                                            blurRadius: 16,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                ),
                                alignment: Alignment.center,
                                child: _busy
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: Color(0xFFB066C9),
                                        ),
                                      )
                                    : const Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.favorite_rounded,
                                              color: Colors.white, size: 18),
                                          SizedBox(width: 8),
                                          Text(
                                            '시작하기 ・ はじめる',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 15,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            // 회원가입 버튼
                            TextButton(
                              onPressed:
                                  _busy ? null : () => _submit(signUp: true),
                              style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFFA94BE0),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: const BorderSide(
                                    color: Color(0xFFE0C8F5),
                                    width: 1.5,
                                  ),
                                ),
                              ),
                              child: const Text(
                                '처음이에요 ・ 新規登録',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13.5,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      // 하단 푸터
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _LangChip('한국어', Color(0xFFFF8FB8)),
                          SizedBox(width: 10),
                          Icon(Icons.swap_horiz_rounded,
                              color: Color(0xFFB066C9), size: 18),
                          SizedBox(width: 10),
                          _LangChip('日本語', Color(0xFFB565E8)),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      style: const TextStyle(
        fontSize: 14.5,
        color: Color(0xFF3D2548),
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          color: Color(0xFFA68BB8),
          fontSize: 13.5,
          fontWeight: FontWeight.w500,
        ),
        prefixIcon: Icon(icon, color: const Color(0xFFC89BEE), size: 20),
        filled: true,
        fillColor: const Color(0xFFFAF4FF),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFB565E8), width: 1.8),
        ),
      ),
    );
  }
}

class _FloatingChar extends StatelessWidget {
  final String text;
  final Color? color;
  final double size;
  const _FloatingChar(this.text, this.color, this.size);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: size,
        color: color?.withOpacity(0.55),
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _LangChip extends StatelessWidget {
  final String label;
  final Color color;
  const _LangChip(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
