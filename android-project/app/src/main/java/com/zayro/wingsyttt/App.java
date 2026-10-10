package com.zayro.wingsyttt;

import android.app.Application;

public class App extends Application {

    private static Application instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        try {
            SecurityManager.initialize(this);
        } catch (Throwable t) { }
    }

    public static Application get() {
        return instance;
    }
}

