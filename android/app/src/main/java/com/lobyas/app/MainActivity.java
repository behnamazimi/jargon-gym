package com.lobyas.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null) {
            bridge.setWebViewClient(new ConnectionErrorWebViewClient(bridge));
        }
    }

    /**
     * Capacitor loads the offline page for any HTTP error on a page, so a 404 or
     * 5xx would replace a working site. Here only a failed connection does.
     */
    private static class ConnectionErrorWebViewClient extends BridgeWebViewClient {

        ConnectionErrorWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedHttpError(
            WebView view,
            WebResourceRequest request,
            WebResourceResponse errorResponse
        ) {}
    }
}
