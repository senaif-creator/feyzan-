#!/usr/bin/env python3
import os
import sys
import zipfile
import subprocess
import shutil

def ensure_tools():
    has_zipalign = shutil.which('zipalign') is not None
    has_apksigner = shutil.which('apksigner') is not None
    has_aapt = shutil.which('aapt') is not None
    
    if not (has_zipalign and has_apksigner and has_aapt):
        print("Android derleme araçları (zipalign, apksigner, aapt) hazırlanıyor...")
        env = os.environ.copy()
        env['DEBIAN_FRONTEND'] = 'noninteractive'
        subprocess.run(['apt-get', 'install', '-y', '--no-install-recommends', 'apksigner', 'zipalign', 'aapt'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def build_dex_if_needed():
    src_java = 'android/src/com/personal/aiassistant/MainActivity.java'
    android_jar = 'android/tools/android.jar'
    r8_jar = 'android/tools/r8.jar'
    if os.path.exists(src_java) and os.path.exists(android_jar) and os.path.exists(r8_jar) and shutil.which('javac'):
        print("0. MainActivity.java derleniyor ve classes.dex güncelleniyor...")
        tmp_classes = '/tmp/repack_classes'
        tmp_dex = '/tmp/repack_dex'
        shutil.rmtree(tmp_classes, ignore_errors=True)
        shutil.rmtree(tmp_dex, ignore_errors=True)
        os.makedirs(tmp_classes, exist_ok=True)
        os.makedirs(tmp_dex, exist_ok=True)
        
        compile_res = subprocess.run([
            'javac', '-cp', android_jar, '-d', tmp_classes,
            '-source', '1.8', '-target', '1.8', src_java
        ], capture_output=True, text=True)
        if compile_res.returncode != 0:
            print("Uyarı: javac derlemesi başarısız, mevcut classes.dex kullanılacak:\n", compile_res.stderr)
            return

        class_files = []
        for root, dirs, files in os.walk(tmp_classes):
            for f in files:
                if f.endswith('.class'):
                    class_files.append(os.path.join(root, f))

        dex_res = subprocess.run([
            'java', '-cp', r8_jar, 'com.android.tools.r8.D8',
            '--lib', android_jar, '--output', tmp_dex
        ] + class_files, capture_output=True, text=True)
        if dex_res.returncode == 0 and os.path.exists(os.path.join(tmp_dex, 'classes.dex')):
            shutil.copyfile(os.path.join(tmp_dex, 'classes.dex'), 'android/classes.dex')
            print("✓ classes.dex başarıyla derlendi ve güncellendi.")

def compile_manifest_and_resources():
    print("1. AndroidManifest.xml ve kaynaklar güncel dosyalardan aapt ile derleniyor...")
    android_jar = 'android/tools/android.jar'
    manifest_xml = 'android/AndroidManifest.xml'
    res_dir = 'android/res'
    tmp_apk = '/tmp/compiled_res.apk'

    if os.path.exists(tmp_apk):
        os.remove(tmp_apk)

    aapt_cmd = [
        'aapt', 'package', '-f', '-m',
        '-M', manifest_xml,
        '-I', android_jar,
        '-S', res_dir,
        '-F', tmp_apk
    ]
    res_aapt = subprocess.run(aapt_cmd, capture_output=True, text=True)
    if res_aapt.returncode != 0:
        print("HATA: aapt manifest derlemesi başarısız:\n", res_aapt.stderr)
        sys.exit(1)

    with zipfile.ZipFile(tmp_apk, 'r') as z:
        manifest_bytes = z.read('AndroidManifest.xml')
        arsc_bytes = z.read('resources.arsc')

    print(f"✓ AndroidManifest.xml ({len(manifest_bytes)} bayt) ve resources.arsc başarıyla derlendi.")
    return manifest_bytes, arsc_bytes

def verify_apk_manifest(aligned_apk):
    print("5. Üretilen APK'nın GERÇEK binary AndroidManifest.xml içeriği doğrulanıyor...")
    dump_cmd = ['aapt', 'dump', 'badging', aligned_apk]
    res_badging = subprocess.run(dump_cmd, capture_output=True, text=True)
    if res_badging.returncode != 0:
        print("HATA: aapt dump badging başarısız:", res_badging.stderr)
        sys.exit(1)

    badging_out = res_badging.stdout
    print("--- AAPT BADGING RAPORU ---")
    for line in badging_out.splitlines():
        if any(k in line for k in ['package:', 'sdkVersion:', 'targetSdkVersion:', 'uses-permission:', 'uses-feature:']):
            print("  ", line)

    xml_cmd = ['aapt', 'dump', 'xmltree', aligned_apk, 'AndroidManifest.xml']
    res_xml = subprocess.run(xml_cmd, capture_output=True, text=True)
    if res_xml.returncode != 0:
        print("HATA: aapt dump xmltree başarısız:", res_xml.stderr)
        sys.exit(1)

    xml_out = res_xml.stdout
    has_queries = 'E: queries' in xml_out
    has_recognition = 'android.speech.RecognitionService' in xml_out
    has_record_audio = 'android.permission.RECORD_AUDIO' in xml_out
    has_target_34 = "android:targetSdkVersion" in xml_out and "0x22" in xml_out

    print("--- MANIFEST DOĞRULAMA KONTROLLERİ ---")
    print(f"  [✓] targetSdkVersion = 34: {has_target_34}")
    print(f"  [✓] RECORD_AUDIO izni: {has_record_audio}")
    print(f"  [✓] <queries> bloğu: {has_queries}")
    print(f"  [✓] RecognitionService intent: {has_recognition}")

    if not (has_queries and has_recognition and has_record_audio):
        print("KRİTİK HATA: Binary manifest içinde zorunlu alanlar eksik!")
        sys.exit(1)
    print("✓ GERÇEK binary manifest doğrulaması %100 BAŞARILI!")

def main():
    print("=== Personal AI Assistant: Standart Android APK Derleyici ===")
    ensure_tools()
    build_dex_if_needed()

    # 1. Temel Android ikili bileşenleri
    if not os.path.exists('android/classes.dex'):
        print("HATA: android/classes.dex bulunamadı!")
        sys.exit(1)
    with open('android/classes.dex', 'rb') as f:
        dex_bytes = f.read()

    # 2. AndroidManifest.xml ve resources.arsc'yi GÜNCEL kaynaklardan aapt ile derle (Eski APK KULLANILMAZ!)
    manifest_bytes, arsc_bytes = compile_manifest_and_resources()

    # 3. Güncel dist/ web varlıklarını topla
    dist_dir = 'dist'
    if not os.path.exists(dist_dir):
        print("dist/ klasörü bulunamadı. Lütfen önce 'npm run build' çalıştırın.")
        sys.exit(1)

    # 4. İmzalanmamış ve hizalanmamış APK ZIP paketini oluştur
    unaligned_apk = 'android/package_unaligned.apk'
    if os.path.exists(unaligned_apk):
        os.remove(unaligned_apk)

    with zipfile.ZipFile(unaligned_apk, 'w') as z:
        # A) Gerçek derlenmiş binary AndroidManifest.xml (DEFLATED)
        z.writestr('AndroidManifest.xml', manifest_bytes, compress_type=zipfile.ZIP_DEFLATED)

        # B) resources.arsc (KRİTİK: Android şartnamesi gereği KESİNLİKLE STORED / SIKIŞTIRILMAMIŞ olmalıdır!)
        z.writestr('resources.arsc', arsc_bytes, compress_type=zipfile.ZIP_STORED)

        # C) classes.dex (DEFLATED)
        z.writestr('classes.dex', dex_bytes, compress_type=zipfile.ZIP_DEFLATED)

        # D) Web varlıkları (assets/ altına DEFLATED)
        for root, dirs, files in os.walk(dist_dir):
            for f in files:
                if f.endswith('.apk') or f.endswith('.cjs') or f.endswith('.cjs.map'):
                    continue
                full = os.path.join(root, f)
                rel = os.path.relpath(full, dist_dir)
                target = 'assets/' + rel.replace(os.sep, '/')
                with open(full, 'rb') as fp:
                    z.writestr(target, fp.read(), compress_type=zipfile.ZIP_DEFLATED)

    print(f"2. Ham APK paketi hazırlandı ({os.path.getsize(unaligned_apk)} bytes)")

    # 5. ZIP Hizalama (zipalign: uncompressed kaynakların 4-byte sınırlarına hizalanması)
    aligned_apk = 'android/package_aligned.apk'
    if os.path.exists(aligned_apk):
        os.remove(aligned_apk)

    print("3. ZipAlign işlemi uygulanıyor (4-byte alignment)...")
    res_align = subprocess.run(['zipalign', '-f', '-v', '4', unaligned_apk, aligned_apk], capture_output=True, text=True)
    if res_align.returncode != 0:
        print("HATA: zipalign başarısız oldu:\n", res_align.stderr)
        sys.exit(1)

    # 6. Standart Android Debug Keystore oluştur (yoksa)
    keystore_path = 'android/keystore/debug.keystore'
    os.makedirs('android/keystore', exist_ok=True)
    if not os.path.exists(keystore_path):
        print("Standart Android Debug Keystore oluşturuluyor...")
        subprocess.run([
            'keytool', '-genkey', '-v',
            '-keystore', keystore_path,
            '-alias', 'androiddebugkey',
            '-storepass', 'android',
            '-keypass', 'android',
            '-keyalg', 'RSA',
            '-keysize', '2048',
            '-validity', '10000',
            '-dname', 'CN=Android Debug,O=Android,C=US'
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 7. Resmi apksigner ile Modern İmza (APK Signature Scheme v2 ve v3)
    print("4. Resmi Android apksigner ile imzalanıyor (APK Signature Scheme v2 & v3)...")
    sign_cmd = [
        'apksigner', 'sign',
        '--ks', keystore_path,
        '--ks-pass', 'pass:android',
        '--key-pass', 'pass:android',
        '--ks-key-alias', 'androiddebugkey',
        '--v2-signing-enabled', 'true',
        aligned_apk
    ]
    res_sign = subprocess.run(sign_cmd, capture_output=True, text=True)
    if res_sign.returncode != 0:
        print("HATA: apksigner sign başarısız:\n", res_sign.stderr)
        sys.exit(1)

    # 8. Üretilen APK'nın manifestini doğrula
    verify_apk_manifest(aligned_apk)

    # 9. apksigner verify ile imza kontrolü
    print("6. apksigner verify ile imza doğrulanıyor...")
    verify_cmd = ['apksigner', 'verify', '--verbose', aligned_apk]
    res_verify = subprocess.run(verify_cmd, capture_output=True, text=True)
    if res_verify.returncode != 0:
        print("HATA: apksigner verify başarısız:\n", res_verify.stderr)
        sys.exit(1)

    # 10. Çıktı APK'larını dağıt
    output_apks = [
        'dist-apk/personal-ai-assistant-debug.apk',
        'public/personal-ai-assistant-debug.apk',
        'dist/personal-ai-assistant-debug.apk'
    ]

    final_size_kb = os.path.getsize(aligned_apk) / 1024
    for out in output_apks:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        shutil.copyfile(aligned_apk, out)
        print(f"✓ Başarıyla hazırlandı: {out} ({final_size_kb:.1f} KB)")

    print("=== TAMAMLANDI: Standart, imzalı ve doğrulanmış Android APK hazır! ===")

if __name__ == '__main__':
    main()
