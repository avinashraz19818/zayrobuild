package com.zayro.client

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.security.MessageDigest

object SecurityBridge {
    private const val CHANNEL = "com.zayro.client/security"
    private const val XOR_KEY = 0x5A
    private val EXPECTED_CERT_SHA256_M = byteArrayOf(0, 0)

    private fun decodeMasked(m: ByteArray): String {
        if (m.size <= 2 && m.all { it.toInt() == 0 }) return ""
        val chars = CharArray(m.size)
        for (i in m.indices) {
            chars[i] = ((m[i].toInt() xor XOR_KEY) and 0xFF).toChar()
        }
        return String(chars)
    }

    fun register(context: Context, engine: FlutterEngine) {
        MethodChannel(engine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getCertSha256" -> {
                    result.success(getAppCertSha256(context))
                }
                "verifySignature" -> {
                    val expected = decodeMasked(EXPECTED_CERT_SHA256_M)
                    if (expected.isEmpty()) {
                        result.success(true)
                    } else {
                        val current = getAppCertSha256(context)
                        result.success(expected.equals(current, ignoreCase = true))
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun getAppCertSha256(context: Context): String {
        try {
            val pm = context.packageManager
            val pkg = context.packageName
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val pi = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES)
                pi.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                val pi = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES)
                @Suppress("DEPRECATION")
                pi.signatures
            }
            if (signatures != null && signatures.isNotEmpty()) {
                val md = MessageDigest.getInstance("SHA-256")
                val digest = md.digest(signatures[0].toByteArray())
                val sb = StringBuilder()
                for (b in digest) {
                    sb.append(String.format("%02x", b))
                }
                return sb.toString()
            }
        } catch (_: Exception) {}
        return ""
    }
}
