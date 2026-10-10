import 'dart:async';
import 'package:audioplayers/audioplayers.dart';

// AudioService: Centralized MP3 playback engine with strict zero-overlap control.
// Handles admin MP3 library sounds, deposit sounds, intro, gate checks & deduplication.
class AudioService {
  static final AudioService instance = AudioService._internal();
  factory AudioService() => instance;

  final AudioPlayer _player = AudioPlayer();
  final StreamController<String> _completionController = StreamController<String>.broadcast();

  Stream<String> get onSoundComplete => _completionController.stream;

  bool _gatePassed = false;
  int _lastRegisterSoundTime = 0;
  String _currentlyPlaying = '';
  int _lastPlayTime = 0;

  AudioService._internal() {
    _initPlayer();
  }

  void _initPlayer() {
    try {
      _player.setReleaseMode(ReleaseMode.stop);
      _player.setPlayerMode(PlayerMode.lowLatency);
      _player.onPlayerComplete.listen((_) {
        final finished = _currentlyPlaying;
        _currentlyPlaying = '';
        if (finished.isNotEmpty) {
          _completionController.add(finished);
        }
      });
      _player.onPlayerStateChanged.listen((state) {
        if (state == PlayerState.stopped) {
          _currentlyPlaying = '';
        }
      });
    } catch (_) {}
  }

  void markLoginPassed() {
    _gatePassed = true;
  }

  // Voice (TTS) no-op shim so legacy JS bridge calls don't fail
  Future<void> speak(String text) async {}

  bool _isBlockedByGate(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.contains('register')) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - _lastRegisterSoundTime < 3000) return true;
      _lastRegisterSoundTime = now;
    }
    return false;
  }

  String _cleanFileName(String input) {
    String name = input.trim();
    if (name.isEmpty) return '';
    if (name.contains('/')) {
      name = name.split('/').last;
    }
    if (name.contains('\\')) {
      name = name.split('\\').last;
    }
    name = name.trim();
    if (name.isEmpty) return '';
    final lower = name.toLowerCase();
    if (lower == 'loginw.mp3' || lower == 'loginw') {
      return 'bypass.mp3';
    }
    if (!lower.endsWith('.mp3')) {
      name = '$name.mp3';
    }
    return name;
  }

  Future<void> playSound(String soundName) async {
    try {
      final clean = _cleanFileName(soundName);
      if (clean.isEmpty) return;

      if (_isBlockedByGate(clean)) return;

      final now = DateTime.now().millisecondsSinceEpoch;

      // Deduplication: If the EXACT same sound was triggered less than 400ms ago, ignore spam
      if (clean == _currentlyPlaying && (now - _lastPlayTime) < 400) {
        return;
      }

      _lastPlayTime = now;

      // ── STRICT OVERLAP PREVENTION ──
      // Always stop any currently playing audio track before starting a new one.
      await _player.stop();

      _currentlyPlaying = clean;
      final assetPath = 'media/$clean';
      await _player.play(AssetSource(assetPath));
    } catch (_) {
      _currentlyPlaying = '';
    }
  }

  Future<void> stopSound() async {
    try {
      _currentlyPlaying = '';
      await _player.stop();
    } catch (_) {}
  }

  void stopIfPlaying(String soundName) {
    final clean = _cleanFileName(soundName);
    if (_currentlyPlaying.toLowerCase() == clean.toLowerCase()) {
      stopSound();
    }
  }

  String get currentlyPlaying => _currentlyPlaying;

  void dispose() {
    _player.dispose();
    _completionController.close();
  }
}
