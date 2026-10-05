import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter/services.dart';
import '../config/build_config.dart';

class CryptoService {
  static const List<int> _marker = [
    0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE
  ];
  static const String _fixedPassword = 'zayroavi@132';

  /// Derive AES key via PBKDF2-HMAC-SHA256
  static Uint8List _pbkdf2Sha256(String password, Uint8List salt, int iterations, int keyLength) {
    final passwordBytes = utf8.encode(password);
    final hmac = Hmac(sha256, passwordBytes);
    final numBlocks = (keyLength + 31) ~/ 32;
    final derivedKey = Uint8List(keyLength);
    int offset = 0;

    for (int block = 1; block <= numBlocks; block++) {
      final blockBytes = Uint8List(salt.length + 4);
      blockBytes.setRange(0, salt.length, salt);
      blockBytes[salt.length] = (block >> 24) & 0xFF;
      blockBytes[salt.length + 1] = (block >> 16) & 0xFF;
      blockBytes[salt.length + 2] = (block >> 8) & 0xFF;
      blockBytes[salt.length + 3] = block & 0xFF;

      Uint8List u = Uint8List.fromList(hmac.convert(blockBytes).bytes);
      final t = Uint8List.fromList(u);

      for (int iter = 1; iter < iterations; iter++) {
        u = Uint8List.fromList(hmac.convert(u).bytes);
        for (int k = 0; k < t.length; k++) {
          t[k] ^= u[k];
        }
      }

      final copyLen = (derivedKey.length - offset < 32) ? (derivedKey.length - offset) : 32;
      derivedKey.setRange(offset, offset + copyLen, t.sublist(0, copyLen));
      offset += copyLen;
    }
    return derivedKey;
  }

  /// Decrypts encrypted HTML bytes (format: MARKER[8] | salt[16] | iv[16] | AES_ENC | padding[64])
  static String? decryptHtml(Uint8List data, {String? customPassword}) {
    try {
      final password = customPassword ?? _fixedPassword;
      int markerPos = -1;
      for (int i = 0; i <= data.length - 8; i++) {
        bool match = true;
        for (int j = 0; j < 8; j++) {
          if (data[i + j] != _marker[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          markerPos = i;
          break;
        }
      }

      if (markerPos < 0) return null;

      final salt = data.sublist(markerPos + 8, markerPos + 24);
      final ivBytes = data.sublist(markerPos + 24, markerPos + 40);
      final cipherBytes = data.sublist(markerPos + 40, data.length - 64);

      final keyBytes = _pbkdf2Sha256(password, salt, 100000, 32);

      final key = enc.Key(keyBytes);
      final iv = enc.IV(ivBytes);
      final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc, padding: 'PKCS7'));

      final decrypted = encrypter.decrypt(enc.Encrypted(cipherBytes), iv: iv);
      return decrypted;
    } catch (e) {
      return null;
    }
  }

  /// Loads and decrypts loading.bin from assets
  static Future<String?> loadAssetLoadingHtml() async {
    try {
      final byteData = await rootBundle.load('assets/loading.bin');
      final bytes = byteData.buffer.asUint8List();
      return decryptHtml(bytes);
    } catch (_) {
      return null;
    }
  }
}
