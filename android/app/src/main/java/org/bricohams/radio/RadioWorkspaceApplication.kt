package org.bricohams.radio

import android.app.Activity
import android.app.Application
import android.os.Bundle

class RadioWorkspaceApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AnonymousDiagnostics.initialize(this, "radicodex", BuildConfig.VERSION_NAME)
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try { AnonymousDiagnostics.record("uncaught_error", "native", "error", error) }
            finally { previous?.uncaughtException(thread, error) }
        }
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, state: Bundle?) {
                AnonymousDiagnostics.record("started", "ui", "info")
            }
            override fun onActivityResumed(activity: Activity) { AnonymousDiagnostics.foreground = true }
            override fun onActivityPaused(activity: Activity) { AnonymousDiagnostics.foreground = false }
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }

    // Robolectric calls this at teardown; it releases the diagnostics threads and database per test.
    override fun onTerminate() {
        AnonymousDiagnostics.reset()
        super.onTerminate()
    }
}
