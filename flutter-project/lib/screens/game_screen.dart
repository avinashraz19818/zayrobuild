import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/build_config.dart';
import '../services/audio_service.dart';
import '../services/crypto_service.dart';
import '../services/live_links_service.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  String _currentUrl = '';
  String? _splashHtml;

  final Set<String> _paymentKeywords = {
    'razorpay', 'cashfree', 'payu.com', 'ccavenue', 'billdesk', 'instamojo',
    'checkout', '/gateway', 'gateway/', 'gateway.', 'paytm.com', 'phonepe.com',
    'bharatpe', 'arpay', 'dhaniwin', 'usdt', '/pg/', '/pay/', '/pay?',
    'pay.html', 'payment.php', 'upi://', '/payment/'
  };

  @override
  void initState() {
    super.initState();
    _currentUrl = BuildConfig.fallbackGameUrl;

    // 1. Play intro sound immediately on startup
    AudioService.instance.playSound('intro.mp3');

    // 2. Load decrypted loading/splash HTML if present
    _loadSplashHtml();

    // 3. Start live link watchdog
    LiveLinksService.instance.startPolling();
    LiveLinksService.instance.urlStream.listen((updatedUrl) {
      if (mounted && updatedUrl.isNotEmpty && updatedUrl != _currentUrl) {
        setState(() {
          _currentUrl = updatedUrl;
        });
        _webViewController?.loadUrl(
          urlRequest: URLRequest(url: WebUri(_currentUrl)),
        );
      }
    });
  }

  void _loadSplashHtml() async {
    final html = await CryptoService.loadAssetLoadingHtml();
    if (html != null && mounted) {
      setState(() {
        _splashHtml = html;
      });
    }
  }

  bool _isPaymentUrl(String url) {
    final lower = url.toLowerCase();
    for (final kw in _paymentKeywords) {
      if (lower.contains(kw)) return true;
    }
    return false;
  }

  bool _isExternalScheme(String url) {
    final lower = url.toLowerCase();
    return lower.startsWith('upi:') ||
        lower.startsWith('intent:') ||
        lower.startsWith('phonepe:') ||
        lower.startsWith('paytmmp:') ||
        lower.startsWith('tez:') ||
        lower.startsWith('gpay:') ||
        lower.startsWith('whatsapp:') ||
        lower.startsWith('tel:') ||
        lower.startsWith('mailto:');
  }

  Future<void> _handleExternalUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            InAppWebView(
              initialUrlRequest: _currentUrl.isNotEmpty
                  ? URLRequest(url: WebUri(_currentUrl))
                  : null,
              initialSettings: InAppWebViewSettings(
                javaScriptEnabled: true,
                domStorageEnabled: true,
                databaseEnabled: true,
                allowFileAccessFromFileURLs: true,
                allowUniversalAccessFromFileURLs: true,
                mixedContentMode: MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                mediaPlaybackRequiresUserGesture: false,
                supportMultipleWindows: true,
                useWideViewPort: true,
                loadWithOverviewMode: true,
                userAgent:
                    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
              ),
              onWebViewCreated: (controller) {
                _webViewController = controller;

                // ── JS Bridge: window.ZAYRO ──
                controller.addJavaScriptHandler(
                  handlerName: 'playSound',
                  callback: (args) {
                    if (args.isNotEmpty) {
                      AudioService.instance.playSound(args[0].toString());
                    }
                  },
                );

                controller.addJavaScriptHandler(
                  handlerName: 'speak',
                  callback: (args) {
                    if (args.isNotEmpty) {
                      AudioService.instance.speak(args[0].toString());
                    }
                  },
                );

                controller.addJavaScriptHandler(
                  handlerName: 'stopSound',
                  callback: (args) {
                    AudioService.instance.stopSound();
                  },
                );

                controller.addJavaScriptHandler(
                  handlerName: 'openExternal',
                  callback: (args) {
                    if (args.isNotEmpty) {
                      _handleExternalUrl(args[0].toString());
                    }
                  },
                );

                controller.addJavaScriptHandler(
                  handlerName: 'retryContent',
                  callback: (args) {
                    controller.reload();
                  },
                );
              },
              onLoadStart: (controller, url) {
                final urlStr = url?.toString() ?? '';
                if (_isExternalScheme(urlStr)) {
                  controller.stopLoading();
                  _handleExternalUrl(urlStr);
                  return;
                }
              },
              onLoadStop: (controller, url) async {
                setState(() {
                  _isLoading = false;
                });

                // Inject ZAYRO window interface shim
                await controller.evaluateJavascript(source: """
                  (function() {
                    window.ZAYRO = {
                      playSound: function(file) {
                        window.flutter_inappwebview.callHandler('playSound', file);
                      },
                      speak: function(text) {
                        window.flutter_inappwebview.callHandler('speak', text);
                      },
                      stopSound: function() {
                        window.flutter_inappwebview.callHandler('stopSound');
                      },
                      openExternal: function(url) {
                        window.flutter_inappwebview.callHandler('openExternal', url);
                      },
                      retryContent: function() {
                        window.flutter_inappwebview.callHandler('retryContent');
                      }
                    };
                  })();
                """);
              },
              shouldOverrideUrlLoading: (controller, navigationAction) async {
                final uri = navigationAction.request.url;
                final urlStr = uri?.toString() ?? '';

                if (_isExternalScheme(urlStr)) {
                  _handleExternalUrl(urlStr);
                  return NavigationActionPolicy.CANCEL;
                }

                if (_isPaymentUrl(urlStr)) {
                  // For payment redirects, launch in external browser or intent
                  _handleExternalUrl(urlStr);
                  return NavigationActionPolicy.CANCEL;
                }

                return NavigationActionPolicy.ALLOW;
              },
            ),

            // Loading splash screen overlay while initial webview finishes loading
            if (_isLoading && _splashHtml != null)
              Positioned.fill(
                child: Container(
                  color: Colors.black,
                  child: InAppWebView(
                    initialData: InAppWebViewInitialData(
                      data: _splashHtml!,
                      mimeType: 'text/html',
                      encoding: 'utf-8',
                    ),
                  ),
                ),
              ),

            // Fallback spinner if splashHtml is not yet loaded
            if (_isLoading && _splashHtml == null)
              Positioned.fill(
                child: Container(
                  color: Colors.black,
                  child: const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF8B7BFF),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    AudioService.instance.dispose();
    LiveLinksService.instance.stop();
    super.dispose();
  }
}
