#include <jni.h>
#include <string>
#include <vector>

static const unsigned char KEY_SHARD_M[] = { 0x00 };
static const unsigned char XOR_KEY = 0x5A;

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_zayro_client_SecurityBridge_getNativeShard(JNIEnv *env, jobject /* this */) {
    int len = sizeof(KEY_SHARD_M);
    if (len <= 1 && KEY_SHARD_M[0] == 0x00) {
        jbyteArray empty = env->NewByteArray(0);
        return empty;
    }
    jbyteArray result = env->NewByteArray(len);
    jbyte* bytes = env->GetByteArrayElements(result, NULL);
    for (int i = 0; i < len; i++) {
        bytes[i] = (jbyte)(KEY_SHARD_M[i] ^ XOR_KEY);
    }
    env->ReleaseByteArrayElements(result, bytes, 0);
    return result;
}
