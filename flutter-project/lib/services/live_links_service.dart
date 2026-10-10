import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/build_config.dart';

class LiveLinksService {
  static final LiveLinksService instance = LiveLinksService._internal();
  factory LiveLinksService() => instance;

  LiveLinksService._internal();

  final _urlController = StreamController<String>.broadcast();
  Stream<String> get urlStream => _urlController.stream;

  Timer? _pollTimer;
  String _currentUrl = '';

  String get currentUrl => _currentUrl.isNotEmpty ? _currentUrl : BuildConfig.fallbackGameUrl;

  void startPolling() {
    _pollTimer?.cancel();
    _currentUrl = BuildConfig.fallbackGameUrl;

    final server = BuildConfig.serverUrl;
    final cpath = BuildConfig.contentPath;

    if (server.isEmpty || cpath.isEmpty) return;

    // Check immediately and poll every 30 seconds
    _fetchRemoteConfig();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _fetchRemoteConfig();
    });
  }

  Future<void> _fetchRemoteConfig() async {
    try {
      final server = BuildConfig.serverUrl.replaceAll(RegExp(r'/+$'), '');
      final cpath = BuildConfig.contentPath;
      final uri = Uri.parse('$server/api/rtdb/$cpath/config?t=${DateTime.now().millisecondsSinceEpoch}');

      final resp = await http.get(uri, headers: {
        'User-Agent': 'ZayroFlutterClient/1.0',
        'Accept': 'application/json'
      }).timeout(const Duration(seconds: 10));

      if (resp.statusCode == 200 && resp.body.isNotEmpty) {
        final data = json.decode(resp.body);
        if (data is Map) {
          final newRegister = data['register_url'] ?? data['registerUrl'];
          if (newRegister != null && newRegister.toString().isNotEmpty) {
            final target = newRegister.toString().trim();
            if (target != _currentUrl) {
              _currentUrl = target;
              _urlController.add(_currentUrl);
            }
          }
        }
      }
    } catch (_) {}
  }

  void stop() {
    _pollTimer?.cancel();
  }
}
