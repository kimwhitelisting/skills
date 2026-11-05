package com.paranstudio.dosirak;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        // 기기 글자 크기 설정과 상관없이 게임 화면은 같은 크기로 (도트 화면이 넘치지 않게)
        if (getBridge() != null) getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
