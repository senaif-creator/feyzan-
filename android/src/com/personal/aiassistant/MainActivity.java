package com.personal.aiassistant;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.webkit.JavascriptInterface;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.Intent;
import android.speech.RecognizerIntent;
import android.Manifest;
import android.util.Log;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

public class MainActivity extends Activity {
    private static final String TAG = "PersonalAI";
    private static final int REQUEST_CODE_SPEECH = 1002;
    private static final int REQUEST_CODE_PERMISSION = 101;
    private WebView webView;
    private final ExecutorService networkExecutor = Executors.newFixedThreadPool(2);

    public class AndroidGeminiBridge {
        @JavascriptInterface
        public void sendGeminiRequest(final String apiKey, final String payloadJson, final String modelName, final String callbackId) {
            final String safeCallbackId = callbackId != null ? callbackId : "default";

            if (apiKey == null || apiKey.trim().isEmpty()) {
                sendGeminiResponseToJs(safeCallbackId, false, 401, "{\"error\":{\"code\":401,\"message\":\"API key is empty\"}}");
                return;
            }

            if (payloadJson == null || payloadJson.trim().isEmpty()) {
                sendGeminiResponseToJs(safeCallbackId, false, 400, "{\"error\":{\"code\":400,\"message\":\"Payload is empty\"}}");
                return;
            }

            final String targetModel = (modelName != null && !modelName.trim().isEmpty()) ? modelName.trim() : "gemini-3.8-flash";

            networkExecutor.execute(new Runnable() {
                @Override
                public void run() {
                    HttpsURLConnection conn = null;
                    try {
                        URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent");
                        conn = (HttpsURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setConnectTimeout(25000);
                        conn.setReadTimeout(45000);
                        conn.setDoOutput(true);
                        conn.setDoInput(true);
                        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        conn.setRequestProperty("x-goog-api-key", apiKey.trim());

                        byte[] postData = payloadJson.getBytes(StandardCharsets.UTF_8);
                        conn.setFixedLengthStreamingMode(postData.length);
                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(postData);
                            os.flush();
                        }

                        int statusCode = conn.getResponseCode();
                        InputStream is = (statusCode >= 200 && statusCode < 300) ? conn.getInputStream() : conn.getErrorStream();

                        String responseBody = "";
                        if (is != null) {
                            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                                StringBuilder sb = new StringBuilder();
                                String line;
                                while ((line = reader.readLine()) != null) {
                                    sb.append(line).append("\n");
                                }
                                responseBody = sb.toString();
                            }
                        }

                        boolean isSuccess = (statusCode >= 200 && statusCode < 300);
                        sendGeminiResponseToJs(safeCallbackId, isSuccess, statusCode, responseBody);
                    } catch (Exception e) {
                        Log.e(TAG, "Gemini HTTPS network error: " + e.getClass().getSimpleName());
                        sendGeminiResponseToJs(safeCallbackId, false, 500, "{\"error\":{\"code\":500,\"message\":\"Network connection failed\"}}");
                    } finally {
                        if (conn != null) {
                            try {
                                conn.disconnect();
                            } catch (Exception ignored) {}
                        }
                    }
                }
            });
        }
    }

    public class AndroidSpeechBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            try {
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                List<ResolveInfo> activities = getPackageManager().queryIntentActivities(intent, 0);
                boolean available = activities != null && !activities.isEmpty();
                Log.d(TAG, "SPEECH_AVAILABLE_CHECK (ACTION_RECOGNIZE_SPEECH): " + available + " (count: " + (activities != null ? activities.size() : 0) + ")");
                return available;
            } catch (Exception e) {
                Log.e(TAG, "SPEECH_AVAILABLE_CHECK error", e);
                return false;
            }
        }

        @JavascriptInterface
        public void startListening(final String language) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Log.d(TAG, "SPEECH_START_REQUESTED: lang=" + (language != null ? language : "tr-TR"));
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        Log.w(TAG, "SPEECH_ERROR: RECORD_AUDIO permission not granted, requesting now");
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_CODE_PERMISSION);
                        sendErrorToJs(9, "ERROR_INSUFFICIENT_PERMISSIONS");
                        return;
                    }
                    startSpeechRecognitionActivity(language != null && !language.isEmpty() ? language : "tr-TR");
                }
            });
        }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Log.d(TAG, "SPEECH_STOP_REQUESTED_BY_USER");
                    sendStateToJs("idle");
                }
            });
        }

        @JavascriptInterface
        public void cancel() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Log.d(TAG, "SPEECH_CANCEL_REQUESTED_BY_USER");
                    sendStateToJs("idle");
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Mikrofon izni kontrolü (Sesli asistan için ilk açılışta ön kontrol)
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_CODE_PERMISSION);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        // JavaScript ile Android SpeechRecognizer ve Gemini Köprülerini kaydet
        webView.addJavascriptInterface(new AndroidSpeechBridge(), "AndroidSpeech");
        webView.addJavascriptInterface(new AndroidGeminiBridge(), "AndroidGemini");

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "RECORD_AUDIO permission granted by user");
            } else {
                Log.w(TAG, "RECORD_AUDIO permission denied by user");
                sendErrorToJs(9, "ERROR_INSUFFICIENT_PERMISSIONS");
            }
        }
    }

    private void startSpeechRecognitionActivity(String lang) {
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            String targetLang = (lang != null && !lang.isEmpty()) ? lang : "tr-TR";
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, targetLang);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, targetLang);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Dinliyorum, konuşabilirsiniz...");

            if (intent.resolveActivity(getPackageManager()) != null) {
                sendStateToJs("listening");
                startActivityForResult(intent, REQUEST_CODE_SPEECH);
            } else {
                Log.e(TAG, "SPEECH_ERROR: No activity found to handle ACTION_RECOGNIZE_SPEECH");
                sendErrorToJs(15, "ERROR_RECOGNITION_SERVICE_NOT_AVAILABLE");
                sendStateToJs("idle");
            }
        } catch (Exception e) {
            Log.e(TAG, "SPEECH_ERROR: Exception launching ACTION_RECOGNIZE_SPEECH", e);
            sendErrorToJs(5, "ERROR_CLIENT");
            sendStateToJs("idle");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_SPEECH) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (matches != null && !matches.isEmpty()) {
                    String recognizedText = matches.get(0);
                    Log.d(TAG, "SPEECH_RESULT: " + recognizedText);
                    sendResultToJs(recognizedText, true);
                } else {
                    Log.d(TAG, "SPEECH_RESULT: [EMPTY]");
                    sendResultToJs("", true);
                }
            } else if (resultCode == RESULT_CANCELED) {
                // Kullanıcı konuşmadan pencereyi kapattıysa veya geri bastıysa hata bandı gösterme
                Log.d(TAG, "SPEECH_CANCELED: User closed dialog or cancelled without speech");
            } else {
                Log.w(TAG, "SPEECH_ERROR: Activity result not OK, code=" + resultCode);
                sendErrorToJs(5, "ERROR_CLIENT");
            }
            sendStateToJs("idle");
        }
    }

    private void sendResultToJs(String text, boolean isFinal) {
        if (webView == null) return;
        final String quotedText = JSONObject.quote(text != null ? text : "");
        final String js = "if (window.onAndroidSpeechResult) { window.onAndroidSpeechResult(" + quotedText + ", " + (isFinal ? "true" : "false") + "); }";
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private void sendErrorToJs(int errorCode, String errorName) {
        if (webView == null) return;
        final String quotedName = JSONObject.quote(errorName != null ? errorName : "ERROR_UNKNOWN");
        final String js = "if (window.onAndroidSpeechError) { window.onAndroidSpeechError(" + errorCode + ", " + quotedName + "); }";
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private void sendStateToJs(final String state) {
        if (webView == null) return;
        final String quotedState = JSONObject.quote(state != null ? state : "idle");
        final String js = "if (window.onAndroidSpeechState) { window.onAndroidSpeechState(" + quotedState + "); }";
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    private void sendGeminiResponseToJs(final String callbackId, final boolean success, final int statusCode, final String bodyOrError) {
        if (webView == null) return;
        final String quotedCallbackId = JSONObject.quote(callbackId != null ? callbackId : "default");
        final String quotedBody = JSONObject.quote(bodyOrError != null ? bodyOrError : "");
        final String js = "if (window.onAndroidGeminiResponse) { window.onAndroidGeminiResponse(" + quotedCallbackId + ", " + (success ? "true" : "false") + ", " + statusCode + ", " + quotedBody + "); }";
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
