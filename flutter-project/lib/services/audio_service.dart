import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_tts/flutter_tts.dart';

class AudioService {
  static final AudioService instance = AudioService._internal();
  factory AudioService() => instance;

  AudioService._internal() {
    _initTts();
  }

  final AudioPlayer _player = AudioPlayer();
  final FlutterTts _tts = FlutterTts();

  bool _gatePassed = false;
  int _lastRegisterSoundTime = 0;

  void markLoginPassed() {
    _gatePassed = true;
  }

  void _initTts() async {
    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
    } catch (_) {}
  }

  Future<void> speak(String text) async {
    try {
      if (text.trim().isEmpty) return;
      await _tts.stop();
      await _tts.speak(text);
    } catch (_) {}
  }

  bool _isBlockedByGate(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.contains('successful') ||
        lower.contains('lowbalance') ||
        lower.contains('low_deposit') ||
        lower.contains('deposit')) {
      return !_gatePassed;
    }
    if (lower.contains('register')) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - _lastRegisterSoundTime < 10000) return true;
      _lastRegisterSoundTime = now;
    }
    return false;
  }

  Future<void> playSound(String soundName) async {
    try {
      String clean = soundName.trim();
      if (clean.isEmpty) return;

      // Handle aliased or virtual sound routes
      if (clean.toLowerCase() == 'loginw.mp3') {
        clean = 'bypass.mp3';
      }
      if (clean.toLowerCase() == 'big.mp3') {
        await speak('Big');
        return;
      }
      if (clean.toLowerCase() == 'small.mp3') {
        await speak('Small');
        return;
      }

      if (_isBlockedByGate(clean)) return;

      // Stop current playback
      await _player.stop();

      // Asset source path
      final assetPath = 'media/$clean';
      await _player.play(AssetSource(assetPath));
    } catch (_) {}
  }

  Future<void> stopSound() async {
    try {
      await _player.stop();
      await _tts.stop();
    } catch (_) {}
  }

  void dispose() {
    _player.dispose();
    _tts.stop();
  }
}
