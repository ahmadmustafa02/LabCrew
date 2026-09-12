import 'package:flutter_test/flutter_test.dart';
import 'package:labcrew_field/main.dart';

void main() {
  testWidgets('login screen shows field headline', (tester) async {
    await tester.pumpWidget(const LabCrewFieldApp());
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Field'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Continue as guest'), findsOneWidget);
  });
}
