import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  bool _splashVisible = true;
  String _currentUrl = '';
  String? _splashHtml;
  String? _popupHtml;
  Timer? _splashTimer;
  StreamSubscription<String>? _introSubscription;

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

    _loadAssets();

    // 1. Play intro sound on startup (loading splash)
    AudioService.instance.playSound('intro.mp3');

    // 2. Listen for intro completion: when the ~7s intro finishes, smoothly dismiss splash
    _introSubscription = AudioService.instance.onSoundComplete.listen((completedSound) {
      if (completedSound.toLowerCase().contains('intro')) {
        Future.delayed(const Duration(milliseconds: 300), () {
          _dismissSplash();
        });
      }
    });

    // 3. Fallback safety timer: 7.5 seconds (ensures full ~7s audio plays even if sound events vary)
    _splashTimer = Timer(const Duration(milliseconds: 7500), () {
      _dismissSplash();
    });

    // 4. Start live link watchdog for dynamic domain/register link updates
    LiveLinksService.instance.startPolling();
    LiveLinksService.instance.urlStream.listen((updatedUrl) {
      if (mounted && updatedUrl.isNotEmpty && updatedUrl != _currentUrl) {
        setState(() {
          _currentUrl = updatedUrl;
        });
        _updateTargetGameFrame(updatedUrl);
      }
    });
  }

  void _dismissSplash() {
    if (mounted && _splashVisible) {
      setState(() {
        _splashVisible = false;
      });
      AudioService.instance.stopIfPlaying('intro.mp3');
    }
  }

  void _loadAssets() async {
    final splash = await CryptoService.loadAssetLoadingHtml();
    final popup = await CryptoService.loadAssetPopupHtml();
    if (mounted) {
      setState(() {
        _splashHtml = splash;
        _popupHtml = popup;
      });
      if (popup != null && _webViewController != null) {
        _webViewController!.loadData(
          data: popup,
          mimeType: 'text/html',
          encoding: 'utf-8',
          baseUrl: WebUri('file:///android_asset/'),
        );
      }
    }
  }

  void _updateTargetGameFrame(String targetUrl) {
    _webViewController?.evaluateJavascript(source: """
      (function() {
        try {
          var fr = document.getElementById('target-game-frame');
          if (!fr) { var fs = document.getElementsByTagName('iframe'); if (fs.length) fr = fs[0]; }
          if (fr && fr.src !== '$targetUrl') {
            fr.src = '$targetUrl';
          }
        } catch (_) {}
      })();
    """);
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
        lower.startsWith('bhim:') ||
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
    final userScripts = UnmodifiableListView<UserScript>([
      UserScript(
        source: """
          (function() {
            window.ZAYRO = {
              playSound: function(file) {
                try { window.flutter_inappwebview.callHandler('playSound', String(file)); } catch(e){}
              },
              speak: function(text) {
                try { window.flutter_inappwebview.callHandler('speak', String(text)); } catch(e){}
              },
              stopSound: function() {
                try { window.flutter_inappwebview.callHandler('stopSound'); } catch(e){}
              },
              openExternal: function(url) {
                try { window.flutter_inappwebview.callHandler('openExternal', String(url)); } catch(e){}
              },
              retryContent: function() {
                try { window.flutter_inappwebview.callHandler('retryContent'); } catch(e){}
              }
            };
            window.playAudio = function(file) {
              if (window.ZAYRO && window.ZAYRO.playSound) window.ZAYRO.playSound(file);
            };
          })();
        """,
        injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
        forMainFrameOnly: false,
      ),
    ]);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_webViewController != null && await _webViewController!.canGoBack()) {
          await _webViewController!.goBack();
          return;
        }
        SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              // Main Predictor Tool / Overlay WebView
              InAppWebView(
                initialData: _popupHtml != null
                    ? InAppWebViewInitialData(
                        data: _popupHtml!,
                        mimeType: 'text/html',
                        encoding: 'utf-8',
                        baseUrl: WebUri('file:///android_asset/'),
                      )
                    : null,
                initialUrlRequest: (_popupHtml == null && _currentUrl.isNotEmpty)
                    ? URLRequest(url: WebUri(_currentUrl))
                    : null,
                initialUserScripts: userScripts,
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  allowFileAccessFromFileURLs: true,
                  allowUniversalAccessFromFileURLs: true,
                  allowContentAccess: true,
                  allowFileAccess: true,
                  mixedContentMode: MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                  mediaPlaybackRequiresUserGesture: false,
                  supportMultipleWindows: true,
                  useWideViewPort: true,
                  loadWithOverviewMode: true,
                  useHybridComposition: true,
                  hardwareAcceleration: true,
                  cacheEnabled: true,
                  overScrollMode: OverScrollMode.NEVER,
                  userAgent:
                      'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
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
                shouldOverrideUrlLoading: (controller, navigationAction) async {
                  final uri = navigationAction.request.url;
                  final urlStr = uri?.toString() ?? '';

                  if (_isExternalScheme(urlStr) || _isPaymentUrl(urlStr)) {
                    _handleExternalUrl(urlStr);
                    return NavigationActionPolicy.CANCEL;
                  }

                  return NavigationActionPolicy.ALLOW;
                },
              ),

              // Smooth Splash Screen: stays for the complete ~7s intro audio, then fades out smoothly
              if (_splashVisible)
                AnimatedOpacity(
                  opacity: _splashVisible ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 600),
                  child: Container(
                    color: Colors.black,
                    child: _splashHtml != null
                        ? InAppWebView(
                            initialData: InAppWebViewInitialData(
                              data: _splashHtml!,
                              mimeType: 'text/html',
                              encoding: 'utf-8',
                              baseUrl: WebUri('file:///android_asset/'),
                            ),
                            initialUserScripts: userScripts,
                            initialSettings: InAppWebViewSettings(
                              javaScriptEnabled: true,
                              domStorageEnabled: true,
                              databaseEnabled: true,
                              allowFileAccessFromFileURLs: true,
                              allowUniversalAccessFromFileURLs: true,
                              mixedContentMode: MixedContentMode.MIXED_CONTENT_ALWAYS_ALLOW,
                              mediaPlaybackRequiresUserGesture: false,
                              useHybridComposition: true,
                              hardwareAcceleration: true,
                            ),
                            onWebViewCreated: (controller) {
                              controller.addJavaScriptHandler(
                                handlerName: 'playSound',
                                callback: (args) {
                                  if (args.isNotEmpty) {
                                    AudioService.instance.playSound(args[0].toString());
                                  }
                                },
                              );
                              controller.addJavaScriptHandler(
                                handlerName: 'stopSound',
                                callback: (args) {
                                  AudioService.instance.stopSound();
                                },
                              );
                            },
                          )
                        : const Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF8B7BFF),
                            ),
                          ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _introSubscription?.cancel();
    _splashTimer?.cancel();
    AudioService.instance.dispose();
    LiveLinksService.instance.stop();
    super.dispose();
  }
}
