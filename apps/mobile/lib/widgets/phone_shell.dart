import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// On a wide Chrome window, frame the UI like a phone. Native builds stay full-screen.
class PhoneShell extends StatelessWidget {
  const PhoneShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!kIsWeb) return child;
    final size = MediaQuery.sizeOf(context);
    if (size.width < 560) return child;

    final height = math.min(844.0, size.height - 48);
    return ColoredBox(
      color: const Color(0xFF111113),
      child: Center(
        child: Container(
          width: 390,
          height: height,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(44),
            border: Border.all(color: const Color(0xFF2C2C2E), width: 10),
            boxShadow: const [
              BoxShadow(color: Color(0x66000000), blurRadius: 48, offset: Offset(0, 18)),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(34),
            child: MediaQuery(
              data: MediaQuery.of(context).copyWith(
                size: Size(370, height - 20),
                padding: const EdgeInsets.only(top: 8, bottom: 12),
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
