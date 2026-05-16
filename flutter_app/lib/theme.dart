import 'package:flutter/material.dart';

/// The "Sakura Romance" visual theme, extracted from the login screen so the
/// whole app shares one look: soft pink → purple → blue pastels, glassy
/// translucent rounded cards, and gradient buttons with a soft glow.

abstract class AppColors {
  // Background gradient stops (diagonal, top-left → bottom-right).
  static const bg1 = Color(0xFFFFE4F0); // light sakura
  static const bg2 = Color(0xFFFFD6E8); // pink
  static const bg3 = Color(0xFFE8D5F2); // lilac
  static const bg4 = Color(0xFFD4E4FF); // light sky

  // Pink → purple accents.
  static const pink = Color(0xFFFF6BA0);
  static const purple = Color(0xFFA94BE0);
  static const pinkSoft = Color(0xFFFF8FB8);
  static const purpleSoft = Color(0xFFB565E8);
  static const lilac = Color(0xFFC89BEE);

  // Text.
  static const textDark = Color(0xFF3D2548);
  static const textHeading = Color(0xFF5C3A6E);
  static const textMuted = Color(0xFF8A6A9E);
  static const textLabel = Color(0xFFA68BB8);

  // Surfaces.
  static const fieldFill = Color(0xFFFAF4FF);
  static const disabled = Color(0xFFE8DFF0);

  // Error.
  static const errorBg = Color(0xFFFFE0E8);
  static const errorText = Color(0xFFB83968);
}

/// The app-wide background gradient.
const kBgGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [AppColors.bg1, AppColors.bg2, AppColors.bg3, AppColors.bg4],
);

/// The pink → purple accent gradient used on primary buttons.
const kAccentGradient = LinearGradient(
  colors: [AppColors.pink, AppColors.purple],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
);

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.bg1,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.purple,
      primary: AppColors.purple,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      foregroundColor: AppColors.textHeading,
      titleTextStyle: TextStyle(
        color: AppColors.textHeading,
        fontSize: 18,
        fontWeight: FontWeight.w800,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.fieldFill,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: const TextStyle(
        color: AppColors.textLabel,
        fontSize: 13.5,
        fontWeight: FontWeight.w500,
      ),
      hintStyle: const TextStyle(color: AppColors.textLabel),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.purpleSoft, width: 1.8),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}

/// A Scaffold whose body sits on the shared sakura gradient background.
class SakuraScaffold extends StatelessWidget {
  const SakuraScaffold({super.key, this.appBar, required this.body});

  final PreferredSizeWidget? appBar;
  final Widget body;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: appBar,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: kBgGradient),
        child: body,
      ),
    );
  }
}

/// A translucent, softly shadowed rounded card.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.80),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.9),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.purpleSoft.withValues(alpha: 0.15),
            blurRadius: 26,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

/// The pink → purple gradient primary button used across the app.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    return GestureDetector(
      onTap: enabled ? onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 54,
        decoration: BoxDecoration(
          gradient: enabled ? kAccentGradient : null,
          color: enabled ? null : AppColors.disabled,
          borderRadius: BorderRadius.circular(16),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: AppColors.pink.withValues(alpha: 0.4),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// A small section heading used on forms.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18, bottom: 6, left: 2),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          color: AppColors.textHeading,
          fontSize: 13.5,
        ),
      ),
    );
  }
}
