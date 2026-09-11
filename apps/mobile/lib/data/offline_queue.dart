import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../api/models.dart';

class OfflineQueue {
  static const _key = 'labcrew.field.drafts';

  Future<Map<String, OfflineDraft>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return {};
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return map.map((k, v) => MapEntry(k, OfflineDraft.fromJson(v as Map<String, dynamic>)));
  }

  Future<void> save(Map<String, OfflineDraft> drafts) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(drafts.map((k, v) => MapEntry(k, v.toJson()))),
    );
  }
}
