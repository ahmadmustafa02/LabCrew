import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.status});
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.baseUrl, this.token});

  String baseUrl;
  String? token;

  Uri _uri(String path) {
    final root = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    return Uri.parse('$root$path');
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Future<Map<String, dynamic>> _json(
    String method,
    String path, {
    Object? body,
  }) async {
    final uri = _uri(path);
    late http.Response res;
    try {
      switch (method) {
        case 'GET':
          res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 20));
        case 'POST':
          res = await http
              .post(uri, headers: _headers, body: body == null ? null : jsonEncode(body))
              .timeout(const Duration(seconds: 25));
        default:
          throw ApiException('Unsupported method');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Cannot reach the lab server. Check the URL and your connection.');
    }

    Map<String, dynamic> decoded = {};
    if (res.body.isNotEmpty) {
      try {
        decoded = jsonDecode(res.body) as Map<String, dynamic>;
      } catch (_) {
        throw ApiException('The server sent an unexpected response.', status: res.statusCode);
      }
    }
    if (res.statusCode >= 400) {
      throw ApiException(
        decoded['error'] as String? ?? 'Request failed (${res.statusCode})',
        status: res.statusCode,
      );
    }
    return decoded;
  }

  Future<({FieldUser user, String token, String? tokenId})> login({
    required String email,
    required String password,
    required String deviceName,
  }) async {
    final data = await _json('POST', '/api/auth/mobile/login', body: {
      'email': email,
      'password': password,
      'deviceName': deviceName,
    });
    final user = FieldUser.fromJson(data['user'] as Map<String, dynamic>);
    return (
      user: user,
      token: data['token'] as String,
      tokenId: data['tokenId'] as String?,
    );
  }

  Future<HomePayload> home() async {
    final data = await _json('GET', '/api/portal/home');
    return HomePayload.fromJson(data);
  }

  Future<List<FieldTask>> assignments() async {
    final data = await _json('GET', '/api/assignments');
    return (data['assignments'] as List<dynamic>? ?? [])
        .map((e) => FieldTask.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<FieldTask> assignment(String id) async {
    final data = await _json('GET', '/api/assignments/$id');
    return FieldTask.fromJson(data['assignment'] as Map<String, dynamic>);
  }

  Future<({List<Map<String, String>> rows, DateTime? updatedAt, bool acceptData})> submission(
    String assignmentId,
  ) async {
    final data = await _json('GET', '/api/assignments/$assignmentId/submit');
    final table = data['dataTable'] as Map<String, dynamic>?;
    final rows = <Map<String, String>>[];
    if (table != null) {
      final rawRows = table['rows'] as List<dynamic>? ?? [];
      for (final row in rawRows) {
        final map = row as Map<String, dynamic>;
        final values = map['values'] as Map<String, dynamic>? ?? map;
        rows.add(values.map((k, v) => MapEntry(k, '${v ?? ''}')));
      }
    }
    final sub = data['submission'] as Map<String, dynamic>?;
    return (
      rows: rows,
      updatedAt: sub?['updatedAt'] != null ? DateTime.tryParse(sub!['updatedAt'].toString()) : null,
      acceptData: data['acceptData'] == true,
    );
  }

  Future<void> submitRows({
    required String assignmentId,
    required List<Map<String, String>> rows,
    required bool asDraft,
  }) async {
    await _json('POST', '/api/assignments/$assignmentId/submit', body: {
      'status': asDraft ? 'DRAFT' : 'SUBMITTED',
      'dataRows': rows,
      'writeup': asDraft ? 'Field draft from LabCrew Field' : 'Submitted from LabCrew Field',
    });
  }

  Future<List<CohortColumn>> cohort(String assignmentId) async {
    final data = await _json('GET', '/api/assignments/$assignmentId/cohort-data');
    final columns = (data['columns'] as List<dynamic>? ?? []);
    final count = (data['contributorCount'] as num?)?.toInt() ?? 0;
    return columns.map((e) {
      final map = Map<String, dynamic>.from(e as Map);
      map['contributorCount'] = count;
      return CohortColumn.fromJson(map);
    }).toList();
  }
}
