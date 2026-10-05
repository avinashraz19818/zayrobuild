import 'dart:convert';

class BuildConfig {
  static const int _xorKey = 0x5A;

  // Masked byte arrays replaced by flutterbuilder.js at build time
  static const List<int> _serverUrlM = [0, 0];
  static const List<int> _contentPathM = [0, 0];
  static const List<int> _fallbackGameUrlM = [0, 0];
  static const List<int> _keyFragDart = [0];
  static const String _keySalt = '@KEY_SALT@';
  static const String _keyId = '@KEY_ID@';
  static const List<String> certPins = [];
  static const String snapshotAppName = 'App';
  static const String snapshotBrandTitle = 'APP';
  static const int snapshotMinDeposit = 300;
  static const String snapshotPrimary = '#ff1e1e';
  static const String snapshotDesignKey = 'default';

  static String _unmask(List<int> bytes) {
    if (bytes.isEmpty || (bytes.length == 2 && bytes[0] == 0 && bytes[1] == 0)) {
      return '';
    }
    final unmasked = bytes.map((b) => (b ^ _xorKey) & 0xFF).toList();
    try {
      return utf8.decode(unmasked);
    } catch (_) {
      return String.fromCharCodes(unmasked);
    }
  }

  static String get serverUrl => _unmask(_serverUrlM);
  static String get contentPath => _unmask(_contentPathM);
  static String get fallbackGameUrl => _unmask(_fallbackGameUrlM);
  static List<int> get keyFragDart => _keyFragDart;
  static String get keySalt => _keySalt;
  static String get keyId => _keyId;
  static String get appName => snapshotAppName;
  static String get brandTitle => snapshotBrandTitle;
  static int get minDeposit => snapshotMinDeposit;
  static String get themeColor => snapshotPrimary;
  static String get designKey => snapshotDesignKey;
}
